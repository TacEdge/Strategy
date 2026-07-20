import { useState } from 'react';
import type { CampaignState } from '../types';
import { fmtDate } from '../lib/time';
import { ConfidenceMeter } from './ui';
import { IconChevronRight } from './icons';

/** Compact strategic context strip. The full Vision expands on demand. */
export const ContextBanner = ({ state }: { state: CampaignState }) => {
  const [visionOpen, setVisionOpen] = useState(false);
  const { campaign } = state;
  const horizon = state.horizons.find((h) => h.id === campaign.activeHorizonId && !h.archived)
    ?? state.horizons.find((h) => !h.archived);

  return (
    <section className="context-strip" aria-label="Strategic context">
      <div className="strip-row">
        <div className="strip-item">
          <span className="strip-label">Campaign</span>
          <span className="strip-value">{campaign.theme}</span>
        </div>
        <div className="strip-item">
          <span className="strip-label">Active Horizon</span>
          <span className="strip-value">
            {horizon ? fmtDate(horizon.date) : 'None'}
            {horizon && <span className="strip-sub"> · {horizon.theme}</span>}
          </span>
        </div>
        <div className="strip-item">
          <span className="strip-label">Confidence</span>
          <span className="strip-value">
            {horizon ? <ConfidenceMeter value={horizon.confidence} /> : '—'}
          </span>
        </div>
        <div className="strip-spacer" />
        <button
          type="button"
          className="btn btn-secondary btn-sm strip-vision-toggle"
          onClick={() => setVisionOpen((o) => !o)}
          aria-expanded={visionOpen}
        >
          View vision
          <span className={`strip-chevron${visionOpen ? ' open' : ''}`} aria-hidden>
            <IconChevronRight size={12} />
          </span>
        </button>
      </div>
      {visionOpen && (
        <p className="strip-vision">
          {campaign.vision.statement}
          <span className="strip-sub"> {campaign.vision.note}</span>
        </p>
      )}
    </section>
  );
};
