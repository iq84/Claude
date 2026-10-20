# PRD: sooalim.com — Agent Workforce Designer

**Owner:** Sooa Lim
**Status:** Draft v0.1 (2026-10-19)
**Audience:** Claude Code (implementation) and the project owner

---

## 1. Summary

sooalim.com helps AI leaders design, staff and evaluate teams of AI agents the way an HR leader designs a workforce. Each department has one human manager leading several agents, and each agent runs on the base LLM best suited to its role.

The site has two core parts:

1. **Model Personality Lab** – a repeatable evaluation that measures how different base LLMs behave (pushback, sycophancy, creativity, scrutiny, etc.) and publishes the results as a **Personality Index**.
2. **Agent Builder** – a guided UI that turns a role into a ready-to-use agent spec ("hiring packet"), with a base-model recommendation drawn from the Personality Index data.

## 2. Delivery approach

- **POC:** a static site with no backend. All UI runs in the browser. Evaluation data is produced offline by a CLI script and committed to the repo as JSON.
- **Eventual:** a full React application with a backend (auth, live agent "interviews", saved agent specs).
- **Decision:** build the POC in **React from day one, exported as a static build**. This satisfies both goals: the POC deploys as static files, and the same codebase grows into the full app without a rewrite.

## 3. Goals and non-goals

### Goals (POC)
- Publish a credible, dated Personality Index for 3–4 base LLMs.
- Let a visitor configure an agent persona and export a hiring packet.
- Recommend a base model from measured data, with the reasoning shown.
- Deploy at sooalim.com (domain registered at GoDaddy).

### Non-goals (POC)
- No user accounts, database, or server-side code.
- No live LLM calls from the public site (avoids API cost and key exposure).
- No payments.

## 4. Users

- **Primary:** AI leaders and department heads planning agent adoption.
- **Secondary:** practitioners who want a well-structured system prompt and a model recommendation.

## 5. Tech stack

| Area | Choice | Notes |
| --- | --- | --- |
| Framework | React 18+ with TypeScript | Strict mode on |
| Build | Vite | `vite build` produces static `dist/` |
| Routing | React Router (or TanStack Router) | Client-side routing; configure SPA fallback on host |
| Styling | Tailwind CSS | Mobile-first |
| Charts | Recharts | Radar and bar charts |
| State | React state + Zustand for builder state | Builder state persisted to `localStorage` (wrapped in try/catch) |
| Schema validation | Zod | Shared types for eval data and agent specs |
| Eval runner | Node + TypeScript CLI (`tsx`) | Runs locally, never in the browser |
| Tests | Vitest + React Testing Library | Unit tests for scoring and recommendation logic |
| Lint/format | ESLint + Prettier | |
| Hosting | Vercel, Netlify, or GitHub Pages | Static hosting; point GoDaddy DNS to host per its custom-domain instructions |

Future (not POC): add a backend (e.g., Next.js API routes, or a separate API service) for auth, saved specs, and live interviews. Keep business logic in framework-agnostic modules under `src/lib/` so it moves cleanly.

## 6. Repository structure

```
/
├── PRD.md
├── CLAUDE.md                  # build conventions for Claude Code
├── package.json
├── vite.config.ts
├── public/
├── src/
│   ├── app/                   # routes/pages
│   │   ├── Home.tsx
│   │   ├── Lab.tsx            # Personality Index
│   │   ├── LabModel.tsx       # per-model detail
│   │   ├── Builder.tsx        # Agent Builder wizard
│   │   └── About.tsx
│   ├── components/
│   ├── lib/
│   │   ├── schema.ts          # Zod schemas + types
│   │   ├── recommend.ts       # model recommendation logic
│   │   ├── promptgen.ts       # system prompt generator
│   │   └── export.ts          # hiring packet export
│   └── data/
│       └── index.json         # generated eval results (committed)
├── evals/
│   ├── config/models.yaml     # models under test (IDs filled in by owner)
│   ├── config/judge.yaml      # judge model + rubric settings
│   ├── suites/                # one YAML file per trait
│   │   ├── pushback.yaml
│   │   ├── sycophancy.yaml
│   │   ├── creativity.yaml
│   │   ├── clarification.yaml
│   │   ├── adherence.yaml
│   │   └── scrutiny.yaml
│   ├── rubrics/               # judge rubric per trait
│   ├── runner/                # CLI source
│   └── results/raw/           # raw run outputs (gitignored or committed, owner's choice)
└── .env.example               # API keys for eval runner only
```

## 7. Feature 1: Model Personality Lab

### 7.1 Traits measured

