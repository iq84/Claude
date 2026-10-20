// npm run eval -- --models all --traits all --reps 3 [--date YYYY-MM-DD] [--concurrency 4]
//                 [--mock] [--dry-run] [--no-build] [--out path]
import path from 'node:path';
import { TRAITS, type Trait } from '../../src/lib/schema';
import { assertNoPlaceholders, loadConfig, type JudgeConfig, type ModelConfig } from './config';
import { buildJudgePrompt, JUDGE_SYSTEM, parseJudgeOutput, pickJudges } from './judge';
import { buildAndWrite, DEFAULT_INDEX_OUT, loadRun, MOCK_INDEX_OUT } from './pipeline';
import { providerRegistry } from './providers';
import {
  CONDITIONS,
  judgmentKey,
  responseKey,
  type Condition,
  type JudgmentRecord,
  type ResponseRecord,
} from './types';
import { appendJsonl, loadDotEnv, parseArgs, resultsDir, runPool, today, withRetry } from './util';

function select<T>(arg: string | true | undefined, all: T[], idOf: (t: T) => string, what: string) {
  if (arg === undefined || arg === true || arg === 'all') return all;
  const wanted = arg.split(',').map((s) => s.trim());
  const unknown = wanted.filter((w) => !all.some((t) => idOf(t) === w));
  if (unknown.length) throw new Error(`Unknown ${what}: ${unknown.join(', ')}`);
  return all.filter((t) => wanted.includes(idOf(t)));
}

