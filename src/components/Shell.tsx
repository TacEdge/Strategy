import type { ReactNode } from 'react';
import { IconSearch, IconBell, IconFlag, IconMenu, IconCompass, IconLink } from './icons';

export type NavKey = 'campaign' | 'loos' | 'milestones' | 'reviews';

const NAV: { key: NavKey; label: string; icon: ReactNode }[] = [
  { key: 'campaign', label: 'Campaign', icon: <IconCompass size={16} /> },
  { key: 'loos', label: 'LOOs', icon: <IconMenu size={16} /> },
  { key: 'milestones', label: 'Milestones', icon: <IconFlag size={16} /> },
  { key: 'reviews', label: 'Reviews', icon: <IconLink size={16} /> },
];

export const Shell = ({
  current, onNavigate, expanded, children,
}: {
  current: NavKey;
  onNavigate: (key: NavKey) => void;
  expanded: boolean;
  children: ReactNode;
}) => (
  <div className={`app${expanded ? ' diagram-expanded' : ''}`}>
    <header className="topbar on-dark">
      <div className="topbar-logo">
        <img src="/brand/tacedge-lockup-cream.svg" alt="TACEDGE" />
        <span className="topbar-divider" aria-hidden />
        <span className="topbar-page">LOO Diagram</span>
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-search" role="search">
        <IconSearch size={15} />
        <input type="search" placeholder="Search milestones" aria-label="Search milestones" />
      </div>
      <div className="topbar-actions">
        <button type="button" className="topbar-icon-btn" title="Notifications" aria-label="Notifications">
          <IconBell size={17} />
        </button>
        <button type="button" className="topbar-user" title="Profile and settings">
          <span className="topbar-user-avatar" aria-hidden>M</span>
          <span>Mike</span>
        </button>
      </div>
    </header>

    <nav className="nav-rail" aria-label="Primary">
      {NAV.map((item, i) => (
        <button
          type="button"
          key={item.key}
          className={`nav-item${current === item.key ? ' current' : ''}`}
          onClick={() => onNavigate(item.key)}
          aria-current={current === item.key ? 'page' : undefined}
        >
          <span className="nav-item-num">{String(i + 1).padStart(2, '0')}</span>
          {item.label}
        </button>
      ))}
      <div className="nav-rail-footer">
        <span className="eyebrow">Shared Clarity.</span>
      </div>
    </nav>

    <main className="main">{children}</main>
  </div>
);
