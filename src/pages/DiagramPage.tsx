import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useLoos } from '../state/store';
import { viewById, TIMELINE_START } from '../lib/views';
import type { ViewId } from '../lib/views';
import { parseDate, daysBetween, todayIso } from '../lib/time';
import { TimeControls } from '../components/TimeControls';
import { Diagram, DiagramLegend } from '../components/Diagram';
import { MilestoneDrawer } from '../components/MilestoneDrawer';
import { HorizonDrawer } from '../components/HorizonDrawer';
import { AddMilestoneModal, AddHorizonModal } from '../components/AddModals';
import { FinanceModal } from '../components/FinanceModal';
import { LooManager } from '../components/LooManager';
import { MilestoneListModal } from '../components/MilestoneListModal';

export const DiagramPage = ({
  expanded, onToggleExpanded, onOpenMilestonePage,
  initialMilestoneId = null, initialHorizonId = null,
  modal, onCloseModal,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpenMilestonePage: (id: string) => void;
  /** Deep-link selection from the URL; the app otherwise opens neutral. */
  initialMilestoneId?: string | null;
  initialHorizonId?: string | null;
  modal: 'loos' | 'milestones' | null;
  onCloseModal: () => void;
}) => {
  const { state, dispatch } = useStore();
  const allLoos = useLoos();
  const [viewId, setViewId] = useState<ViewId>('6m');
  const [visibleLooIds, setVisibleLooIds] = useState<Set<string>>(
    () => new Set(allLoos.map((l) => l.id)),
  );
  const [focusLooId, setFocusLooId] = useState<string | null>(null);
  const [showAllDeps, setShowAllDeps] = useState(false);
  // Labels default on up to Year view, off at 3y/5y; the user can override.
  const [labelsOverride, setLabelsOverride] = useState<boolean | null>(null);
  // Neutral by default: drawers open only on user selection or a deep link.
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
  const [financeOpen, setFinanceOpen] = useState(false);
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

  const [horizonFocusLooId, setHorizonFocusLooId] = useState<string | null>(null);

  const selectMilestone = (id: string) => {
    setSelectedHorizonId(null);
    setHorizonFocusLooId(null);
    setSelectedMilestoneId((cur) => (cur === id ? null : id));
  };
  const selectHorizon = (id: string, focusLooId?: string) => {
    setSelectedMilestoneId(null);
    setHorizonFocusLooId(focusLooId ?? null);
    setSelectedHorizonId(id);
  };

  return (
    <div className="page">
      <TimeControls
        viewId={viewId}
        loos={allLoos}
        visibleLooIds={visibleLooIds}
        expanded={expanded}
        showAllDeps={showAllDeps}
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
        onToggleAllDeps={() => setShowAllDeps((s) => !s)}
        onToggleExpanded={onToggleExpanded}
        onAdd={setAddOpen}
      />

      <Diagram
        state={state}
        loos={loos}
        view={view}
        selectedMilestoneId={selectedMilestoneId}
        selectedHorizonId={selectedHorizonId}
        focusLooId={focusLooId}
        showAllDeps={showAllDeps}
        showLabels={showLabels}
        scrollRef={scrollRef}
        onSelectMilestone={selectMilestone}
        onSelectHorizon={selectHorizon}
        onMoveMilestone={(id, iso) => dispatch({ type: 'milestone/move-date', id, targetDate: iso })}
        onMoveHorizon={(id, iso) => dispatch({ type: 'horizon/update', id, patch: { date: iso } })}
        onToggleFocus={(id) => setFocusLooId((cur) => (cur === id ? null : id))}
        onEditFinance={() => setFinanceOpen(true)}
      />

      <DiagramLegend />

      {selectedMilestoneId && (
        <MilestoneDrawer
          milestoneId={selectedMilestoneId}
          onClose={() => setSelectedMilestoneId(null)}
          onOpenFull={onOpenMilestonePage}
          onSelectMilestone={(id) => { setSelectedHorizonId(null); setSelectedMilestoneId(id); }}
        />
      )}
      {selectedHorizonId && (
        <HorizonDrawer
          horizonId={selectedHorizonId}
          focusLooId={horizonFocusLooId}
          onClose={() => { setSelectedHorizonId(null); setHorizonFocusLooId(null); }}
          onSelectMilestone={(id) => { setSelectedHorizonId(null); setHorizonFocusLooId(null); setSelectedMilestoneId(id); }}
        />
      )}
      {addOpen === 'milestone' && (
        <AddMilestoneModal onClose={() => setAddOpen(null)} onCreated={(id) => { setSelectedHorizonId(null); setSelectedMilestoneId(id); }} />
      )}
      {addOpen === 'horizon' && (
        <AddHorizonModal onClose={() => setAddOpen(null)} onCreated={selectHorizon} />
      )}

      {financeOpen && <FinanceModal onClose={() => setFinanceOpen(false)} />}

      {modal === 'loos' && <LooManager onClose={onCloseModal} />}
      {modal === 'milestones' && (
        <MilestoneListModal onClose={onCloseModal} onOpen={onOpenMilestonePage} />
      )}
    </div>
  );
};
