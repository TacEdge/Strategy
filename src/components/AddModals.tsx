import { useState } from 'react';
import type { Milestone, StrategicHorizon, HorizonObjective } from '../types';
import { useStore, useLoos, newId } from '../state/store';
import { nowStamp, todayIso, addDays, parseDate, toIso } from '../lib/time';
import { Modal, Field } from './ui';

export const AddMilestoneModal = ({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (id: string) => void }) => {
  const { dispatch } = useStore();
  const loos = useLoos();
  const [title, setTitle] = useState('');
  const [looId, setLooId] = useState(loos[0]?.id ?? '');
  const [date, setDate] = useState(toIso(addDays(parseDate(todayIso()), 30)));
  const [owner, setOwner] = useState('Mike');

  const create = () => {
    const t = title.trim();
    if (!t || !looId || !date) return;
    const id = newId('ms');
    const milestone: Milestone = {
      id, title: t, looId, targetDate: date, status: 'future', confidence: 'medium',
      owner, progress: 0, purpose: '', strategicImportance: '', successCriteria: [],
      risks: [], decisions: [], tasks: [], evidence: [], notes: '', nextBestAction: '',
      founderAction: false, major: false,
      history: [{ id: newId('ch'), at: nowStamp(), summary: 'Milestone created.' }],
    };
    dispatch({ type: 'milestone/add', milestone });
    onCreated(id);
    onClose();
  };

  return (
    <Modal title="Add milestone" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        A milestone is a condition that must become true, not an activity.
        Write the end state: "Fulton Hogan agrees to a defined pilot", not "Meet Fulton Hogan".
      </p>
      <Field label="Condition to become true">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Second design partner agrees to a defined pilot"
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

export const AddHorizonModal = ({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (id: string) => void }) => {
  const { dispatch } = useStore();
  const loos = useLoos();
  const [theme, setTheme] = useState('');
  const [date, setDate] = useState('2028-06-30');

  const create = () => {
    const t = theme.trim();
    if (!t || !date) return;
    const id = newId('hz');
    const horizon: StrategicHorizon = {
      id, date, theme: t,
      integratedState: 'Describe what TACEDGE should look like at this point if the LOO objectives are achieved together.',
      status: 'forming', confidence: 'low',
      assumptions: [], risks: [],
      assessment: 'Forming. Objectives are directional until earlier horizons deliver evidence.',
      archived: false,
    };
    const objectives: HorizonObjective[] = loos.map((loo) => ({
      id: newId('obj'),
      horizonId: id,
      looId: loo.id,
      statement: `Define the ${loo.name} objective at this horizon.`,
      confidence: 'low',
    }));
    dispatch({ type: 'horizon/add', horizon, objectives });
    onCreated(id);
    onClose();
  };

  return (
    <Modal title="Add Strategic Horizon" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        A Strategic Horizon is a point in time where progress across all Lines of Operation
        must synchronise. The lines continue beyond it.
      </p>
      <Field label="Theme">
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="e.g. Scale Beyond Anchoring"
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
