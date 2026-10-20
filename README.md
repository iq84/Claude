# sooalim.com — Agent Workforce Designer

Design, staff and evaluate teams of AI agents the way an HR leader designs a workforce.
See [`PRD.md`](./PRD.md) for the full spec and [`CLAUDE.md`](./CLAUDE.md) for build conventions.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # static output in dist/
```

Hosted free on GitHub Pages at [sooalim.com](https://sooalim.com); every push to `main` deploys via
`.github/workflows/deploy.yml`. See [`docs/DEPLOY.md`](./docs/DEPLOY.md) for setup and the GoDaddy DNS steps.

## Status

- [x] M0 – Scaffold (Vite + React + TS + Tailwind + Router + ESLint/Prettier + Vitest; Home and About)
- [x] M1 – Eval runner (built and tested with the mock provider; first real run pending API keys and model IDs, see [`evals/README.md`](./evals/README.md))
- [x] M2 – Personality Index UI (`/lab`, `/lab/:modelId`; showing labelled sample data until the first real run)
- [x] M3 – Agent Builder (`/builder`: six-step wizard, recommendations from Lab data, `.md` + `.json` hiring packet)
- [x] Playground (`/playground`): load an agent and chat with it or give it work, on any base model,
      with your own API key (calls go straight from the browser to the provider)
- [x] M4 – Launch prep: GitHub Pages workflow, SPA fallback, page titles, SEO/Open Graph tags, sitemap
- [ ] M4 – Go live: enable Pages and point sooalim.com DNS at GitHub (owner steps in `docs/DEPLOY.md`)
