import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LineOfOperation } from '../types';
import { VIEWS } from '../lib/views';
import type { ViewId } from '../lib/views';
import { IconToday, IconFilter, IconExpand, IconPlus } from './icons';

/** Small anchored menu that closes on outside click or Escape. */
const Menu = ({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="filter-menu" ref={ref}>{children}</div>;
};

interface TimeControlsProps {
  viewId: ViewId;
  loos: LineOfOperation[];
  visibleLooIds: Set<string>;
  expanded: boolean;
  showAllDeps: boolean;
  onView: (id: ViewId) => void;
  onToday: () => void;
  onToggleLoo: (id: string) => void;
  onFocusAll: () => void;
  onToggleAllDeps: () => void;
  onToggleExpanded: () => void;
  onAdd: (kind: 'milestone' | 'horizon') => void;
}

export const TimeControls = ({
  viewId, loos, visibleLooIds, expanded, showAllDeps,
  onView, onToday, onToggleLoo, onFocusAll,
  onToggleAllDeps, onToggleExpanded, onAdd,
}: TimeControlsProps) => {
  const [openMenu, setOpenMenu] = useState<'focus' | 'add' | null>(null);

  return (
    <div className="diagram-toolbar">
      <div className="view-switch" role="group" aria-label="Time range">
        <button
          type="button"
          className="view-today"
          onClick={onToday}
          title="Scroll to today"
        >
          <IconToday size={13} /> Today
        </button>
        {VIEWS.map((v) => (
          <button
            type="button"
            key={v.id}
            className={viewId === v.id ? 'on' : ''}
            onClick={() => onView(v.id)}
            aria-pressed={viewId === v.id}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="filter-pop">
        <div className="toolbar-group">
          <button
            type="button"
            className="btn-quiet"
            onClick={() => setOpenMenu((m) => (m === 'focus' ? null : 'focus'))}
            aria-expanded={openMenu === 'focus'}
            title="Focus Lines of Operation"
          >
            <IconFilter size={14} /> Focus LOOs
            {visibleLooIds.size < loos.length && ` (${visibleLooIds.size})`}
          </button>
        </div>
        <Menu open={openMenu === 'focus'} onClose={() => setOpenMenu(null)}>
          <button type="button" className="menu-action" onClick={() => { onFocusAll(); setOpenMenu(null); }}>
            All LOOs
          </button>
          <div className="menu-divider" />
          {loos.map((loo) => (
            <label key={loo.id} className="filter-row">
              <input
                type="checkbox"
                checked={visibleLooIds.has(loo.id)}
                onChange={() => onToggleLoo(loo.id)}
              />
              <span>{loo.name}</span>
            </label>
          ))}
          <div className="menu-divider" />
          <label className="filter-row">
            <input type="checkbox" checked={showAllDeps} onChange={onToggleAllDeps} />
            <span>Show all dependencies</span>
          </label>
        </Menu>
      </div>

      <div className="filter-pop">
        <div className="toolbar-group">
          <button
            type="button"
            className="btn-quiet"
            onClick={() => setOpenMenu((m) => (m === 'add' ? null : 'add'))}
            aria-expanded={openMenu === 'add'}
            title="Add to the campaign"
          >
            <IconPlus size={14} /> Add
          </button>
        </div>
        <Menu open={openMenu === 'add'} onClose={() => setOpenMenu(null)}>
          <button type="button" className="menu-action" onClick={() => { onAdd('milestone'); setOpenMenu(null); }}>
            Milestone
          </button>
          <button type="button" className="menu-action" onClick={() => { onAdd('horizon'); setOpenMenu(null); }}>
            Strategic Horizon
          </button>
        </Menu>
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon-btn" onClick={onToggleExpanded} title={expanded ? 'Exit expanded diagram' : 'Expand diagram'} aria-label={expanded ? 'Exit expanded diagram' : 'Expand diagram'} aria-pressed={expanded}>
          <IconExpand size={15} />
        </button>
      </div>
    </div>
  );
};
