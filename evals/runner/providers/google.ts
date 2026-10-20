import { GoogleGenAI } from '@google/genai';
import type { Complete } from '../types';

export function createGoogle(): Complete {
  const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Set GOOGLE_API_KEY in .env to run Google models.');
  const ai = new GoogleGenAI({ apiKey });
  return async ({ model, system, prompt, temperature, maxTokens }) => {
    const start = performance.now();
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: maxTokens,
        ...(temperature != null && { temperature }),
      },
    });
    const usage = res.usageMetadata;
    return {
      text: res.text ?? '',
      latencyMs: Math.round(performance.now() - start),
      tokensIn: usage?.promptTokenCount ?? 0,
      // Thinking tokens are billed as output, as they are on the other providers.
      tokensOut: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
      stopReason: res.candidates?.[0]?.finishReason ?? undefined,
    };
  };
}
