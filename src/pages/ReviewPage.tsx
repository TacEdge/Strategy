import { useMemo } from 'react';
import { useStore, useLoos } from '../state/store';
import { fmtDateLong, fmtDate, parseDate, daysBetween, todayIso, nowStamp } from '../lib/time';
import { SectionHeading, Eyebrow, StatusBadge, ProgressBar, ConfidenceMeter } from '../components/ui';

/**
 * Weekly review: movement toward the active horizon, progress by LOO,
 * slippage, founder allocation, and the three outcomes for the week.
 */
export const ReviewPage = ({
  onOpenMilestone, onOpenDiagram,
}: {
  onOpenMilestone: (id: string) => void;
  onOpenDiagram: () => void;
}) => {
  const { state, dispatch } = useStore();
  const loos = useLoos();

  const weekAgo = useMemo(() => {
    const d = parseDate(todayIso());
    d.setDate(d.getDate() - 7);
    return d.toISOString();
  }, []);

  const open = state.milestones.filter((m) => !['archived', 'superseded'].includes(m.status));
  const achieved = open.filter((m) => m.status === 'complete');
  const underPressure = open.filter((m) => m.status === 'at-risk' || m.status === 'blocked');

  const recentMoves = state.milestones.flatMap((m) =>
    m.history
      .filter((h) => h.at >= weekAgo && h.summary.startsWith('Target date moved'))
      .map((h) => ({ milestone: m, entry: h })));
  const confidenceChanges = state.milestones.flatMap((m) =>
    m.history
      .filter((h) => h.at >= weekAgo && h.summary.startsWith('Confidence changed'))
      .map((h) => ({ milestone: m, entry: h })));

  const mainEffort = state.loos.find((l) => l.role === 'main-effort' && !l.archived);
  const founderOpen = open.filter((m) => m.founderAction && m.status !== 'complete');
  const founderOffMain = founderOpen.filter((m) => m.looId !== mainEffort?.id);

  const horizon =
    state.horizons.find((h) => h.id === state.campaign.activeHorizonId && !h.archived)
    ?? state.horizons.filter((h) => !h.archived).sort((a, b) => a.date.localeCompare(b.date))[0];

  const setOutcome = (i: number, text: string) => {
    const outcomes = [...state.weekly.outcomes];
    outcomes[i] = text;
    dispatch({ type: 'weekly/update', patch: { outcomes, updatedAt: nowStamp() } });
  };

  if (!horizon) {
    return <div className="page"><p className="empty-note">No campaign data to review.</p></div>;
  }

  const daysTo = daysBetween(parseDate(todayIso()), parseDate(horizon.date));
  const beforeHorizon = open.filter((m) => m.targetDate <= horizon.date);
  const doneBeforeHorizon = beforeHorizon.filter((m) => m.status === 'complete');

  return (
    <div className="page today-page">
      <div className="today-priority-head" style={{ alignItems: 'baseline' }}>
        <div>
          <Eyebrow>Weekly command review</Eyebrow>
          <h1 className="ws-title" style={{ marginTop: 4 }}>Week to {fmtDateLong(todayIso())}</h1>
        </div>
        <button type="button" className="btn btn-quiet btn-sm" onClick={onOpenDiagram}>
          View the LOO Diagram
        </button>
      </div>

      <section className="today-context" aria-label="Movement toward the horizon">
        <div className="today-context-cell">
          <Eyebrow>Active Horizon</Eyebrow>
          <p className="today-context-value">{fmtDateLong(horizon.date)}</p>
          <p className="today-context-sub">{daysTo} days remaining</p>
        </div>
        <div className="today-context-cell">
          <Eyebrow>Milestones before horizon</Eyebrow>
          <p className="today-context-value">{doneBeforeHorizon.length} of {beforeHorizon.length} complete</p>
          <p className="today-context-sub">{underPressure.length} under pressure</p>
        </div>
        <div className="today-context-cell">
          <Eyebrow>Horizon confidence</Eyebrow>
          <p className="today-context-value"><ConfidenceMeter value={horizon.confidence} /></p>
          <p className="today-context-sub">{horizon.status === 'on-track' ? 'On track' : horizon.status === 'at-risk' ? 'At risk' : 'Forming'}</p>
        </div>
        <div className="today-context-cell">
          <Eyebrow>Main Effort</Eyebrow>
          <p className="today-context-value">{mainEffort?.name ?? 'Not set'}</p>
          {mainEffort && <p className="today-context-sub">{mainEffort.owner}</p>}
        </div>
      </section>

      <div className="today-grid">
        <div className="today-main">
          <section className="ws-card" aria-label="Progress by Line of Operation">
            <h2 className="ws-card-title">Progress by Line of Operation</h2>
            {loos.map((loo) => {
              const ms = open.filter((m) => m.looId === loo.id);
              const done = ms.filter((m) => m.status === 'complete').length;
              const pressure = ms.filter((m) => m.status === 'at-risk' || m.status === 'blocked').length;
              const avg = ms.length > 0
                ? Math.round(ms.reduce((s, m) => s + m.progress, 0) / ms.length)
                : 0;
              return (
                <div key={loo.id} className="review-loo-row">
                  <span className="lane-num">{String(loo.number).padStart(2, '0')}</span>
                  <span className="review-loo-name">{loo.name}</span>
                  <ProgressBar value={avg} />
                  <span className="review-loo-stat">{done}/{ms.length} complete</span>
                  <span className="review-loo-stat" style={{ color: pressure > 0 ? 'var(--te-ochre)' : undefined }}>
                    {pressure > 0 ? `${pressure} under pressure` : 'Clear'}
                  </span>
                </div>
              );
            })}
          </section>

          <section className="ws-card" aria-label="Milestones achieved and slipped">
            <h2 className="ws-card-title">Achieved and slipped</h2>
            <div className="detail-section">
              <SectionHeading>Achieved</SectionHeading>
              {achieved.length > 0 ? achieved.map((m) => (
                <div key={m.id} className="dep-item">
                  <span className="dep-loo">{fmtDate(m.targetDate)}</span>
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(m.id)}>{m.title}</button>
                </div>
              )) : <p className="empty-note">None yet.</p>}
            </div>
            <div className="detail-section">
              <SectionHeading>Moved this week</SectionHeading>
              {recentMoves.length > 0 ? recentMoves.map(({ milestone, entry }) => (
                <div key={entry.id} className="dep-item">
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(milestone.id)}>{milestone.title}</button>
                  <span className="detail-text muted" style={{ fontSize: 13 }}>{entry.summary}</span>
                </div>
              )) : <p className="empty-note">No date movement recorded this week.</p>}
            </div>
            <div className="detail-section">
              <SectionHeading>Confidence changes</SectionHeading>
              {confidenceChanges.length > 0 ? confidenceChanges.map(({ milestone, entry }) => (
                <div key={entry.id} className="dep-item">
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(milestone.id)}>{milestone.title}</button>
                  <span className="detail-text muted" style={{ fontSize: 13 }}>{entry.summary}</span>
                </div>
              )) : <p className="empty-note">No confidence changes recorded this week.</p>}
            </div>
            <div className="detail-section">
              <SectionHeading>Under pressure now</SectionHeading>
              {underPressure.map((m) => (
                <div key={m.id} className="dep-item">
                  <StatusBadge status={m.status} compact />
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(m.id)}>{m.title}</button>
                  <span className="dep-loo" style={{ marginLeft: 'auto' }}>{fmtDate(m.targetDate)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="today-side">
          <section className="ws-card" aria-label="Founder time allocation">
            <h2 className="ws-card-title">Founder allocation</h2>
            <p className="detail-text">
              {founderOpen.length} open founder-owned milestone{founderOpen.length === 1 ? '' : 's'}.
            </p>
            {founderOffMain.length > 0 && (
              <p className="detail-text muted" style={{ fontSize: 14 }}>
                {founderOffMain.length} sit outside the Main Effort:{' '}
                {founderOffMain.map((m) => m.title).join('; ')}.
              </p>
            )}
            {(() => {
              const doneOffMain = achieved.filter((m) => m.looId !== mainEffort?.id);
              return (
                <p className="detail-text muted" style={{ fontSize: 14 }}>
                  {doneOffMain.length} of {achieved.length} completed milestones sit outside the Main Effort
                  {doneOffMain.length > achieved.length / 2
                    ? ' — check whether effort is following the stated priority.'
                    : '.'}
                </p>
              );
            })()}
            <div className="detail-section">
              <SectionHeading>Risks raised this horizon</SectionHeading>
              <ul className="detail-list">
                {horizon.risks.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          </section>

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
