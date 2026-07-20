import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useLoos } from '../state/store';
import { VIEWS, viewById, TIMELINE_START } from '../lib/views';
import type { ViewId } from '../lib/views';
import { parseDate, daysBetween, todayIso } from '../lib/time';
import { TimeControls } from '../components/TimeControls';
import { Diagram, DiagramLegend } from '../components/Diagram';
import { InsightsStrip } from '../components/InsightsStrip';
import { MilestoneDrawer } from '../components/MilestoneDrawer';
import { HorizonDrawer } from '../components/HorizonDrawer';
import { AddMilestoneModal, AddHorizonModal } from '../components/AddModals';
import { LooManager } from '../components/LooManager';
import { MilestoneListModal } from '../components/MilestoneListModal';

export const DiagramPage = ({
  expanded, onToggleExpanded, onOpenMilestonePage,
  modal, onCloseModal,
}: {
  expanded: boolean;
  onToggleExpanded: () => void;
  onOpenMilestonePage: (id: string) => void;
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
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>('ms-mv-3');
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<'milestone' | 'horizon' | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const view = viewById(viewId);

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

  // Views are ordered near-term to long-term: zooming in steps toward Month.
  const zoom = (dir: -1 | 1) => {
    const idx = VIEWS.findIndex((v) => v.id === viewId);
    setViewId(VIEWS[Math.min(VIEWS.length - 1, Math.max(0, idx - dir))].id);
  };

  const selectMilestone = (id: string) => {
    setSelectedHorizonId(null);
    setSelectedMilestoneId((cur) => (cur === id ? null : id));
  };
  const selectHorizon = (id: string) => {
    setSelectedMilestoneId(null);
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
        onView={setViewId}
        onZoom={zoom}
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
        scrollRef={scrollRef}
        onSelectMilestone={selectMilestone}
        onSelectHorizon={selectHorizon}
        onMoveMilestone={(id, iso) => dispatch({ type: 'milestone/move-date', id, targetDate: iso })}
        onMoveHorizon={(id, iso) => dispatch({ type: 'horizon/update', id, patch: { date: iso } })}
        onToggleFocus={(id) => setFocusLooId((cur) => (cur === id ? null : id))}
      />

      <DiagramLegend />

      {!expanded && <InsightsStrip />}

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
          onClose={() => setSelectedHorizonId(null)}
          onSelectMilestone={(id) => { setSelectedHorizonId(null); setSelectedMilestoneId(id); }}
        />
      )}
      {addOpen === 'milestone' && (
        <AddMilestoneModal onClose={() => setAddOpen(null)} onCreated={(id) => { setSelectedHorizonId(null); setSelectedMilestoneId(id); }} />
      )}
      {addOpen === 'horizon' && (
        <AddHorizonModal onClose={() => setAddOpen(null)} onCreated={selectHorizon} />
      )}

      {modal === 'loos' && <LooManager onClose={onCloseModal} />}
      {modal === 'milestones' && (
        <MilestoneListModal onClose={onCloseModal} onOpen={onOpenMilestonePage} />
      )}
    </div>
  );
};
