import { useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { CampaignState, LineOfOperation, Milestone } from '../types';
import type { ViewSpec } from '../lib/views';
import { TIMELINE_START, TIMELINE_END } from '../lib/views';
import {
  parseDate, toIso, daysBetween, addDays, monthShort, todayIso, fmtDayMonth,
} from '../lib/time';
import { statusIcon } from './icons';
import { STATUS_LABEL } from './ui';

const HEAD_H = 44;

interface DiagramProps {
  state: CampaignState;
  loos: LineOfOperation[];
  view: ViewSpec;
  selectedMilestoneId: string | null;
  focusLooId: string | null;
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
  cy: number; // anchor centre y (for dependency lines)
  top: number; // card top (detail views)
  row: number;
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
  state, loos, view, selectedMilestoneId, focusLooId, scrollRef,
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
  const isDetail = view.detail !== 'macro';
  const isOperational = view.detail === 'operational';
  const sparse = px < 1; // 3y / 5y: strategic shape only
  const showObjectives = !sparse && !isOperational;

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

  // ---- month / week / year grid ----
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
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7)); // first Monday
    while (d <= t1) {
      ticks.push({ x: daysBetween(t0, d) * px, label: `${d.getDate()}` });
      d.setDate(d.getDate() + 7);
    }
    return ticks;
  }, [view.showWeeks, px, t0, t1]);

  // ---- milestone placement with collision avoidance ----
  const placedByLane = useMemo(() => {
    const map = new Map<string, Placed[]>();
    loos.forEach((loo, laneIdx) => {
      const laneTop = HEAD_H + laneIdx * laneH;
      const ms = state.milestones
        .filter((m) => m.looId === loo.id && m.status !== 'archived')
        .filter((m) => (isDetail ? true : m.major && m.status !== 'superseded'))
        .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

      const rowEnds: number[] = [];
      const placed: Placed[] = ms.map((m) => {
        const cx = x(m.targetDate);
        const w = isDetail ? 224 : sparse ? 30 : Math.min(230, 44 + m.title.length * 6.4);
        const startX = cx - w / 2;
        let row = rowEnds.findIndex((end) => startX >= end + 8);
        const maxRows = 2;
        if (row === -1) {
          row = rowEnds.length < maxRows
            ? rowEnds.length
            : rowEnds.indexOf(Math.min(...rowEnds));
        }
        rowEnds[row] = cx + w / 2;
        const cy = isDetail
          ? laneTop + (row === 0 ? laneH * 0.32 : laneH * 0.72)
          : laneTop + (row === 0 ? laneH * 0.62 : laneH * 0.86);
        const top = isDetail
          ? laneTop + (row === 0 ? 8 : laneH * 0.52)
          : cy;
        return { m, x: cx, cy, top, row, laneTop };
      });
      map.set(loo.id, placed);
    });
    return map;
  }, [state.milestones, loos, laneH, isDetail, px]); // eslint-disable-line react-hooks/exhaustive-deps

  const positions = useMemo(() => {
    const p = new Map<string, { x: number; y: number }>();
    placedByLane.forEach((list) => list.forEach((pl) => {
      const dx = msDrag.drag?.id === pl.m.id ? msDrag.drag.dx : 0;
      p.set(pl.m.id, { x: pl.x + dx, y: pl.cy });
    }));
    return p;
  }, [placedByLane, msDrag.drag]);

  // ---- dependencies ----
  const deps = useMemo(() => {
    const majorIds = new Set(
      state.milestones.filter((m) => m.major).map((m) => m.id),
    );
    return state.dependencies.filter((d) => {
      if (!d.fromMilestoneId) return false;
      if (!positions.has(d.fromMilestoneId) || !positions.has(d.toMilestoneId)) return false;
      if (!isDetail) return majorIds.has(d.fromMilestoneId) && majorIds.has(d.toMilestoneId);
      return true;
    });
  }, [state.dependencies, state.milestones, positions, isDetail]);

  // Stagger horizon flags vertically when they crowd at wide zooms.
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
      return { h, flagTop: 2 + row * 40 };
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

  const laneDim = (loo: LineOfOperation) =>
    focusLooId !== null && focusLooId !== loo.id;

  return (
    <div className="diagram-card" style={{ minHeight: totalH + 14 }}>
      {/* Left rail: LOO identities */}
      <div className="lane-rail" style={{ height: totalH }}>
        <div className="lane-rail-head" style={{ height: HEAD_H }}>
          <span className="eyebrow">Lines of Operation</span>
        </div>
        {loos.map((loo) => (
          <div
            key={loo.id}
            className={`lane-label${loo.role === 'paused' ? ' paused' : ''}`}
            style={{ height: laneH, opacity: laneDim(loo) ? 0.4 : 1 }}
          >
            <div className="lane-label-top">
              <span className="lane-num">{String(loo.number).padStart(2, '0')}</span>
              <button
                type="button"
                className="lane-name"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                onClick={() => onToggleFocus(loo.id)}
                title={focusLooId === loo.id ? 'Clear focus' : `Focus on ${loo.name}`}
              >
                {loo.name}
              </button>
            </div>
            <div className="lane-meta">
              <span className={`role-tag role-${loo.role}`}>
                {loo.role === 'main-effort' ? 'Main Effort'
                  : loo.role.charAt(0).toUpperCase() + loo.role.slice(1)}
              </span>
              {isDetail && <span className="lane-owner">{loo.owner}</span>}
            </div>
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

          {/* lane rows with enduring LOO lines */}
          <div className="lanes" style={{ height: bodyH }}>
            {loos.map((loo) => (
              <div
                key={loo.id}
                className={[
                  'lane-row',
                  loo.role === 'main-effort' ? 'main-effort-row' : '',
                  loo.role === 'paused' ? 'paused-row' : '',
                  laneDim(loo) ? 'dimmed' : '',
                ].filter(Boolean).join(' ')}
                style={{ height: laneH }}
              >
                <div className="loo-line" style={{ top: isDetail ? laneH - 14 : laneH * 0.62 }} />
              </div>
            ))}
          </div>

          {/* vertical grid */}
          {monthTicks.map((tk) => (
            <div key={`g-${tk.year}-${tk.month}`} className="grid-line" style={{ left: tk.x, top: HEAD_H, height: bodyH }} />
          ))}
          {weekTicks.map((tk) => (
            <div key={`gw-${tk.x}`} className="grid-line week" style={{ left: tk.x, top: HEAD_H, height: bodyH }} />
          ))}

          {/* today */}
          <div className="today-line" style={{ left: x(today), top: HEAD_H - 26, height: bodyH + 26 }}>
            <span className="today-chip">Today</span>
          </div>

          {/* dependency layer */}
          <svg className="dep-layer" width={width} height={totalH} aria-hidden>
            {deps.map((d) => {
              const a = positions.get(d.fromMilestoneId!)!;
              const b = positions.get(d.toMilestoneId)!;
              const hl = selectedMilestoneId === d.toMilestoneId || selectedMilestoneId === d.fromMilestoneId;
              const target = state.milestones.find((m) => m.id === d.toMilestoneId);
              const bend = Math.max(8, Math.min(110, Math.abs(b.x - a.x) * 0.4));
              return (
                <g key={d.id}>
                  <path
                    className={`dep-path${hl ? ' highlight' : ''}${target?.status === 'blocked' ? ' into-blocked' : ''}`}
                    d={`M ${a.x} ${a.y} C ${a.x + bend} ${a.y}, ${b.x - bend} ${b.y}, ${b.x - 8} ${b.y}`}
                  />
                  <circle className={`dep-dot${hl ? ' highlight' : ''}`} cx={b.x - 6} cy={b.y} r={3} />
                </g>
              );
            })}
          </svg>

          {/* horizon markers */}
          {horizons.map(({ h, flagTop }) => {
            const dx = hzDrag.drag?.id === h.id ? hzDrag.drag.dx : 0;
            const hx = x(h.date) + dx;
            const forming = h.status === 'forming';
            return (
              <div key={h.id}>
                <div className={`horizon-line${forming ? ' forming' : ''}`} style={{ left: hx, top: HEAD_H, height: bodyH }} />
                <button
                  type="button"
                  className={`horizon-flag${forming ? ' forming' : ''}`}
                  style={{ left: hx, top: flagTop }}
                  title={`Strategic Horizon: ${h.theme}. Drag to change date, select for detail.`}
                  aria-label={`Strategic Horizon ${fmtDayMonth(h.date)}: ${h.theme}`}
                  {...hzDrag.handlers(h.id)}
                >
                  <span className="hz-date">{fmtDayMonth(h.date)} {parseDate(h.date).getFullYear()}</span>
                  <span className="hz-theme">{h.theme}</span>
                </button>
              </div>
            );
          })}

          {/* objective chips pinned to horizons */}
          {showObjectives && horizons.map(({ h }) =>
            loos.map((loo, laneIdx) => {
              const obj = state.objectives.find((o) => o.horizonId === h.id && o.looId === loo.id);
              if (!obj) return null;
              const dx = hzDrag.drag?.id === h.id ? hzDrag.drag.dx : 0;
              const laneTop = HEAD_H + laneIdx * laneH;
              return (
                <button
                  type="button"
                  key={obj.id}
                  className={`objective-chip${h.status === 'forming' ? ' forming' : ''}`}
                  style={{
                    left: x(h.date) + dx - 8,
                    top: isDetail ? laneTop + laneH - 8 : laneTop + 6,
                    transform: isDetail ? 'translate(-100%, -100%)' : 'translate(-100%, 0)',
                    opacity: laneDim(loo) ? 0.3 : 1,
                  }}
                  onClick={() => onSelectHorizon(h.id)}
                  title={`${loo.name} objective at ${fmtDayMonth(h.date)}: ${obj.statement}`}
                >
                  <span className="obj-eyebrow">Objective · {fmtDayMonth(h.date)}</span>
                  {obj.statement.length > 76 ? `${obj.statement.slice(0, 74)}…` : obj.statement}
                </button>
              );
            }))}

          {/* milestones */}
          {loos.map((loo) => (placedByLane.get(loo.id) ?? []).map((pl) => {
            const { m } = pl;
            const dragging = msDrag.drag?.id === m.id && msDrag.drag.dx !== 0;
            const dx = msDrag.drag?.id === m.id ? msDrag.drag.dx : 0;
            const selected = selectedMilestoneId === m.id;
            const dimmed = laneDim(loo);
            const label = `${m.title}. ${STATUS_LABEL[m.status]}, ${fmtDayMonth(m.targetDate)}, ${m.owner}. Drag to reschedule.`;

            if (!isDetail) {
              return (
                <button
                  type="button"
                  key={m.id}
                  className={`ms-node${sparse ? ' sparse' : ''} st-${m.status}${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
                  style={{ left: pl.x + dx, top: pl.cy, opacity: dimmed ? 0.3 : 1 }}
                  aria-label={label}
                  title={label}
                  {...msDrag.handlers(m.id)}
                >
                  <span className={`ms-status st-icon-${m.status}`}>{statusIcon(m.status, 15)}</span>
                  {!sparse && <span className="ms-title">{m.title}</span>}
                </button>
              );
            }

            const showTasks = isOperational
              && ['active', 'at-risk', 'blocked'].includes(m.status);
            const openDecisions = m.decisions.filter((d) => !d.resolved);
            return (
              <button
                type="button"
                key={m.id}
                className={`ms-card st-${m.status}${selected ? ' selected' : ''}${dragging ? ' dragging' : ''}`}
                style={{ left: pl.x + dx, top: pl.top, opacity: dimmed ? 0.3 : 1 }}
                aria-label={label}
                title={label}
                {...msDrag.handlers(m.id)}
              >
                <span className="ms-card-head">
                  <span className={`ms-status st-icon-${m.status}`} title={STATUS_LABEL[m.status]}>
                    {statusIcon(m.status, 15)}
                  </span>
                  <span className="ms-card-title">{m.title}</span>
                  {m.founderAction && <span className="founder-mark" title="Founder action required">MF</span>}
                </span>
                <span className="ms-card-meta">
                  <span>{fmtDayMonth(m.targetDate)}</span>
                  <span className="owner">{m.owner}</span>
                  <span title={`Confidence ${m.confidence}`}>C:{m.confidence.charAt(0).toUpperCase()}</span>
                  <span>{m.progress}%</span>
                </span>
                {m.status !== 'future' && m.status !== 'superseded' && (
                  <span className="progress-track" aria-hidden>
                    <span className="progress-fill" style={{ width: `${m.progress}%` }} />
                  </span>
                )}
                {showTasks && (m.tasks.length > 0 || openDecisions.length > 0) && (
                  <ul className="ms-card-tasks">
                    {m.tasks.slice(0, 3).map((tk) => (
                      <li key={tk.id} className={tk.done ? 'done' : ''}>
                        <span className="tk-dot" />
                        <span>{tk.week ? `${tk.week}: ` : ''}{tk.title}</span>
                      </li>
                    ))}
                    {openDecisions.slice(0, 1).map((d) => (
                      <li key={d.id}>
                        <span className="tk-dot" style={{ borderColor: 'var(--te-ochre)' }} />
                        <span className="ms-card-decision">Decide: {d.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </button>
            );
          }))}
        </div>
      </div>
    </div>
  );
};
