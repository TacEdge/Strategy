/**
 * Semantic zoom levels. Each view sets a time density (px per day)
 * and a detail level — the diagram changes what it shows, not just scale.
 */
export type ViewId = '5y' | '3y' | 'year' | '6m' | 'quarter' | 'month';

export interface ViewSpec {
  id: ViewId;
  label: string;
  pxPerDay: number;
  /** 'macro' = strategic shape, 'detail' = full milestone cards, 'operational' = tasks and sequencing */
  detail: 'macro' | 'detail' | 'operational';
  laneHeight: number;
  showWeeks: boolean;
}

export const VIEWS: ViewSpec[] = [
  { id: '5y', label: '5 years', pxPerDay: 0.42, detail: 'macro', laneHeight: 96, showWeeks: false },
  { id: '3y', label: '3 years', pxPerDay: 0.72, detail: 'macro', laneHeight: 96, showWeeks: false },
  { id: 'year', label: 'Year', pxPerDay: 1.9, detail: 'macro', laneHeight: 118, showWeeks: false },
  { id: '6m', label: '6 months', pxPerDay: 3.8, detail: 'detail', laneHeight: 148, showWeeks: false },
  { id: 'quarter', label: 'Quarter', pxPerDay: 7.4, detail: 'detail', laneHeight: 148, showWeeks: false },
  { id: 'month', label: 'Month', pxPerDay: 15, detail: 'operational', laneHeight: 184, showWeeks: true },
];

export const viewById = (id: ViewId): ViewSpec =>
  VIEWS.find((v) => v.id === id) ?? VIEWS[2];

/** Timeline window. Lines of Operation continue beyond every horizon. */
export const TIMELINE_START = '2026-01-01';
export const TIMELINE_END = '2031-12-31';
