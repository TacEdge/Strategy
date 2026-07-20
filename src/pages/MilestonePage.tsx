import { useState } from 'react';
import type { MilestoneStatus, Confidence } from '../types';
import { useStore, useLoos, newId } from '../state/store';
import { fmtDate } from '../lib/time';
import {
  StatusBadge, ConfidenceMeter, ProgressBar, Field, SectionHeading,
  STATUS_LABEL, CONFIDENCE_LABEL, Eyebrow,
} from '../components/ui';
import { statusIcon, IconChevronRight, IconPlus } from '../components/icons';

const EDIT_STATUSES: MilestoneStatus[] = ['future', 'active', 'at-risk', 'blocked', 'complete', 'superseded'];

export const MilestonePage = ({
  milestoneId, onBack, onOpenMilestone,
}: {
  milestoneId: string;
  onBack: () => void;
  onOpenMilestone: (id: string) => void;
}) => {
  const { state, dispatch } = useStore();
  const loos = useLoos();
  const m = state.milestones.find((x) => x.id === milestoneId);
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');

  if (!m) {
    return (
      <div className="page">
        <div className="workspace">
          <p className="empty-note">Milestone not found. It may have been deleted.</p>
          <div><button type="button" className="btn btn-secondary" onClick={onBack}>Back to LOO Diagram</button></div>
        </div>
      </div>
    );
  }

  const loo = state.loos.find((l) => l.id === m.looId);
  const laneMs = state.milestones
    .filter((x) => x.looId === m.looId && x.status !== 'archived')
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const idx = laneMs.findIndex((x) => x.id === m.id);
  const strip = laneMs.slice(Math.max(0, idx - 1), idx + 2);

  const incoming = state.dependencies.filter((d) => d.toMilestoneId === m.id);
  const outgoing = state.dependencies.filter((d) => d.fromMilestoneId === m.id);

  // The horizon objective this milestone supports: same LOO, first horizon at/after target date.
  const horizon = state.horizons
    .filter((h) => !h.archived && h.date >= m.targetDate)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
    ?? state.horizons.filter((h) => !h.archived).sort((a, b) => b.date.localeCompare(a.date))[0];
  const objective = horizon
    && state.objectives.find((o) => o.horizonId === horizon.id && o.looId === m.looId);

  const patch = (p: Partial<typeof m>, historySummary?: string) =>
    dispatch({ type: 'milestone/update', id: m.id, patch: p, historySummary });

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    patch(
      { tasks: [...m.tasks, { id: newId('tk'), title: t, done: false, owner: m.owner }] },
      `Task added: "${t}".`,
    );
    setNewTask('');
  };

  const addNote = () => {
    const t = newNote.trim();
    if (!t) return;
    patch(
      { notes: m.notes ? `${m.notes}\n${t}` : t },
      'Note added.',
    );
    setNewNote('');
  };

  return (
    <div className="page">
      <div className="workspace">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={onBack}>{state.campaign.name}</button>
          <span className="crumb-sep">/</span>
          <button type="button" onClick={onBack}>{loo?.name ?? 'Line of Operation'}</button>
          <span className="crumb-sep">/</span>
          <span className="current">{m.title}</span>
        </nav>

        <header className="ws-head">
          <div className="ws-title-row">
            <h1 className="ws-title">{m.title}</h1>
            <StatusBadge status={m.status} />
          </div>
          <div className="ws-meta-row">
            <span>{loo?.name}</span>
            <span className="sep" aria-hidden />
            <span>{fmtDate(m.targetDate)}</span>
            <span className="sep" aria-hidden />
            <span>{m.owner}</span>
            <span className="sep" aria-hidden />
            <ConfidenceMeter value={m.confidence} />
            <span className="sep" aria-hidden />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
              <ProgressBar value={m.progress} /> {m.progress}%
            </span>
          </div>

          <div className="ms-strip" aria-label="Neighbouring milestones on this line">
            {strip.map((s, i) => (
              <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                {i > 0 && <span className="ms-strip-arrow" aria-hidden><IconChevronRight size={13} /></span>}
                <button
                  type="button"
                  className={`ms-strip-item${s.id === m.id ? ' current' : ''}`}
                  onClick={() => onOpenMilestone(s.id)}
                  title={`${s.title} · ${fmtDate(s.targetDate)}`}
                >
                  {statusIcon(s.status, 13)}
                  {s.title}
                </button>
              </span>
            ))}
            <span className="ms-strip-arrow" aria-hidden><IconChevronRight size={13} /></span>
            <span className="ms-strip-item" style={{ borderStyle: 'dashed', cursor: 'default' }}>
              {loo?.name} continues
            </span>
          </div>

          {horizon && objective && (
            <div className="next-action-panel" style={{ background: 'var(--te-tint)' }}>
              <SectionHeading>Supports the {loo?.name} objective at {fmtDate(horizon.date)}</SectionHeading>
              <p className="detail-text" style={{ fontWeight: 500 }}>{objective.statement}</p>
            </div>
          )}
        </header>

        <div className="ws-grid">
          <div className="ws-col">
            {m.nextBestAction && (
              <div className="ws-card" style={{ background: 'var(--te-sage-tint)', borderColor: 'var(--te-olive-line)' }}>
                <SectionHeading>Next best action</SectionHeading>
                <p className="detail-text" style={{ fontWeight: 600, fontSize: 16 }}>{m.nextBestAction}</p>
              </div>
            )}

            <div className="ws-card">
              <h2 className="ws-card-title">Purpose</h2>
              <textarea
                style={{ border: '1px solid var(--te-line-2)', borderRadius: 'var(--te-r-sm)', padding: '8px 10px', minHeight: 64, lineHeight: 1.55, resize: 'vertical' }}
                value={m.purpose}
                onChange={(e) => patch({ purpose: e.target.value }, 'Purpose updated.')}
                aria-label="Purpose"
                placeholder="Why this condition must become true."
              />
              <h2 className="ws-card-title" style={{ marginTop: 8 }}>Strategic importance</h2>
              <textarea
                style={{ border: '1px solid var(--te-line-2)', borderRadius: 'var(--te-r-sm)', padding: '8px 10px', minHeight: 64, lineHeight: 1.55, resize: 'vertical' }}
                value={m.strategicImportance}
                onChange={(e) => patch({ strategicImportance: e.target.value }, 'Strategic importance updated.')}
                aria-label="Strategic importance"
                placeholder="What this milestone unlocks across the campaign."
              />
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Success criteria</h2>
              {m.successCriteria.length > 0
                ? <ul className="detail-list">{m.successCriteria.map((c) => <li key={c}>{c}</li>)}</ul>
                : <p className="empty-note">No success criteria yet.</p>}
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Tasks</h2>
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
                  <span className="task-title">{t.week ? `${t.week}: ` : ''}{t.title}</span>
                  {t.owner && <span className="task-owner">{t.owner}</span>}
                </label>
              ))}
              <div className="add-inline">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }}
                  placeholder="Add a task"
                  aria-label="New task"
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addTask}>
                  <IconPlus size={13} /> Add
                </button>
              </div>
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Decisions required</h2>
              {m.decisions.length > 0 ? m.decisions.map((d) => (
                <label key={d.id} className={`decision-row${d.resolved ? ' resolved' : ''}`} style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={d.resolved}
                    onChange={() => patch(
                      { decisions: m.decisions.map((x) => (x.id === d.id ? { ...x, resolved: !x.resolved } : x)) },
                      `Decision "${d.text}" marked ${d.resolved ? 'open' : 'resolved'}.`,
                    )}
                    style={{ accentColor: 'var(--te-forest)' }}
                  />
                  <span className="decision-text">{d.text}</span>
                  {d.due && <span className="due">due {fmtDate(d.due)}</span>}
                </label>
              )) : <p className="empty-note">No open decisions.</p>}
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Notes</h2>
              {m.notes
                ? m.notes.split('\n').map((line, i) => <p key={i} className="detail-text muted">{line}</p>)
                : <p className="empty-note">No notes yet.</p>}
              <div className="add-inline">
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addNote(); }}
                  placeholder="Add a note"
                  aria-label="New note"
                />
                <button type="button" className="btn btn-secondary btn-sm" onClick={addNote}>
                  <IconPlus size={13} /> Add
                </button>
              </div>
            </div>
          </div>

          <div className="ws-col">
            <div className="ws-card">
              <h2 className="ws-card-title">Details</h2>
              <div className="meta-grid">
                <Field label="Status">
                  <select value={m.status} onChange={(e) => patch({ status: e.target.value as MilestoneStatus })}>
                    {EDIT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </Field>
                <Field label="Confidence">
                  <select value={m.confidence} onChange={(e) => patch({ confidence: e.target.value as Confidence })}>
                    {(['high', 'medium', 'low'] as Confidence[]).map((c) => (
                      <option key={c} value={c}>{CONFIDENCE_LABEL[c]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Target date">
                  <input
                    type="date"
                    value={m.targetDate}
                    onChange={(e) => { if (e.target.value) dispatch({ type: 'milestone/move-date', id: m.id, targetDate: e.target.value }); }}
                  />
                </Field>
                <Field label="Owner">
                  <input value={m.owner} onChange={(e) => patch({ owner: e.target.value }, `Owner changed to ${e.target.value || 'unassigned'}.`)} />
                </Field>
                <Field label="Line of Operation">
                  <select value={m.looId} onChange={(e) => dispatch({ type: 'milestone/move-loo', id: m.id, looId: e.target.value })}>
                    {loos.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </Field>
                <Field label={`Progress · ${m.progress}%`}>
                  <input
                    type="range" min={0} max={100} step={5} value={m.progress}
                    onChange={(e) => patch({ progress: Number(e.target.value) }, `Progress set to ${e.target.value}%.`)}
                    aria-label="Progress percent"
                  />
                </Field>
              </div>
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Dependencies</h2>
              {incoming.length === 0 && outgoing.length === 0 && (
                <p className="empty-note">No dependencies recorded.</p>
              )}
              {incoming.map((d) => {
                const from = d.fromMilestoneId ? state.milestones.find((x) => x.id === d.fromMilestoneId) : undefined;
                const fromLoo = from && state.loos.find((l) => l.id === from.looId);
                return (
                  <div key={d.id} className="dep-item">
                    <span className="dep-loo">Needs</span>
                    {from ? (
                      <button type="button" className="dep-link" onClick={() => onOpenMilestone(from.id)}>
                        {from.title}{fromLoo ? ` · ${fromLoo.name}` : ''}
                      </button>
                    ) : <span>{d.label}</span>}
                  </div>
                );
              })}
              {outgoing.map((d) => {
                const to = state.milestones.find((x) => x.id === d.toMilestoneId);
                if (!to) return null;
                return (
                  <div key={d.id} className="dep-item">
                    <span className="dep-loo">Feeds</span>
                    <button type="button" className="dep-link" onClick={() => onOpenMilestone(to.id)}>
                      {to.title}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Risks</h2>
              {m.risks.length > 0 ? m.risks.map((r) => (
                <div key={r.id} className="risk-item">
                  <span className={`risk-sev ${r.severity}`}>{r.severity}</span>
                  <span>{r.text}</span>
                </div>
              )) : <p className="empty-note">No risks recorded.</p>}
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Evidence</h2>
              {m.evidence.length > 0 ? m.evidence.map((e) => (
                <div key={e.id} className="evidence-item">
                  {e.date && <span className="ev-date">{fmtDate(e.date)}</span>}
                  <span>{e.text}</span>
                </div>
              )) : <p className="empty-note">No evidence captured yet.</p>}
            </div>

            <div className="ws-card">
              <h2 className="ws-card-title">Change history</h2>
              {[...m.history].reverse().map((h) => (
                <div key={h.id} className="history-item">
                  <span className="history-when">{fmtDate(h.at.slice(0, 10))}</span>
                  <span className="history-what">{h.summary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Eyebrow>Shared Clarity.</Eyebrow>
        </div>
      </div>
    </div>
  );
};
