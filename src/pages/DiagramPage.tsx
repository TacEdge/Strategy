import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useStore, useLoos } from '../state/store';
import { viewForScale, clampZoom, zoomStep, ZOOM_DEFAULT, ZOOM_MIN, ZOOM_MAX, TIMELINE_START } from '../lib/views';
import { parseDate, toIso, daysBetween, todayIso } from '../lib/time';
import { TimeControls } from '../components/TimeControls';
import { Diagram } from '../components/Diagram';
import { MilestoneDrawer } from '../components/MilestoneDrawer';
import { HorizonDrawer } from '../components/HorizonDrawer';
import { AddMilestoneModal, AddHorizonModal } from '../components/AddModals';
import { LooManager } from '../components/LooManager';
import { ExportSheet } from '../components/ExportSheet';
import type { PdfInput } from '../lib/exportPdf';

export const DiagramPage = ({
  expanded, onToggleExpanded,
  initialMilestoneId = null, initialHorizonId = null,
  modal, onCloseModal,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  /** Deep-link selection from the URL; the app otherwise opens neutral. */
  initialMilestoneId?: string | null;
  initialHorizonId?: string | null;
  modal: 'loos' | null;
  onCloseModal: () => void;
}) => {
  const { state, dispatch } = useStore();
  const allLoos = useLoos();
  // Zoom is a continuous scale in px per day. The nearest named view sets
  // what is shown; the scale itself sets the size.
  const [pxPerDay, setPxPerDay] = useState(ZOOM_DEFAULT);
  const pxRef = useRef(pxPerDay);
  pxRef.current = pxPerDay;
  const [visibleLooIds, setVisibleLooIds] = useState<Set<string>>(
    () => new Set(allLoos.map((l) => l.id)),
  );
  const [focusLooId, setFocusLooId] = useState<string | null>(null);
  // Labels default on up to Year view, off at 3y/5y; the user can override.
  const [labelsOverride, setLabelsOverride] = useState<boolean | null>(null);
  // Neutral by default: panels open only on user selection or a deep link.
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(
    () => (initialMilestoneId && state.milestones.some((m) => m.id === initialMilestoneId)
      ? initialMilestoneId : null),
  );
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(
    () => (!initialMilestoneId && initialHorizonId
      && state.horizons.some((h) => h.id === initialHorizonId)
      ? initialHorizonId : null),
  );
  const [addOpen, setAddOpen] = useState<'milestone' | 'horizon' | null>(null);
  const [exportInput, setExportInput] = useState<PdfInput | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const view = useMemo(() => viewForScale(pxPerDay), [pxPerDay]);
  const showLabels = labelsOverride ?? !['3y', '5y'].includes(view.id);

  // Zoom about a point: the date under the fingers (or the centre) stays
  // put. The scroll position is corrected once the wider timeline renders.
  const pendingAnchor = useRef<{ day: number; ax: number } | null>(null);
  const zoomTo = useCallback((next: number, clientX?: number) => {
    const el = scrollRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      const ax = clientX === undefined ? rect.width / 2 : Math.min(rect.width, Math.max(0, clientX - rect.left));
      pendingAnchor.current = { day: (el.scrollLeft + ax) / pxRef.current, ax };
    }
    setPxPerDay(clampZoom(next));
  }, []);
  useLayoutEffect(() => {
    const a = pendingAnchor.current;
    const el = scrollRef.current;
    if (a && el) {
      el.scrollLeft = a.day * pxPerDay - a.ax;
      pendingAnchor.current = null;
    }
  }, [pxPerDay]);
  // The buttons zoom about Today when it is on screen, else the centre.
  const stepZoom = (dir: 1 | -1) => {
    const next = zoomStep(pxRef.current, dir);
    if (next === null) return;
    const el = scrollRef.current;
    let anchor: number | undefined;
    if (el) {
      const rect = el.getBoundingClientRect();
      const tx = (daysBetween(parseDate(TIMELINE_START), parseDate(todayIso())) + 0.5) * pxRef.current - el.scrollLeft;
      if (tx >= 0 && tx <= rect.width) anchor = rect.left + tx;
    }
    zoomTo(next, anchor);
  };

  // Newly created LOOs become visible.
  useEffect(() => {
    setVisibleLooIds((prev) => {
      const next = new Set(prev);
      allLoos.forEach((l) => { if (!prev.has(l.id)) next.add(l.id); });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allLoos.length]);

  const loos = useMemo(
    () => allLoos.filter((l) => visibleLooIds.has(l.id)),
    [allLoos, visibleLooIds],
  );

  const scrollToDate = useCallback((iso: string, ratio = 0.3) => {
    const el = scrollRef.current;
    if (!el) return;
    const x = (daysBetween(parseDate(TIMELINE_START), parseDate(iso)) + 0.5) * view.pxPerDay;
    el.scrollLeft = Math.max(0, x - el.clientWidth * ratio);
  }, [view.pxPerDay]);

  // Week view opens on this week's Monday; every other view puts today
  // about a third of the way in.
  const scrollHome = useCallback(() => {
    if (view.id === 'week') {
      // Monday of this week, with room to the left for Monday's own labels.
      const d = parseDate(todayIso());
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const w = scrollRef.current?.clientWidth ?? 1000;
      scrollToDate(toIso(d), Math.min(0.2, 90 / w));
    } else {
      scrollToDate(todayIso());
    }
  }, [view.id, scrollToDate]);

  // Land on today once, when the diagram first opens. Zooming keeps its
  // own anchor, so the view never jumps back to today mid-pinch.
  useEffect(() => { scrollHome(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectMilestone = (id: string) => {
    setSelectedHorizonId(null);
    setSelectedMilestoneId((cur) => (cur === id ? null : id));
  };
  const selectHorizon = (id: string) => {
    setSelectedMilestoneId(null);
    setSelectedHorizonId((cur) => (cur === id ? null : id));
  };
  const closePanels = () => { setSelectedMilestoneId(null); setSelectedHorizonId(null); };

  // Export exactly what is on screen: the visible date window, the visible
  // lines, and the current label setting.
  const openExport = () => {
    const el = scrollRef.current;
    if (!el) return;
    closePanels();
    setExportInput({
      loos,
      milestones: state.milestones,
      horizons: state.horizons,
      view,
      startDay: el.scrollLeft / view.pxPerDay,
      days: el.clientWidth / view.pxPerDay,
      showLabels,
      today: todayIso(),
    });
  };

  // Adding is fire-and-forget: the new item lands on the diagram and the
  // timeline scrolls to it if it is out of view. No panel opens.
  const revealDate = (iso: string) => {
    const el = scrollRef.current;
    if (!el) return;
    const x = (daysBetween(parseDate(TIMELINE_START), parseDate(iso)) + 0.5) * view.pxPerDay;
    if (x < el.scrollLeft + 40 || x > el.scrollLeft + el.clientWidth - 40) scrollToDate(iso, 0.5);
  };

  // Voice commands add from the top bar; bring what they added into view.
  const revealRef = useRef(revealDate);
  revealRef.current = revealDate;
  useEffect(() => {
    const onReveal = (e: Event) => {
      const iso = (e as CustomEvent<{ date: string }>).detail?.date;
      if (iso) revealRef.current(iso);
    };
    window.addEventListener('tacedge:reveal', onReveal);
    return () => window.removeEventListener('tacedge:reveal', onReveal);
  }, []);

  return (
    <div className="page diagram-page">
      <TimeControls
        zoomLabel={view.label}
        canZoomIn={pxPerDay < ZOOM_MAX * 0.999}
        canZoomOut={pxPerDay > ZOOM_MIN * 1.001}
        onZoomIn={() => stepZoom(1)}
        onZoomOut={() => stepZoom(-1)}
        loos={allLoos}
        visibleLooIds={visibleLooIds}
        expanded={expanded}
        showLabels={showLabels}
        onToggleLabels={() => setLabelsOverride(!showLabels)}
        onToday={scrollHome}
        onToggleLoo={(id) => setVisibleLooIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
          return next;
        })}
        onFocusAll={() => { setVisibleLooIds(new Set(allLoos.map((l) => l.id))); setFocusLooId(null); }}
        onToggleExpanded={onToggleExpanded}
        onAdd={(kind) => { closePanels(); setAddOpen(kind); }}
        onExport={openExport}
      />

      <Diagram
        state={state}
        loos={loos}
        view={view}
        selectedMilestoneId={selectedMilestoneId}
        selectedHorizonId={selectedHorizonId}
        focusLooId={focusLooId}
        showLabels={showLabels}
        scrollRef={scrollRef}
        onSelectMilestone={selectMilestone}
        onSelectHorizon={selectHorizon}
        onMoveMilestone={(id, iso) => dispatch({ type: 'milestone/update', id, patch: { targetDate: iso } })}
        onMoveHorizon={(id, iso) => dispatch({ type: 'horizon/update', id, patch: { date: iso } })}
        onToggleFocus={(id) => setFocusLooId((cur) => (cur === id ? null : id))}
        onZoom={zoomTo}
        onSetTaskOutcome={(id, outcome) => dispatch({ type: 'milestone/update', id, patch: { outcome } })}
        onSetObjectiveOutcome={(id, outcome) => dispatch({ type: 'horizon/update', id, patch: { outcome } })}
      />

      {selectedMilestoneId && (
        <MilestoneDrawer
          milestoneId={selectedMilestoneId}
          onClose={() => setSelectedMilestoneId(null)}
        />
      )}
      {selectedHorizonId && (
        <HorizonDrawer
          horizonId={selectedHorizonId}
          onClose={() => setSelectedHorizonId(null)}
        />
      )}
      {addOpen === 'milestone' && (
        <AddMilestoneModal
          onClose={() => setAddOpen(null)}
          defaultLooId={focusLooId}
          onCreated={(m) => revealDate(m.targetDate)}
        />
      )}
      {addOpen === 'horizon' && (
        <AddHorizonModal onClose={() => setAddOpen(null)} onCreated={(h) => revealDate(h.date)} />
      )}

      {exportInput && <ExportSheet input={exportInput} onClose={() => setExportInput(null)} />}

      {modal === 'loos' && <LooManager onClose={onCloseModal} />}
    </div>
  );
};
