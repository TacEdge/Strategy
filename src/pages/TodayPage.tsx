import { useMemo, useState } from 'react';
import type { EnergyLevel } from '../types';
import { useStore, newId } from '../state/store';
import { recommend } from '../lib/recommend';
import { fmtDateLong, fmtDate } from '../lib/time';
import { RecommendationDetail } from '../components/Recommendation';
import { CloseoutModal } from '../components/CloseoutModal';
import { ConfidenceMeter, SectionHeading, Eyebrow } from '../components/ui';
import { IconClose, IconPlus, IconCompass } from '../components/icons';

const TIME_OPTIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '60 min' },
  { minutes: 90, label: '90 min' },
  { minutes: 240, label: 'Half day' },
  { minutes: 420, label: 'Full day' },
];

const ENERGY_OPTIONS: { value: EnergyLevel; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export const TodayPage = ({
  onOpenMilestone, onOpenDiagram, onOpenNow,
}: {
  onOpenMilestone: (id: string) => void;
  onOpenDiagram: () => void;
  onOpenNow: () => void;
}) => {
  const { state, dispatch } = useStore();
  const [closeoutOpen, setCloseoutOpen] = useState(false);
  const [newWaiting, setNewWaiting] = useState('');
  const [editingConstraint, setEditingConstraint] = useState(false);

  const result = useMemo(() => recommend(state), [state]);
  const capacity = state.capacity;
  const lastCloseout = state.closeouts[state.closeouts.length - 1];
  const carried = lastCloseout?.carryForward?.trim();

  if (!result) {
    return (
      <div className="page">
        <p className="empty-note">No campaign data. Add Lines of Operation and milestones first.</p>
      </div>
    );
  }

  const { horizon, mainEffort } = result;

  return (
    <div className="page today-page">
      {/* 1. Current strategic context */}
      <section className="today-context" aria-label="Current strategic context">
        <div className="today-context-cell">
          <Eyebrow>Active Horizon</Eyebrow>
          <p className="today-context-value">{fmtDateLong(horizon.date)}</p>
          <p className="today-context-sub">{result.daysToHorizon} days remaining</p>
        </div>
        <div className="today-context-cell">
          <Eyebrow>Campaign theme</Eyebrow>
          <p className="today-context-value">{horizon.theme}</p>
          <p className="today-context-sub">{state.campaign.theme}</p>
        </div>
        <div className="today-context-cell">
          <Eyebrow>Main Effort</Eyebrow>
          <p className="today-context-value">{mainEffort?.name ?? 'Not set'}</p>
          {mainEffort && <p className="today-context-sub">{mainEffort.owner}</p>}
        </div>
        <div className="today-context-cell">
          <Eyebrow>Primary constraint</Eyebrow>
          {editingConstraint ? (
            <input
              className="today-constraint-input"
              value={state.campaign.primaryConstraint}
              onChange={(e) => dispatch({ type: 'campaign/update', patch: { primaryConstraint: e.target.value } })}
              onBlur={() => setEditingConstraint(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingConstraint(false); }}
              aria-label="Primary constraint"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="today-context-value editable"
              onClick={() => setEditingConstraint(true)}
              title="Edit the primary constraint"
            >
              {state.campaign.primaryConstraint}
            </button>
          )}
        </div>
        <div className="today-context-cell">
          <Eyebrow>Horizon confidence</Eyebrow>
          <p className="today-context-value"><ConfidenceMeter value={horizon.confidence} /></p>
          <p className="today-context-sub">
            {horizon.status === 'on-track' ? 'On track' : horizon.status === 'at-risk' ? 'At risk' : 'Forming'}
          </p>
        </div>
      </section>

      {carried && (
        <div className="carried-note">
          <span className="eyebrow">Carried from {fmtDate(lastCloseout.date)}</span>
          <span>{carried}</span>
        </div>
      )}

      <div className="today-grid">
        <div className="today-main">
          {/* 2. Recommended priority */}
          <section className="ws-card today-priority" aria-label="Today's priority">
            <div className="today-priority-head">
              <SectionHeading>Today's priority</SectionHeading>
              <button type="button" className="btn btn-quiet btn-sm" onClick={onOpenDiagram}>
                View on the LOO Diagram
              </button>
            </div>
            <RecommendationDetail result={result} onOpenMilestone={onOpenMilestone} />
          </section>

          {/* 3. Next two actions */}
          <section className="ws-card" aria-label="Next actions">
            <h2 className="ws-card-title">Next</h2>
            <ol className="next-actions">
              {result.next.map((n, i) => (
                <li key={n.milestoneId}>
                  <span className="next-num">{i + 1}</span>
                  <button type="button" className="dep-link" onClick={() => onOpenMilestone(n.milestoneId)}>
                    {n.text}
                  </button>
                </li>
              ))}
            </ol>
            <p className="detail-text muted" style={{ fontSize: 13 }}>
              Sequenced, not a task list. Nothing else is queued for today.
            </p>
          </section>

          {/* 4. Do not prioritise */}
          <section className="ws-card" aria-label="Not today">
            <h2 className="ws-card-title">Not today</h2>
            <p className="detail-text muted" style={{ fontSize: 14 }}>
              Attractive work that does not advance the campaign today. Permission to ignore it.
            </p>
            <div className="priority-avoid">
              {state.campaign.notToday.map((d) => <span key={d}>{d}</span>)}
            </div>
          </section>
        </div>

        <div className="today-side">
          {/* 6. Today's capacity */}
          <section className="ws-card" aria-label="Today's capacity">
            <h2 className="ws-card-title">Today's capacity</h2>
            <div className="detail-section">
              <SectionHeading>Time available</SectionHeading>
              <div className="chip-row" role="group" aria-label="Time available">
                {TIME_OPTIONS.map((t) => (
                  <button
                    type="button"
                    key={t.minutes}
                    className={`chip${capacity.minutes === t.minutes ? ' on' : ''}`}
                    onClick={() => dispatch({ type: 'capacity/set', patch: { minutes: t.minutes } })}
                    aria-pressed={capacity.minutes === t.minutes}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="detail-section">
              <SectionHeading>Energy</SectionHeading>
              <div className="chip-row" role="group" aria-label="Energy">
                {ENERGY_OPTIONS.map((e) => (
                  <button
                    type="button"
                    key={e.value}
                    className={`chip${capacity.energy === e.value ? ' on' : ''}`}
                    onClick={() => dispatch({ type: 'capacity/set', patch: { energy: e.value } })}
                    aria-pressed={capacity.energy === e.value}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="meta-grid">
              <label className="field">
                <span className="field-label">Focused blocks</span>
                <select
                  value={capacity.blocks}
                  onChange={(e) => dispatch({ type: 'capacity/set', patch: { blocks: Number(e.target.value) } })}
                >
                  {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Day type</span>
                <select
                  value={capacity.constrainedDay ? 'constrained' : 'full'}
                  onChange={(e) => dispatch({ type: 'capacity/set', patch: { constrainedDay: e.target.value === 'constrained' } })}
                >
                  <option value="full">Full TACEDGE day</option>
                  <option value="constrained">Constrained by military work</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span className="field-label">Fixed meetings</span>
              <input
                value={capacity.meetings}
                onChange={(e) => dispatch({ type: 'capacity/set', patch: { meetings: e.target.value } })}
                placeholder="e.g. Military planning 1300 to 1500"
              />
            </label>
            <label className="filter-row" style={{ padding: '4px 0' }}>
              <input
                type="checkbox"
                checked={capacity.together}
                onChange={(e) => dispatch({ type: 'capacity/set', patch: { together: e.target.checked } })}
              />
              <span>Working with another founder today</span>
            </label>
          </section>

          {/* 5. Waiting and blocked */}
          <section className="ws-card" aria-label="Waiting on others">
            <h2 className="ws-card-title">Waiting</h2>
            <p className="detail-text muted" style={{ fontSize: 13 }}>
              Needs another person or event first. Not mentally active.
            </p>
            {state.waiting.map((w) => (
              <div key={w.id} className="dep-item">
                {w.who && <span className="dep-loo">{w.who}</span>}
                <span>{w.text}</span>
                <button
                  type="button"
                  className="icon-btn dep-remove"
                  style={{ width: 24, height: 24 }}
                  onClick={() => dispatch({ type: 'waiting/remove', id: w.id })}
                  title="Resolved — remove"
                  aria-label={`Remove waiting item: ${w.text}`}
                >
                  <IconClose size={11} />
                </button>
              </div>
            ))}
            <div className="add-inline">
              <input
                value={newWaiting}
                onChange={(e) => setNewWaiting(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newWaiting.trim()) {
                    dispatch({ type: 'waiting/add', item: { id: newId('wt'), text: newWaiting.trim() } });
                    setNewWaiting('');
                  }
                }}
                placeholder="Add a waiting item"
                aria-label="New waiting item"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (!newWaiting.trim()) return;
                  dispatch({ type: 'waiting/add', item: { id: newId('wt'), text: newWaiting.trim() } });
                  setNewWaiting('');
                }}
              >
                <IconPlus size={13} /> Add
              </button>
            </div>
          </section>

          <section className="ws-card" aria-label="Day controls">
            <button type="button" className="priority-btn" style={{ justifyContent: 'center' }} onClick={onOpenNow}>
              <IconCompass size={16} /> What should I do now?
            </button>
            <button type="button" className="btn btn-secondary" style={{ justifyContent: 'center' }} onClick={() => setCloseoutOpen(true)}>
              Daily closeout
            </button>
            {state.closeouts.length > 0 && (
              <p className="detail-text muted" style={{ fontSize: 13 }}>
                Last closeout {fmtDate(state.closeouts[state.closeouts.length - 1].date)}
                {' · '}{state.closeouts.length} recorded
              </p>
            )}
          </section>
        </div>
      </div>

      {closeoutOpen && <CloseoutModal onClose={() => setCloseoutOpen(false)} />}
      <div style={{ marginTop: 4 }}>
        <span className="eyebrow">Shared Clarity.</span>
      </div>
    </div>
  );
};
