# CLAUDE.md

Build conventions for sooalim.com. The product spec is `PRD.md`; read it first.

## Commands

- `npm run dev` – local dev server
- `npm run build` – typecheck + static build to `dist/`
- `npm run lint` / `npm run format` / `npm run format:check`
- `npm test` – Vitest (jsdom + React Testing Library)

Run `npm run lint && npm test && npm run build` before every commit.

## Rules

- Work milestone by milestone (PRD §12). Don't start the next milestone until the current one's
  acceptance criteria pass.
- `src/lib/` holds pure, framework-agnostic logic (no React imports) so it can move to a backend later.
- Never hardcode model IDs or prices in code; they live in `evals/config/models.yaml`.
- Unit-test `recommend.ts`, `promptgen.ts` and the scoring aggregator.
- Until real eval results exist, `src/data/index.json` holds placeholder data that the UI must label
  clearly as sample data.
- API keys live only in `.env` for the eval runner. Nothing under `src/` may read them.
- Exception, by design: the Playground (`/playground`) takes the _visitor's own_ key, keeps it in
  sessionStorage (localStorage only if they tick "remember") and sends it only to that provider from
  the browser. Never ship a key of ours in the bundle, and keep provider SDKs lazy-loaded.
- Wrap every `localStorage` access in try/catch; the site must work without storage.
- Ask the owner before adding any dependency not listed in PRD §5.

## Styling

- Tailwind v4, mobile-first, must work from 360px wide.
- Use the theme tokens in `src/index.css` (`bg`, `surface`, `fg`, `muted`, `border`, `accent`) rather
  than raw colours, so light and dark mode stay in sync.
- Interactive elements need visible focus states and WCAG AA contrast.

## Routing

Client-side routing via React Router (`BrowserRouter`). The static host must serve `index.html` for
unknown paths (SPA fallback); `vercel.json` does this on Vercel. Deploy steps: `docs/DEPLOY.md`.
