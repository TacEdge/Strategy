import { useEffect, useState } from 'react';
import type { Milestone, MilestoneStatus, Confidence, MilestonePriority } from '../types';
import { useStore, useLoos } from '../state/store';
import { fmtDate } from '../lib/time';
import {
  StatusBadge, ConfidenceMeter, ProgressBar, ConfirmDialog, Field, SectionHeading,
  STATUS_LABEL, CONFIDENCE_LABEL, PRIORITY_LABEL,
} from './ui';
import { IconClose, IconCopy, IconArchive, IconTrash, IconEdit } from './icons';

const EDIT_STATUSES: MilestoneStatus[] = ['future', 'active', 'at-risk', 'blocked', 'complete', 'superseded'];

export const MilestoneDrawer = ({
  milestoneId, onClose, onOpenFull, onSelectMilestone,
}: {
  milestoneId: string;
  onClose: () => void;
  onOpenFull: (id: string) => void;
  onSelectMilestone: (id: string) => void;
}) => {
  const { state, dispatch } = useStore();
  const loos = useLoos();
  const m = state.milestones.find((mm) => mm.id === milestoneId);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);

  useEffect(() => { setEditingTitle(false); setConfirm(null); }, [milestoneId]);

  if (!m) return null;
  const loo = state.loos.find((l) => l.id === m.looId);
  const incoming = state.dependencies.filter((d) => d.toMilestoneId === m.id);
  const outgoing = state.dependencies.filter((d) => d.fromMilestoneId === m.id);

  const patch = (p: Partial<Milestone>, historySummary?: string) =>
    dispatch({ type: 'milestone/update', id: m.id, patch: p, historySummary });

  const commitTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== m.title) patch({ title: t });
    setEditingTitle(false);
  };

  return (
    <aside className="drawer" aria-label={`Milestone: ${m.title}`}>
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
            <ConfidenceMeter value={m.confidence} />
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
              {EDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select
              value={m.priority}
              onChange={(e) => patch(
                { priority: e.target.value as MilestonePriority },
                `Priority set to ${e.target.value}.`,
              )}
            >
              {(['critical', 'important', 'routine'] as MilestonePriority[]).map((pr) => (
                <option key={pr} value={pr}>{PRIORITY_LABEL[pr]}</option>
              ))}
            </select>
          </Field>
          <Field label="Confidence">
            <select
              value={m.confidence}
              onChange={(e) => patch({ confidence: e.target.value as Confidence })}
            >
              {(['high', 'medium', 'low'] as Confidence[]).map((c) => (
                <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>
              ))}
            </select>
          </Field>
          <Field label="Target date">
            <input
              type="date"
              value={m.targetDate}
              onChange={(e) => {
                if (e.target.value) dispatch({ type: 'milestone/move-date', id: m.id, targetDate: e.target.value });
              }}
            />
          </Field>
          <Field label="Owner">
            <input
              value={m.owner}
              onChange={(e) => patch({ owner: e.target.value }, `Owner changed to ${e.target.value || 'unassigned'}.`)}
            />
          </Field>
          <Field label="Line of Operation">
            <select
              value={m.looId}
              onChange={(e) => dispatch({ type: 'milestone/move-loo', id: m.id, looId: e.target.value })}
            >
              {loos.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </Field>
          <Field label={`Progress · ${m.progress}%`}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={m.progress}
              onChange={(e) => patch({ progress: Number(e.target.value) }, `Progress set to ${e.target.value}%.`)}
              aria-label="Progress percent"
            />
          </Field>
        </div>
        <ProgressBar value={m.progress} />

        {m.nextBestAction && (
          <div className="next-action-panel">
            <SectionHeading>Next best action</SectionHeading>
            <p className="detail-text">{m.nextBestAction}</p>
          </div>
        )}

        {m.purpose && (
          <div className="detail-section">
            <SectionHeading>Purpose</SectionHeading>
            <p className="detail-text">{m.purpose}</p>
          </div>
        )}

        {m.strategicImportance && (
          <div className="detail-section">
            <SectionHeading>Strategic importance</SectionHeading>
            <p className="detail-text muted">{m.strategicImportance}</p>
          </div>
        )}

        {m.successCriteria.length > 0 && (
          <div className="detail-section">
            <SectionHeading>Success criteria</SectionHeading>
            <ul className="detail-list">
              {m.successCriteria.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        )}

        {(incoming.length > 0 || outgoing.length > 0) && (
          <div className="detail-section">
            <SectionHeading>Dependencies</SectionHeading>
            {incoming.map((d) => {
              const from = d.fromMilestoneId
                ? state.milestones.find((x) => x.id === d.fromMilestoneId)
                : undefined;
              const fromLoo = from && state.loos.find((l) => l.id === from.looId);
              return (
                <div key={d.id} className="dep-item">
                  <span className="dep-loo">Needs</span>
                  {from ? (
                    <button type="button" className="dep-link" onClick={() => onSelectMilestone(from.id)}>
                      {from.title}{fromLoo ? ` · ${fromLoo.name}` : ''}
                    </button>
                  ) : (
                    <span>{d.label}</span>
                  )}
                  <button
                    type="button"
                    className="icon-btn dep-remove"
                    style={{ width: 24, height: 24 }}
                    onClick={() => dispatch({ type: 'dependency/remove', id: d.id })}
                    title="Remove dependency"
                    aria-label={`Remove dependency ${from?.title ?? d.label ?? ''}`}
                  >
                    <IconClose size={11} />
                  </button>
                </div>
              );
            })}
            {outgoing.map((d) => {
              const to = state.milestones.find((x) => x.id === d.toMilestoneId);
              if (!to) return null;
              return (
                <div key={d.id} className="dep-item">
                  <span className="dep-loo">Feeds</span>
                  <button type="button" className="dep-link" onClick={() => onSelectMilestone(to.id)}>
                    {to.title}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {m.risks.length > 0 && (
          <div className="detail-section">
            <SectionHeading>Risks</SectionHeading>
            {m.risks.map((r) => (
              <div key={r.id} className="risk-item">
                <span className={`risk-sev ${r.severity}`}>{r.severity}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        )}

        {m.tasks.length > 0 && (
          <div className="detail-section">
            <SectionHeading>Key tasks</SectionHeading>
            {m.tasks.map((t) => (
              <label key={t.id} className={`task-row${t.done ? ' done' : ''}`}>
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => patch(
                    { tasks: m.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) },
                    `Task "${t.title}" marked ${t.done ? 'open' : 'done'}.`,
                  )}
                />
                <span className="task-title">{t.title}</span>
                {t.owner && <span className="task-owner">{t.owner}</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="drawer-foot">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenFull(m.id)}>
          Open full milestone
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => dispatch({ type: 'milestone/duplicate', id: m.id })}
          title="Duplicate milestone"
        >
          <IconCopy size={13} /> Duplicate
        </button>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm('archive')}>
          <IconArchive size={13} /> Archive
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm('delete')}>
          <IconTrash size={13} /> Delete
        </button>
      </div>

      {confirm === 'archive' && (
        <ConfirmDialog
          title="Archive milestone"
          message={`Archive "${m.title}"? It leaves the diagram but keeps its strategic history.`}
          confirmLabel="Archive"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { dispatch({ type: 'milestone/archive', id: m.id }); setConfirm(null); onClose(); }}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete milestone"
          message={`Permanently delete "${m.title}" and its dependencies? Archiving preserves strategic history; deletion does not.`}
          confirmLabel="Delete permanently"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { dispatch({ type: 'milestone/delete', id: m.id }); setConfirm(null); onClose(); }}
        />
      )}
    </aside>
  );
};
