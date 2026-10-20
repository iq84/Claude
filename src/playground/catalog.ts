import { parse } from 'yaml';
import { z } from 'zod';
import modelsYaml from '../../evals/config/models.yaml?raw';
import type { Provider } from '../lib/playground';

export interface CatalogModel {
  id: string;
  displayName: string;
  provider: Provider;
  apiModel: string;
  /** null = model rejects custom temperature. */
  temperature: number | null;
}

const Schema = z.object({
  defaults: z.object({ temperature: z.number() }),
  models: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      provider: z.enum(['anthropic', 'openai', 'google']),
      apiModel: z.string(),
      temperature: z.number().nullable().optional(),
    }),
  ),
});

/** Models from the eval config (the single source of model IDs), minus unfilled placeholders. */
export const CATALOG: CatalogModel[] = (() => {
  const cfg = Schema.parse(parse(modelsYaml));
  return cfg.models
    .filter((m) => m.apiModel !== 'REPLACE_ME')
    .map((m) => ({
      id: m.id,
      displayName: m.displayName,
      provider: m.provider,
      apiModel: m.apiModel,
      temperature: m.temperature === undefined ? cfg.defaults.temperature : m.temperature,
    }));
})();

export const PROVIDER_LABEL: Record<Provider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
};

export const KEY_HELP: Record<Provider, string> = {
  anthropic: 'console.anthropic.com → API keys',
  openai: 'platform.openai.com → API keys',
  google: 'aistudio.google.com → Get API key',
};
