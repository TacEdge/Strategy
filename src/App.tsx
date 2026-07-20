import { useEffect, useState } from 'react';
import { StoreProvider } from './state/store';
import { Shell } from './components/Shell';
import type { NavKey } from './components/Shell';
import { DiagramPage } from './pages/DiagramPage';
import { MilestonePage } from './pages/MilestonePage';

type Route = { name: 'diagram' } | { name: 'milestone'; id: string };

const parseHash = (): Route => {
  const h = window.location.hash;
  const match = h.match(/^#\/milestone\/(.+)$/);
  if (match) return { name: 'milestone', id: decodeURIComponent(match[1]) };
  return { name: 'diagram' };
};

export const App = () => {
  const [route, setRoute] = useState<Route>(parseHash);
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<'loos' | 'milestones' | null>(null);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goDiagram = () => { window.location.hash = '/'; };
  const goMilestone = (id: string) => { window.location.hash = `/milestone/${encodeURIComponent(id)}`; };

  const onNavigate = (key: NavKey) => {
    if (key === 'campaign') { setModal(null); goDiagram(); }
    else if (key === 'loos') { goDiagram(); setModal('loos'); }
    else if (key === 'milestones') { goDiagram(); setModal('milestones'); }
    // Reviews is a placeholder in the first pass.
  };

  return (
    <StoreProvider>
      <Shell
        current={route.name === 'milestone' ? 'milestones' : modal === 'loos' ? 'loos' : modal === 'milestones' ? 'milestones' : 'campaign'}
        onNavigate={onNavigate}
        expanded={expanded && route.name === 'diagram'}
      >
        {route.name === 'diagram' ? (
          <DiagramPage
            expanded={expanded}
            onToggleExpanded={() => setExpanded((e) => !e)}
            onOpenMilestonePage={goMilestone}
            modal={modal}
            onCloseModal={() => setModal(null)}
          />
        ) : (
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
