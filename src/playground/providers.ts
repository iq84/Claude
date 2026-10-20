import type { ChatMessage, Provider } from '../lib/playground';

export interface StreamRequest {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  messages: Pick<ChatMessage, 'role' | 'content'>[];
  temperature: number | null;
  maxTokens: number;
  signal: AbortSignal;
  onText: (delta: string) => void;
}

export interface StreamResult {
  tokensIn: number;
  tokensOut: number;
  stopReason?: string;
}

/**
 * Streams one assistant turn straight from the browser to the provider with the visitor's own key.
 * SDKs load on demand so each provider's code is only downloaded when used.
 */
export async function streamChat(req: StreamRequest): Promise<StreamResult> {
  const temp = req.temperature != null ? { temperature: req.temperature } : {};

  if (req.provider === 'anthropic') {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({
      apiKey: req.apiKey,
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
    });
    // No refusal fallback: the point is to test this model's behaviour, so a refusal is shown as-is.
    const stream = client.messages.stream(
      {
        model: req.model,
        max_tokens: req.maxTokens,
        system: req.system,
        messages: req.messages,
        ...temp,
      },
      { signal: req.signal },
    );
    stream.on('text', (delta) => req.onText(delta));
    const final = await stream.finalMessage();
    return {
      tokensIn: final.usage.input_tokens,
      tokensOut: final.usage.output_tokens,
      stopReason: final.stop_reason ?? undefined,
    };
  }

  if (req.provider === 'openai') {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: req.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
    const stream = await client.responses.create(
      {
        model: req.model,
        instructions: req.system,
        input: req.messages.map((m) => ({ role: m.role, content: m.content })),
        max_output_tokens: req.maxTokens,
        stream: true,
        ...temp,
      },
      { signal: req.signal },
    );
    let result: StreamResult = { tokensIn: 0, tokensOut: 0 };
    for await (const ev of stream) {
      if (ev.type === 'response.output_text.delta') req.onText(ev.delta);
      else if (ev.type === 'response.completed' || ev.type === 'response.incomplete') {
        result = {
          tokensIn: ev.response.usage?.input_tokens ?? 0,
          tokensOut: ev.response.usage?.output_tokens ?? 0,
          stopReason: ev.response.incomplete_details?.reason ?? ev.response.status ?? undefined,
        };
      }
    }
    return result;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: req.apiKey });
  const stream = await ai.models.generateContentStream({
    model: req.model,
    contents: req.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: req.system,
      maxOutputTokens: req.maxTokens,
      abortSignal: req.signal,
      ...temp,
    },
  });
  let result: StreamResult = { tokensIn: 0, tokensOut: 0 };
  for await (const chunk of stream) {
    if (chunk.text) req.onText(chunk.text);
    const u = chunk.usageMetadata;
    if (u) {
      result = {
        tokensIn: u.promptTokenCount ?? 0,
        tokensOut: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
        stopReason: chunk.candidates?.[0]?.finishReason ?? result.stopReason,
      };
    }
  }
  return result;
}

/** Turns SDK errors into something a person can act on. */
export function friendlyError(err: unknown): string {
  const e = err as { status?: number; name?: string; message?: string };
  if (e.name === 'AbortError' || /abort/i.test(e.message ?? '')) return 'Stopped.';
  if (e.status === 401 || e.status === 403)
    return 'The API key was rejected. Check it and try again.';
  if (e.status === 404) return 'Model not found. Check the model ID.';
  if (e.status === 429) return 'Rate limited by the provider. Wait a moment and try again.';
  if (e.status === 400) return `The provider rejected the request: ${e.message ?? 'bad request'}`;
  if (/fetch|network|cors/i.test(e.message ?? '')) return 'Network error reaching the provider.';
  return e.message ?? 'Something went wrong.';
}
