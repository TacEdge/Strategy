# TACEDGE Strategy

Strategic orchestration and founder decision support, built on the
Lines of Operation model. Working high-fidelity prototype. Product-facing
name is TACEDGE.

## Run

```bash
npm install
npm run dev        # develop at the printed local URL
npm run typecheck  # must pass
npm run build      # production build
npm run preview    # serve the build
```

## Strategic model

- **Vision** — an enduring direction, not an endpoint.
- **Lines of Operation** — endure through time; they never terminate at a
  horizon. Roles: Main Effort, Supporting, Sustaining, Paused. One Main
  Effort at a time.
- **Strategic Horizons** — vertical synchronisation points. Each carries an
  Endstate, one objective per LOO, assumptions, risks and an assessment.
  Lines continue visually through and beyond every horizon.
- **Milestones** — conditions that must become true, not activities. Live
  objects with purpose, importance, success criteria, dependencies, risks,
  decisions, tasks, evidence, notes, next best action and change history.
- **Dependencies** — cross-LOO, drawn as restrained curves on the diagram.
- **Financial baseline** — milestones carry optional revenue and cost
  figures, horizons carry revenue and cash-floor targets, and a projected
  cash strip under the lanes (starting cash minus burn plus milestone
  revenue) shows the runway consequence of the plan. Strategic-scale
  finance, not accounting.
## Views

- **LOO Diagram** (`#/`, the landing route) — the strategic map: lanes,
  horizons, objectives, milestones, dependencies, semantic zoom, editing.
  Milestones are status dots on the LOO line with short labels; horizon
  objectives are diamonds with short summaries; dependency lines appear
  only for the selected milestone (or via "Show all dependencies").
  Full detail lives in the selection drawer and milestone workspace.
- **Weekly Review** (`#/review`) — movement toward the horizon, progress
  by LOO, achieved/slipped milestones, founder allocation, and the three
  outcomes for the next seven days.
- **Milestone workspace** (`#/milestone/:id`).

Types live in `src/types.ts`; seeded campaign data in `src/data/seed.ts`;
state in `src/state/store.tsx` (reducer + localStorage persistence, keyed
`tacedge-strategy-campaign-v1`). Clear the key to reset to seed data.

## Brand

Visuals follow the TACEDGE Brand Identity & Guidelines repository:
`tokens.css` is copied verbatim, fonts are the approved self-hosted Google
Fonts (Play, Be Vietnam Pro, JetBrains Mono), and logo SVGs in
`public/brand/` are unmodified masters. Status colours (ochre, brick) carry
product meaning only; status is always paired with icon shape and text.
