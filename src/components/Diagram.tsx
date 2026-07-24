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
import { projectCash, cashOutIso, fmtCashOut, fmtMoney } from '../lib/finance';

const HEAD_H = 40;
/** The LOO line runs at this fraction of lane height; labels hang below. */
const LINE_AT = 0.42;
/** Height of the financial baseline strip under the lanes. */
const STRIP_H = 96;

interface DiagramProps {
  state: CampaignState;
  loos: LineOfOperation[];
  view: ViewSpec;
  selectedMilestoneId: string | null;
  selectedHorizonId: string | null;
  focusLooId: string | null;
  showAllDeps: boolean;
  showLabels: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  onSelectMilestone: (id: string) => void;
  onSelectHorizon: (id: string, focusLooId?: string) => void;
  onMoveMilestone: (id: string, iso: string) => void;
  onMoveHorizon: (id: string, iso: string) => void;
  onToggleFocus: (looId: string) => void;
  onEditFinance: () => void;
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
  state, loos, view, selectedMilestoneId, selectedHorizonId, focusLooId, showAllDeps, showLabels, scrollRef,
  onSelectMilestone, onSelectHorizon, onMoveMilestone, onMoveHorizon, onToggleFocus, onEditFinance,
}: DiagramProps) => {
  const t0 = parseDate(TIMELINE_START);
  const t1 = parseDate(TIMELINE_END);
  const px = view.pxPerDay;
  const width = daysBetween(t0, t1) * px;
  const x = (iso: string) => daysBetween(t0, parseDate(iso)) * px;
  const laneH = view.laneHeight;
  const bodyH = loos.length * laneH;
  const gridH = bodyH + STRIP_H; // vertical structures run through the cash strip
  const totalH = HEAD_H + gridH;
  const today = todayIso();

  // Semantic density by view: dots -> labelled dots -> dates/owners -> tasks.
  const sparse = px < 1; // 5y / 3y
  const zoomedIn = ['6m', 'quarter', 'month'].includes(view.id);
  const showMeta = ['quarter', 'month'].includes(view.id);
  const showTasks = view.id === 'month';

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

  // Guide density steps with the view: monthly to Year, quarterly at 3
  // years, 6-monthly at 5 years — always aligned with the header markers.
  // January is drawn by the stronger year separator, not a guide.
  const guideTicks = useMemo(() => {
    if (view.id === '3y') return monthTicks.filter((tk) => tk.month % 3 === 0 && tk.month !== 0);
    if (view.id === '5y') return monthTicks.filter((tk) => tk.month === 6);
    return monthTicks.filter((tk) => tk.month !== 0);
  }, [monthTicks, view.id]);

  // Calendar-year bands: alternate a whisper of tint so years read as the
  // parent grouping, with a slightly stronger separator at each boundary.
  const yearBands = useMemo(() => {
    const bands: { year: number; x0: number; x1: number }[] = [];
    for (let y = t0.getFullYear(); y <= t1.getFullYear(); y++) {
      const start = new Date(y, 0, 1) < t0 ? t0 : new Date(y, 0, 1);
      const end = new Date(y + 1, 0, 1) > t1 ? t1 : new Date(y + 1, 0, 1);
      bands.push({ year: y, x0: daysBetween(t0, start) * px, x1: daysBetween(t0, end) * px });
    }
    return bands;
  }, [px, t0, t1]);

  // ---- projected cash line (financial baseline strip) ----
  const cashPoints = useMemo(
    () => projectCash(state, TIMELINE_END),
    [state.milestones, state.finance], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const cashOut = cashOutIso(cashPoints);
  const cashGeom = useMemo(() => {
    const values = cashPoints.map((p) => p.cash);
    const dMax = Math.max(...values, state.finance.startingCash) * 1.08;
    const dMin = Math.min(0, ...values) * 1.15;
    const padT = 12;
    const padB = 10;
    const yOf = (v: number) => padT + ((dMax - v) / (dMax - dMin || 1)) * (STRIP_H - padT - padB);
    const line = cashPoints.map((p) => `${x(p.iso).toFixed(1)},${yOf(p.cash).toFixed(1)}`).join(' ');
    const x0 = x(cashPoints[0].iso);
    const xn = x(cashPoints[cashPoints.length - 1].iso);
    const area = `${x0},${yOf(0)} ${line} ${xn},${yOf(0)}`;
    return { yOf, line, area, zeroY: yOf(0) };
  }, [cashPoints, px, state.finance.startingCash]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const labelW = sparse ? 82 : showMeta ? 132 : 110;
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
        const w = showLabels ? labelW + 8 : 26;
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
  }, [state.milestones, loos, laneH, zoomedIn, showLabels, labelW, px]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const horizons = useMemo(
    () => state.horizons
      .filter((h) => !h.archived)
      .sort((a, b) => a.date.localeCompare(b.date)),
    [state.horizons],
  );

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
    if (selectedHorizonId) return 0.55; // horizon selected: spine and objectives lead
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
        <div className="lane-label strip-rail" style={{ height: STRIP_H }}>
          <span className="rail-title">Cash · Projected</span>
          <span className="strip-rail-line">
            {fmtMoney(state.finance.startingCash)} today · burn {fmtMoney(state.finance.monthlyBurn)}/mo
          </span>
          <span className="strip-rail-line strong">
            {cashOut ? `Cash out ${fmtCashOut(cashPoints)}` : 'Runway beyond 2031'}
          </span>
          <button type="button" className="strip-assumptions" onClick={onEditFinance}>
            Edit assumptions
          </button>
        </div>
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
          {/* calendar-year grouping: alternating bands and boundary separators */}
          {yearBands.filter((b) => b.year % 2 === 1).map((b) => (
            <div key={`yb-${b.year}`} className="year-band" style={{ left: b.x0, width: b.x1 - b.x0, top: 0, height: totalH }} />
          ))}
          {yearBands.slice(1).map((b) => (
            <div key={`ys-${b.year}`} className="year-sep" style={{ left: b.x0, top: 0, height: totalH }} />
          ))}

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
          {guideTicks.map((tk) => (
            <div key={`g-${tk.year}-${tk.month}`} className="guide-line" style={{ left: tk.x, top: HEAD_H, height: gridH }} />
          ))}
          {weekTicks.map((tk) => (
            <div key={`gw-${tk.x}`} className="guide-line week" style={{ left: tk.x, top: HEAD_H, height: gridH }} />
          ))}

          {/* financial baseline strip: projected cash on the same time axis */}
          <div className="cash-strip" style={{ top: HEAD_H + bodyH, height: STRIP_H, width }}>
            <svg width={width} height={STRIP_H} aria-hidden>
              <polygon className="cash-area" points={cashGeom.area} />
              <line className="cash-zero" x1={x(cashPoints[0].iso)} y1={cashGeom.zeroY} x2={width} y2={cashGeom.zeroY} />
              <polyline className="cash-line" points={cashGeom.line} />
              {cashOut && (
                <circle className="cash-out-dot" cx={x(cashOut)} cy={cashGeom.zeroY} r={4} />
              )}
            </svg>
            {cashOut && (
              <span className="cash-out-label" style={{ left: x(cashOut) + 8, top: cashGeom.zeroY - 18 }}>
                Cash out · {fmtCashOut(cashPoints)}
              </span>
            )}
          </div>

          {/* today marker */}
          <div className="today-line" style={{ left: x(today), top: HEAD_H - 20, height: gridH + 20 }}>
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

          {/* Strategic Horizon spines. The calendar header stays clean: one
              large Endstate diamond sits at the top of the vertical line —
              its position against the calendar carries the timing. Select
              first, then drag the diamond to move the horizon. */}
          {horizons.map((h) => {
            const hzSelected = selectedHorizonId === h.id;
            const dx = hzSelected && hzDrag.drag?.id === h.id ? hzDrag.drag.dx : 0;
            const hx = x(h.date) + dx;
            const forming = h.status === 'forming';
            const title = hzSelected
              ? `Strategic Horizon: ${h.theme} · ${fmtDayMonth(h.date)} ${parseDate(h.date).getFullYear()}. Drag to change date.`
              : `Strategic Horizon: ${h.theme} · ${fmtDayMonth(h.date)} ${parseDate(h.date).getFullYear()}. Select for the Endstate.`;
            const label = `Strategic Horizon ${fmtDayMonth(h.date)} ${parseDate(h.date).getFullYear()}: ${h.theme}`;
            return (
              <div key={h.id}>
                <div
                  className={`horizon-line${forming ? ' forming' : ''}${hzSelected ? ' selected' : ''}`}
                  style={{ left: hx, top: HEAD_H, height: gridH }}
                />
                <button
                  type="button"
                  className="horizon-hit"
                  style={{ left: hx - 5, top: HEAD_H, height: gridH }}
                  title={title}
                  aria-hidden
                  tabIndex={-1}
                  {...selectProps(() => onSelectHorizon(h.id))}
                />
                <button
                  type="button"
                  className={`horizon-endstate${forming ? ' forming' : ''}${hzSelected ? ' selected' : ''}`}
                  style={{ left: hx, top: HEAD_H + 14 }}
                  title={title}
                  aria-label={label}
                  {...(hzSelected
                    ? hzDrag.handlers(h.id)
                    : selectProps(() => onSelectHorizon(h.id)))}
                >
                  <span className="endstate-diamond" aria-hidden />
                </button>
              </div>
            );
          })}

          {/* Objective diamonds at each LOO x horizon intersection. The
              short label appears on hover/focus or while the horizon is
              selected; clicking opens the drawer at that LOO objective. */}
          {horizons.map((h) =>
            loos.map((loo, laneIdx) => {
              const obj = state.objectives.find((o) => o.horizonId === h.id && o.looId === loo.id);
              if (!obj) return null;
              const dx = hzDrag.drag?.id === h.id ? hzDrag.drag.dx : 0;
              const laneTop = HEAD_H + laneIdx * laneH;
              return (
                <button
                  type="button"
                  key={obj.id}
                  className={`objective-marker${h.status === 'forming' ? ' forming' : ''}${selectedHorizonId === h.id ? ' hz-selected' : ''}`}
                  style={{
                    left: x(h.date) + dx,
                    top: laneTop + laneH * LINE_AT,
                    opacity: laneDim(loo) ? 0.25 : 1,
                  }}
                  {...selectProps(() => onSelectHorizon(h.id, loo.id))}
                  title={`${loo.name} objective at ${fmtDayMonth(h.date)}: ${obj.statement}`}
                >
                  <span className="obj-diamond" aria-hidden />
                  <span className="obj-summary">{obj.summary}</span>
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
                    <span className="msb-title">{m.shortLabel ?? m.title}</span>
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
                {showLabels && (
                  <button
                    type="button"
                    className={`ms-tag${sparse ? ' compact' : ''}${pl.row === 1 ? ' above' : ''}${m.status === 'superseded' ? ' superseded' : ''}`}
                    style={{
                      left: cx,
                      top: pl.row === 1 ? cy - (sparse ? 8 : 10) : cy + (sparse ? 8 : 10),
                      width: labelW,
                    }}
                    {...selectProps(() => onSelectMilestone(m.id))}
                    title={label}
                    tabIndex={-1}
                    aria-hidden
                  >
                    <span className="ms-tag-title">{m.shortLabel ?? m.title}</span>
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
        <span className={`st-icon-${status}`}><MarkerIcon status={status} size={14} /></span>
        {text}
      </span>
    ))}
    <span className="legend-item"><span className="endstate-diamond legend-endstate" /> Horizon endstate</span>
    <span className="legend-item"><span className="obj-diamond" /> LOO objective</span>
    <span className="legend-item"><span className="legend-continues" /> Line continues</span>
  </div>
);
