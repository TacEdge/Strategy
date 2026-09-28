import { useState } from 'react';
import type { Milestone, StrategicHorizon } from '../types';
import { useStore, useLoos, newId } from '../state/store';
import { todayIso, addDays, parseDate, toIso } from '../lib/time';
import { Modal, Field } from './ui';

/** Add a milestone and move on: condition, line, date, owner. Nothing else. */
export const AddMilestoneModal = ({
  onClose, onCreated, defaultLooId,
}: { onClose: () => void; onCreated: (milestone: Milestone) => void; defaultLooId?: string | null }) => {
  const { dispatch } = useStore();
  const loos = useLoos();
  const [title, setTitle] = useState('');
  const [looId, setLooId] = useState(defaultLooId ?? loos[0]?.id ?? '');
  const [date, setDate] = useState(toIso(addDays(parseDate(todayIso()), 30)));
  const [owner, setOwner] = useState('Mike');

  const create = () => {
    const t = title.trim();
    if (!t || !looId || !date) return;
    const milestone: Milestone = {
      id: newId('ms'), title: t, looId, targetDate: date, status: 'future', owner: owner.trim(),
    };
    dispatch({ type: 'milestone/add', milestone });
    onCreated(milestone);
    onClose();
  };

  return (
    <Modal title="Add milestone" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        Write the condition that must become true, not the activity:
        "Customer agrees to a defined pilot", not "Meet the customer".
      </p>
      <Field label="Milestone">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. First reference customer agrees to a defined pilot"
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          autoFocus
        />
      </Field>
      <div className="meta-grid">
        <Field label="Line of Operation">
          <select value={looId} onChange={(e) => setLooId(e.target.value)}>
            {loos.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Target date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Owner">
          <input value={owner} onChange={(e) => setOwner(e.target.value)} />
        </Field>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={create} disabled={!title.trim()}>
          Add milestone
        </button>
      </div>
    </Modal>
  );
};

/** Add a Strategic Horizon: a labelled point in time across every line. */
export const AddHorizonModal = ({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (horizon: StrategicHorizon) => void }) => {
  const { dispatch } = useStore();
  const [theme, setTheme] = useState('');
  const [date, setDate] = useState(toIso(addDays(parseDate(todayIso()), 365)));

  const create = () => {
    const t = theme.trim();
    if (!t || !date) return;
    const horizon: StrategicHorizon = { id: newId('hz'), date, theme: t };
    dispatch({ type: 'horizon/add', horizon });
    onCreated(horizon);
    onClose();
  };

  return (
    <Modal title="Add Strategic Horizon" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        A point in time where progress across all Lines of Operation must synchronise.
        The lines continue beyond it.
      </p>
      <Field label="Theme">
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g. Prove the Model"
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          autoFocus
        />
      </Field>
      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={create} disabled={!theme.trim()}>
          Add horizon
        </button>
      </div>
    </Modal>
  );
};
