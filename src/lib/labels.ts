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

export interface StackSlot {
  /** Marker offset from the line, positive downward. 0 when it stands alone. */
  dy: number;
  /** Half the stack's reach from the line; labels start beyond it. */
  ext: number;
}

/**
 * Markers that would sit on top of one another (same date, or dates closer
 * than a marker is wide) stack down the line instead, so each keeps its own
 * tap target. Items must be sorted by x. Within a stack, `rank` orders the
 * markers top to bottom (lower first); by default they keep their order,
 * first at the top. Pass a rank that puts markers labelled above the line
 * at the top and those labelled below at the bottom, so each box sits
 * nearest its own label.
 */
export const stackMarkers = (
  items: { id: string; x: number }[],
  boxSize: number,
  pitch: number,
  rank?: (id: string) => number,
): Map<string, StackSlot> => {
  const out = new Map<string, StackSlot>();
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && items[j].x - items[i].x < boxSize) j++;
    const group = items.slice(i, j).map((it, k) => ({ id: it.id, k }));
    if (rank) group.sort((a, b) => rank(a.id) - rank(b.id) || a.k - b.k);
    const ext = ((group.length - 1) / 2) * pitch;
    group.forEach((g, k) => out.set(g.id, { dy: k * pitch - ext, ext }));
    i = j;
  }
  return out;
};

/**
 * Orders a stack by its labels: above-the-line labels at the top (nearest
 * first), unlabelled in the middle, below-the-line at the bottom (nearest
 * last).
 */
export const stackRank = (slot: LabelSlot | null | undefined): number => {
  if (!slot) return 0;
  return slot.side === 'above' ? -1000 + slot.level : 1000 - slot.level;
};
