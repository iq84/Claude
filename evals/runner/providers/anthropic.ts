import Anthropic from '@anthropic-ai/sdk';
import type { Complete } from '../types';

export function createAnthropic(): Complete {
  // Retries are handled by withRetry so every provider backs off the same way.
  const client = new Anthropic({ maxRetries: 0 });
  return async ({ model, system, prompt, temperature, maxTokens, effort }) => {
    const start = performance.now();
    // No refusal fallback on purpose: a fallback model would contaminate the measurement.
    // Refusals are recorded via stopReason instead.
    const res = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
      ...(temperature != null && { temperature }),
      ...(effort && { output_config: { effort } }),
    });
    return {
      text: res.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join(''),
      latencyMs: Math.round(performance.now() - start),
      tokensIn: res.usage.input_tokens,
      tokensOut: res.usage.output_tokens,
      stopReason: res.stop_reason ?? undefined,
    };
  };
}
