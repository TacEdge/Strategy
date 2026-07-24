import { useState } from 'react';
import { useStore } from '../state/store';
import { Modal, Field } from './ui';

/** Edit the campaign cash assumptions that drive the projected runway line. */
export const FinanceModal = ({ onClose }: { onClose: () => void }) => {
  const { state, dispatch } = useStore();
  const [startingCash, setStartingCash] = useState(String(state.finance.startingCash));
  const [monthlyBurn, setMonthlyBurn] = useState(String(state.finance.monthlyBurn));

  const save = () => {
    dispatch({
      type: 'finance/update',
      patch: {
        startingCash: Math.max(0, Number(startingCash) || 0),
        monthlyBurn: Math.max(0, Number(monthlyBurn) || 0),
      },
    });
    onClose();
  };

  return (
    <Modal title="Financial assumptions" onClose={onClose}>
      <p className="detail-text muted" style={{ fontSize: 14 }}>
        Two numbers drive the projected cash line: cash on hand today and
        monthly burn before milestone revenue. Revenue and costs attach to
        individual milestones.
      </p>
      <div className="meta-grid">
        <Field label="Starting cash (NZD)">
          <input
            type="number"
            min={0}
            step={1000}
            value={startingCash}
            onChange={(e) => setStartingCash(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
            autoFocus
          />
        </Field>
        <Field label="Monthly burn (NZD)">
          <input
            type="number"
            min={0}
            step={500}
            value={monthlyBurn}
            onChange={(e) => setMonthlyBurn(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
          />
        </Field>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save}>Save</button>
      </div>
    </Modal>
  );
};
