import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { CampaignState, LineOfOperation, Milestone, Outcome } from '../types';
import type { ViewSpec } from '../lib/views';
import { TIMELINE_START, TIMELINE_END } from '../lib/views';
import {
  parseDate, toIso, daysBetween, addDays, monthShort, todayIso, fmtDayMonth,
} from '../lib/time';
import { OutcomeBox, OUTCOME_LABEL, IconEdit } from './icons';
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
  onSetTaskOutcome: (id: string, outcome: Outcome) => void;
  onSetObjectiveOutcome: (id: string, outcome: Outcome) => void;
  /** Continuous zoom: a new px-per-day scale, anchored at a screen x. */
  onZoom: (pxPerDay: number, clientX?: number) => void;
}

/** Safari's non-standard pinch events, used on iPad and iPhone. */
interface GestureEvt extends Event { scale: number; clientX: number }

/** Tap a box, choose: completed, didn't complete, or reopen; or edit. */
const OutcomeMenu = ({
  x, y, above, title, outcome, onChoose, onEdit, onClose,
}: {
  x: number; y: number; above: boolean; title: string; outcome: Outcome;
  onChoose: (o: Outcome) => void; onEdit: () => void; onClose: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <div
      className={`outcome-menu${above ? ' above' : ''}`}
      ref={ref}
      style={{ left: x, top: y }}
      role="menu"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="outcome-menu-title" title={title}>{title}</div>
      <button type="button" role="menuitem" className="outcome-menu-item done" onClick={() => onChoose('done')}>
        <OutcomeBox outcome="done" size={17} /> Completed
      </button>
      <button type="button" role="menuitem" className="outcome-menu-item missed" onClick={() => onChoose('missed')}>
        <OutcomeBox outcome="missed" size={17} /> Didn't complete
      </button>
      {outcome !== 'open' && (
        <button type="button" role="menuitem" className="outcome-menu-item" onClick={() => onChoose('open')}>
          <OutcomeBox outcome="open" size={17} /> Reopen
        </button>
      )}
      <div className="menu-divider" />
      <button type="button" role="menuitem" className="outcome-menu-item quiet" onClick={onEdit}>
        <IconEdit size={15} /> Edit
      </button>
    </div>
  );
};

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

/** Still open past its date: needs a decision now. */
export const isOverdue = (m: { outcome: Outcome; targetDate: string }, today: string): boolean =>
  m.outcome === 'open' && m.targetDate < today;

/** Objectives use their date the same way. */
const isObjectiveOverdue = (h: { outcome: Outcome; date: string }, today: string): boolean =>
  h.outcome === 'open' && h.date < today;

