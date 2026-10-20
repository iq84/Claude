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

Deployed on Vercel; see [`docs/DEPLOY.md`](./docs/DEPLOY.md) for setup and the GoDaddy DNS steps.

## Status

- [x] M0 – Scaffold (Vite + React + TS + Tailwind + Router + ESLint/Prettier + Vitest; Home and About)
- [ ] M1 – Eval runner
- [ ] M2 – Personality Index UI
- [ ] M3 – Agent Builder
- [ ] M4 – Launch on sooalim.com
