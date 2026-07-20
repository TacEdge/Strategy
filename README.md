# TACEDGE Strategy — LOO Diagram

Strategic orchestration and founder decision support, built on the military
concept of a Lines of Operation diagram. The product answers one question:
what is the most strategically valuable thing I should be doing now?

First working high-fidelity prototype. Product-facing name is TACEDGE.

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
- **Founder Priority Engine** — "What should I do now?" produces a single
  recommended founder action with context (deterministic first pass).

Types live in `src/types.ts`; seeded campaign data in `src/data/seed.ts`;
state in `src/state/store.tsx` (reducer + localStorage persistence, keyed
`tacedge-strategy-campaign-v1`). Clear the key to reset to seed data.

## Brand

Visuals follow the TACEDGE Brand Identity & Guidelines repository:
`tokens.css` is copied verbatim, fonts are the approved self-hosted Google
Fonts (Play, Be Vietnam Pro, JetBrains Mono), and logo SVGs in
`public/brand/` are unmodified masters. Status colours (ochre, brick) carry
product meaning only; status is always paired with icon shape and text.
