import { useEffect, useRef, useState } from 'react';
import type { LineOfOperation } from '../types';
import { VIEWS } from '../lib/views';
import type { ViewId } from '../lib/views';
import {
  IconZoomIn, IconZoomOut, IconToday, IconChevronLeft, IconChevronRight,
  IconFilter, IconExpand, IconPlus, IconCompass,
} from './icons';

interface TimeControlsProps {
  viewId: ViewId;
  loos: LineOfOperation[];
  visibleLooIds: Set<string>;
  expanded: boolean;
  onView: (id: ViewId) => void;
  onZoom: (dir: -1 | 1) => void;
  onToday: () => void;
  onPan: (dir: -1 | 1) => void;
  onToggleLoo: (id: string) => void;
  onShowAllLoos: () => void;
  onToggleExpanded: () => void;
  onAddMilestone: () => void;
  onAddHorizon: () => void;
  onPriority: () => void;
}

export const TimeControls = ({
  viewId, loos, visibleLooIds, expanded,
  onView, onZoom, onToday, onPan, onToggleLoo, onShowAllLoos,
  onToggleExpanded, onAddMilestone, onAddHorizon, onPriority,
}: TimeControlsProps) => {
  const [filterOpen, setFilterOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [filterOpen]);

  return (
    <div className="diagram-toolbar">
      <div className="view-switch" role="group" aria-label="Time range">
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

      <div className="toolbar-group" role="group" aria-label="Zoom and pan">
        <button type="button" className="icon-btn" onClick={() => onZoom(-1)} title="Zoom out" aria-label="Zoom out"><IconZoomOut size={15} /></button>
        <button type="button" className="icon-btn" onClick={() => onZoom(1)} title="Zoom in" aria-label="Zoom in"><IconZoomIn size={15} /></button>
        <button type="button" className="icon-btn" onClick={() => onPan(-1)} title="Pan earlier" aria-label="Pan earlier"><IconChevronLeft size={15} /></button>
        <button type="button" className="icon-btn" onClick={() => onPan(1)} title="Pan later" aria-label="Pan later"><IconChevronRight size={15} /></button>
        <button type="button" className="btn-quiet" onClick={onToday} title="Scroll to today">
          <IconToday size={14} /> Today
        </button>
      </div>

      <div className="filter-pop" ref={popRef}>
        <div className="toolbar-group">
          <button
            type="button"
            className="btn-quiet"
            onClick={() => setFilterOpen((o) => !o)}
            aria-expanded={filterOpen}
            title="Filter Lines of Operation"
          >
            <IconFilter size={14} /> Filter LOOs
            {visibleLooIds.size < loos.length && ` (${visibleLooIds.size})`}
          </button>
        </div>
        {filterOpen && (
          <div className="filter-menu" role="group" aria-label="Filter Lines of Operation">
            <span className="eyebrow filter-menu-label">Show lines</span>
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
            <div className="filter-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={onShowAllLoos}>Show all</button>
            </div>
          </div>
        )}
      </div>

      <div className="toolbar-group">
        <button type="button" className="icon-btn" onClick={onToggleExpanded} title={expanded ? 'Exit expanded diagram' : 'Expand diagram'} aria-label={expanded ? 'Exit expanded diagram' : 'Expand diagram'} aria-pressed={expanded}>
          <IconExpand size={15} />
        </button>
      </div>

      <div className="toolbar-spacer" />

      <button type="button" className="btn btn-secondary" onClick={onAddMilestone}>
        <IconPlus size={14} /> Add milestone
      </button>
      <button type="button" className="btn btn-secondary" onClick={onAddHorizon}>
        <IconPlus size={14} /> Add horizon
      </button>
      <button type="button" className="priority-btn" onClick={onPriority}>
        <IconCompass size={16} /> What should I do now?
      </button>
    </div>
  );
};
