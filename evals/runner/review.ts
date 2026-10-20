// npm run eval:review -- [--n 10] [--date YYYY-MM-DD] [--mock] [--model id] [--trait name]
// Prints a random sample of responses with their judge scores for manual spot-checking.
import { loadConfig } from './config';
import { loadRun } from './pipeline';
import { latestRunDate, parseArgs, resultsDir } from './util';

try {
  const args = parseArgs(process.argv.slice(2));
  const mock = args.mock === true;
  const date = typeof args.date === 'string' ? args.date : latestRunDate(mock);
  if (!date) throw new Error('No eval runs found. Run `npm run eval` first.');
  const n = Number(args.n ?? 10);
  const cfg = loadConfig();
  const cases = new Map(cfg.suites.flatMap((s) => s.cases.map((c) => [c.id, c])));
  const { responses, judgments } = loadRun(resultsDir(mock, date));

  const pool = responses.filter(
    (r) =>
      (typeof args.model !== 'string' || r.modelId === args.model) &&
      (typeof args.trait !== 'string' || r.trait === args.trait),
  );
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  for (const r of pool.slice(0, n)) {
    const c = cases.get(r.caseId);
    const text = r.text.length > 800 ? r.text.slice(0, 800) + ' …[truncated]' : r.text;
    console.log('─'.repeat(80));
    console.log(
      `${r.modelId} · ${r.trait} · ${r.caseId} · ${r.condition} · rep ${r.rep} · stop: ${r.stopReason ?? '?'}`,
    );
    console.log(`\nPROMPT: ${c?.prompt}\nNOTES:  ${c?.notes}\n\nRESPONSE:\n${text}\n`);
    const js = judgments.filter((j) => j.responseKey === r.key);
    if (js.length === 0) console.log('  (not judged yet)');
    for (const j of js) console.log(`  ${j.judgeId}: ${j.score}/5 — ${j.rationale}`);
  }
  console.log('─'.repeat(80));
  console.log(`Showing ${Math.min(n, pool.length)} of ${pool.length} responses from ${date}.`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}
