import { useState } from 'react';
import type { RecommendationResult } from '../lib/recommend';
import { useStore } from '../state/store';
import { SectionHeading } from './ui';
import { fmtDateLong } from '../lib/time';

/**
 * Renders an engine result: one primary action, its explanation, completion
 * condition, unlocks, consequence of delay, and the visible reasoning chain.
 * Shared by the Today view and the "What should I do now?" panel.
 */
export const RecommendationDetail = ({
  result, onOpenMilestone, compact = false,
}: {
  result: RecommendationResult;
  onOpenMilestone: (id: string) => void;
  compact?: boolean;
}) => {
  const { state } = useStore();
  const [showReasoning, setShowReasoning] = useState(false);
  const rec = result.recommendation;
  const milestone = state.milestones.find((m) => m.id === rec.milestoneId);
  const loo = state.loos.find((l) => l.id === rec.looId);
  const objective = state.objectives.find((o) => o.id === rec.objectiveId);

  return (
    <div className="priority-panel">
      <p className="priority-action">{rec.action.text}</p>

      {result.noted && (
        <p className="detail-text muted" style={{ fontSize: 13 }}>
          Noted: {result.noted}
        </p>
      )}

      <div className="detail-section">
        <SectionHeading>Why this, why now</SectionHeading>
        <p className="detail-text">{rec.whyThis}</p>
        {!compact && <p className="detail-text muted">{rec.whyNow}</p>}
        <p className="detail-text muted">{rec.whyFounder}</p>
      </div>

      <div className="priority-grid">
        <div className="priority-block">
          <SectionHeading>Milestone supported</SectionHeading>
          {milestone ? (
            <button type="button" className="dep-link" onClick={() => onOpenMilestone(milestone.id)}>
              {milestone.title}
            </button>
          ) : <p className="detail-text muted">—</p>}
        </div>
        <div className="priority-block">
          <SectionHeading>Line of Operation</SectionHeading>
          <p className="detail-text">{loo?.name ?? '—'}</p>
        </div>
        <div className="priority-block">
          <SectionHeading>Horizon objective supported</SectionHeading>
          <p className="detail-text" style={{ fontSize: 14 }}>
            {objective ? objective.statement : '—'}
            <span className="detail-text muted" style={{ display: 'block', fontSize: 12 }}>
              {result.horizon.theme} · {fmtDateLong(result.horizon.date)}
            </span>
          </p>
        </div>
        <div className="priority-block">
          <SectionHeading>Suggested block</SectionHeading>
          <p className="detail-text">{rec.action.block} minutes</p>
        </div>
      </div>

      <div className="detail-section">
        <SectionHeading>Successful completion</SectionHeading>
        <p className="detail-text">{rec.action.completion}</p>
      </div>

      {rec.unlocked.length > 0 && (
        <div className="detail-section">
          <SectionHeading>Unlocked by completion</SectionHeading>
          <ul className="detail-list">
            {rec.unlocked.map((u) => <li key={u}>{u}</li>)}
          </ul>
        </div>
      )}

      {!compact && (
        <div className="detail-section">
          <SectionHeading>Consequence of delay</SectionHeading>
          <p className="detail-text muted">{rec.consequenceOfDelay}</p>
        </div>
      )}

      <div className="detail-section">
        <SectionHeading>Do not prioritise</SectionHeading>
        <div className="priority-avoid">
          {rec.notToday.map((d) => <span key={d}>{d}</span>)}
        </div>
      </div>

      <div>
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          onClick={() => setShowReasoning((s) => !s)}
          aria-expanded={showReasoning}
        >
          {showReasoning ? 'Hide the reasoning' : 'How this was decided'}
        </button>
        {showReasoning && (
          <ol className="reasoning-list">
            {result.reasoning.map((step) => (
              <li key={step.question}>
                <span className="reasoning-q">{step.question}</span>
                <span className="reasoning-a">{step.answer}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};
