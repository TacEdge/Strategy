import { useState } from 'react';
import type { Milestone, StrategicHorizon } from '../types';
import { useStore, useLoos, newId } from '../state/store';
import { todayIso, addDays, parseDate, toIso } from '../lib/time';
import { Modal, Field } from './ui';
import { TERMS } from '../lib/terms';

/** Add a key task and move on: condition, line, date, owner. Nothing else. */
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
      id: newId('ms'), title: t, looId, targetDate: date, outcome: 'open', owner: owner.trim(),
    };
    dispatch({ type: 'milestone/add', milestone });
    onCreated(milestone);
    onClose();
  };

  return (
    <Modal title={`Add ${TERMS.taskLower}`} onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        Write the condition that must become true, not the activity:
        "Customer agrees to a defined pilot", not "Meet the customer".
      </p>
      <Field label={TERMS.task}>
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
          Add {TERMS.taskLower}
        </button>
      </div>
    </Modal>
  );
};

/**
 * Add a Decision Point: a decision to make on one line by a date. The star
 * on the diagram holds the details written here.
 */
export const AddDecisionModal = ({
  onClose, onCreated, defaultLooId,
}: { onClose: () => void; onCreated: (milestone: Milestone) => void; defaultLooId?: string | null }) => {
  const { dispatch } = useStore();
  const loos = useLoos();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [looId, setLooId] = useState(defaultLooId ?? loos[0]?.id ?? '');
  const [date, setDate] = useState(toIso(addDays(parseDate(todayIso()), 14)));
  const [owner, setOwner] = useState('Mike');

  const create = () => {
    const t = title.trim();
    if (!t || !looId || !date) return;
    const milestone: Milestone = {
      id: newId('dp'), kind: 'decision', title: t, details: details.trim(),
      looId, targetDate: date, outcome: 'open', owner: owner.trim(),
    };
    dispatch({ type: 'milestone/add', milestone });
    onCreated(milestone);
    onClose();
  };

  return (
    <Modal title={`Add ${TERMS.decisionLower}`} onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        A decision that must be made on a line by a date. It shows as a star;
        tap the star to read the details.
      </p>
      <Field label="Decision">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Go / no-go on the second pilot"
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
          autoFocus
        />
      </Field>
      <Field label="Details">
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="The options, what it hinges on, and who needs to be in the room."
          rows={3}
        />
      </Field>
      <div className="meta-grid">
        <Field label="Line of Operation">
          <select value={looId} onChange={(e) => setLooId(e.target.value)}>
            {loos.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </Field>
        <Field label="Decide by">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Owner">
          <input value={owner} onChange={(e) => setOwner(e.target.value)} />
        </Field>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={create} disabled={!title.trim()}>
          Add {TERMS.decisionLower}
        </button>
      </div>
    </Modal>
  );
};

/** Add a Strategic Objective: a labelled point in time across every line. */
export const AddHorizonModal = ({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (horizon: StrategicHorizon) => void }) => {
  const { dispatch } = useStore();
  const [theme, setTheme] = useState('');
  const [date, setDate] = useState(toIso(addDays(parseDate(todayIso()), 365)));

  const create = () => {
    const t = theme.trim();
    if (!t || !date) return;
    const horizon: StrategicHorizon = { id: newId('hz'), date, theme: t, outcome: 'open' };
    dispatch({ type: 'horizon/add', horizon });
    onCreated(horizon);
    onClose();
  };

  return (
    <Modal title={`Add ${TERMS.objective}`} onClose={onClose}>
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
          Add {TERMS.objectiveLower}
        </button>
      </div>
    </Modal>
  );
};