export const Diagram = ({
  state, loos, view, selectedMilestoneId, selectedHorizonId, focusLooId, showLabels, scrollRef,
  onSelectMilestone, onSelectHorizon, onMoveMilestone, onMoveHorizon, onToggleFocus,
  onSetTaskOutcome, onSetObjectiveOutcome, onZoom,
}: DiagramProps) => {
  // The tick-box menu: which box it belongs to and where it sits.
  const [menu, setMenu] = useState<{ kind: 'task' | 'objective'; id: string; x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
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
  const sparse = view.id === '3y' || view.id === '5y';
  const showMeta = ['quarter', 'month', 'week'].includes(view.id);

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

  // Alternating bands mark the unit you count in at this zoom: days in
  // Week view, weeks in Month view, months from Quarter to Year, years at
  // 3 and 5 years.
  const bandUnit: 'day' | 'week' | 'month' | 'year' = view.showDays ? 'day' : view.showWeeks ? 'week' : sparse ? 'year' : 'month';

  // Calendar-year bands, with a slightly stronger separator at each boundary.
  const yearBands = useMemo(() => {
    const bands: { year: number; x0: number; x1: number }[] = [];
    for (let y = t0.getFullYear(); y <= t1.getFullYear(); y++) {
      const start = new Date(y, 0, 1) < t0 ? t0 : new Date(y, 0, 1);
      const end = new Date(y + 1, 0, 1) > t1 ? t1 : new Date(y + 1, 0, 1);
      bands.push({ year: y, x0: daysBetween(t0, start) * px, x1: daysBetween(t0, end) * px });
    }
    return bands;
  }, [px, t0, t1]);

  // Week view: one column per day, labelled with weekday and date. Only
  // the days near the scroll position are rendered; the timeline is six
  // years long and a node per day would be thousands of elements.
  const [scrollX, setScrollX] = useState(0);
  const [viewportW, setViewportW] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const measure = () => { setScrollX(el.scrollLeft); setViewportW(el.clientWidth); };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [scrollRef]);
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayTicks = useMemo(() => {
    if (!view.showDays) return [];
    const from = Math.max(0, Math.floor((scrollX - viewportW) / px));
    const to = Math.min(daysBetween(t0, t1), Math.ceil((scrollX + 2 * viewportW) / px));
    const ticks: { x: number; label: string; weekend: boolean; odd: boolean }[] = [];
    for (let i = from; i <= to; i++) {
      const d = addDays(t0, i);
      ticks.push({ x: i * px, label: `${DAY_NAMES[d.getDay()]} ${d.getDate()}`, weekend: d.getDay() === 0 || d.getDay() === 6, odd: i % 2 === 1 });
    }
    return ticks;
  }, [view.showDays, scrollX, viewportW, px, t0, t1]);

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

  // ---- pinch, trackpad and ctrl-wheel zoom ----
  // Two fingers on the diagram change the scale; the date between them
  // stays put. iPad and iPhone send Safari's gesture events; other touch
  // browsers give two touches; a trackpad pinch arrives as a ctrl-wheel.
  const pinching = useRef(false);
  const pxRef = useRef(px);
  pxRef.current = px;
  const zoomRef = useRef(onZoom);
  zoomRef.current = onZoom;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let startPx = 0;
    let raf = 0;
    let pending: { px: number; x: number } | null = null;
    const flush = () => { raf = 0; if (pending) { zoomRef.current(pending.px, pending.x); pending = null; } };
    const queue = (p: number, x: number) => { pending = { px: p, x }; if (!raf) raf = requestAnimationFrame(flush); };
    const begin = () => { startPx = pxRef.current; pinching.current = true; panning.current = null; setIsPanning(false); };
    const end = () => { pinching.current = false; };

    const hasGestureEvents = 'GestureEvent' in window;
    const onGStart = (e: Event) => { e.preventDefault(); begin(); };
    const onGChange = (e: Event) => { e.preventDefault(); const g = e as GestureEvt; queue(startPx * g.scale, g.clientX); };
    const onGEnd = (e: Event) => { e.preventDefault(); end(); };

    let touchDist = 0;
    const dist = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const mid = (e: TouchEvent) => (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const onTStart = (e: TouchEvent) => { if (e.touches.length === 2) { touchDist = dist(e); begin(); } };
    const onTMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchDist) { e.preventDefault(); queue(startPx * (dist(e) / touchDist), mid(e)); }
    };
    const onTEnd = () => { if (touchDist) { touchDist = 0; end(); } };

    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      queue(pxRef.current * Math.exp(-e.deltaY * 0.003), e.clientX);
    };

    if (hasGestureEvents) {
      el.addEventListener('gesturestart', onGStart, { passive: false });
      el.addEventListener('gesturechange', onGChange, { passive: false });
      el.addEventListener('gestureend', onGEnd, { passive: false });
    } else {
      el.addEventListener('touchstart', onTStart, { passive: true });
      el.addEventListener('touchmove', onTMove, { passive: false });
      el.addEventListener('touchend', onTEnd);
      el.addEventListener('touchcancel', onTEnd);
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('gesturestart', onGStart);
      el.removeEventListener('gesturechange', onGChange);
      el.removeEventListener('gestureend', onGEnd);
      el.removeEventListener('touchstart', onTStart);
      el.removeEventListener('touchmove', onTMove);
      el.removeEventListener('touchend', onTEnd);
      el.removeEventListener('touchcancel', onTEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, [scrollRef]);

  // ---- background panning ----
  const panning = useRef<{ startX: number; scroll: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const onBgPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || pinching.current) return;
    const el = scrollRef.current;
    if (!el) return;
    panning.current = { startX: e.clientX, scroll: el.scrollLeft };
    setIsPanning(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onBgPointerMove = (e: ReactPointerEvent) => {
    if (!panning.current || !scrollRef.current || pinching.current) return;
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
          {/* alternating bands for the unit of this zoom, plus year separators */}
          {bandUnit === 'year' && yearBands.filter((b) => b.year % 2 === 1).map((b) => (
            <div key={`yb-${b.year}`} className="period-band" style={{ left: b.x0, width: b.x1 - b.x0, top: 0, height: totalH }} />
          ))}
          {bandUnit === 'month' && monthTicks.map((tk, i) => (i % 2 === 0 ? (
            <div key={`mb-${tk.x}`} className="period-band" style={{ left: tk.x, width: (monthTicks[i + 1]?.x ?? width) - tk.x, top: 0, height: totalH }} />
          ) : null))}
          {bandUnit === 'day' && dayTicks.map((tk) => (tk.odd ? (
            <div key={`db-${tk.x}`} className="period-band" style={{ left: tk.x, width: px, top: 0, height: totalH }} />
          ) : null))}
          {bandUnit === 'week' && weekTicks.map((tk, i) => (i % 2 === 0 ? (
            <div key={`wb-${tk.x}`} className="period-band" style={{ left: tk.x, width: 7 * px, top: 0, height: totalH }} />
          ) : null))}
          {yearBands.slice(1).map((b) => (
            <div key={`ys-${b.year}`} className="year-sep" style={{ left: b.x0, top: 0, height: totalH }} />
          ))}

          {/* time header */}
          <div className="time-head" style={{ width }}>
            {visibleTicks.map((tk) => (
              <div key={`${tk.year}-${tk.month}`} className={`month-tick${view.showDays ? ' top' : ''}`} style={{ left: tk.x, width: sparse ? px * 91 : px * 30 }}>
                {view.showDays ? (
                  // Week view: the day row is full, so month and year share the top row.
                  <span className="year">{tk.label} {tk.year}</span>
                ) : (
                  <>
                    {(tk.month === 0 || tk === visibleTicks[0]) && <span className="year">{tk.year}</span>}
                    <span>{tk.label}</span>
                  </>
                )}
              </div>
            ))}
            {!view.showDays && weekTicks.map((tk) => (
              <div key={`w-${tk.x}`} className="week-tick" style={{ left: tk.x }}>{tk.label}</div>
            ))}
            {dayTicks.map((tk) => (
              <div key={`d-${tk.x}`} className={`day-tick${tk.weekend ? ' weekend' : ''}`} style={{ left: tk.x, width: px }}>{tk.label}</div>
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
          {dayTicks.map((tk) => (
            <div key={`gd-${tk.x}`} className="guide-line day" style={{ left: tk.x, top: HEAD_H, height: bodyH }} />
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
                  style={{ left: hx, top: HEAD_H + 16 }}
                  title={hzSelected ? title : `${TERMS.objective}: ${h.theme} · ${when}. ${OUTCOME_LABEL[h.outcome]}. Tap to mark.`}
                  aria-label={`${TERMS.objective} ${when}: ${h.theme}. ${OUTCOME_LABEL[h.outcome]}.`}
                  {...(hzSelected
                    ? hzDrag.handlers(h.id)
                    : selectProps(() => setMenu({ kind: 'objective', id: h.id, x: hx, y: HEAD_H + 16 })))}
                >
                  <OutcomeBox outcome={h.outcome} size={26} bold overdue={isObjectiveOverdue(h, today)} />
                </button>
                {showLabels && (
                  <button
                    type="button"
                    className={`horizon-label${hzSelected ? ' selected' : ''}${h.outcome === 'missed' ? ' missed' : ''}`}
                    style={{ left: hx + 17, top: HEAD_H + 16 }}
                    title={`${h.theme} · ${when}. Select to edit or move.`}
                    {...selectProps(() => onSelectHorizon(h.id))}
                  >
                    <span className="horizon-theme">{h.theme}</span>
                    {!sparse && <span className="horizon-when">{when}</span>}
                  </button>
                )}
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
            const label = `${m.title}. ${OUTCOME_LABEL[m.outcome]}${overdue ? ', overdue' : ''}, ${fmtDayMonth(m.targetDate)}, ${m.owner}.`;

            if (selected && !sparse) {
              return (
                <button
                  type="button"
                  key={m.id}
                  className={`ms-selected-box outcome-${m.outcome}${dragging ? ' dragging' : ''}`}
                  style={{ left: cx, top: cy }}
                  aria-label={`${label} Selected. Drag to reschedule.`}
                  title={`${label} Drag to reschedule.`}
                  {...msDrag.handlers(m.id)}
                >
                  <OutcomeBox outcome={m.outcome} size={18} overdue={overdue} />
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

            // The box opens the outcome menu; the label selects for editing.
            // Dragging an unselected task pans the canvas; rescheduling
            // requires selecting first.
            return (
              <div key={m.id} className="ms-point" style={{ opacity }}>
                <button
                  type="button"
                  className={`ms-box outcome-${m.outcome}`}
                  style={{ left: cx, top: cy }}
                  aria-label={`${label} Tap to mark completed or not.`}
                  title={`${label} Tap to mark.`}
                  {...selectProps(() => setMenu({ kind: 'task', id: m.id, x: cx, y: cy }))}
                >
                  <OutcomeBox outcome={m.outcome} size={sparse ? 15 : 19} overdue={overdue} />
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

          {menu && (() => {
            const task = menu.kind === 'task' ? state.milestones.find((m) => m.id === menu.id) : undefined;
            const obj = menu.kind === 'objective' ? state.horizons.find((h) => h.id === menu.id) : undefined;
            const outcome = task?.outcome ?? obj?.outcome;
            const title = task?.title ?? obj?.theme;
            if (!outcome || !title) return null;
            const above = menu.y + 190 > totalH;
            return (
              <OutcomeMenu
                x={menu.x}
                y={above ? menu.y - 16 : menu.y + 16}
                above={above}
                title={title}
                outcome={outcome}
                onChoose={(o) => {
                  if (menu.kind === 'task') onSetTaskOutcome(menu.id, o);
                  else onSetObjectiveOutcome(menu.id, o);
                  setMenu(null);
                }}
                onEdit={() => {
                  if (menu.kind === 'task') onSelectMilestone(menu.id);
                  else onSelectHorizon(menu.id);
                  setMenu(null);
                }}
                onClose={closeMenu}
              />
            );
          })()}
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
