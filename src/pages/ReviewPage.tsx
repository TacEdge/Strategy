import { useStore, useLoos } from '../state/store';
import { fmtDateLong, fmtDate, parseDate, daysBetween, todayIso, nowStamp } from '../lib/time';
import { SectionHeading, Eyebrow, OutcomeBadge } from '../components/ui';
import { isOverdue } from '../components/Diagram';
import { TERMS } from '../lib/terms';

/**
 * Weekly review: what needs attention, what is due before the next
 * strategic objective, what has been achieved, and the three outcomes for
 * the week. Everything here is read straight off key task status and date.
 */
export const ReviewPage = ({
  onOpenMilestone, onOpenDiagram,
}: {
  onOpenMilestone: (id: string) => void;
  onOpenDiagram: () => void;
}) => {
  const { state, dispatch } = useStore();
  const loos = useLoos();
  const today = todayIso();

  const milestones = state.milestones;
  const achieved = milestones.filter((m) => m.outcome === 'done');
  const missed = milestones.filter((m) => m.outcome === 'missed');
  const overdue = milestones.filter((m) => isOverdue(m, today));

  // The next strategic objective ahead of today; failing that, the latest one on the diagram.
  const horizon =
    [...state.horizons].filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
    ?? [...state.horizons].sort((a, b) => b.date.localeCompare(a.date))[0];

  const setOutcome = (i: number, text: string) => {
    const outcomes = [...state.weekly.outcomes];
    outcomes[i] = text;
    dispatch({ type: 'weekly/update', patch: { outcomes, updatedAt: nowStamp() } });
  };

  const daysTo = horizon ? daysBetween(parseDate(today), parseDate(horizon.date)) : null;
  const beforeHorizon = horizon ? milestones.filter((m) => m.targetDate <= horizon.date) : [];
  const doneBeforeHorizon = beforeHorizon.filter((m) => m.outcome === 'done');

  const byLoo = (id: string) => milestones.filter((m) => m.looId === id);

  return (
    <div className="page today-page">
      <div className="today-priority-head" style={{ alignItems: 'baseline' }}>
        <div>
          <Eyebrow>Weekly review</Eyebrow>
          <h1 className="ws-title" style={{ marginTop: 4 }}>Week to {fmtDateLong(today)}</h1>
        </div>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onOpenDiagram}>
          View the LOO Diagram
        </button>
      </div>

      <section className="today-context" aria-label="Movement toward the next strategic objective">
        <div className="today-context-cell">
          <Eyebrow>Next {TERMS.objective}</Eyebrow>
          <p className="today-context-value">{horizon ? horizon.theme : 'None set'}</p>
          <p className="today-context-sub">
            {horizon && daysTo !== null
              ? `${fmtDateLong(horizon.date)} · ${daysTo >= 0 ? `${daysTo} days remaining` : `${-daysTo} days past`}`
              : 'Add one from the Campaign diagram'}
          </p>
        </div>
        <div className="today-context-cell">
          <Eyebrow>{TERMS.tasks} before it</Eyebrow>
          <p className="today-context-value">
            {horizon ? `${doneBeforeHorizon.length} of ${beforeHorizon.length} completed` : '—'}
          </p>
          <p className="today-context-sub">{missed.length} not completed</p>
        </div>
        <div className="today-context-cell">
          <Eyebrow>Overdue</Eyebrow>
          <p className="today-context-value">{overdue.length} {overdue.length === 1 ? TERMS.taskLower : TERMS.tasksLower}</p>
          <p className="today-context-sub">Past the date and still open: decide tick or cross</p>
        </div>
      </section>

      <div className="today-grid">
        <div className="today-main">
          <section className="ws-card" aria-label="Progress by Line of Operation">
            <h2 className="ws-card-title">By Line of Operation</h2>
            {loos.map((loo) => {
              const ms = byLoo(loo.id);
              const done = ms.filter((m) => m.outcome === 'done').length;
              const notDone = ms.filter((m) => m.outcome === 'missed').length;
              const pressure = ms.filter((m) => isOverdue(m, today)).length;
              return (
                <div key={loo.id} className="review-loo-row">
                  <span className="lane-num">{String(loo.number).padStart(2, '0')}</span>
                  <span className="review-loo-name">{loo.name}</span>
                  <span className="review-loo-stat">
                    {done}/{ms.length} completed{notDone > 0 ? ` · ${notDone} not` : ''}
                  </span>
                  <span className="review-loo-stat" style={{ color: pressure > 0 ? 'var(--te-ochre)' : undefined }}>
                    {pressure > 0 ? `${pressure} overdue` : 'Clear'}
                  </span>
                </div>
              );
            })}
          </section>

          <section className="ws-card" aria-label="Attention and achievement">
            <h2 className="ws-card-title">Needs attention</h2>
            <div className="detail-section">
              <SectionHeading>Overdue, still open</SectionHeading>
              {overdue.length > 0 ? overdue.map((m) => (
                <div key={m.id} className="dep-item">
                  <OutcomeBadge outcome={m.outcome} overdue compact />
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(m.id)}>{m.title}</button>
                  <span className="dep-loo" style={{ marginLeft: 'auto', color: 'var(--te-ochre)' }}>{fmtDate(m.targetDate)}</span>
                </div>
              )) : <p className="empty-note">Nothing past its date.</p>}
            </div>
            <div className="detail-section">
              <SectionHeading>Didn't complete</SectionHeading>
              {missed.length > 0 ? missed.map((m) => (
                <div key={m.id} className="dep-item">
                  <OutcomeBadge outcome={m.outcome} compact />
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(m.id)}>{m.title}</button>
                  <span className="dep-loo" style={{ marginLeft: 'auto' }}>{fmtDate(m.targetDate)}</span>
                </div>
              )) : <p className="empty-note">Nothing marked as not completed.</p>}
            </div>
            <div className="detail-section">
              <SectionHeading>Completed</SectionHeading>
              {achieved.length > 0 ? achieved.map((m) => (
                <div key={m.id} className="dep-item">
                  <span className="dep-loo">{fmtDate(m.targetDate)}</span>
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(m.id)}>{m.title}</button>
                </div>
              )) : <p className="empty-note">None yet.</p>}
            </div>
          </section>
        </div>

        <div className="today-side">
          <section className="ws-card" aria-label="Three outcomes for the next seven days">
            <h2 className="ws-card-title">Next seven days</h2>
            <p className="detail-text muted" style={{ fontSize: 13 }}>
              The three most important outcomes for the coming week.
            </p>
            {[0, 1, 2].map((i) => (
              <label key={i} className="field">
                <span className="field-label">Outcome {i + 1}</span>
                <input
                  value={state.weekly.outcomes[i] ?? ''}
                  onChange={(e) => setOutcome(i, e.target.value)}
                />
              </label>
            ))}
            {state.weekly.updatedAt && (
              <p className="detail-text muted" style={{ fontSize: 12 }}>
                Updated {fmtDate(state.weekly.updatedAt.slice(0, 10))}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
