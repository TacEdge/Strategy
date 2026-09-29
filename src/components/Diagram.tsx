import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { CampaignState, LineOfOperation, Milestone } from '../types';
import type { ViewSpec } from '../lib/views';
import { TIMELINE_START, TIMELINE_END } from '../lib/views';
import {
  parseDate, toIso, daysBetween, addDays, monthShort, todayIso, fmtDayMonth,
} from '../lib/time';
import { MarkerIcon } from './icons';
import { STATUS_LABEL } from './ui';
import { placeLabels, tiersThatFit } from '../lib/labels';
import type { LabelSlot } from '../lib/labels';
import { TERMS } from '../lib/terms';

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
  showLabels: boolean;
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
  /** Where the label sits, or null when the lane is too crowded to show it. */
  slot: LabelSlot | null;
  laneTop: number;
}

/** How a lane's labels are drawn: full size, or compressed when crowded. */
type LabelMode = 'full' | 'narrow' | 'oneline';

interface LaneLabels {
  mode: LabelMode;
  width: number;
  tierH: number;
  items: Placed[];
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

/** Past its target date and not yet complete: needs attention now. */
export const isOverdue = (m: Milestone, today: string): boolean =>
  m.status !== 'complete' && m.targetDate < today;

export const Diagram = ({
  state, loos, view, selectedMilestoneId, selectedHorizonId, focusLooId, showLabels, scrollRef,
  onSelectMilestone, onSelectHorizon, onMoveMilestone, onMoveHorizon, onToggleFocus,
}: DiagramProps) => {
  const t0 = parseDate(TIMELINE_START);
  const t1 = parseDate(TIMELINE_END);
  const px = view.pxPerDay;
  const width = daysBetween(t0, t1) * px;
  const x = (iso: string) => daysBetween(t0, parseDate(iso)) * px;
  // Lanes stretch to fill the card, never shrinking below the view's own
  // height; with many lines the card grows and the page scrolls instead.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardH, setCardH] = useState(0);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCardH(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const minLaneH = view.laneHeight;
  const fitLaneH = loos.length ? Math.floor((cardH - HEAD_H - 2) / loos.length) : 0;
  const laneH = Math.max(minLaneH, fitLaneH);
  const bodyH = loos.length * laneH;
  const totalH = HEAD_H + bodyH;
  const today = todayIso();

  // Semantic density by view: dots -> labelled dots -> dates and owners.
  const sparse = px < 1; // 5y / 3y
  const showMeta = ['quarter', 'month'].includes(view.id);

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

  // ---- key task placement ----
  // Labels sit just below the line and step out in tiers when crowded. A
  // lane that still cannot show every label at full size compresses them:
  // first narrower with the title only, then a single truncated line. Each
  // step fits more per tier and more tiers per lane. Only after that does
  // a label give way to its dot.
  const labelOffset = sparse ? 8 : 10; // dot centre to label edge
  const labelStyles = useMemo(() => {
    // Block heights: up to two title lines, plus date and owner when shown.
    const full = { mode: 'full' as LabelMode, width: sparse ? 82 : showMeta ? 132 : 110, blockH: sparse ? 25 : showMeta ? 46 : 31 };
    const narrow = { mode: 'narrow' as LabelMode, width: sparse ? 64 : 92, blockH: sparse ? 22 : 30 };
    const oneline = { mode: 'oneline' as LabelMode, width: sparse ? 64 : 92, blockH: sparse ? 13 : 15 };
    return [full, narrow, oneline].map((s) => {
      const tierH = s.blockH + 4;
      return {
        ...s,
        tierH,
        maxBelow: tiersThatFit(laneH * (1 - LINE_AT), labelOffset, s.blockH, tierH, 2),
        maxAbove: tiersThatFit(laneH * LINE_AT, labelOffset, s.blockH, tierH, 2),
      };
    });
  }, [sparse, showMeta, laneH, labelOffset]);

  const placedByLane = useMemo(() => {
    const map = new Map<string, LaneLabels>();
    loos.forEach((loo, laneIdx) => {
      const laneTop = HEAD_H + laneIdx * laneH;
      const ms = state.milestones
        .filter((m) => m.looId === loo.id)
        .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
        .map((m) => ({ m, x: x(m.targetDate) }));
      const ids = ms.map((p) => ({ id: p.m.id, x: p.x }));
      let best: { style: typeof labelStyles[number]; slots: Map<string, LabelSlot | null>; hidden: number } | null = null;
      for (const style of labelStyles) {
        const slots = placeLabels(ids, { width: style.width + 8, gap: 6, maxBelow: style.maxBelow, maxAbove: style.maxAbove });
        const hidden = [...slots.values()].filter((s) => s === null).length;
        if (!best || hidden < best.hidden) best = { style, slots, hidden };
        if (hidden === 0) break;
      }
      const { style, slots } = best!;
      map.set(loo.id, {
        mode: style.mode,
        width: style.width,
        tierH: style.tierH,
        items: ms.map((p) => ({ m: p.m, x: p.x, slot: showLabels ? slots.get(p.m.id) ?? null : null, laneTop })),
      });
    });
    return map;
  }, [state.milestones, loos, laneH, showLabels, labelStyles, px]); // eslint-disable-line react-hooks/exhaustive-deps

  const horizons = useMemo(
    () => [...state.horizons].sort((a, b) => a.date.localeCompare(b.date)),
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

  const isEmpty = state.milestones.length === 0;

  const laneDim = (loo: LineOfOperation) => focusLooId !== null && focusLooId !== loo.id;
  const nodeOpacity = (loo: LineOfOperation, m: Milestone) => {
    if (laneDim(loo)) return 0.25;
    if (selectedMilestoneId && selectedMilestoneId !== m.id) return 0.55;
    if (selectedHorizonId) return 0.55; // horizon selected: the spine leads
    return 1;
  };

  return (
    <div className="diagram-card" ref={cardRef} style={{ minHeight: HEAD_H + loos.length * minLaneH + 2 }}>
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
          {/* calendar-year grouping: alternating bands and boundary separators */}
          {yearBands.filter((b) => b.year % 2 === 1).map((b) => (
            <div key={`yb-${b.year}`} className="year-band" style={{ left: b.x0, width: b.x1 - b.x0, top: 0, height: totalH }} />
          ))}
          {/* Month view: every other week (Monday to Sunday) carries a faint
              tint, so weeks can be counted at a glance. */}
          {weekTicks.map((tk, i) => (i % 2 === 0 ? (
            <div key={`wb-${tk.x}`} className="week-band" style={{ left: tk.x, width: 7 * px, top: 0, height: totalH }} />
          ) : null))}
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
            <div key={`g-${tk.year}-${tk.month}`} className="guide-line" style={{ left: tk.x, top: HEAD_H, height: bodyH }} />
          ))}
          {weekTicks.map((tk) => (
            <div key={`gw-${tk.x}`} className="guide-line week" style={{ left: tk.x, top: HEAD_H, height: bodyH }} />
          ))}

