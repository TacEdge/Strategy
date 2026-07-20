import { useMemo, useState } from 'react';
import type { EnergyLevel } from '../types';
import { useStore } from '../state/store';
import { recommend } from '../lib/recommend';
import { Modal } from './ui';
import { RecommendationDetail } from './Recommendation';

const TIME_OPTIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
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

/**
 * The focused "What should I do now?" panel. Time, energy and a free-text
 * note reshape the recommendation immediately.
 */
export const NowPanel = ({
  onClose, onOpenMilestone,
}: {
  onClose: () => void;
  onOpenMilestone: (id: string) => void;
}) => {
  const { state } = useStore();
  const [minutes, setMinutes] = useState<number>(state.capacity.minutes);
  const [energy, setEnergy] = useState<EnergyLevel>(state.capacity.energy);
  const [note, setNote] = useState('');

  const result = useMemo(
    () => recommend(state, { minutes, energy, note }),
    [state, minutes, energy, note],
  );

  return (
    <Modal title="What should I do now?" onClose={onClose} wide>
      <div className="now-inputs">
        <div className="now-input-group">
          <span className="field-label">Time available</span>
          <div className="chip-row" role="group" aria-label="Time available">
            {TIME_OPTIONS.map((t) => (
              <button
                type="button"
                key={t.minutes}
                className={`chip${minutes === t.minutes ? ' on' : ''}`}
                onClick={() => setMinutes(t.minutes)}
                aria-pressed={minutes === t.minutes}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="now-input-group">
          <span className="field-label">Energy</span>
          <div className="chip-row" role="group" aria-label="Energy available">
            {ENERGY_OPTIONS.map((e) => (
              <button
                type="button"
                key={e.value}
                className={`chip${energy === e.value ? ' on' : ''}`}
                onClick={() => setEnergy(e.value)}
                aria-pressed={energy === e.value}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <label className="field" style={{ flex: 1, minWidth: 220 }}>
          <span className="field-label">Anything changed?</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. 45 minutes before a military meeting"
          />
        </label>
      </div>

      {result ? (
        <>
          <div className="now-heading">
            Best use of the next {minutes >= 240 ? (minutes >= 420 ? 'full day' : 'half day') : `${minutes} minutes`}
          </div>
          <RecommendationDetail
            result={result}
            compact
            onOpenMilestone={(id) => { onClose(); onOpenMilestone(id); }}
          />
        </>
      ) : (
        <p className="empty-note">No open milestones to recommend against. Add milestones to the campaign first.</p>
      )}
    </Modal>
  );
};
