import { useMemo } from 'react';
import { useStore } from '../state/store';
import { parseDate, addDays, toIso, todayIso } from '../lib/time';

const OPEN = ['active', 'at-risk', 'blocked', 'future'];

/** Compact computed campaign signals. */
export const InsightsStrip = () => {
  const { state } = useStore();

  const stats = useMemo(() => {
    const today = todayIso();
    const in30 = toIso(addDays(parseDate(today), 30));
    const open = state.milestones.filter((m) => OPEN.includes(m.status));
    return [
      {
        label: 'Milestones due · next 30 days',
        value: open.filter((m) => m.targetDate >= today && m.targetDate <= in30).length,
      },
      { label: 'Milestones at risk', value: open.filter((m) => m.status === 'at-risk').length },
      { label: 'Blocked milestones', value: open.filter((m) => m.status === 'blocked').length },
      { label: 'Founder-owned open milestones', value: open.filter((m) => m.founderAction).length },
    ];
  }, [state.milestones]);

  return (
    <section className="insights-bar" aria-label="Campaign signals">
      <span className="eyebrow">Insights</span>
      {stats.map((s) => (
        <div key={s.label} className="insight-stat">
          <span className="insight-stat-label">{s.label}</span>
          <span className="insight-stat-value">{s.value}</span>
        </div>
      ))}
    </section>
  );
};
