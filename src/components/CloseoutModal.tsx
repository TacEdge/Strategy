import { useState } from 'react';
import { useStore, newId } from '../state/store';
import { todayIso } from '../lib/time';
import { Modal, Field } from './ui';

/**
 * Lightweight end-of-day review. One or two minutes: what became true,
 * what changed, what now blocks, what carries forward. The stated blocker
 * becomes tomorrow's primary constraint.
 */
export const CloseoutModal = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useStore();
  const [becameTrue, setBecameTrue] = useState('');
  const [changed, setChanged] = useState('');
  const [blocker, setBlocker] = useState(state.campaign.primaryConstraint);
  const [newInformation, setNewInformation] = useState('');
  const [recCorrect, setRecCorrect] = useState<boolean | null>(null);
  const [mainEffortCorrect, setMainEffortCorrect] = useState(true);
  const [carryForward, setCarryForward] = useState('');

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
    onClose();
  };

  const mainEffort = state.loos.find((l) => l.role === 'main-effort' && !l.archived);

  return (
    <Modal title="Daily closeout" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        Two minutes. What you record here shapes tomorrow's recommendation.
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
