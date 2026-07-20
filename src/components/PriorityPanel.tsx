import type { CampaignState, FounderRecommendation } from '../types';
import { Modal, SectionHeading } from './ui';
import { fmtDateLong } from '../lib/time';

/**
 * Deterministic first-pass priority logic: the seeded recommendation,
 * re-validated against live campaign state. If the seeded milestone is
 * finished, fall back to the earliest founder-owned open milestone on
 * the Main Effort.
 */
const resolveRecommendation = (state: CampaignState): FounderRecommendation => {
  const rec = state.recommendation;
  const target = state.milestones.find((m) => m.id === rec.milestoneId);
  const stillOpen = target && !['complete', 'archived', 'superseded'].includes(target.status);
  if (stillOpen) return rec;

  const mainEffort = state.loos.find((l) => l.role === 'main-effort');
  const fallback = state.milestones
    .filter((m) => m.looId === mainEffort?.id
      && !['complete', 'archived', 'superseded'].includes(m.status))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
  if (!fallback) return rec;
  return {
    ...rec,
    action: fallback.nextBestAction || `Advance "${fallback.title}".`,
    milestoneId: fallback.id,
    looId: fallback.looId,
    why: `This is the next open milestone on the current Main Effort (${mainEffort?.name}).`,
  };
};

export const PriorityPanel = ({
  state, onClose, onOpenMilestone,
}: {
  state: CampaignState;
  onClose: () => void;
  onOpenMilestone: (id: string) => void;
}) => {
  const rec = resolveRecommendation(state);
  const milestone = state.milestones.find((m) => m.id === rec.milestoneId);
  const loo = state.loos.find((l) => l.id === rec.looId);
  const objective = state.objectives.find((o) => o.id === rec.horizonObjectiveId);
  const horizon = objective && state.horizons.find((h) => h.id === objective.horizonId);

  return (
    <Modal title="Recommended founder action" onClose={onClose} wide>
      <div className="priority-panel">
        <p className="priority-action">{rec.action}</p>

        <div className="detail-section">
          <SectionHeading>Why it matters</SectionHeading>
          <p className="detail-text">{rec.why}</p>
        </div>

        <div className="priority-grid">
          <div className="priority-block">
            <SectionHeading>Milestone supported</SectionHeading>
            {milestone ? (
              <button
                type="button"
                className="dep-link"
                onClick={() => { onClose(); onOpenMilestone(milestone.id); }}
              >
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
              {horizon && (
                <span className="detail-text muted" style={{ display: 'block', fontSize: 12 }}>
                  {horizon.theme} · {fmtDateLong(horizon.date)}
                </span>
              )}
            </p>
          </div>
          <div className="priority-block">
            <SectionHeading>Suggested block</SectionHeading>
            <p className="detail-text">{rec.suggestedBlock}</p>
          </div>
        </div>

        <div className="detail-section">
          <SectionHeading>Successful completion</SectionHeading>
          <p className="detail-text">{rec.successfulCompletion}</p>
        </div>

        <div className="detail-section">
          <SectionHeading>Do not prioritise</SectionHeading>
          <div className="priority-avoid">
            {rec.doNotPrioritise.map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>
      </div>
    </Modal>
  );
};
