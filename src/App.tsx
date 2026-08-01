import { useEffect, useState } from 'react';
import { StoreProvider } from './state/store';
import { Shell } from './components/Shell';
import type { NavKey } from './components/Shell';
import { DiagramPage } from './pages/DiagramPage';
import { MilestonePage } from './pages/MilestonePage';
import { ReviewPage } from './pages/ReviewPage';
import { ProgressPage } from './pages/ProgressPage';

type Route =
  | { name: 'diagram'; milestoneId: string | null; horizonId: string | null }
  | { name: 'review' }
  | { name: 'progress' }
  | { name: 'milestone'; id: string };

const parseHash = (): Route => {
  const h = window.location.hash;
  const match = h.match(/^#\/milestone\/([^?]+)/);
  if (match) return { name: 'milestone', id: decodeURIComponent(match[1]) };
  if (h.startsWith('#/review')) return { name: 'review' };
  if (h.startsWith('#/progress')) return { name: 'progress' };
  // The diagram opens neutral; ?milestone= / ?horizon= deep links open a drawer.
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
  const goProgress = () => { window.location.hash = '/progress'; };
  const goMilestone = (id: string) => { window.location.hash = `/milestone/${encodeURIComponent(id)}`; };

  const onNavigate = (key: NavKey) => {
    setModal(null);
    if (key === 'campaign') goDiagram();
    else if (key === 'loos') { goDiagram(); setModal('loos'); }
    else if (key === 'milestones') goProgress();
    else if (key === 'reviews') goReview();
  };

  const current: NavKey =
    route.name === 'review' ? 'reviews'
      : route.name === 'progress' || route.name === 'milestone' ? 'milestones'
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
            onOpenMilestonePage={goMilestone}
            initialMilestoneId={route.milestoneId}
            initialHorizonId={route.horizonId}
            modal={modal}
            onCloseModal={() => setModal(null)}
          />
        )}
        {route.name === 'progress' && (
          <ProgressPage onOpenMilestone={goMilestone} />
        )}
        {route.name === 'review' && (
          <ReviewPage onOpenMilestone={goMilestone} onOpenDiagram={goDiagram} />
        )}
        {route.name === 'milestone' && (
          <MilestonePage
            milestoneId={route.id}
            onBack={goDiagram}
            onOpenMilestone={goMilestone}
          />
        )}
      </Shell>
    </StoreProvider>
  );
};
