import type { CampaignState } from '../types';
import { fmtDateLong } from '../lib/time';
import { ConfidenceMeter, Eyebrow } from './ui';

export const ContextBanner = ({ state }: { state: CampaignState }) => {
  const { campaign } = state;
  const mainEffort = state.loos.find((l) => l.role === 'main-effort' && !l.archived);
  const horizon = state.horizons.find((h) => h.id === campaign.activeHorizonId && !h.archived)
    ?? state.horizons.find((h) => !h.archived);

  return (
    <section className="context-banner on-dark" aria-label="Strategic context">
      <div className="banner-cell">
        <Eyebrow>Vision</Eyebrow>
        <p className="banner-vision">{campaign.vision.statement}</p>
      </div>
      <div className="banner-cell">
        <Eyebrow>Current Campaign</Eyebrow>
        <p className="banner-value">{campaign.theme}</p>
      </div>
      <div className="banner-cell">
        <Eyebrow>Main Effort</Eyebrow>
        <p className="banner-value">{mainEffort?.name ?? 'Not set'}</p>
        {mainEffort && <p className="banner-sub">{mainEffort.owner}</p>}
      </div>
      <div className="banner-cell">
        <Eyebrow>Active Horizon</Eyebrow>
        <p className="banner-value">{horizon ? fmtDateLong(horizon.date) : 'None'}</p>
        {horizon && <p className="banner-sub">{horizon.theme}</p>}
      </div>
      <div className="banner-cell">
        <Eyebrow>Confidence</Eyebrow>
        {horizon
          ? <p className="banner-value"><ConfidenceMeter value={horizon.confidence} /></p>
          : <p className="banner-value">—</p>}
        {horizon && (
          <p className="banner-sub">
            {horizon.status === 'on-track' ? 'On track'
              : horizon.status === 'at-risk' ? 'At risk'
                : horizon.status === 'forming' ? 'Forming' : 'Archived'}
          </p>
        )}
      </div>
    </section>
  );
};
