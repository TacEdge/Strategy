import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { fmtDateLong } from '../lib/time';
import { ConfirmDialog, Field } from './ui';
import { IconClose, IconTrash } from './icons';

/** Compact edit panel for one Strategic Horizon: theme and date. */
export const HorizonDrawer = ({
  horizonId, onClose,
}: {
  horizonId: string;
  onClose: () => void;
}) => {
  const { state, dispatch } = useStore();
  const h = state.horizons.find((x) => x.id === horizonId);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { setConfirm(false); }, [horizonId]);

  if (!h) return null;

  const patch = (p: Partial<typeof h>) => dispatch({ type: 'horizon/update', id: h.id, patch: p });

  return (
    <aside className="drawer drawer-compact" aria-label={`Strategic Horizon: ${h.theme}`}>
      <div className="drawer-head">
        <div className="drawer-head-info">
          <span className="eyebrow">Strategic Horizon</span>
          <h2 className="drawer-title">{h.theme}</h2>
          <span className="detail-text muted" style={{ fontSize: 13 }}>{fmtDateLong(h.date)}</span>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close horizon panel">
          <IconClose size={16} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="meta-grid">
          <Field label="Theme">
            <input value={h.theme} onChange={(e) => patch({ theme: e.target.value })} />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={h.date}
              onChange={(e) => { if (e.target.value) patch({ date: e.target.value }); }}
            />
          </Field>
        </div>
      </div>

      <div className="drawer-foot">
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>
          <IconTrash size={13} /> Delete
        </button>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Delete horizon"
          message={`Delete "${h.theme}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => { dispatch({ type: 'horizon/delete', id: h.id }); setConfirm(false); onClose(); }}
        />
      )}
    </aside>
  );
};
