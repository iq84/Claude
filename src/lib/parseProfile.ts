const BULLET = /^\s*(?:[-*•▪◦–]|\d+[.)])\s+/;
/** Section headings whose bullets are not responsibilities. */
const SKIP_SECTION =
  /^(?:requirements|qualifications|skills|education|benefits|perks|who you are|what we offer|about (?:us|the company)|nice to have)\b/i;
/** Section headings that start (or resume) responsibilities. */
const KEEP_SECTION =
  /^(?:responsibilities|duties|what you(?:'|’)ll do|the role|your role|key tasks|experience)\b/i;

/**
 * Pulls likely responsibilities out of a pasted job description or resume-style profile.
 * Heuristic only (no LLM): prefers bullet lines outside requirement/benefit sections, falls back
 * to sentences; skips very short or very long fragments.
 */
export function suggestResponsibilities(text: string, max = 10): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const bulleted: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (BULLET.test(line)) {
      if (!skipping) bulleted.push(line.replace(BULLET, ''));
    } else if (SKIP_SECTION.test(line)) {
      skipping = true;
    } else if (KEEP_SECTION.test(line)) {
      skipping = false;
    }
  }
  const candidates = bulleted.length
    ? bulleted
    : text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim());

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of candidates) {
    const item = raw.replace(/[.;,\s]+$/, '').replace(/^\w/, (c) => c.toUpperCase());
    const words = item.split(/\s+/).length;
    if (words < 3 || item.length > 160 || item.endsWith(':')) continue;
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}
