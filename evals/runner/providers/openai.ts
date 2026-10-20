import OpenAI from 'openai';
import type { Complete } from '../types';

export function createOpenAI(): Complete {
  const client = new OpenAI({ maxRetries: 0 });
  return async ({ model, system, prompt, temperature, maxTokens }) => {
    const start = performance.now();
    const res = await client.responses.create({
      model,
      instructions: system,
      input: prompt,
      max_output_tokens: maxTokens,
      ...(temperature != null && { temperature }),
    });
    return {
      text: res.output_text,
      latencyMs: Math.round(performance.now() - start),
      tokensIn: res.usage?.input_tokens ?? 0,
      tokensOut: res.usage?.output_tokens ?? 0,
      stopReason: res.incomplete_details?.reason ?? res.status ?? undefined,
    };
  };
}
