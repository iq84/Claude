import type { Suite } from '../config';
import type { Complete } from '../types';
import { createAnthropic } from './anthropic';
import { createGoogle } from './google';
import { createMock } from './mock';
import { createOpenAI } from './openai';

type ProviderName = 'anthropic' | 'openai' | 'google';

/** Returns a lazily-initialised adapter per provider, so unused providers need no API key. */
export function providerRegistry(opts: { mock: boolean; suites: Suite[] }) {
  const cache = new Map<ProviderName, Complete>();
  const mock = opts.mock ? createMock(opts.suites) : undefined;
  return (provider: ProviderName): Complete => {
    if (mock) return mock;
    let c = cache.get(provider);
    if (!c) {
      c = { anthropic: createAnthropic, openai: createOpenAI, google: createGoogle }[provider]();
      cache.set(provider, c);
    }
    return c;
  };
}
