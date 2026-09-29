import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useLoos } from '../state/store';
import { viewById, TIMELINE_START } from '../lib/views';
import type { ViewId } from '../lib/views';
import { parseDate, daysBetween, todayIso } from '../lib/time';
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
  const [viewId, setViewId] = useState<ViewId>('month');
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

  const view = viewById(viewId);
  const showLabels = labelsOverride ?? !['3y', '5y'].includes(viewId);

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
    const x = daysBetween(parseDate(TIMELINE_START), parseDate(iso)) * view.pxPerDay;
    el.scrollLeft = Math.max(0, x - el.clientWidth * ratio);
  }, [view.pxPerDay]);

  useEffect(() => { scrollToDate(todayIso()); }, [scrollToDate]);

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
    const x = daysBetween(parseDate(TIMELINE_START), parseDate(iso)) * view.pxPerDay;
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
        viewId={viewId}
        loos={allLoos}
        visibleLooIds={visibleLooIds}
        expanded={expanded}
        showLabels={showLabels}
        onToggleLabels={() => setLabelsOverride(!showLabels)}
        onView={setViewId}
        onToday={() => scrollToDate(todayIso())}
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
