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

The model is deliberately small. The diagram is meant to be read at a
glance: what needs attention shows from the labels alone, synchronised by
Line of Operation and by time. Nothing needs opening to be understood.

- **Lines of Operation** — endure through time; they never terminate at a
  horizon. Three by default: **Product** (design and build of the
  product), **Commercial** (contracts and agreements with customers) and
  **Company** (the internal workings: brand, marketing, team, runway).
- **Milestones** — conditions that must become true, not activities. A
  milestone is a title, a Line of Operation, a target date, an owner and a
  status (future, active, at risk, blocked, complete). A milestone past its
  date and not complete reads as overdue on the diagram.
- **Strategic Horizons** — vertical synchronisation points: a theme and a
  date. Lines continue visually through and beyond every horizon.

## Views

- **Campaign** (`#/`, the landing route) — the LOO Diagram: lanes,
  milestones as status dots with labels, horizon spines with their theme,
  semantic zoom. Add a milestone or a horizon from the toolbar and move on;
  nothing opens. Selecting a dot opens a compact panel to change status,
  date, line or owner, or delete.
- **Milestones** (`#/milestones`) — the flat list behind the diagram,
  attention first. A row opens that milestone on the diagram.
- **Reviews** (`#/review`) — what needs attention, what is due before the
  next horizon, what has been achieved, and the three outcomes for the
  next seven days.

Types live in `src/types.ts`; seeded campaign data in `src/data/seed.ts`;
state in `src/state/store.tsx` (reducer + localStorage persistence, keyed
`tacedge-strategy-campaign-v1`). Earlier stored campaigns migrate on load:
the extra milestone detail is dropped and titles, lines, dates, owners and
statuses are kept. Clear the key to reset to seed data.

## Brand

Visuals follow the TACEDGE Brand Identity & Guidelines repository:
`tokens.css` is copied verbatim, fonts are the approved self-hosted Google
Fonts (Play, Be Vietnam Pro, JetBrains Mono), and logo SVGs in
`public/brand/` are unmodified masters. Status colours (ochre, brick) carry
product meaning only; status is always paired with icon shape and text.