async function main() {
  loadDotEnv();
  const args = parseArgs(process.argv.slice(2));
  const mock = args.mock === true;
  const dryRun = args['dry-run'] === true;
  const reps = Number(args.reps ?? 3);
  const concurrency = Number(args.concurrency ?? 4);
  const date = typeof args.date === 'string' ? args.date : today();
  if (!Number.isInteger(reps) || reps < 1) throw new Error('--reps must be a positive integer');

  const cfg = loadConfig();
  const models = select(args.models, cfg.models.models, (m) => m.id, 'model');
  const traits = select(args.traits, [...TRAITS], (t) => t, 'trait') as Trait[];
  const suites = cfg.suites.filter((s) => traits.includes(s.trait));
  const judgesUsed = [
    ...new Set(
      models.flatMap((m) => pickJudges(cfg.judge.judges, m.family, cfg.judge.perResponse)),
    ),
  ];
  if (!mock) assertNoPlaceholders([...models, ...judgesUsed]);

  const dir = resultsDir(mock, date);
  const responsesFile = path.join(dir, 'responses.jsonl');
  const judgmentsFile = path.join(dir, 'judgments.jsonl');
  const existing = loadRun(dir);
  const done = new Set(existing.responses.map((r) => r.key));
  const judged = new Set(existing.judgments.map((j) => j.key));

  // Plan model calls, skipping anything already in this run's raw results (resumable).
  type Task = {
    model: ModelConfig;
    trait: Trait;
    caseId: string;
    prompt: string;
    system: string;
    condition: Condition;
    rep: number;
  };
  const tasks: Task[] = [];
  for (const model of models)
    for (const suite of suites)
      for (const c of suite.cases)
        for (const condition of CONDITIONS)
          for (let rep = 0; rep < reps; rep++) {
            const t = { model, trait: suite.trait, caseId: c.id, prompt: c.prompt, condition, rep };
            if (done.has(responseKey({ ...t, modelId: model.id }))) continue;
            const system =
              condition === 'baseline'
                ? cfg.models.defaults.baselineSystem
                : condition === 'steerHigh'
                  ? suite.steer.high
                  : suite.steer.low;
            tasks.push({ ...t, system });
          }

  const totalResponses =
    models.length * suites.reduce((n, s) => n + s.cases.length, 0) * CONDITIONS.length * reps;
  const judgeCalls = totalResponses * cfg.judge.perResponse;
  console.log(
    `Run ${date}${mock ? ' (MOCK)' : ''}: ${models.length} models × ${suites.length} traits × ` +
      `${CONDITIONS.length} conditions × ${reps} reps = ${totalResponses} responses, ` +
      `${judgeCalls} judge calls. Already done: ${totalResponses - tasks.length} responses.`,
  );
  if (dryRun) {
    // Rough planning numbers only: ~200 tokens in / ~800 out per answer, ~1,200 in / ~400 out per judgment.
    const avgJudge = (p: 'input' | 'output') =>
      judgesUsed.reduce((s, j) => s + j.pricePer1M[p], 0) / Math.max(1, judgesUsed.length);
    const perModel = models.map((m) => {
      const n = totalResponses / models.length;
      return (n * (200 * m.pricePer1M.input + 800 * m.pricePer1M.output)) / 1e6;
    });
    const judging = (judgeCalls * (1200 * avgJudge('input') + 400 * avgJudge('output'))) / 1e6;
    models.forEach((m, i) => console.log(`  ${m.id}: ~$${perModel[i]!.toFixed(2)}`));
    console.log(`  judging: ~$${judging.toFixed(2)}`);
    console.log(
      `  total: ~$${(perModel.reduce((a, b) => a + b, 0) + judging).toFixed(2)} (rough estimate)`,
    );
    return;
  }

  const provider = providerRegistry({ mock, suites: cfg.suites });
  const { temperature: defaultTemp, maxTokens } = cfg.models.defaults;
  let failures = 0;
  let completed = 0;

  await runPool(tasks, concurrency, async (t) => {
    try {
      const res = await withRetry(() =>
        provider(t.model.provider)({
          model: t.model.apiModel,
          system: t.system,
          prompt: t.prompt,
          temperature: t.model.temperature === undefined ? defaultTemp : t.model.temperature,
          maxTokens,
          effort: t.model.effort,
        }),
      );
      const rec: ResponseRecord = {
        key: responseKey({ ...t, modelId: t.model.id }),
        modelId: t.model.id,
        trait: t.trait,
        caseId: t.caseId,
        condition: t.condition,
        rep: t.rep,
        at: new Date().toISOString(),
        ...res,
      };
      appendJsonl(responsesFile, rec);
      if (++completed % 25 === 0) console.log(`  responses: ${completed}/${tasks.length}`);
    } catch (err) {
      failures++;
      console.error(
        `✗ ${t.model.id} ${t.caseId} ${t.condition} rep ${t.rep}: ${(err as Error).message}`,
      );
    }
  });

  // Judge every response from this run's selection that is missing a judgment.
  const casesById = new Map(cfg.suites.flatMap((s) => s.cases.map((c) => [c.id, c])));
  const selected = new Set(models.map((m) => m.id));
  const responses = loadRun(dir).responses.filter(
    (r) => selected.has(r.modelId) && traits.includes(r.trait) && r.rep < reps,
  );
  const jobs: { r: ResponseRecord; judge: JudgeConfig }[] = [];
  for (const r of responses) {
    const model = models.find((m) => m.id === r.modelId)!;
    for (const judge of pickJudges(cfg.judge.judges, model.family, cfg.judge.perResponse))
      if (!judged.has(judgmentKey(r.key, judge.id))) jobs.push({ r, judge });
  }
  console.log(`Judging ${jobs.length} responses…`);
  completed = 0;

  await runPool(jobs, concurrency, async ({ r, judge }) => {
    const c = casesById.get(r.caseId)!;
    try {
      const { parsed, res } = await withRetry(async () => {
        const res = await provider(judge.provider)({
          model: judge.apiModel,
          system: JUDGE_SYSTEM,
          prompt: buildJudgePrompt({
            rubric: cfg.rubrics[r.trait],
            notes: c.notes,
            prompt: c.prompt,
            response: r.text,
          }),
          temperature: judge.temperature === undefined ? cfg.judge.temperature : judge.temperature,
          maxTokens: cfg.judge.maxTokens,
          effort: judge.effort,
        });
        return { parsed: parseJudgeOutput(res.text), res };
      });
      const rec: JudgmentRecord = {
        key: judgmentKey(r.key, judge.id),
        responseKey: r.key,
        judgeId: judge.id,
        score: parsed.score,
        rationale: parsed.rationale,
        tokensIn: res.tokensIn,
        tokensOut: res.tokensOut,
        at: new Date().toISOString(),
      };
      appendJsonl(judgmentsFile, rec);
      if (++completed % 50 === 0) console.log(`  judgments: ${completed}/${jobs.length}`);
    } catch (err) {
      failures++;
      console.error(`✗ judge ${judge.id} on ${r.key}: ${(err as Error).message}`);
    }
  });

  // Report spend for this run directory.
  const run = loadRun(dir);
  const price = new Map<string, { input: number; output: number }>([
    ...cfg.models.models.map((m) => [m.id, m.pricePer1M] as const),
    ...cfg.judge.judges.map((j) => [j.id, j.pricePer1M] as const),
  ]);
  const cost = (id: string, i: number, o: number) => {
    const p = price.get(id);
    return p ? (i * p.input + o * p.output) / 1e6 : 0;
  };
  const modelCost = run.responses.reduce((s, r) => s + cost(r.modelId, r.tokensIn, r.tokensOut), 0);
  const judgeCost = run.judgments.reduce((s, j) => s + cost(j.judgeId, j.tokensIn, j.tokensOut), 0);
  console.log(
    `Estimated spend for ${date}: models $${modelCost.toFixed(2)}, judges $${judgeCost.toFixed(2)}` +
      (mock ? ' (mock: no real spend)' : ''),
  );

  if (args['no-build'] !== true) {
    const out =
      typeof args.out === 'string'
        ? path.resolve(args.out)
        : mock
          ? MOCK_INDEX_OUT
          : DEFAULT_INDEX_OUT;
    buildAndWrite(cfg, dir, out, mock);
  }
  if (failures) {
    console.error(`${failures} calls failed. Re-run the same command to retry just those.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
