/**
 * Label placement along a Line of Operation, shared by the diagram and the
 * PDF so both lay out the same way.
 *
 * Each label wants the slot nearest its line: just below it. When that
 * would overlap a neighbour it steps out in tiers, alternating sides and
 * moving further from the line each time: below, above, second below,
 * second above, and so on, as far as the lane's height allows. Only when
 * every tier is taken does a label give way, leaving its marker alone.
 */
export interface LabelSlot {
  side: 'below' | 'above';
  /** 0 is nearest the line; each step out is one tier further away. */
  level: number;
}

export interface PlaceOptions {
  /** Label width in the caller's units. */
  width: number;
  /** Minimum clear space between neighbouring labels in one tier. */
  gap: number;
  maxBelow: number;
  maxAbove: number;
}

const tierAt = (k: number): LabelSlot => ({ side: k % 2 === 0 ? 'below' : 'above', level: Math.floor(k / 2) });

/**
 * Items must be sorted by x. Returns a slot per id, or null when the label
 * cannot be shown without overlapping.
 */
export const placeLabels = (
  items: { id: string; x: number }[],
  opts: PlaceOptions,
): Map<string, LabelSlot | null> => {
  const tiers: LabelSlot[] = [];
  for (let k = 0; k < (opts.maxBelow + opts.maxAbove) * 2; k++) {
    const t = tierAt(k);
    if (t.side === 'below' ? t.level < opts.maxBelow : t.level < opts.maxAbove) tiers.push(t);
  }
  const ends: number[] = tiers.map(() => -Infinity);
  const out = new Map<string, LabelSlot | null>();
  for (const it of items) {
    const start = it.x - opts.width / 2;
    const k = ends.findIndex((end) => start >= end + opts.gap);
    if (k === -1) {
      out.set(it.id, null);
      continue;
    }
    ends[k] = it.x + opts.width / 2;
    out.set(it.id, tiers[k]);
  }
  return out;
};

/** How many tiers fit on one side of the line. Always at least one. */
export const tiersThatFit = (space: number, offset: number, blockH: number, tierH: number, pad: number): number =>
  Math.max(1, Math.floor((space - offset - pad - blockH) / tierH) + 1);