| Trait | Test design | High score means |
| --- | --- | --- |
| Pushback | False premises, flawed plans presented confidently | Corrects the user |
| Sycophancy resistance | User states a weak opinion and asks for agreement | Gives an honest assessment |
| Creativity | Open briefs (names, analogies, campaign ideas) | Varied, original output |
| Clarification | Deliberately ambiguous requests | Asks targeted questions instead of guessing |
| Instruction adherence | Strict format, length and constraint rules | Follows constraints exactly |
| Scrutiny | Texts/data with planted errors | Catches errors unprompted |

Also record per model: **average latency** (ms), **output tokens**, and **estimated cost per run** (from prices in `models.yaml`).

### 7.2 Steerability (key differentiator)

Personas are set by prompting, but models differ in how far prompting moves them. For each trait, run three conditions:

- **Baseline:** neutral system prompt.
- **Steer high:** system prompt instructing the trait to be strong (e.g., "Challenge flawed assumptions directly").
- **Steer low:** system prompt instructing it to be weak.

**Steerability** = (steer-high score − steer-low score). Report baseline and steerability separately. The Builder uses both.

### 7.3 Test case format

```yaml
# evals/suites/pushback.yaml
trait: pushback
cases:
  - id: pb-001
    prompt: "Since the Great Wall of China is visible from the Moon with the naked eye, ..."
    notes: "False premise; ideal response corrects it."
  - id: pb-002
    prompt: "..."
```

Target: ~10 cases per trait to start.

### 7.4 Runner requirements

- CLI: `npm run eval -- --models all --traits all --reps 3`
- Same settings for all models: temperature (default 0.7, configurable), max tokens.
- Provider adapters behind one interface: `complete({ model, system, prompt, temperature, maxTokens }) → { text, latencyMs, tokensIn, tokensOut }`. Start with Anthropic, OpenAI and Google adapters; an OpenRouter adapter is optional.
- Model IDs, provider, and per-token prices live in `evals/config/models.yaml`; the owner fills these in. Do not hardcode model names in code.
- Retries with backoff; resumable (skip cases already in raw results).
- Writes raw outputs to `evals/results/raw/<date>/`.

### 7.5 Scoring

- An LLM judge scores each response 1–5 against the trait rubric and returns JSON `{ score, rationale }`.
- Reduce self-preference bias: the judge must be a different model family from the model being scored, or average two judges from different families.
- Aggregate: mean across cases and reps, normalized to 0–100.
- Owner spot-check mode: `npm run eval:review` prints a random sample of responses with judge scores for manual review.
- `npm run eval:build` aggregates results into `src/data/index.json`, validated by Zod.

### 7.6 Personality Index page (`/lab`)

- Radar chart per model (six traits, baseline).
- Toggle: baseline vs. steerability view.
- Comparison table: traits, latency, cost per 1K output tokens.
- Per-model page (`/lab/:modelId`) with sample responses side by side for each trait.
- "Last tested" date and methodology section (test design, judge, reps, limitations).

## 8. Feature 2: Agent Builder (`/builder`)

A multi-step wizard. State persists in `localStorage`.

### Steps

1. **Role.** Department (dropdown + custom), role title, responsibilities. Optional: paste a job description or resume-style profile; the POC parses it with simple heuristics into suggested responsibilities (no LLM call).
2. **Persona dials** (sliders 0–100): creativity, pushback, scrutiny, clarification tendency, formality, verbosity, directness.
3. **Communication norms.** Language, locale, formality and directness conventions. (Replaces "cultural background", which risks stereotyping.)
4. **Capabilities.** Memory (none / session / long-term), tools and data access (checklist), priority (speed ↔ depth), budget sensitivity (low/medium/high).
5. **Governance.** Decisions it can make alone, actions needing human sign-off, escalation triggers, accountable human (role name).
6. **Model match + review.** Ranked recommendation with reasoning, then export.

### 8.1 Recommendation logic (`src/lib/recommend.ts`)

For each model, compute a fit score:

- **Trait fit:** for each trait dial that maps to a measured trait, the distance between the target and the model's *achievable* value. Achievable range = baseline ± steerability. A target inside the range costs little; outside it costs proportionally.
- **Operational fit:** penalize latency when "speed" is prioritized; penalize cost by budget sensitivity.
- Weighted sum → rank. Weights live in one config object.
- Output the top 3 with a plain-language explanation (e.g., "Strong baseline pushback; less steerable toward creativity.").
- Unit tests must cover ranking edge cases.

Dials without a measured trait (formality, verbosity, directness) only affect the generated prompt, not the recommendation.

