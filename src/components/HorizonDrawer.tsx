import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { fmtDateLong, todayIso } from '../lib/time';
import { ConfirmDialog, Field, OutcomeBadge, OutcomePicker } from './ui';
import { IconClose, IconTrash } from './icons';
import { TERMS } from '../lib/terms';

/** Compact edit panel for one Strategic Objective: theme and date. */
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
    <aside className="drawer drawer-compact" aria-label={`${TERMS.objective}: ${h.theme}`}>
      <div className="drawer-head">
        <div className="drawer-head-info">
          <span className="eyebrow">{TERMS.objective}</span>
          <h2 className="drawer-title">{h.theme}</h2>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <OutcomeBadge outcome={h.outcome} overdue={h.outcome === 'open' && h.date < todayIso()} />
            <span className="detail-text muted" style={{ fontSize: 13 }}>{fmtDateLong(h.date)}</span>
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label={`Close ${TERMS.objectiveLower} panel`}>
          <IconClose size={16} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="field">
          <span className="field-label">Outcome</span>
          <OutcomePicker value={h.outcome} onChange={(outcome) => patch({ outcome })} />
        </div>
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
          title={`Delete ${TERMS.objectiveLower}`}
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
