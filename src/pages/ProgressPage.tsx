import { useMemo, useState } from 'react';
import type { Milestone, MilestonePriority, MilestoneStatus } from '../types';
import { useStore, useLoos } from '../state/store';
import { fmtDate, fmtDayMonth, parseDate, daysBetween, todayIso } from '../lib/time';
import { MarkerIcon } from '../components/icons';
import { ProgressBar, PRIORITY_LABEL, STATUS_LABEL } from '../components/ui';

const PRIORITY_ORDER: Record<MilestonePriority, number> = { critical: 0, important: 1, routine: 2 };
const STATUS_ORDER: Record<MilestoneStatus, number> = {
  blocked: 0, 'at-risk': 1, active: 2, future: 3, superseded: 4, complete: 5, archived: 6,
};

/** Auto-registered freshness from the milestone's change history. */
const lastUpdated = (m: Milestone): string =>
  m.history.length ? m.history[m.history.length - 1].at : '';

const fmtAgo = (stamp: string, today: Date): string => {
  if (!stamp) return '—';
  const d = new Date(stamp);
  const days = daysBetween(new Date(d.getFullYear(), d.getMonth(), d.getDate()), today);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days}d ago`;
  return fmtDayMonth(stamp.slice(0, 10));
};

export const ProgressPage = ({ onOpenMilestone }: { onOpenMilestone: (id: string) => void }) => {
  const { state } = useStore();
  const loos = useLoos();
  const [looFilter, setLooFilter] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);

  const today = parseDate(todayIso());

  const open = useMemo(
    () => state.milestones.filter((m) => m.status !== 'archived'),
    [state.milestones],
  );

  const isOverdue = (m: Milestone) =>
    !['complete', 'superseded'].includes(m.status) && parseDate(m.targetDate) < today;
  const needsAttention = (m: Milestone) =>
    m.status === 'at-risk' || m.status === 'blocked' || isOverdue(m);

  const rows = useMemo(() => {
    let list = open.filter((m) => m.status !== 'superseded');
    if (looFilter !== 'all') list = list.filter((m) => m.looId === looFilter);
    if (attentionOnly) list = list.filter(needsAttention);
    return [...list].sort((a, b) =>
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      || STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
      || a.targetDate.localeCompare(b.targetDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, looFilter, attentionOnly]);

  // Summary counts follow the tracker: bands exclude completed work.
  const live = open.filter((m) => !['complete', 'superseded'].includes(m.status));
  const bandCount = (p: MilestonePriority) => live.filter((m) => m.priority === p).length;
  const complete = open.filter((m) => m.status === 'complete').length;
  const pressure = live.filter((m) => m.status === 'at-risk' || m.status === 'blocked').length;
  const avgProgress = live.length
    ? Math.round(live.reduce((s, m) => s + m.progress, 0) / live.length)
    : 0;

  const nextTask = (m: Milestone) => {
    const t = m.tasks.find((x) => !x.done);
    if (t) return t.owner ? `${t.title} · ${t.owner}` : t.title;
    return m.nextBestAction || '';
  };

  return (
    <div className="page progress-page">
      <div className="pv-head">
        <h1 className="pv-title">Progress</h1>
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
            Needs attention{pressure > 0 ? ` · ${pressure}` : ''}
          </button>
        </div>
      </div>

      <div className="pv-stats">
        {([['Critical', bandCount('critical')], ['Important', bandCount('important')], ['Routine', bandCount('routine')]] as const)
          .map(([label, n]) => (
            <div key={label} className="pv-stat">
              <span className="pv-stat-num">{n}</span>
              <span className="pv-stat-label">{label}</span>
            </div>
          ))}
        <div className="pv-stat">
          <span className="pv-stat-num">{pressure}</span>
          <span className="pv-stat-label">At risk / blocked</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat-num">{avgProgress}%</span>
          <span className="pv-stat-label">Average progress</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat-num">{complete}</span>
          <span className="pv-stat-label">Complete</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-note">
          {open.length === 0
            ? 'No milestones yet. Add the first milestone to begin building the campaign.'
            : 'Nothing matches the current filter.'}
        </p>
      ) : (
        <div className="pv-table" role="table" aria-label="Milestone progress">
          <div className="pv-row pv-row-head" role="row">
            <span />
            <span>Milestone</span>
            <span>LOO</span>
            <span>Priority</span>
            <span>Target</span>
            <span>Progress</span>
            <span>Next task</span>
            <span>Updated</span>
          </div>
          {rows.map((m) => {
            const loo = state.loos.find((l) => l.id === m.looId);
            const overdue = isOverdue(m);
            const delta = daysBetween(today, parseDate(m.targetDate));
            const updated = lastUpdated(m);
            return (
              <button
                type="button"
                key={m.id}
                className={`pv-row${needsAttention(m) ? ' attention' : ''}`}
                role="row"
                onClick={() => onOpenMilestone(m.id)}
                title={`${m.title}. ${STATUS_LABEL[m.status]}. Open milestone.`}
              >
                <span className={`st-icon-${m.status}`} aria-label={STATUS_LABEL[m.status]}>
                  <MarkerIcon status={m.status} size={14} />
                </span>
                <span className="pv-ms-title">{m.title}</span>
                <span className="pv-loo">{loo ? `${String(loo.number).padStart(2, '0')} ${loo.name}` : '—'}</span>
                <span className={`pv-priority ${m.priority}`}>{PRIORITY_LABEL[m.priority]}</span>
                <span className={`pv-date${overdue ? ' overdue' : ''}`}>
                  {fmtDate(m.targetDate)}
                  <span className="pv-delta">
                    {m.status === 'complete' ? '' : overdue ? ` ${-delta}d over` : ` ${delta}d`}
                  </span>
                </span>
                <span className="pv-progress">
                  <ProgressBar value={m.progress} />
                  <span className="pv-pct">{m.progress}%</span>
                </span>
                <span className="pv-next">{nextTask(m) || '—'}</span>
                <span className="pv-updated" title={updated ? new Date(updated).toLocaleString() : undefined}>
                  {fmtAgo(updated, today)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
