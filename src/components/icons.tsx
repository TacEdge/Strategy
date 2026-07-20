import type { SVGProps, JSX } from 'react';
import type { MilestoneStatus } from '../types';

type P = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 16, ...rest }: P) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...rest,
});

export const IconSearch = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.7-3.7" /></svg>
);
export const IconBell = (p: P) => (
  <svg {...base(p)}><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.3 20a2 2 0 0 0 3.4 0" /></svg>
);
export const IconUser = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg>
);
export const IconPlus = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}><path d="m6 6 12 12M18 6 6 18" /></svg>
);
export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}><path d="m14 6-6 6 6 6" /></svg>
);
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}><path d="m10 6 6 6-6 6" /></svg>
);
export const IconZoomIn = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.7-3.7M8 11h6M11 8v6" /></svg>
);
export const IconZoomOut = (p: P) => (
  <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.7-3.7M8 11h6" /></svg>
);
export const IconExpand = (p: P) => (
  <svg {...base(p)}><path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" /></svg>
);
export const IconFilter = (p: P) => (
  <svg {...base(p)}><path d="M4 6h16M7 12h10M10 18h4" /></svg>
);
export const IconToday = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" /></svg>
);
export const IconCompass = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
);
export const IconEdit = (p: P) => (
  <svg {...base(p)}><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="m13.5 6.5 3 3" /></svg>
);
export const IconTrash = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></svg>
);
export const IconCopy = (p: P) => (
  <svg {...base(p)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
);
export const IconArchive = (p: P) => (
  <svg {...base(p)}><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4" /></svg>
);
export const IconArrowUp = (p: P) => (
  <svg {...base(p)}><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
);
export const IconArrowDown = (p: P) => (
  <svg {...base(p)}><path d="M12 5v14m-6-6 6 6 6-6" /></svg>
);
export const IconLink = (p: P) => (
  <svg {...base(p)}><path d="M9.5 14.5 14.5 9.5" /><path d="M11 6.5 12.9 4.6a3.4 3.4 0 0 1 4.8 4.8L15.8 11.3" /><path d="M13 17.5l-1.9 1.9a3.4 3.4 0 0 1-4.8-4.8l1.9-1.9" /></svg>
);
export const IconFlag = (p: P) => (
  <svg {...base(p)}><path d="M5 21V4" /><path d="M5 4h12l-2.5 4L17 12H5" /></svg>
);
export const IconMenu = (p: P) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);

/* ---- Milestone status icons. Shape carries meaning, never colour alone. ---- */

export const IconStatusComplete = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.2 2.8 2.8L16.4 9.4" fill="none" stroke="var(--te-cream)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const IconStatusActive = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5H12z" fill="currentColor" stroke="none" /></svg>
);
export const IconStatusAtRisk = (p: P) => (
  <svg {...base(p)}><path d="M12 4 21 19H3z" /><path d="M12 10v4M12 16.8v.4" strokeWidth="2" /></svg>
);
export const IconStatusBlocked = (p: P) => (
  <svg {...base(p)}><path d="M8.2 3.5h7.6l4.7 4.7v7.6l-4.7 4.7H8.2l-4.7-4.7V8.2z" /><path d="M8.5 12h7" strokeWidth="2" /></svg>
);
export const IconStatusFuture = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" strokeDasharray="3.4 3.2" /></svg>
);
export const IconStatusSuperseded = (p: P) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="m6.5 17.5 11-11" /></svg>
);
export const IconStatusArchived = (p: P) => <IconArchive {...p} />;

export const statusIcon = (status: MilestoneStatus, size = 16): JSX.Element => {
  switch (status) {
    case 'complete': return <IconStatusComplete size={size} />;
    case 'active': return <IconStatusActive size={size} />;
    case 'at-risk': return <IconStatusAtRisk size={size} />;
    case 'blocked': return <IconStatusBlocked size={size} />;
    case 'future': return <IconStatusFuture size={size} />;
    case 'superseded': return <IconStatusSuperseded size={size} />;
    case 'archived': return <IconStatusArchived size={size} />;
  }
};
