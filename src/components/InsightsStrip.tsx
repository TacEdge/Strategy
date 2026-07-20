import type { Insight } from '../types';

const KIND_LABEL: Record<Insight['kind'], string> = {
  congestion: 'Congestion',
  founder: 'Founder',
  sequencing: 'Sequencing',
  resource: 'Resource',
  momentum: 'Momentum',
};

export const InsightsStrip = ({ insights }: { insights: Insight[] }) => (
  <section className="insights-strip" aria-label="Campaign insights">
    <span className="eyebrow">Insights</span>
    {insights.map((i) => (
      <div key={i.id} className="insight-chip">
        <span className="insight-kind">{KIND_LABEL[i.kind]}</span>
        <span>{i.text}</span>
      </div>
    ))}
  </section>
);
