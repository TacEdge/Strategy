import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useLoos } from '../state/store';
import { VIEWS, viewById, TIMELINE_START } from '../lib/views';
import type { ViewId } from '../lib/views';
import { parseDate, daysBetween, todayIso } from '../lib/time';
import { ContextBanner } from '../components/ContextBanner';
import { TimeControls } from '../components/TimeControls';
import { Diagram } from '../components/Diagram';
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
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>('ms-mv-3');
  const [selectedHorizonId, setSelectedHorizonId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState<'milestone' | 'horizon' | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const view = viewById(viewId);

  // Keep the visible-set in sync as LOOs are added.
  useEffect(() => {
    setVisibleLooIds((prev) => {
      const next = new Set(prev);
      allLoos.forEach((l) => { if (!state.looOrder.includes(l.id) || !prev.has(l.id)) {
        // newly created LOOs become visible
        if (![...prev].includes(l.id)) next.add(l.id);
      } });
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

  // On view change, keep today in frame.
  useEffect(() => { scrollToDate(todayIso()); }, [scrollToDate]);

  const zoom = (dir: -1 | 1) => {
    const idx = VIEWS.findIndex((v) => v.id === viewId);
    const next = VIEWS[Math.min(VIEWS.length - 1, Math.max(0, idx + dir))];
    setViewId(next.id);
  };

  const pan = (dir: -1 | 1) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' });
  };

  const selectMilestone = (id: string) => {
    setSelectedHorizonId(null);
    setSelectedMilestoneId(id);
  };
  const selectHorizon = (id: string) => {
    setSelectedMilestoneId(null);
    setSelectedHorizonId(id);
  };

  return (
    <div className="page">
      {!expanded && <ContextBanner state={state} />}

      <TimeControls
        viewId={viewId}
        loos={allLoos}
        visibleLooIds={visibleLooIds}
        expanded={expanded}
        onView={setViewId}
        onZoom={zoom}
        onToday={() => scrollToDate(todayIso())}
        onPan={pan}
        onToggleLoo={(id) => setVisibleLooIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) { if (next.size > 1) next.delete(id); } else next.add(id);
          return next;
        })}
        onShowAllLoos={() => setVisibleLooIds(new Set(allLoos.map((l) => l.id)))}
        onToggleExpanded={onToggleExpanded}
        onAddMilestone={() => setAddOpen('milestone')}
        onAddHorizon={() => setAddOpen('horizon')}
      />

      <Diagram
        state={state}
        loos={loos}
        view={view}
        selectedMilestoneId={selectedMilestoneId}
        focusLooId={focusLooId}
        scrollRef={scrollRef}
        onSelectMilestone={selectMilestone}
        onSelectHorizon={selectHorizon}
        onMoveMilestone={(id, iso) => dispatch({ type: 'milestone/move-date', id, targetDate: iso })}
        onMoveHorizon={(id, iso) => dispatch({ type: 'horizon/update', id, patch: { date: iso } })}
        onToggleFocus={(id) => setFocusLooId((cur) => (cur === id ? null : id))}
      />

      {!expanded && <InsightsStrip insights={state.insights} />}

      {selectedMilestoneId && (
        <MilestoneDrawer
          milestoneId={selectedMilestoneId}
          onClose={() => setSelectedMilestoneId(null)}
          onOpenFull={onOpenMilestonePage}
          onSelectMilestone={selectMilestone}
        />
      )}
      {selectedHorizonId && (
        <HorizonDrawer
          horizonId={selectedHorizonId}
          onClose={() => setSelectedHorizonId(null)}
          onSelectMilestone={selectMilestone}
        />
      )}
      {addOpen === 'milestone' && (
        <AddMilestoneModal onClose={() => setAddOpen(null)} onCreated={selectMilestone} />
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