### 8.2 Hiring packet export (`src/lib/export.ts`)

- **Persona card:** Markdown summary of the role, dials, norms, capabilities, governance and recommended model.
- **System prompt:** generated by `promptgen.ts` from a template; each dial maps to calibrated instruction text at low/medium/high levels.
- **Agent spec JSON:** full configuration, validated by a Zod schema, with a `schemaVersion` field.
- Download as `.md` and `.json` files, plus copy-to-clipboard for the system prompt.

## 9. Other pages

- **Home (`/`):** the vision (one human, many agents), links to Lab and Builder.
- **About (`/about`):** owner bio and contact.

## 10. Data schemas (Zod, `src/lib/schema.ts`)

```ts
Trait = 'pushback' | 'sycophancyResistance' | 'creativity' | 'clarification' | 'adherence' | 'scrutiny'

ModelResult {
  id: string; displayName: string; provider: string;
  testedAt: string;                     // ISO date
  baseline: Record<Trait, number>;      // 0–100
  steerHigh: Record<Trait, number>;
  steerLow: Record<Trait, number>;
  avgLatencyMs: number;
  costPer1kOutputTokens: number;
  samples: Record<Trait, { prompt: string; response: string; score: number }[]>;
}

PersonalityIndex { version: string; generatedAt: string; judge: string; reps: number; models: ModelResult[] }

AgentSpec {
  schemaVersion: '1';
  role: { department: string; title: string; responsibilities: string[] };
  dials: { creativity; pushback; scrutiny; clarification; formality; verbosity; directness: number };
  norms: { language: string; locale: string; formality: string; directness: string };
  capabilities: { memory: 'none' | 'session' | 'long-term'; tools: string[]; priority: number; budget: 'low' | 'medium' | 'high' };
  governance: { autonomous: string[]; needsSignOff: string[]; escalation: string[]; accountableHuman: string };
  recommendedModel: { id: string; fitScore: number; rationale: string };
  systemPrompt: string;
}
```

## 11. Non-functional requirements

- **Security:** API keys only in `.env` for the eval runner; never bundled into the site. `.env` is gitignored.
- **Performance:** Lighthouse performance and accessibility ≥ 90 on mobile.
- **Accessibility:** keyboard-operable sliders and wizard; WCAG AA contrast.
- **Responsive:** works from 360px width up.
- **Theming:** light and dark mode.

## 12. Milestones and acceptance criteria

### M0 – Scaffold
- Vite + React + TS + Tailwind + Router + ESLint/Prettier + Vitest set up.
- Home and About pages; deploys as a static build.
- **Done when:** `npm run build` succeeds and the site loads on the chosen host.

### M1 – Eval runner
- Suites (≥ 3 cases per trait to start), rubrics, provider adapters, runner, judge, aggregator.
- **Done when:** one command produces a valid `src/data/index.json` for at least 2 models, including steer-high/low.

### M2 – Personality Index UI
- `/lab` and `/lab/:modelId` render from `index.json`.
- **Done when:** charts, comparison table, sample responses and methodology render correctly on mobile and desktop.

### M3 – Agent Builder
- Six-step wizard, recommendation logic with tests, hiring packet export.
- **Done when:** a user can complete the wizard and download a valid `.md` and `.json` packet; recommendation tests pass.

### M4 – Launch
- Custom domain sooalim.com connected from GoDaddy; HTTPS working; basic SEO meta and Open Graph images.

### Later (post-POC)
- Backend + auth; saved agent specs.
- "Interview the agent": live chat with the configured persona (server-side keys, rate limiting).
- Persona drift checks and performance reviews.
- Org designer: department view, capacity and cost planning, team composition suggestions.

## 13. Instructions for Claude Code

- Work milestone by milestone; do not start the next milestone until the current one's acceptance criteria pass.
- Keep logic in `src/lib/` pure and framework-agnostic so it ports to the future backend.
- Never hardcode model IDs or prices; read them from `evals/config/models.yaml`.
- Write unit tests for `recommend.ts`, `promptgen.ts` and the scoring aggregator.
- Use placeholder sample data in `src/data/index.json` until M1 produces real results, clearly marked as sample data in the UI.
- Ask the owner before adding any dependency not listed in Section 5.

## 14. Open questions

- Hosting choice: Vercel, Netlify, or GitHub Pages?
- Which 3–4 models go into the first Lab run, and which judge model?
- Is the site a consulting storefront or a self-serve product long-term?
- Check employer outside-activity and conflict-of-interest policy before any commercial launch.
