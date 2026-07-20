import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { CampaignState, LineOfOperation, Milestone } from '../types';
import type { ViewSpec } from '../lib/views';
import { TIMELINE_START, TIMELINE_END } from '../lib/views';
import {
  parseDate, toIso, daysBetween, addDays, monthShort, todayIso, fmtDayMonth,
} from '../lib/time';
import { MarkerIcon } from './icons';
import { STATUS_LABEL, ConfidenceMeter } from './ui';

const HEAD_H = 40;
/** The LOO line runs at this fraction of lane height; labels hang below. */
const LINE_AT = 0.42;

interface DiagramProps {
  state: CampaignState;
  loos: LineOfOperation[];
  view: ViewSpec;
  selectedMilestoneId: string | null;
  selectedHorizonId: string | null;
  focusLooId: string | null;
  showAllDeps: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onSelectMilestone: (id: string) => void;
  onSelectHorizon: (id: string) => void;
  onMoveMilestone: (id: string, iso: string) => void;
  onMoveHorizon: (id: string, iso: string) => void;
  onToggleFocus: (looId: string) => void;
}

interface Placed {
  m: Milestone;
  x: number;
  row: number; // 0 = label below the line, 1 = label above
  laneTop: number;
}

/** Horizontal drag that distinguishes click from drag and reports day deltas. */
const useDragDays = (
  pxPerDay: number,
  onCommit: (id: string, dayDelta: number) => void,
  onClick: (id: string) => void,
) => {
  const [drag, setDrag] = useState<{ id: string; dx: number } | null>(null);
  const start = useRef(0);
  const moved = useRef(false);

  const onPointerDown = (id: string) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    start.current = e.clientX;
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id, dx: 0 });
  };
  const onPointerMove = (id: string) => (e: ReactPointerEvent) => {
    if (!drag || drag.id !== id) return;
    const dx = e.clientX - start.current;
    if (Math.abs(dx) > 3) moved.current = true;
    if (moved.current) setDrag({ id, dx });
  };
  const onPointerUp = (id: string) => (e: ReactPointerEvent) => {
    if (!drag || drag.id !== id) return;
    const dx = e.clientX - start.current;
    setDrag(null);
    if (moved.current && Math.abs(dx) > 3) {
      const days = Math.round(dx / pxPerDay);
      if (days !== 0) onCommit(id, days);
    } else {
      onClick(id);
    }
  };
  return { drag, handlers: (id: string) => ({
    onPointerDown: onPointerDown(id),
    onPointerMove: onPointerMove(id),
    onPointerUp: onPointerUp(id),
  }) };
};

