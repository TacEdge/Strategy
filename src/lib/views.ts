/**
 * Semantic zoom. The scale (px per day) is continuous: pinch, trackpad or
 * the plus and minus buttons move it anywhere between ZOOM_MIN and
 * ZOOM_MAX. The named views below are anchors along that scale: the
 * nearest one decides what the diagram shows at the current scale (day
 * columns, week or month bands, label density), not just its size.
 */
export type ViewId = '5y' | '3y' | 'year' | '6m' | 'quarter' | 'month' | 'week';

export interface ViewSpec {
  id: ViewId;
  label: string;
  pxPerDay: number;
  /** 'macro' = strategic shape, 'detail' = full milestone cards, 'operational' = tasks and sequencing */
  detail: 'macro' | 'detail' | 'operational';
  laneHeight: number;
  showWeeks: boolean;
  /** Label every day in the header (Week view). */
  showDays?: boolean;
}

/** Ordered near-term to long-term; zooming in steps toward Month. */
export const VIEWS: ViewSpec[] = [
  { id: 'week', label: 'Week', pxPerDay: 96, detail: 'operational', laneHeight: 164, showWeeks: true, showDays: true },
  { id: 'month', label: 'Month', pxPerDay: 15, detail: 'operational', laneHeight: 164, showWeeks: true },
  { id: 'quarter', label: 'Quarter', pxPerDay: 7.4, detail: 'detail', laneHeight: 142, showWeeks: false },
  { id: '6m', label: '6 months', pxPerDay: 3.8, detail: 'detail', laneHeight: 134, showWeeks: false },
  { id: 'year', label: 'Year', pxPerDay: 1.9, detail: 'macro', laneHeight: 122, showWeeks: false },
  { id: '3y', label: '3 years', pxPerDay: 0.72, detail: 'macro', laneHeight: 94, showWeeks: false },
  { id: '5y', label: '5 years', pxPerDay: 0.42, detail: 'macro', laneHeight: 94, showWeeks: false },
];

export const viewById = (id: ViewId): ViewSpec =>
  VIEWS.find((v) => v.id === id) ?? VIEWS[2];

export const ZOOM_MIN = VIEWS[VIEWS.length - 1].pxPerDay;
export const ZOOM_MAX = VIEWS[0].pxPerDay;
export const ZOOM_DEFAULT = viewById('month').pxPerDay;

export const clampZoom = (px: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, px));

/** The view spec for a scale: the nearest anchor's rules at this exact scale. */
export const viewForScale = (px: number): ViewSpec => {
  const p = clampZoom(px);
  let best = VIEWS[0];
  let bestD = Infinity;
  for (const v of VIEWS) {
    const d = Math.abs(Math.log(v.pxPerDay) - Math.log(p));
    if (d < bestD) { best = v; bestD = d; }
  }
  return { ...best, pxPerDay: p };
};

/** The next anchor in (dir = 1) or out (dir = -1) from a scale, or null at the end. */
export const zoomStep = (px: number, dir: 1 | -1): number | null => {
  const anchors = [...VIEWS].map((v) => v.pxPerDay).sort((a, b) => a - b);
  if (dir === 1) return anchors.find((a) => a > px * 1.001) ?? null;
  return [...anchors].reverse().find((a) => a < px / 1.001) ?? null;
};

/** Timeline window. Lines of Operation continue beyond every horizon. */
export const TIMELINE_START = '2026-01-01';
export const TIMELINE_END = '2031-12-31';
