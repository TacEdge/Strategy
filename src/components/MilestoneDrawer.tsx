import { useEffect, useState } from 'react';
import type { Milestone, MilestoneStatus } from '../types';
import { useStore, useLoos } from '../state/store';
import { fmtDate } from '../lib/time';
import { StatusBadge, ConfirmDialog, Field, STATUS_LABEL, STATUSES } from './ui';
import { IconClose, IconTrash, IconEdit } from './icons';

/**
 * Compact edit panel for one selected milestone: the same five things the
 * diagram already shows. Change what you need and close.
 */
export const MilestoneDrawer = ({
  milestoneId, onClose,
}: {
  milestoneId: string;
  onClose: () => void;
}) => {
  const { state, dispatch } = useStore();
  const loos = useLoos();
  const m = state.milestones.find((mm) => mm.id === milestoneId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => { setEditingTitle(false); setConfirm(false); }, [milestoneId]);

  if (!m) return null;
  const loo = state.loos.find((l) => l.id === m.looId);

  const patch = (p: Partial<Milestone>) => dispatch({ type: 'milestone/update', id: m.id, patch: p });

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== m.title) patch({ title: t });
    setEditingTitle(false);
  };

  return (
    <aside className="drawer drawer-compact" aria-label={`Milestone: ${m.title}`}>
      <div className="drawer-head">
        <div className="drawer-head-info">
          <span className="eyebrow">{loo?.name ?? 'Milestone'}</span>
          {editingTitle ? (
            <input
              className="drawer-title-input"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitTitle();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              aria-label="Milestone title"
              autoFocus
            />
          ) : (
            <h2 className="drawer-title">
              {m.title}{' '}
              <button
                type="button"
                className="icon-btn"
                style={{ display: 'inline-grid', verticalAlign: 'middle', width: 26, height: 26 }}
                onClick={() => { setTitleDraft(m.title); setEditingTitle(true); }}
                title="Edit title"
                aria-label="Edit title"
              >
                <IconEdit size={13} />
              </button>
            </h2>
          )}
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge status={m.status} />
            <span className="detail-text muted" style={{ fontSize: 13 }}>{fmtDate(m.targetDate)}</span>
          </div>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close milestone panel">
          <IconClose size={16} />
        </button>
      </div>

      <div className="drawer-body">
        <div className="meta-grid">
          <Field label="Status">
            <select
              value={m.status}
              onChange={(e) => patch({ status: e.target.value as MilestoneStatus })}
            >
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Target date">
            <input
              type="date"
              value={m.targetDate}
              onChange={(e) => { if (e.target.value) patch({ targetDate: e.target.value }); }}
            />
          </Field>
          <Field label="Line of Operation">
            <select value={m.looId} onChange={(e) => patch({ looId: e.target.value })}>
              {loos.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label="Owner">
            <input value={m.owner} onChange={(e) => patch({ owner: e.target.value })} />
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
          title="Delete milestone"
          message={`Delete "${m.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setConfirm(false)}
          onConfirm={() => { dispatch({ type: 'milestone/delete', id: m.id }); setConfirm(false); onClose(); }}
        />
      )}
    </aside>
  );
};