          {/* today marker */}
          {/* The chip sits in the top strip of the date header, above the
              day and month labels, so it never hides a date. The dashed
              line starts below the header for the same reason. */}
          <div className="today-line" style={{ left: x(today), top: HEAD_H, height: bodyH }}>
            <span className="today-chip" style={{ top: -(HEAD_H - 2) }}>Today</span>
          </div>

          {/* Strategic Objective spines: a vertical line across every lane with
              one diamond and the theme label at its head. Select first, then
              drag the diamond to move it. */}
          {horizons.map((h) => {
            const hzSelected = selectedHorizonId === h.id;
            const dx = hzSelected && hzDrag.drag?.id === h.id ? hzDrag.drag.dx : 0;
            const hx = x(h.date) + dx;
            const when = `${fmtDayMonth(h.date)} ${parseDate(h.date).getFullYear()}`;
            const title = `${TERMS.objective}: ${h.theme} · ${when}. ${hzSelected ? 'Drag to change date.' : 'Select to edit.'}`;
            return (
              <div key={h.id}>
                <div
                  className={`horizon-line${hzSelected ? ' selected' : ''}`}
                  style={{ left: hx, top: HEAD_H, height: bodyH }}
                />
                <button
                  type="button"
                  className="horizon-hit"
                  style={{ left: hx - 5, top: HEAD_H, height: bodyH }}
                  title={title}
                  aria-hidden
                  tabIndex={-1}
                  {...selectProps(() => onSelectHorizon(h.id))}
                />
                <button
                  type="button"
                  className={`horizon-endstate${hzSelected ? ' selected' : ''}`}
                  style={{ left: hx, top: HEAD_H + 14 }}
                  title={title}
                  aria-label={`${TERMS.objective} ${when}: ${h.theme}`}
                  {...(hzSelected
                    ? hzDrag.handlers(h.id)
                    : selectProps(() => onSelectHorizon(h.id)))}
                >
                  <span className="endstate-diamond" aria-hidden />
                  {showLabels && (
                    <span className="horizon-label">
                      <span className="horizon-theme">{h.theme}</span>
                      {!sparse && <span className="horizon-when">{when}</span>}
                    </span>
                  )}
                </button>
              </div>
            );
          })}

