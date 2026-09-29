import { useMemo, useState } from 'react';
import type { Milestone, Outcome } from '../types';
import { useStore, useLoos } from '../state/store';
import { fmtDate, parseDate, daysBetween, todayIso } from '../lib/time';
import { OutcomeBox, OUTCOME_LABEL } from '../components/icons';
import { isOverdue } from '../components/Diagram';
import { TERMS } from '../lib/terms';

/** Open work first, then what was not completed, then what was. */
const OUTCOME_ORDER: Record<Outcome, number> = { open: 0, missed: 1, done: 2 };

/**
 * The flat list behind the diagram: every key task, one line each,
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

  const needsAttention = (m: Milestone) => isOverdue(m, today);

  const rows = useMemo(() => {
    let list = state.milestones;
    if (looFilter !== 'all') list = list.filter((m) => m.looId === looFilter);
    if (attentionOnly) list = list.filter(needsAttention);
    return [...list].sort((a, b) =>
      Number(needsAttention(b)) - Number(needsAttention(a))
      || OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome]
      || a.targetDate.localeCompare(b.targetDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.milestones, looFilter, attentionOnly]);

  const attention = state.milestones.filter(needsAttention).length;
  const open = state.milestones.filter((m) => m.outcome === 'open').length;
  const done = state.milestones.filter((m) => m.outcome === 'done').length;
  const missed = state.milestones.filter((m) => m.outcome === 'missed').length;

  return (
    <div className="page progress-page">
      <div className="pv-head">
        <h1 className="pv-title">{TERMS.tasks}</h1>
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
          <span className="pv-stat-num">{done}</span>
          <span className="pv-stat-label">Completed</span>
        </div>
        <div className="pv-stat">
          <span className="pv-stat-num">{missed}</span>
          <span className="pv-stat-label">Didn't complete</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="empty-note">
          {state.milestones.length === 0
            ? `No ${TERMS.tasksLower} yet. Add the first ${TERMS.taskLower} from the Campaign diagram.`
            : 'Nothing matches the current filter.'}
        </p>
      ) : (
        <div className="pv-table" role="table" aria-label={TERMS.tasks}>
          <div className="pv-row pv-row-head" role="row">
            <span />
            <span>{TERMS.task}</span>
            <span>LOO</span>
            <span>Outcome</span>
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
                title={`${m.title}. ${OUTCOME_LABEL[m.outcome]}. Open on the diagram.`}
              >
                <span aria-label={OUTCOME_LABEL[m.outcome]}>
                  <OutcomeBox outcome={m.outcome} overdue={overdue} size={17} />
                </span>
                <span className="pv-ms-title">{m.title}</span>
                <span className="pv-loo">{loo ? `${String(loo.number).padStart(2, '0')} ${loo.name}` : '—'}</span>
                <span className={`pv-status outcome-${m.outcome}${overdue ? ' overdue' : ''}`}>
                  {overdue ? 'Overdue' : OUTCOME_LABEL[m.outcome]}
                </span>
                <span className={`pv-date${overdue ? ' overdue' : ''}`}>
                  {fmtDate(m.targetDate)}
                  <span className="pv-delta">
                    {m.outcome !== 'open' ? '' : overdue ? ` ${-delta}d over` : ` ${delta}d`}
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
