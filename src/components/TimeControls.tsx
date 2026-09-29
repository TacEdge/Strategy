import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { LineOfOperation } from '../types';
import { IconToday, IconFilter, IconExpand, IconPlus, IconExport, IconZoomIn, IconZoomOut } from './icons';
import { TERMS } from '../lib/terms';

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
  /** Name of the nearest zoom level, e.g. "Month". */
  zoomLabel: string;
  canZoomIn: boolean;
  canZoomOut: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  loos: LineOfOperation[];
  visibleLooIds: Set<string>;
  expanded: boolean;
  showLabels: boolean;
  onToggleLabels: () => void;
  onToday: () => void;
  onToggleLoo: (id: string) => void;
  onFocusAll: () => void;
  onToggleExpanded: () => void;
  onAdd: (kind: 'milestone' | 'horizon') => void;
  onExport: () => void;
}

export const TimeControls = ({
  zoomLabel, canZoomIn, canZoomOut, onZoomIn, onZoomOut,
  loos, visibleLooIds, expanded, showLabels,
  onToggleLabels, onToday, onToggleLoo, onFocusAll,
  onToggleExpanded, onAdd, onExport,
}: TimeControlsProps) => {
  const [openMenu, setOpenMenu] = useState<'focus' | 'add' | null>(null);

  return (
    <div className="diagram-toolbar">
      {/* Pinch the diagram to zoom. These are for a mouse, and say where you are. */}
      <div className="view-switch" role="group" aria-label="Zoom">
        <button
          type="button"
          className="view-today"
          onClick={onToday}
          title="Scroll to today"
        >
          <IconToday size={13} /> Today
        </button>
        <button type="button" className="zoom-btn" onClick={onZoomOut} disabled={!canZoomOut} title="Zoom out" aria-label="Zoom out">
          <IconZoomOut size={15} />
        </button>
        <span className="zoom-readout" aria-live="polite" title="Pinch the diagram to zoom">{zoomLabel}</span>
        <button type="button" className="zoom-btn" onClick={onZoomIn} disabled={!canZoomIn} title="Zoom in" aria-label="Zoom in">
          <IconZoomIn size={15} />
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          className={`btn-quiet labels-toggle${showLabels ? ' on' : ''}`}
          onClick={onToggleLabels}
          aria-pressed={showLabels}
          title={showLabels ? 'Hide labels' : 'Show labels'}
        >
          Labels: {showLabels ? 'On' : 'Off'}
        </button>
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
            {TERMS.task}
          </button>
          <button type="button" className="menu-action" onClick={() => { onAdd('horizon'); setOpenMenu(null); }}>
            {TERMS.objective}
          </button>
        </Menu>
      </div>

      <div className="toolbar-group">
        <button type="button" className="btn-quiet" onClick={onExport} title="Export the diagram as a one-page PDF">
          <IconExport size={14} /> Export
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon-btn" onClick={onToggleExpanded} title={expanded ? 'Exit expanded diagram' : 'Expand diagram'} aria-label={expanded ? 'Exit expanded diagram' : 'Expand diagram'} aria-pressed={expanded}>
          <IconExpand size={15} />
        </button>
      </div>
    </div>
  );
};
