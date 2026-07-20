import { useMemo, useState } from 'react';
import type { Confidence } from '../types';
import { useStore, newId } from '../state/store';
import { recommend } from '../lib/recommend';
import { todayIso } from '../lib/time';
import { Modal, Field, SectionHeading, CONFIDENCE_LABEL } from './ui';

/**
 * Lightweight end-of-day review. One or two minutes: what became true,
 * what changed, what now blocks, what carries forward. Saving updates the
 * day's recommended milestone (progress, confidence, change history), sets
 * tomorrow's primary constraint, and feeds tomorrow's recommendation.
 */
export const CloseoutModal = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useStore();
  const result = useMemo(() => recommend(state), [state]);
  const recMilestone = state.milestones.find((m) => m.id === result?.recommendation.milestoneId);

  const [becameTrue, setBecameTrue] = useState('');
  const [changed, setChanged] = useState('');
  const [blocker, setBlocker] = useState(state.campaign.primaryConstraint);
  const [newInformation, setNewInformation] = useState('');
  const [recCorrect, setRecCorrect] = useState<boolean | null>(null);
  const [mainEffortCorrect, setMainEffortCorrect] = useState(true);
  const [carryForward, setCarryForward] = useState('');
  const [progress, setProgress] = useState(recMilestone?.progress ?? 0);
  const [confidence, setConfidence] = useState<Confidence>(recMilestone?.confidence ?? 'medium');

  const save = () => {
    dispatch({
      type: 'closeout/add',
      entry: {
        id: newId('co'),
        date: todayIso(),
        becameTrue,
        changed,
        primaryBlocker: blocker,
        newInformation,
        recommendationCorrect: recCorrect,
        mainEffortCorrect,
        carryForward,
      },
    });
    // Reflect the day in the recommended milestone's live state and history.
    if (recMilestone) {
      const moved = progress !== recMilestone.progress || confidence !== recMilestone.confidence;
      if (moved || becameTrue.trim()) {
        const notes = [
          becameTrue.trim() && `Became true: ${becameTrue.trim()}`,
          progress !== recMilestone.progress && `Progress ${recMilestone.progress}% to ${progress}%`,
          confidence !== recMilestone.confidence && `confidence ${recMilestone.confidence} to ${confidence}`,
        ].filter(Boolean).join('; ');
        dispatch({
          type: 'milestone/update',
          id: recMilestone.id,
          patch: { progress, confidence },
          historySummary: `Daily closeout: ${notes || 'reviewed, no change'}.`,
        });
      }
    }
    onClose();
  };

  const mainEffort = state.loos.find((l) => l.role === 'main-effort' && !l.archived);

  return (
    <Modal title="Daily closeout" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        Two minutes. What you record here updates the milestone you worked on
        and shapes tomorrow's recommendation.
      </p>
      <Field label="What became true today?">
        <input value={becameTrue} onChange={(e) => setBecameTrue(e.target.value)} placeholder="Conditions achieved, not activity" autoFocus />
      </Field>
      <Field label="What changed?">
        <input value={changed} onChange={(e) => setChanged(e.target.value)} placeholder="Movement, decisions, surprises" />
      </Field>
      <Field label="What is now the primary blocker?">
        <input value={blocker} onChange={(e) => setBlocker(e.target.value)} />
      </Field>
      <Field label="New information received">
        <input value={newInformation} onChange={(e) => setNewInformation(e.target.value)} placeholder="Optional" />
      </Field>

      {recMilestone && (
        <div className="detail-section" style={{ background: 'var(--te-tint)', borderRadius: 'var(--te-r-md)', padding: '10px 14px' }}>
          <SectionHeading>Today's recommended milestone: {recMilestone.title}</SectionHeading>
          <div className="meta-grid">
            <Field label={`Progress · ${progress}%`}>
              <input
                type="range" min={0} max={100} step={5} value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                aria-label="Milestone progress"
              />
            </Field>
            <Field label="Confidence">
              <select value={confidence} onChange={(e) => setConfidence(e.target.value as Confidence)}>
                {(['high', 'medium', 'low'] as Confidence[]).map((c) => (
                  <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      <div className="meta-grid">
        <Field label="Was the recommended action correct?">
          <select
            value={recCorrect === null ? '' : recCorrect ? 'yes' : 'no'}
            onChange={(e) => setRecCorrect(e.target.value === '' ? null : e.target.value === 'yes')}
          >
            <option value="">Not assessed</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </Field>
        <Field label={`Is ${mainEffort?.name ?? 'the Main Effort'} still the Main Effort?`}>
          <select
            value={mainEffortCorrect ? 'yes' : 'no'}
            onChange={(e) => setMainEffortCorrect(e.target.value === 'yes')}
          >
            <option value="yes">Yes</option>
            <option value="no">Review at weekly command review</option>
          </select>
        </Field>
      </div>
      <Field label="What must happen next?">
        <input value={carryForward} onChange={(e) => setCarryForward(e.target.value)} placeholder="Carries into tomorrow's Today view" />
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save}>Save closeout</button>
      </div>
    </Modal>
  );
};
