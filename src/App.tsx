import { useEffect, useState } from 'react';
import { StoreProvider } from './state/store';
import { Shell } from './components/Shell';
import type { NavKey } from './components/Shell';
import { DiagramPage } from './pages/DiagramPage';
import { MilestonePage } from './pages/MilestonePage';
import { TodayPage } from './pages/TodayPage';
import { ReviewPage } from './pages/ReviewPage';
import { NowPanel } from './components/NowPanel';

type Route =
  | { name: 'today' }
  | { name: 'diagram' }
  | { name: 'review' }
  | { name: 'milestone'; id: string };

const parseHash = (): Route => {
  const h = window.location.hash;
  const match = h.match(/^#\/milestone\/(.+)$/);
  if (match) return { name: 'milestone', id: decodeURIComponent(match[1]) };
  if (h.startsWith('#/campaign') || h.startsWith('#/diagram')) return { name: 'diagram' };
  if (h.startsWith('#/review')) return { name: 'review' };
  return { name: 'today' };
};

const PAGE_LABEL: Record<Route['name'], string> = {
  today: 'Today',
  diagram: 'LOO Diagram',
  review: 'Weekly Review',
  milestone: 'Milestone',
};

export const App = () => {
  const [route, setRoute] = useState<Route>(parseHash);
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<'loos' | 'milestones' | null>(null);
  const [nowOpen, setNowOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goToday = () => { window.location.hash = '/'; };
  const goDiagram = () => { window.location.hash = '/campaign'; };
  const goReview = () => { window.location.hash = '/review'; };
  const goMilestone = (id: string) => { window.location.hash = `/milestone/${encodeURIComponent(id)}`; };

  const onNavigate = (key: NavKey) => {
    setModal(null);
    if (key === 'today') goToday();
    else if (key === 'campaign') goDiagram();
    else if (key === 'loos') { goDiagram(); setModal('loos'); }
    else if (key === 'milestones') { goDiagram(); setModal('milestones'); }
    else if (key === 'reviews') goReview();
  };

  const current: NavKey =
    route.name === 'today' ? 'today'
      : route.name === 'review' ? 'reviews'
        : route.name === 'milestone' ? 'milestones'
          : modal === 'loos' ? 'loos'
            : modal === 'milestones' ? 'milestones'
              : 'campaign';

  return (
    <StoreProvider>
      <Shell
        current={current}
        pageLabel={PAGE_LABEL[route.name]}
        onNavigate={onNavigate}
        onOpenNow={() => setNowOpen(true)}
        expanded={expanded && route.name === 'diagram'}
      >
        {route.name === 'today' && (
          <TodayPage
            onOpenMilestone={goMilestone}
            onOpenDiagram={goDiagram}
            onOpenNow={() => setNowOpen(true)}
          />
        )}
        {route.name === 'diagram' && (
          <DiagramPage
            expanded={expanded}
            onToggleExpanded={() => setExpanded((e) => !e)}
            onOpenMilestonePage={goMilestone}
            onOpenNow={() => setNowOpen(true)}
            modal={modal}
            onCloseModal={() => setModal(null)}
          />
        )}
        {route.name === 'review' && (
          <ReviewPage onOpenMilestone={goMilestone} onOpenDiagram={goDiagram} />
        )}
        {route.name === 'milestone' && (
          <MilestonePage
            milestoneId={route.id}
            onBack={goDiagram}
            onOpenMilestone={goMilestone}
            onOpenNow={() => setNowOpen(true)}
          />
        )}
      </Shell>
      {nowOpen && (
        <NowPanel onClose={() => setNowOpen(false)} onOpenMilestone={goMilestone} />
      )}
    </StoreProvider>
  );
};