export const Diagram = ({
  state, loos, view, selectedMilestoneId, selectedHorizonId, focusLooId, showAllDeps, scrollRef,
  onSelectMilestone, onSelectHorizon, onMoveMilestone, onMoveHorizon, onToggleFocus,
}: DiagramProps) => {
  const t0 = parseDate(TIMELINE_START);
  const t1 = parseDate(TIMELINE_END);
  const px = view.pxPerDay;
  const width = daysBetween(t0, t1) * px;
  const x = (iso: string) => daysBetween(t0, parseDate(iso)) * px;
  const laneH = view.laneHeight;
  const bodyH = loos.length * laneH;
  const totalH = HEAD_H + bodyH;
  const today = todayIso();

  // Semantic density by view: dots -> labelled dots -> dates/owners -> tasks.
  const sparse = px < 1; // 5y / 3y
  const zoomedIn = ['6m', 'quarter', 'month'].includes(view.id);
  const showMeta = ['quarter', 'month'].includes(view.id);
  const showTasks = view.id === 'month';
  const showSummaries = zoomedIn;

  const msDrag = useDragDays(
    px,
    (id, days) => {
      const m = state.milestones.find((mm) => mm.id === id);
      if (!m) return;
      const next = addDays(parseDate(m.targetDate), days);
      const clamped = next < t0 ? t0 : next > t1 ? t1 : next;
      onMoveMilestone(id, toIso(clamped));
    },
    onSelectMilestone,
  );
  const hzDrag = useDragDays(
    px,
    (id, days) => {
      const h = state.horizons.find((hh) => hh.id === id);
      if (!h) return;
      const next = addDays(parseDate(h.date), days);
      const clamped = next < t0 ? t0 : next > t1 ? t1 : next;
      onMoveHorizon(id, toIso(clamped));
    },
    onSelectHorizon,
  );

  // ---- time header ticks ----
  const monthTicks = useMemo(() => {
    const ticks: { x: number; label: string; year: number; month: number }[] = [];
    const d = new Date(t0.getFullYear(), t0.getMonth(), 1);
    while (d <= t1) {
      ticks.push({ x: daysBetween(t0, d) * px, label: monthShort(d.getMonth()), year: d.getFullYear(), month: d.getMonth() });
      d.setMonth(d.getMonth() + 1);
    }
    return ticks;
  }, [px, t0, t1]);

  const visibleTicks = sparse
    ? monthTicks.filter((tk) => tk.month % 3 === 0)
    : monthTicks;

  const weekTicks = useMemo(() => {
    if (!view.showWeeks) return [];
    const ticks: { x: number; label: string }[] = [];
    const d = new Date(t0);
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7));
    while (d <= t1) {
      ticks.push({ x: daysBetween(t0, d) * px, label: `${d.getDate()}` });
      d.setDate(d.getDate() + 7);
    }
    return ticks;
  }, [view.showWeeks, px, t0, t1]);

  // ---- milestone placement: centre track, alternate above when crowded ----
  const labelW = showMeta ? 132 : 118;
  const placedByLane = useMemo(() => {
    const map = new Map<string, Placed[]>();
    loos.forEach((loo, laneIdx) => {
      const laneTop = HEAD_H + laneIdx * laneH;
      const ms = state.milestones
        .filter((m) => m.looId === loo.id && m.status !== 'archived')
        .filter((m) => (zoomedIn ? true : m.major && m.status !== 'superseded'))
        .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

      const rowEnds: number[] = [];
      const placed: Placed[] = ms.map((m) => {
        const cx = x(m.targetDate);
        const w = sparse ? 26 : labelW + 8;
        const startX = cx - w / 2;
        let row = rowEnds.findIndex((end) => startX >= end + 6);
        if (row === -1) {
          row = rowEnds.length < 2 ? rowEnds.length : rowEnds.indexOf(Math.min(...rowEnds));
        }
        rowEnds[row] = cx + w / 2;
        return { m, x: cx, row, laneTop };
      });
      map.set(loo.id, placed);
    });
    return map;
  }, [state.milestones, loos, laneH, zoomedIn, sparse, labelW, px]); // eslint-disable-line react-hooks/exhaustive-deps

  const positions = useMemo(() => {
    const p = new Map<string, { x: number; y: number }>();
    placedByLane.forEach((list) => list.forEach((pl) => {
      const dx = msDrag.drag?.id === pl.m.id ? msDrag.drag.dx : 0;
      p.set(pl.m.id, { x: pl.x + dx, y: pl.laneTop + laneH * LINE_AT });
    }));
    return p;
  }, [placedByLane, msDrag.drag, laneH]);

  // ---- selection focus: related milestones and visible dependencies ----
  const relatedIds = useMemo(() => {
    if (!selectedMilestoneId) return null;
    const set = new Set([selectedMilestoneId]);
    state.dependencies.forEach((d) => {
      if (d.toMilestoneId === selectedMilestoneId && d.fromMilestoneId) set.add(d.fromMilestoneId);
      if (d.fromMilestoneId === selectedMilestoneId) set.add(d.toMilestoneId);
    });
    return set;
  }, [selectedMilestoneId, state.dependencies]);

  const visibleDeps = useMemo(() => {
    if (!zoomedIn) return [];
    const placeable = state.dependencies.filter((d) =>
      d.fromMilestoneId && positions.has(d.fromMilestoneId) && positions.has(d.toMilestoneId));
    if (showAllDeps) return placeable;
    if (!selectedMilestoneId) return [];
    return placeable.filter((d) =>
      d.toMilestoneId === selectedMilestoneId || d.fromMilestoneId === selectedMilestoneId);
  }, [state.dependencies, positions, zoomedIn, showAllDeps, selectedMilestoneId]);

  const horizons = useMemo(() => {
    const list = state.horizons
      .filter((h) => !h.archived)
      .sort((a, b) => a.date.localeCompare(b.date));
    let lastEnd = -Infinity;
    let lastRow = 0;
    return list.map((h) => {
      const hx = x(h.date);
      const row = hx - lastEnd < 230 ? (lastRow + 1) % 2 : 0;
      lastEnd = hx;
      lastRow = row;
      return { h, flagTop: 2 + row * 38 };
    });
  }, [state.horizons, px]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- background panning ----
  const panning = useRef<{ startX: number; scroll: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const onBgPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    panning.current = { startX: e.clientX, scroll: el.scrollLeft };
    setIsPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onBgPointerMove = (e: ReactPointerEvent) => {
    if (!panning.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft = panning.current.scroll - (e.clientX - panning.current.startX);
  };
  const onBgPointerUp = () => { panning.current = null; setIsPanning(false); };

  // Click-to-select props: keep the pointerdown away from the canvas pan so
  // the click lands, and never start a drag from an unselected element.
  const selectProps = (fn: () => void) => ({
    onPointerDown: (e: ReactPointerEvent) => e.stopPropagation(),
    onClick: fn,
  });

  const laneDim = (loo: LineOfOperation) => focusLooId !== null && focusLooId !== loo.id;
  const nodeOpacity = (loo: LineOfOperation, m: Milestone) => {
    if (laneDim(loo)) return 0.25;
    if (relatedIds && !relatedIds.has(m.id)) return 0.4;
    if (m.status === 'superseded') return 0.5;
    return 1;
  };

  return (
    <div className="diagram-card" style={{ minHeight: totalH + 10 }}>
      {/* Left rail: LOO identities */}
      <div className="lane-rail" style={{ height: totalH }}>
        <div className="lane-rail-head" style={{ height: HEAD_H }}>
          <span className="rail-title">Lines of Operation</span>
        </div>
        {loos.map((loo) => (
          <div
            key={loo.id}
            className="lane-label"
            style={{ height: laneH, opacity: laneDim(loo) ? 0.35 : 1 }}
          >
            <span className="lane-num">{String(loo.number).padStart(2, '0')}</span>
            <button
              type="button"
              className="lane-name"
              onClick={() => onToggleFocus(loo.id)}
              title={`${loo.name} — ${loo.description} Owner: ${loo.owner}. ${focusLooId === loo.id ? 'Clear focus.' : 'Click to focus this line.'}`}
            >
              {loo.name}
            </button>
            <span className="lane-desc">{loo.description}</span>
          </div>
        ))}
      </div>

      {/* Scrollable timeline */}
      <div
        className={`diagram-scroll${isPanning ? ' panning' : ''}${msDrag.drag ? ' dragging-milestone' : ''}`}
        ref={scrollRef}
        onPointerDown={onBgPointerDown}
        onPointerMove={onBgPointerMove}
        onPointerUp={onBgPointerUp}
        onPointerCancel={onBgPointerUp}
      >
        <div className="timeline" style={{ width, height: totalH }}>
          {/* time header */}
          <div className="time-head" style={{ width }}>
            {visibleTicks.map((tk) => (
              <div key={`${tk.year}-${tk.month}`} className="month-tick" style={{ left: tk.x, width: sparse ? px * 91 : px * 30 }}>
                {(tk.month === 0 || tk === visibleTicks[0]) && <span className="year">{tk.year}</span>}
                <span>{tk.label}</span>
              </div>
            ))}
            {weekTicks.map((tk) => (
              <div key={`w-${tk.x}`} className="week-tick" style={{ left: tk.x }}>{tk.label}</div>
            ))}
          </div>

          {/* lanes with enduring LOO lines */}
          <div className="lanes" style={{ height: bodyH }}>
            {loos.map((loo) => (
              <div
                key={loo.id}
                className={`lane-row${laneDim(loo) ? ' dimmed' : ''}`}
                style={{ height: laneH }}
              >
                <div className="loo-line" style={{ top: laneH * LINE_AT }} />
              </div>
            ))}
          </div>

          {/* faint date guides dropping from the month and week markers */}
          {zoomedIn && monthTicks.map((tk) => (
            <div key={`g-${tk.year}-${tk.month}`} className="guide-line" style={{ left: tk.x, top: HEAD_H, height: bodyH }} />
          ))}
          {zoomedIn && weekTicks.map((tk) => (
            <div key={`gw-${tk.x}`} className="guide-line week" style={{ left: tk.x, top: HEAD_H, height: bodyH }} />
          ))}

          {/* today marker */}
          <div className="today-line" style={{ left: x(today), top: HEAD_H - 20, height: bodyH + 20 }}>
            <span className="today-chip">Today</span>
          </div>

          {/* dependency layer: hidden until a milestone is selected */}
          {visibleDeps.length > 0 && (
            <svg className="dep-layer" width={width} height={totalH} aria-hidden>
              {visibleDeps.map((d) => {
                const a = positions.get(d.fromMilestoneId!)!;
                const b = positions.get(d.toMilestoneId)!;
                const hl = selectedMilestoneId === d.toMilestoneId || selectedMilestoneId === d.fromMilestoneId;
                const bend = Math.max(8, Math.min(110, Math.abs(b.x - a.x) * 0.4));
                return (
                  <g key={d.id}>
                    <path
                      className={`dep-path${hl ? ' highlight' : ''}`}
                      d={`M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x - 9} ${b.y}`}
                    />
                    <circle className={`dep-dot${hl ? ' highlight' : ''}`} cx={b.x - 7} cy={b.y} r={2.6} />
                  </g>
                );
              })}
            </svg>
          )}

          {/* horizon markers: select first, then drag to move */}
          {horizons.map(({ h, flagTop }) => {
            const hzSelected = selectedHorizonId === h.id;
            const dx = hzSelected && hzDrag.drag?.id === h.id ? hzDrag.drag.dx : 0;
            const hx = x(h.date) + dx;
            const forming = h.status === 'forming';
            return (
              <div key={h.id}>
                <div className={`horizon-line${forming ? ' forming' : ''}`} style={{ left: hx, top: HEAD_H, height: bodyH }} />
                <button
                  type="button"
                  className={`horizon-flag${forming ? ' forming' : ''}${hzSelected ? ' selected' : ''}`}
                  style={{ left: hx, top: flagTop }}
                  title={hzSelected
                    ? `Strategic Horizon: ${h.theme}. Drag to change date.`
                    : `Strategic Horizon: ${h.theme}. Select for detail; select first to move.`}
                  aria-label={`Strategic Horizon ${fmtDayMonth(h.date)}: ${h.theme}`}
                  {...(hzSelected
                    ? hzDrag.handlers(h.id)
                    : selectProps(() => onSelectHorizon(h.id)))}
                >
                  <span className="hz-date">{fmtDayMonth(h.date)} {parseDate(h.date).getFullYear()}</span>
                  <span className="hz-theme">{h.theme}</span>
                </button>
              </div>
            );
          })}

          {/* objective diamonds at each LOO x horizon intersection */}
          {horizons.map(({ h }) =>
            loos.map((loo, laneIdx) => {
              const obj = state.objectives.find((o) => o.horizonId === h.id && o.looId === loo.id);
              if (!obj) return null;
              const dx = hzDrag.drag?.id === h.id ? hzDrag.drag.dx : 0;
              const laneTop = HEAD_H + laneIdx * laneH;
              return (
                <button
                  type="button"
                  key={obj.id}
                  className={`objective-marker${h.status === 'forming' ? ' forming' : ''}`}
                  style={{
                    left: x(h.date) + dx,
                    top: laneTop + laneH * LINE_AT,
                    opacity: laneDim(loo) ? 0.25 : 1,
                  }}
                  {...selectProps(() => onSelectHorizon(h.id))}
                  title={`${loo.name} objective at ${fmtDayMonth(h.date)}: ${obj.statement}`}
                >
                  <span className="obj-diamond" aria-hidden />
                  {showSummaries && <span className="obj-summary">{obj.summary}</span>}
                </button>
              );
            }))}

          {/* milestones: dots on the line, labels beneath (or above when crowded) */}
          {loos.map((loo) => (placedByLane.get(loo.id) ?? []).map((pl) => {
            const { m } = pl;
            const dx = msDrag.drag?.id === m.id ? msDrag.drag.dx : 0;
            const cx = pl.x + dx;
            const cy = pl.laneTop + laneH * LINE_AT;
            const dragging = msDrag.drag?.id === m.id && msDrag.drag.dx !== 0;
            const selected = selectedMilestoneId === m.id;
            const opacity = nodeOpacity(loo, m);
            const label = `${m.title}. ${STATUS_LABEL[m.status]}, ${fmtDayMonth(m.targetDate)}, ${m.owner}.`;

            if (selected && !sparse) {
              return (
                <button
                  type="button"
                  key={m.id}
                  className={`ms-selected-box st-${m.status}${dragging ? ' dragging' : ''}`}
                  style={{ left: cx, top: cy }}
                  aria-label={`${label} Selected. Drag to reschedule.`}
                  title={`${label} Drag to reschedule.`}
                  {...msDrag.handlers(m.id)}
                >
                  <span className={`st-icon-${m.status}`}><MarkerIcon status={m.status} size={15} /></span>
                  <span className="msb-text">
                    <span className="msb-title">{m.title}</span>
                    {showMeta && <span className="msb-meta">{fmtDayMonth(m.targetDate)} · {m.owner}</span>}
                  </span>
                </button>
              );
            }

            const tasks = showTasks && ['active', 'at-risk', 'blocked'].includes(m.status)
              ? m.tasks.filter((t) => !t.done).slice(0, 2)
              : [];

            // Unselected milestones select on click only; dragging them pans
            // the canvas. Rescheduling requires selecting first.
            return (
              <div key={m.id} className="ms-point" style={{ opacity }}>
                <button
                  type="button"
                  className={`ms-dot st-icon-${m.status}`}
                  style={{ left: cx, top: cy }}
                  aria-label={`${label} Select to view and move.`}
                  title={`${label} Select to view and move.`}
                  {...selectProps(() => onSelectMilestone(m.id))}
                >
                  <MarkerIcon status={m.status} size={sparse ? 12 : 14} />
                </button>
                {!sparse && (
                  <button
                    type="button"
                    className={`ms-tag${pl.row === 1 ? ' above' : ''}${m.status === 'superseded' ? ' superseded' : ''}`}
                    style={{
                      left: cx,
                      top: pl.row === 1 ? cy - 10 : cy + 10,
                      width: labelW,
                    }}
                    {...selectProps(() => onSelectMilestone(m.id))}
                    title={label}
                    tabIndex={-1}
                    aria-hidden
                  >
                    <span className="ms-tag-title">{m.title}</span>
                    {showMeta && (
                      <span className="ms-tag-meta">
                        {fmtDayMonth(m.targetDate)} · {m.owner}
                        {m.progress > 0 && m.status !== 'complete' ? ` · ${m.progress}%` : ''}
                        {' '}
                        <ConfidenceMeter value={m.confidence} label={false} />
                      </span>
                    )}
                    {tasks.length > 0 && (
                      <span className="ms-tag-tasks">
                        {tasks.map((t) => (
                          <span key={t.id}>{t.week ? `${t.week}: ` : ''}{t.title}</span>
                        ))}
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
          }))}
        </div>
      </div>
    </div>
  );
};

/** Legend for the marker language. Rendered under the diagram. */
export const DiagramLegend = () => (
  <div className="diagram-legend" aria-hidden>
    {([
      ['complete', 'Completed'],
      ['active', 'Active'],
      ['future', 'Future'],
      ['at-risk', 'At risk'],
      ['blocked', 'Blocked'],
      ['superseded', 'Superseded'],
    ] as const).map(([status, text]) => (
      <span key={status} className="legend-item">
        <span className={`st-icon-${status}`}><MarkerIcon status={status} size={12} /></span>
        {text}
      </span>
    ))}
    <span className="legend-item"><span className="obj-diamond" /> Horizon objective</span>
    <span className="legend-item"><span className="legend-continues" /> Line continues</span>
  </div>
);
