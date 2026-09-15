# Poker Assistant

A mobile-first web app for **live poker decision support** and **buy-in tracking**.
React + Vite + Tailwind, no backend — everything persists in local storage.

## Features

### 🎯 In-Hand Decision Analyzer (core)

Minimal-input flow for use between actions at the table:

- **Fast card picker** — suit tab + rank grid, large touch targets, no typing.
- **Real equity** — Monte Carlo simulation over the remaining deck with an exact
  7-card hand evaluator (not hand-rolled probability math). Runs in a Web Worker
  so the UI never freezes; equity updates instantly as you enter cards/numbers.
- **Opponent assumptions are explicit** — equity is computed vs a _random hand_,
  a _loose_ or _tight_ estimated range (Chen-formula thresholds, with the % of
  hands shown), or a specific villain's cards if you know them. The app makes
  clear this is an assumption, not the villain's real cards.
- **Pot odds** — required equity to call = `call / (pot + call)`, shown with the math.
- **Call / fold signal** — e.g. _"Fold — you need 33.3% equity, you have 21.0%"_,
  plus the EV of calling in chips. Never a bare verdict.
- **Multiple opponents** — bump the opponent count so equity and pot stay accurate;
  no need to enter their cards.
- **Raise / semi-bluff** — required fold equity to break even, crediting your
  equity for the times you get called, with the pure-bluff comparison.

### 💰 Buy-in Tracker

- Add players, record buy-ins / re-buys / cash-outs, running per-player ledger.
- **End-of-session settlement** — minimal set of payments via a debt-simplification
  (greedy largest-debtor/creditor) algorithm, not naive pairwise settling.
- Session history by date.

### 📊 Reports

- All-time totals: total buy-in, total cash-out, net across every session.
- **All-time leaderboard** ranking players by net profit/loss (players matched by
  name, case-insensitive).
- **Per-session breakdown** — expand any past session to re-check each player's
  buy-in / cash-out / net, anytime after the fact.
- Auto-updates as sessions are added; **CSV export** for spreadsheets, plus JSON
  backup/restore.

### 📓 Hand Log (optional)

Save a hand (hole cards, board, equity, result, notes) for later review. Entirely
separate from — and not required by — the analyzer.

## Persistence & sync

- **Default:** localStorage — zero setup, data lives in one browser.
- **Optional cross-device sync:** Supabase (free tier) with email magic-link login
  and Row Level Security. When `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are
  set at build time the app switches to synced mode; otherwise it stays local. See
  **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** for click-by-click setup.
- On first sign-in the app auto-imports this browser's localStorage data; a
  **JSON export/import** (Reports tab) is the reliable path when moving between
  different sites/origins.
- The hosted Artifact preview is always localStorage-only — sandboxed artifact
  pages can't reach Supabase.

## The math (and data layer) are tested

Pure ES modules with Node test suites: the evaluator's hand rankings and Monte
Carlo output vs known all-in equities (AA vs KK ≈ 82.4%, AKs vs QQ ≈ 46.2%), plus
reports aggregation, CSV, row mappers, and the migration importer.

```bash
npm install
npm test              # engine + data-layer correctness checks
npm run dev           # local dev server
npm run build         # production build (reads VITE_SUPABASE_* if present)
```

## Notes / limitations

- Range estimates (loose/tight) use Chen-formula thresholds — a disclosed
  approximation of how wide an opponent plays. The Monte Carlo equity itself is
  exact given the chosen range.
- Equity assumes opponents' hole cards are unknown; it is never a read on their
  actual holding.
