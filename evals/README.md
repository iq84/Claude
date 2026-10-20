# Model Personality Lab: eval runner

Measures how base LLMs behave on six traits (pushback, sycophancy resistance, creativity,
clarification, instruction adherence, scrutiny), with and without steering, and writes the
Personality Index to `src/data/index.json`. Runs locally only; nothing here ships to the site.

## Setup (one time)

1. Copy `.env.example` to `.env` and add `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `GOOGLE_API_KEY`.
2. In `evals/config/models.yaml` and `evals/config/judge.yaml`, replace every `REPLACE_ME` with the
   provider's exact model ID, and check the prices against each provider's pricing page.
   The runner refuses to call any API while a placeholder remains.

## Commands

```bash
npm run eval -- --dry-run                    # plan + rough cost estimate, no API calls
npm run eval -- --models all --traits all --reps 3
npm run eval:review -- --n 10                # spot-check random responses with judge scores
npm run eval:build                           # re-aggregate the latest run into src/data/index.json
```

Useful flags for `eval`: `--models claude-sonnet-5-5,gpt-6-1-sol`, `--traits pushback,scrutiny`,
`--date 2026-10-20` (resume or extend a specific run), `--concurrency 4`, `--no-build`.

Add `--mock` to any command to exercise the whole pipeline with a fake provider: no keys, no cost.
Mock output goes to `evals/results/mock/` (gitignored) and is marked as sample data.

## How a run works

1. **Responses.** Every case runs under three system prompts: a neutral baseline, steer-high and
   steer-low (from each suite file). Results append to `evals/results/raw/<date>/responses.jsonl`.
2. **Judging.** Each response is scored 1–5 against `rubrics/<trait>.md` by the
   `perResponse` judges whose family differs from the model's (`judge.yaml`). Judges never see the
   system prompt, so they can't tell which condition they're scoring.
3. **Aggregation.** Judge scores are averaged per response, then across cases and reps, and mapped
   to 0–100. Steerability is `steerHigh − steerLow`.

Runs are resumable: re-running the same command for the same date skips completed calls, so a crash
or rate limit only costs a re-run. Calls retry with backoff (2s, 4s, 8s).

## Methodology notes

- **Sampling:** temperature 0.7 by default, but Claude Opus 5.5 and Sonnet 5.5 reject custom
  temperature, so they run at their default (`temperature: null`). This is recorded per model.
- **Reasoning:** Claude models run at a fixed `effort` (set in `models.yaml`) so runs are comparable.
- **Refusals** are recorded as-is (`stopReason`), with no fallback to another model, and judged as
  given.
- **Cost:** judging is most of the spend. Run `--dry-run` first.

Raw results under `evals/results/raw/` are committed by default so published numbers can be traced
to the responses behind them. Add `evals/results/raw` to `.gitignore` if you'd rather not.