          {/* key tasks: dots on the line, labels in tiers out from it */}
          {loos.map((loo) => {
            const lane = placedByLane.get(loo.id);
            if (!lane) return null;
            const { tierH, mode } = lane;
            const labelW = lane.width;
            return lane.items.map((pl) => {
            const { m } = pl;
            const dx = msDrag.drag?.id === m.id ? msDrag.drag.dx : 0;
            const cx = pl.x + dx;
            const cy = pl.laneTop + laneH * LINE_AT;
            const dragging = msDrag.drag?.id === m.id && msDrag.drag.dx !== 0;
            const selected = selectedMilestoneId === m.id;
            const opacity = nodeOpacity(loo, m);
            const overdue = isOverdue(m, today);
            const label = `${m.title}. ${STATUS_LABEL[m.status]}${overdue ? ', overdue' : ''}, ${fmtDayMonth(m.targetDate)}, ${m.owner}.`;

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
                    {showMeta && (
                      <span className={`msb-meta${overdue ? ' overdue' : ''}`}>
                        {fmtDayMonth(m.targetDate)}{m.owner ? ` · ${m.owner}` : ''}
                      </span>
                    )}
                  </span>
                </button>
              );
            }

            // Unselected key tasks select on click only; dragging them pans
            // the canvas. Rescheduling requires selecting first.
            return (
              <div key={m.id} className="ms-point" style={{ opacity }}>
                <button
                  type="button"
                  className={`ms-dot st-icon-${m.status}${overdue ? ' overdue' : ''}`}
                  style={{ left: cx, top: cy }}
                  aria-label={`${label} Select to edit or move.`}
                  title={`${label} Select to edit or move.`}
                  {...selectProps(() => onSelectMilestone(m.id))}
                >
                  <MarkerIcon status={m.status} size={sparse ? 12 : 14} />
                </button>
                {pl.slot && pl.slot.level > 0 && (
                  // A thin leader ties an outer-tier label back to its dot.
                  <span
                    className="ms-leader"
                    aria-hidden
                    style={pl.slot.side === 'below'
                      ? { left: cx, top: cy + 8, height: labelOffset - 8 + pl.slot.level * tierH - 2 }
                      : { left: cx, top: cy - labelOffset - pl.slot.level * tierH + 2, height: labelOffset - 8 + pl.slot.level * tierH - 2 }}
                  />
                )}
                {pl.slot && (
                  <button
                    type="button"
                    className={`ms-tag${sparse ? ' compact' : ''}${mode !== 'full' ? ` ${mode}` : ''}${pl.slot.side === 'above' ? ' above' : ''}${overdue ? ' overdue' : ''}`}
                    style={{
                      left: cx,
                      top: pl.slot.side === 'above'
                        ? cy - labelOffset - pl.slot.level * tierH
                        : cy + labelOffset + pl.slot.level * tierH,
                      width: labelW,
                    }}
                    {...selectProps(() => onSelectMilestone(m.id))}
                    title={label}
                    tabIndex={-1}
                    aria-hidden
                  >
                    <span className="ms-tag-title">{m.title}</span>
                    {showMeta && mode === 'full' && (
                      <span className="ms-tag-meta">
                        {fmtDayMonth(m.targetDate)}{m.owner ? ` · ${m.owner}` : ''}
                      </span>
                    )}
                  </button>
                )}
              </div>
            );
            });
          })}
        </div>
      </div>

      {isEmpty && (
        <div className="diagram-empty" aria-live="polite">
          No {TERMS.tasksLower} yet. Add the first {TERMS.taskLower} to begin building the campaign.
        </div>
      )}
    </div>
  );
};
