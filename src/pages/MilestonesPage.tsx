import { useMemo, useState } from 'react';
import type { Milestone, MilestoneStatus } from '../types';
import { useStore, useLoos } from '../state/store';
import { fmtDate, parseDate, daysBetween, todayIso } from '../lib/time';
import { MarkerIcon } from '../components/icons';
import { STATUS_LABEL } from '../components/ui';
import { isOverdue } from '../components/Diagram';

/** Attention first, then soonest. */
const STATUS_ORDER: Record<MilestoneStatus, number> = {
  blocked: 0, 'at-risk': 1, active: 2, future: 3, complete: 4,
};

/**
 * The flat list behind the diagram: every milestone, one line each,
 * sorted so what needs attention is at the top. Selecting a row opens it
 * on the diagram.
 */
export const MilestonesPage = ({ onOpenMilestone }: { onOpenMilestone: (id: string) => void }) => {
  const { state } = useStore();
  const loos = useLoos();
  const [looFilter, setLooFilter] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);

  const today = todayIso();
  const todayDate = parseDate(today);

  const needsAttention = (m: Milestone) =>
    m.status === 'at-risk' || m.status === 'blocked' || isOverdue(m, today);

  const rows = useMemo(() => {
    let list = state.milestones;
    if (looFilter !== 'all') list = list.filter((m) => m.looId === looFilter);
    if (attentionOnly) list = list.filter(needsAttention);
    return [...list].sort((a, b) =>
      Number(needsAttention(b)) - Number(needsAttention(a))
      || STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      || a.targetDate.localeCompare(b.targetDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.milestones, looFilter, attentionOnly]);

  const attention = state.milestones.filter(needsAttention).length;
  const open = state.milestones.filter((m) => m.status !== 'complete').length;
  const complete = state.milestones.length - open;

  return (
    <div className="page progress-page">
      <div className="pv-head">
        <h1 className="pv-title">Milestones</h1>
        <div className="pv-filters">
          <select
            value={looFilter}
            onChange={(e) => setLooFilter(e.target.value)}
            aria-label="Filter by Line of Operation"
          >
            <option value="all">All Lines of Operation</option>
            {loos.map((l) => <option key={l.id} value={l.id}>{String(l.number).padStart(2, '0')} {l.name}</option>)}
          </select>
          <button
            type="button"
            className={`btn btn-sm ${attentionOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setAttentionOnly((v) => !v)}
            aria-pressed={attentionOnly}
          >
            Needs attention{attention > 0 ? ` · ${attention}` : ''}
          </button>
        </div>
      </div>

      <div className="pv-stats">
        <div className="pv-stat">
          <span className="pv-stat-num">{attention}</span>
          <span className="pv-stat-label">Needs attention</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat-num">{open}</span>
          <span className="pv-stat-label">Open</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat-num">{complete}</span>
          <span className="pv-stat-label">Complete</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-note">
          {state.milestones.length === 0
            ? 'No milestones yet. Add the first milestone from the Campaign diagram.'
            : 'Nothing matches the current filter.'}
        </p>
      ) : (
        <div className="pv-table" role="table" aria-label="Milestones">
          <div className="pv-row pv-row-head" role="row">
            <span />
            <span>Milestone</span>
            <span>LOO</span>
            <span>Status</span>
            <span>Target</span>
            <span>Owner</span>
          </div>
          {rows.map((m) => {
            const loo = state.loos.find((l) => l.id === m.looId);
            const overdue = isOverdue(m, today);
            const delta = daysBetween(todayDate, parseDate(m.targetDate));
            return (
              <button
                type="button"
                key={m.id}
                className={`pv-row${needsAttention(m) ? ' attention' : ''}`}
                role="row"
                onClick={() => onOpenMilestone(m.id)}
                title={`${m.title}. ${STATUS_LABEL[m.status]}. Open on the diagram.`}
              >
                <span className={`st-icon-${m.status}`} aria-label={STATUS_LABEL[m.status]}>
                  <MarkerIcon status={m.status} size={14} />
                </span>
                <span className="pv-ms-title">{m.title}</span>
                <span className="pv-loo">{loo ? `${String(loo.number).padStart(2, '0')} ${loo.name}` : '—'}</span>
                <span className={`pv-status status-${m.status}`}>{STATUS_LABEL[m.status]}</span>
                <span className={`pv-date${overdue ? ' overdue' : ''}`}>
                  {fmtDate(m.targetDate)}
                  <span className="pv-delta">
                    {m.status === 'complete' ? '' : overdue ? ` ${-delta}d over` : ` ${delta}d`}
                  </span>
                </span>
                <span className="pv-owner">{m.owner || '—'}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
