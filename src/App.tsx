import { useEffect, useState } from 'react';
import { StoreProvider } from './state/store';
import { Shell } from './components/Shell';
import type { NavKey } from './components/Shell';
import { DiagramPage } from './pages/DiagramPage';
import { MilestonesPage } from './pages/MilestonesPage';
import { ReviewPage } from './pages/ReviewPage';

type Route =
  | { name: 'diagram'; milestoneId: string | null; horizonId: string | null }
  | { name: 'review' }
  | { name: 'tasks' };

const parseHash = (): Route => {
  const h = window.location.hash;
  // Older links to the retired milestone workspace open the key task on the diagram.
  const legacy = h.match(/^#\/milestone\/([^?]+)/);
  if (legacy) return { name: 'diagram', milestoneId: decodeURIComponent(legacy[1]), horizonId: null };
  if (h.startsWith('#/review')) return { name: 'review' };
  // #/tasks is the Key Tasks list; older #/milestones and #/progress links still land there.
  if (h.startsWith('#/tasks') || h.startsWith('#/milestones') || h.startsWith('#/progress')) return { name: 'tasks' };
  // The diagram opens neutral; ?milestone= / ?horizon= deep links open a panel.
  const params = new URLSearchParams(h.split('?')[1] ?? '');
  return {
    name: 'diagram',
    milestoneId: params.get('milestone'),
    horizonId: params.get('horizon'),
  };
};

export const App = () => {
  const [route, setRoute] = useState<Route>(parseHash);
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<'loos' | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goDiagram = () => { window.location.hash = '/'; };
  const goReview = () => { window.location.hash = '/review'; };
  const goTasks = () => { window.location.hash = '/tasks'; };
  const goMilestone = (id: string) => { window.location.hash = `/?milestone=${encodeURIComponent(id)}`; };

  const onNavigate = (key: NavKey) => {
    setModal(null);
    if (key === 'campaign') goDiagram();
    else if (key === 'loos') { goDiagram(); setModal('loos'); }
    else if (key === 'tasks') goTasks();
    else if (key === 'reviews') goReview();
  };

  const current: NavKey =
    route.name === 'review' ? 'reviews'
      : route.name === 'tasks' ? 'tasks'
        : modal === 'loos' ? 'loos'
          : 'campaign';

  return (
    <StoreProvider>
      <Shell
        current={current}
        onNavigate={onNavigate}
        expanded={expanded && route.name === 'diagram'}
      >
        {route.name === 'diagram' && (
          <DiagramPage
            expanded={expanded}
            onToggleExpanded={() => setExpanded((e) => !e)}
            initialMilestoneId={route.milestoneId}
            initialHorizonId={route.horizonId}
            modal={modal}
            onCloseModal={() => setModal(null)}
          />
        )}
        {route.name === 'tasks' && (
          <MilestonesPage onOpenMilestone={goMilestone} />
        )}
        {route.name === 'review' && (
          <ReviewPage onOpenMilestone={goMilestone} onOpenDiagram={goDiagram} />
        )}
      </Shell>
    </StoreProvider>
  );
};
