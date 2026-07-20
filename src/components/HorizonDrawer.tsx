import { useState } from 'react';
import type { HorizonStatus, Confidence } from '../types';
import { useStore, useLoos } from '../state/store';
import { fmtDateLong, fmtDayMonth } from '../lib/time';
import {
  ConfidenceMeter, ConfirmDialog, Field, SectionHeading, CONFIDENCE_LABEL, StatusBadge,
} from './ui';
import { IconClose, IconArchive, IconTrash } from './icons';

const HZ_STATUS: { value: HorizonStatus; label: string }[] = [
  { value: 'on-track', label: 'On track' },
  { value: 'at-risk', label: 'At risk' },
  { value: 'forming', label: 'Forming' },
];

export const HorizonDrawer = ({
  horizonId, onClose, onSelectMilestone,
}: {
  horizonId: string;
  onClose: () => void;
  onSelectMilestone: (id: string) => void;
}) => {
  const { state, dispatch } = useStore();
  const loos = useLoos();
  const h = state.horizons.find((x) => x.id === horizonId);
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);
  if (!h) return null;

  const objectives = loos
    .map((loo) => ({
      loo,
      obj: state.objectives.find((o) => o.horizonId === h.id && o.looId === loo.id),
    }))
    .filter((x) => x.obj);

  // Critical milestones: major, not complete, landing before this horizon.
  const critical = state.milestones
    .filter((m) => m.major && m.status !== 'archived' && m.status !== 'superseded'
      && m.status !== 'complete' && m.targetDate <= h.date)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  const criticalDeps = state.dependencies.filter((d) =>
    critical.some((m) => m.id === d.toMilestoneId));

  const patch = (p: Partial<typeof h>) => dispatch({ type: 'horizon/update', id: h.id, patch: p });

  return (
    <aside className="drawer" aria-label={`Strategic Horizon: ${h.theme}`}>
      <div className="drawer-head">
        <div className="drawer-head-info">
          <span className="eyebrow">Strategic Horizon</span>
          <h2 className="drawer-title">{h.theme}</h2>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="detail-text muted" style={{ fontSize: 13 }}>{fmtDateLong(h.date)}</span>
            <ConfidenceMeter value={h.confidence} />
          </div>
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
          <Field label="Status">
            <select value={h.status} onChange={(e) => patch({ status: e.target.value as HorizonStatus })}>
              {HZ_STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Overall confidence">
            <select value={h.confidence} onChange={(e) => patch({ confidence: e.target.value as Confidence })}>
              {(['high', 'medium', 'low'] as Confidence[]).map((c) => (
                <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="detail-section">
          <SectionHeading>Integrated Horizon State</SectionHeading>
          <p className="detail-text muted" style={{ fontSize: 13 }}>
            What TACEDGE looks like at this point if the LOO objectives are achieved together.
            The Lines of Operation continue beyond it.
          </p>
          <textarea
            className="field-textarea"
            style={{
              border: '1px solid var(--te-line-2)', borderRadius: 'var(--te-r-sm)',
              padding: '8px 10px', minHeight: 120, lineHeight: 1.55, width: '100%', resize: 'vertical',
            }}
            value={h.integratedState}
            onChange={(e) => patch({ integratedState: e.target.value })}
            aria-label="Integrated Horizon State"
          />
        </div>

        <div className="detail-section">
          <SectionHeading>LOO objectives at this horizon</SectionHeading>
          {objectives.map(({ loo, obj }) => (
            <div key={obj!.id} className="detail-section" style={{ paddingBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="eyebrow" style={{ fontSize: 10 }}>
                  {String(loo.number).padStart(2, '0')} · {loo.name}
                </span>
                <ConfidenceMeter value={obj!.confidence} label={false} />
              </div>
              <textarea
                style={{
                  border: '1px solid var(--te-line-2)', borderRadius: 'var(--te-r-sm)',
                  padding: '7px 10px', minHeight: 54, lineHeight: 1.5, width: '100%',
                  fontSize: 14, resize: 'vertical',
                }}
                value={obj!.statement}
                onChange={(e) => dispatch({ type: 'objective/update', id: obj!.id, patch: { statement: e.target.value } })}
                aria-label={`${loo.name} objective`}
              />
            </div>
          ))}
        </div>

        {critical.length > 0 && (
          <div className="detail-section">
            <SectionHeading>Critical milestones before this horizon</SectionHeading>
            {critical.map((m) => {
              const loo = state.loos.find((l) => l.id === m.looId);
              return (
                <div key={m.id} className="dep-item">
                  <span className="dep-loo">{fmtDayMonth(m.targetDate)}</span>
                  <button type="button" className="dep-link" onClick={() => onSelectMilestone(m.id)}>
                    {m.title}
                  </button>
                  <span style={{ marginLeft: 'auto' }}><StatusBadge status={m.status} compact /></span>
                  <span className="dep-loo">{loo?.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {criticalDeps.length > 0 && (
          <div className="detail-section">
            <SectionHeading>Dependencies in play</SectionHeading>
            {criticalDeps.map((d) => {
              const to = state.milestones.find((m) => m.id === d.toMilestoneId);
              const from = d.fromMilestoneId
                ? state.milestones.find((m) => m.id === d.fromMilestoneId)
                : undefined;
              if (!to) return null;
              return (
                <div key={d.id} className="dep-item">
                  <span>{from?.title ?? d.label}</span>
                  <span className="dep-loo">feeds</span>
                  <span style={{ fontWeight: 600 }}>{to.title}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="detail-section">
          <SectionHeading>Key assumptions</SectionHeading>
          <ul className="detail-list">
            {h.assumptions.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </div>

        <div className="detail-section">
          <SectionHeading>Critical risks</SectionHeading>
          <ul className="detail-list">
            {h.risks.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>

        <div className="detail-section">
          <SectionHeading>Current assessment</SectionHeading>
          <p className="detail-text muted">{h.assessment}</p>
        </div>
      </div>

      <div className="drawer-foot">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirm('archive')}>
          <IconArchive size={13} /> Archive
        </button>
        <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm('delete')}>
          <IconTrash size={13} /> Delete
        </button>
      </div>

      {confirm === 'archive' && (
        <ConfirmDialog
          title="Archive horizon"
          message={`Archive "${h.theme}"? Its objectives are kept for strategic history.`}
          confirmLabel="Archive"
          onCancel={() => setConfirm(null)}
          onConfirm={() => { dispatch({ type: 'horizon/archive', id: h.id }); setConfirm(null); onClose(); }}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete horizon"
          message={`Permanently delete "${h.theme}" and its objectives? Archiving preserves strategic history; deletion does not.`}
          confirmLabel="Delete permanently"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={() => { dispatch({ type: 'horizon/delete', id: h.id }); setConfirm(null); onClose(); }}
        />
      )}
    </aside>
  );
};
