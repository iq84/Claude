import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { buttonClass } from '../components/builder/buttonClass';
import { downloadText } from '../components/builder/download';
import Tabs from '../components/Tabs';
import {
  parseSpec,
  transcriptMarkdown,
  workTasks,
  type ChatMessage,
  type Provider,
  type WorkTask,
} from '../lib/playground';
import type { AgentSpec } from '../lib/schema';
import { CATALOG, KEY_HELP, PROVIDER_LABEL } from '../playground/catalog';
import { loadKey, saveKey } from '../playground/keys';
import { PROBES } from '../playground/probes';
import { friendlyError, streamChat } from '../playground/providers';
import { currentBuilderSpec } from './builderSpec';

const BLANK_PROMPT = 'You are a helpful assistant.';
const CUSTOM = '__custom__';
const inputClass =
  'w-full rounded-md border border-border bg-bg px-2.5 py-1.5 text-sm focus-visible:outline-2 focus-visible:outline-accent';

type TaskGroup = WorkTask['group'];

export default function Playground() {
  const [params] = useSearchParams();
  const [spec, setSpec] = useState<AgentSpec | undefined>(() =>
    params.get('from') === 'builder' ? currentBuilderSpec() : undefined,
  );
  const [loadError, setLoadError] = useState('');
  const [system, setSystem] = useState(spec?.systemPrompt ?? BLANK_PROMPT);

  // Model: a catalog entry (from evals/config/models.yaml) or a custom provider + ID.
  const initialModel =
    CATALOG.find((m) => m.id === spec?.recommendedModel.id)?.id ?? CATALOG[0]?.id ?? CUSTOM;
  const [modelChoice, setModelChoice] = useState(initialModel);
  const [customProvider, setCustomProvider] = useState<Provider>('anthropic');
  const [customModel, setCustomModel] = useState('');
  const catalogModel = CATALOG.find((m) => m.id === modelChoice);
  const provider: Provider = catalogModel?.provider ?? customProvider;
  const apiModel = catalogModel?.apiModel ?? customModel.trim();

  const [sendTemperature, setSendTemperature] = useState(true);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4000);
  const temperatureAllowed = catalogModel ? catalogModel.temperature !== null : true;

  const [apiKey, setApiKey] = useState(() => loadKey(provider).value);
  const [remember, setRemember] = useState(() => loadKey(provider).remembered);
  useEffect(() => {
    const k = loadKey(provider);
    setApiKey(k.value);
    setRemember(k.remembered);
  }, [provider]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [setupOpen, setSetupOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  useEffect(() => listEnd.current?.scrollIntoView?.({ block: 'end' }), [messages]);

  const [taskGroup, setTaskGroup] = useState<TaskGroup>(
    spec?.role.responsibilities.length ? 'responsibility' : 'probe',
  );
  const tasks = useMemo(() => workTasks(spec, PROBES), [spec]);

  const agentTitle = spec?.role.title || 'Assistant';

  function loadAgent(next: AgentSpec | undefined) {
    setSpec(next);
    setSystem(next?.systemPrompt ?? BLANK_PROMPT);
    setMessages([]);
    setLoadError('');
    setTaskGroup(next?.role.responsibilities.length ? 'responsibility' : 'probe');
    const rec = CATALOG.find((m) => m.id === next?.recommendedModel.id);
    if (rec) setModelChoice(rec.id);
  }

  async function onUpload(file: File | undefined) {
    if (!file) return;
    const { spec: parsed, error } = parseSpec(await file.text());
    if (error) setLoadError(error);
    else loadAgent(parsed);
  }

  const missing = !apiKey.trim()
    ? `Add your ${PROVIDER_LABEL[provider]} API key.`
    : !apiModel
      ? 'Enter a model ID.'
      : '';

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy || missing) return;
    const history = [...messages.filter((m) => !m.error), { role: 'user' as const, content }];
    setMessages([...messages, { role: 'user', content }, { role: 'assistant', content: '' }]);
    setDraft('');
    setSetupOpen(false);
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    const started = performance.now();
    const patchLast = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((ms) => [...ms.slice(0, -1), fn(ms[ms.length - 1]!)]);
    try {
      const result = await streamChat({
        provider,
        apiKey: apiKey.trim(),
        model: apiModel,
        system,
        messages: history.map(({ role, content: c }) => ({ role, content: c })),
        temperature: temperatureAllowed && sendTemperature ? temperature : null,
        maxTokens,
        signal: controller.signal,
        onText: (delta) => patchLast((m) => ({ ...m, content: m.content + delta })),
      });
      patchLast((m) => ({
        ...m,
        content:
          m.content ||
          (result.stopReason === 'refusal'
            ? '(The model declined to respond.)'
            : '(No text returned.)'),
        meta: { model: apiModel, latencyMs: Math.round(performance.now() - started), ...result },
      }));
    } catch (err) {
      patchLast((m) => ({ ...m, error: friendlyError(err) }));
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(draft);
  };
  const onComposerKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(draft);
    }
  };

  const builderAvailable = Boolean(currentBuilderSpec());

  const setup = (
    <div className="space-y-5">
      <section aria-labelledby="agent-heading" className="space-y-2">
        <h2 id="agent-heading" className="text-sm font-semibold tracking-wide text-muted uppercase">
          Agent
        </h2>
        {spec ? (
          <div className="rounded-lg border border-border p-3">
            <p className="font-semibold">{spec.role.title}</p>
            <p className="text-sm text-muted">
              {spec.role.department}
              {spec.governance.accountableHuman &&
                ` · reports to ${spec.governance.accountableHuman}`}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">No agent loaded: chatting with a plain assistant.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass.secondary}
            disabled={!builderAvailable}
            title={builderAvailable ? undefined : 'Design an agent in the Builder first'}
            onClick={() => loadAgent(currentBuilderSpec())}
          >
            From Builder
          </button>
          <label
            className={`${buttonClass.secondary} cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent`}
          >
            Upload .json
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                void onUpload(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {spec && (
            <button
              type="button"
              className={buttonClass.secondary}
              onClick={() => loadAgent(undefined)}
            >
              Unload
            </button>
          )}
        </div>
        {!builderAvailable && (
          <p className="text-xs text-muted">
            <Link to="/builder" className="text-accent underline">
              Design an agent
            </Link>{' '}
            or upload an agent spec exported from the Builder.
          </p>
        )}
        {loadError && (
          <p role="alert" className="text-sm text-fg">
            {loadError}
          </p>
        )}
        <details className="rounded-lg border border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">System prompt</summary>
          <div className="space-y-1 px-3 pb-3">
            <label htmlFor="system" className="sr-only">
              System prompt
            </label>
            <textarea
              id="system"
              rows={10}
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              className={`${inputClass} font-mono text-xs`}
            />
            <p className="text-xs text-muted">
              Edits apply to the next message and aren't saved to the agent.
            </p>
          </div>
        </details>
      </section>

      <section aria-labelledby="model-heading" className="space-y-2">
        <h2 id="model-heading" className="text-sm font-semibold tracking-wide text-muted uppercase">
          Model
        </h2>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Base model</span>
          <select
            value={modelChoice}
            onChange={(e) => setModelChoice(e.target.value)}
            className={inputClass}
          >
            {CATALOG.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({PROVIDER_LABEL[m.provider]})
                {m.id === spec?.recommendedModel.id ? ' · recommended' : ''}
              </option>
            ))}
            <option value={CUSTOM}>Custom model ID…</option>
          </select>
        </label>
        {!catalogModel && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Provider</span>
              <select
                value={customProvider}
                onChange={(e) => setCustomProvider(e.target.value as Provider)}
                className={inputClass}
              >
                {(Object.keys(PROVIDER_LABEL) as Provider[]).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Model ID</span>
              <input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">{PROVIDER_LABEL[provider]} API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              saveKey(provider, e.target.value.trim(), remember);
            }}
            className={inputClass}
            aria-describedby="key-help"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => {
              setRemember(e.target.checked);
              saveKey(provider, apiKey.trim(), e.target.checked);
            }}
            className="accent-accent"
          />
          Remember on this device
        </label>
        <p id="key-help" className="text-xs text-muted">
          Get one at {KEY_HELP[provider]}. Your key stays in this browser and is sent only to{' '}
          {PROVIDER_LABEL[provider]}. Calls are billed to your account. Use a key with a spending
          limit.
        </p>
      </section>

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Settings</summary>
        <div className="space-y-3 px-3 pb-3 text-sm">
          {temperatureAllowed ? (
            <div className="space-y-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sendTemperature}
                  onChange={(e) => setSendTemperature(e.target.checked)}
                  className="accent-accent"
                />
                Temperature{' '}
                <output className="tabular-nums text-muted">{temperature.toFixed(1)}</output>
              </label>
              <input
                type="range"
                aria-label="Temperature"
                min={0}
                max={1}
                step={0.1}
                value={temperature}
                disabled={!sendTemperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          ) : (
            <p className="text-muted">This model uses its default temperature.</p>
          )}
          <label className="block space-y-1">
            <span>Max output tokens</span>
            <input
              type="number"
              min={256}
              max={64000}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Math.max(256, Number(e.target.value) || 256))}
              className={inputClass}
            />
          </label>
        </div>
      </details>
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">Playground</p>
          <h1 className="text-3xl font-bold tracking-tight">Try out your agent</h1>
        </div>
        <p className="max-w-md text-sm text-muted">
          Load an agent, give it work, and talk to it on any base model, using your own API key.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Setup: rendered once; always visible on desktop, toggled on phones. */}
        <div>
          <button
            type="button"
            aria-expanded={setupOpen}
            aria-controls="playground-setup"
            onClick={() => setSetupOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-border px-3 py-2 text-left font-medium focus-visible:outline-2 focus-visible:outline-accent lg:hidden"
          >
            <span>
              Setup · {agentTitle} on {catalogModel?.displayName ?? (apiModel || 'custom model')}
            </span>
            <span aria-hidden="true">{setupOpen ? '▲' : '▼'}</span>
          </button>
          <aside
            id="playground-setup"
            aria-label="Setup"
            className={`${setupOpen ? 'mt-3 block' : 'hidden'} lg:mt-0 lg:block`}
          >
            {setup}
          </aside>
        </div>

        <section
          aria-label="Chat"
          className="flex h-[75vh] min-h-[520px] flex-col overflow-hidden rounded-xl border border-border"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-sm">
              <span className="font-semibold">{agentTitle}</span>{' '}
              <span className="text-muted">· {apiModel || 'no model'}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
                disabled={messages.length === 0}
                onClick={() =>
                  downloadText(
                    `${agentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-transcript.md`,
                    transcriptMarkdown({ agentTitle, model: apiModel, system, messages }),
                    'text/markdown',
                  )
                }
              >
                Export
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
                disabled={messages.length === 0 || busy}
                onClick={() => setMessages([])}
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-3" aria-live="polite" aria-busy={busy}>
            {messages.length === 0 && (
              <div className="mx-auto max-w-md pt-8 text-center text-sm text-muted">
                <p className="font-medium text-fg">Give {agentTitle} some work.</p>
                <p className="mt-1">Pick a task below, or write your own message.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-accent text-accent-fg'
                      : 'border border-border bg-surface'
                  }`}
                >
                  <p className="sr-only">{m.role === 'user' ? 'You:' : `${agentTitle}:`}</p>
                  {m.error ? (
                    <p role="alert">⚠ {m.error}</p>
                  ) : (
                    <p className="break-words whitespace-pre-wrap">
                      {m.content || (busy ? '…' : '')}
                    </p>
                  )}
                  {m.meta && (
                    <p className="mt-1 text-xs text-muted">
                      {(m.meta.latencyMs / 1000).toFixed(1)} s · {m.meta.tokensOut} tokens
                      {m.meta.stopReason &&
                      !['end_turn', 'completed', 'STOP'].includes(m.meta.stopReason)
                        ? ` · ${m.meta.stopReason}`
                        : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <div ref={listEnd} />
          </div>

          <div className="space-y-2 border-t border-border p-3">
            <Tabs
              label="Give it work"
              size="sm"
              active={taskGroup}
              onChange={setTaskGroup}
              tabs={[
                ...(spec?.role.responsibilities.length
                  ? [{ id: 'responsibility' as const, label: 'Its work' }]
                  : []),
                { id: 'probe' as const, label: 'Lab probes' },
                { id: 'conversation' as const, label: 'Conversation' },
              ]}
            >
              <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                {tasks
                  .filter((t) => t.group === taskGroup)
                  .map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        setDraft(t.prompt);
                        composer.current?.focus();
                      }}
                      className="max-w-full truncate rounded-full border border-border px-2.5 py-0.5 text-xs text-muted hover:border-accent hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
                      title={t.prompt}
                    >
                      {t.label}
                    </button>
                  ))}
              </div>
            </Tabs>
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <label htmlFor="composer" className="sr-only">
                Message
              </label>
              <textarea
                id="composer"
                ref={composer}
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onComposerKey}
                placeholder={missing || `Message ${agentTitle}…`}
                aria-describedby="composer-hint"
                className={`${inputClass} resize-none`}
              />
              {busy ? (
                <button
                  type="button"
                  className={buttonClass.secondary}
                  onClick={() => abort.current?.abort()}
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  className={buttonClass.primary}
                  disabled={!draft.trim() || Boolean(missing)}
                >
                  Send
                </button>
              )}
            </form>
            <p id="composer-hint" className="text-xs text-muted">
              {missing || 'Enter to send · Shift+Enter for a new line'}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
