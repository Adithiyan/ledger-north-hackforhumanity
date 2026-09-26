# CLAUDE.md — Ledger North

Read `SPEC.md` first. It is the source of truth for scope, data model, and acceptance criteria.

## Context
- Hackathon MVP. Code freeze 3:30 PM. Prefer small, safe changes that keep the demo path working.
- React 18 + Vite rebuild of the working prototype. The prototype (`public/prototype/index.html`) is the reference for behaviour, copy and styling — port from it, do not redesign.
- No UI libraries, no router, no state libraries. Plain CSS in `src/styles.css`.
- All persistence goes through `src/store/store.js` (localStorage + `storage` event). Views never touch localStorage directly.
- Deployed to GitHub Pages by GitHub Actions; `vite.config.js` sets `base` to the repo name.

## Rules
- Follow the build-plan order in SPEC §14; demo priority is photo → offline sync → find a part → plan/report.
- Do not add features outside SPEC §4 "In the MVP" unless asked.
- Keep the append-only event model (SPEC §6). Do not edit or delete events, except request `status` as documented.
- Never commit API keys. The Gemini key is entered in the app and stored only in the browser's localStorage.
- Never machine-translate Inuktitut. Leave the Inuktitut option disabled.
- Keep sample data clearly labelled as sample in UI text.
- Accessibility is a judging criterion: keep ≥ 44 px targets, labels, visible focus, status text not colour alone, `aria-live` on status messages.
- $0 constraint: only free services (Google Fonts, Open-Meteo, Gemini free tier, optional Firebase free plan).

## Commands
- `npm install`, `npm run dev` (local), `npm run build` (must pass before every push).

## How to test
- Open `http://localhost:5173/?as=Inukjuak` and `http://localhost:5173/?as=region` in two tabs.
- Walk through SPEC §15 test checklist after each change.
- Use "Reset demo data" (Snap ledger → Settings) to return to the seeded state (Inukjuak 4 of 6).

## Working style
- Before editing, state which SPEC section and acceptance criterion the change serves.
- After editing, run the relevant checklist items and report results.
- Commit after each working step with a clear message; push so GitHub Pages redeploys.
