# TACEDGE Strategy

Strategic orchestration and founder decision support. The LOO Diagram is
the strategic map; the Today view is the operational answer. The product
exists to answer one question: what is the most valuable thing we should
be doing now or today?

Working high-fidelity prototype. Product-facing name is TACEDGE.

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
  Integrated Horizon State, one objective per LOO, assumptions, risks and an
  assessment. Lines continue visually through and beyond every horizon.
- **Milestones** — conditions that must become true, not activities. Live
  objects with purpose, importance, success criteria, dependencies, risks,
  decisions, tasks, evidence, notes, next best action and change history.
- **Dependencies** — cross-LOO, drawn as restrained curves on the diagram.
- **Recommendation engine** — `src/lib/recommend.ts`, a pure deterministic
  function over campaign state that walks the daily decision chain: active
  horizon, Integrated Horizon State, Main Effort, least secure objective,
  most material milestone, current blockers, best action for the time
  actually available, and what consciously not to work on. Every
  recommendation exposes its reasoning ("How this was decided"). Built to
  be replaced or augmented by an AI reasoning layer without UI changes.

## Views

- **Today** (`#/`, the landing route) — strategic context, one primary
  recommendation with completion condition and unlocks, two sequenced next
  actions, an explicit "Not today" list, waiting-on-others, and capacity
  controls (time, energy, blocks, day type) that reshape the
  recommendation. A 30-minute window gets a genuinely completable
  30-minute action, not a shortened project.
- **LOO Diagram** (`#/campaign`) — the strategic map: lanes, horizons,
  objectives, milestones, dependencies, semantic zoom, editing.
- **Weekly Review** (`#/review`) — movement toward the horizon, progress
  by LOO, achieved/slipped/confidence changes, founder allocation,
  recommended Main Effort, and the three outcomes for the next seven days.
- **Milestone workspace** (`#/milestone/:id`).
- **What should I do now?** — persistent in the top bar and available from
  the diagram, horizons, and milestone workspaces. Accepts time, energy
  and a free-text note.
- **Daily closeout** — a two-minute end-of-day review; the stated blocker
  becomes tomorrow's primary constraint and the carry-forward appears on
  tomorrow's Today view.

Types live in `src/types.ts`; seeded campaign data in `src/data/seed.ts`;
state in `src/state/store.tsx` (reducer + localStorage persistence, keyed
`tacedge-strategy-campaign-v1`). Clear the key to reset to seed data.

## Brand

Visuals follow the TACEDGE Brand Identity & Guidelines repository:
`tokens.css` is copied verbatim, fonts are the approved self-hosted Google
Fonts (Play, Be Vietnam Pro, JetBrains Mono), and logo SVGs in
`public/brand/` are unmodified masters. Status colours (ochre, brick) carry
product meaning only; status is always paired with icon shape and text.
