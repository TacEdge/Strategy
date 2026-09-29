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
- **Key Tasks** — conditions that must become true, not activities. A key
  task is a title, a Line of Operation, a target date, an owner and an
  outcome. It sits on its line as a tick box: open, completed (green
  tick) or didn't complete (red cross). Tap the box to mark it. Nothing is
  deleted to tidy up: what was not completed stays on the record, and a
  fresh task is added if it is to be tried again. A task still open past
  its date reads as overdue (ochre) on the diagram.
- **Strategic Objectives** — vertical synchronisation points: a theme, a
  date and the same tick-box outcome, in a larger box at the head of the
  spine. Lines continue visually through and beyond every one.

In code the older names remain: a key task is a `Milestone` and a
strategic objective is a `StrategicHorizon`. User-facing words live in
`src/lib/terms.ts`.

## Views

- **Campaign** (`#/`, the landing route) — the LOO Diagram: lanes, key
  tasks as status dots with labels, strategic objective spines with their
  theme, semantic zoom from Week (a column per day) to 5 years. Add a key task or a strategic objective from the
  toolbar and move on; nothing opens. Selecting a dot opens a compact
  panel to change status, date, line or owner, or delete.
- **Voice** (microphone in the top bar, on every page) — tap once and say
  a command, e.g. "key task next Friday to meet with Rutledge" or
  "strategic objective at the end of next month, second customer signed".
  Several commands can go in one sentence. Items are added straight away
  and read back aloud, with Undo. Parsing is rule-based and on-device
  (`src/lib/voice.ts`): it picks up the kind, date phrase, line (said or
  inferred from words like customer, build, hire) and owner. Where live
  speech recognition is unavailable, as in some home-screen web apps, the
  same box accepts typing or the keyboard's dictation mic.
- **Export** (toolbar on the diagram) — a one-page A4 landscape PDF of the
  diagram exactly as it is on screen: the visible date window, the visible
  lines and the current label setting, drawn as vectors in the brand fonts
  (`src/lib/exportPdf.ts`). On iPad it opens the share sheet (Mail,
  Messages, AirDrop, Save to Files); elsewhere it downloads. jsPDF and the
  fonts load only when an export is made.
- **Key Tasks** (`#/tasks`) — the flat list behind the diagram, attention
  first. A row opens that key task on the diagram.
- **Reviews** (`#/review`) — what needs attention, what is due before the
  next strategic objective, what has been achieved, and the three outcomes
  for the next seven days.

Types live in `src/types.ts`; seeded campaign data in `src/data/seed.ts`;
state in `src/state/store.tsx` (reducer + localStorage persistence, keyed
`tacedge-strategy-campaign-v1`). Earlier stored campaigns migrate on load:
the extra detail is dropped and titles, lines, dates, owners and statuses
are kept. Clear the key to reset to seed data.

## Brand

Visuals follow the TACEDGE Brand Identity & Guidelines repository:
`tokens.css` is copied verbatim, fonts are the approved self-hosted Google
Fonts (Play, Be Vietnam Pro, JetBrains Mono), and logo SVGs in
`public/brand/` are unmodified masters. Status colours (ochre, brick) carry
product meaning only; status is always paired with icon shape and text.
