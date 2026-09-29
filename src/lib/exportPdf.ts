/**
 * One-page PDF of the Lines of Operation, exactly as the diagram shows them:
 * the same date window, the same lines, labels on or off. Drawn as vectors
 * with the brand fonts, so it stays crisp when printed or zoomed.
 *
 * jsPDF and the fonts are loaded only when an export is asked for.
 */
import type { LineOfOperation, Milestone, MilestoneStatus, StrategicHorizon } from '../types';
import { TIMELINE_START } from './views';
import type { ViewSpec } from './views';
import { parseDate, daysBetween, addDays, fmtDayMonth, fmtDateLong, monthShort } from './time';
import { TERMS } from './terms';
import { placeLabels, tiersThatFit } from './labels';
import lockupUrl from '../assets/brand/tacedge-lockup-cream.svg';
import bvp400Url from '../assets/pdf-fonts/be-vietnam-pro-400.ttf?url';
import bvp600Url from '../assets/pdf-fonts/be-vietnam-pro-600.ttf?url';
import jbm500Url from '../assets/pdf-fonts/jetbrains-mono-500.ttf?url';
import play700Url from '../assets/pdf-fonts/play-700.ttf?url';

export interface PdfInput {
  loos: LineOfOperation[];
  milestones: Milestone[];
  horizons: StrategicHorizon[];
  view: ViewSpec;
  /** Visible window, in days from TIMELINE_START (fractional). */
  startDay: number;
  days: number;
  showLabels: boolean;
  today: string; // ISO
}

/* Brand colours (tokens.css). */
const C = {
  forest: '#112411', olive: '#6E7D5C', oliveEdge: '#AEB89C', sage: '#B2B594',
  cream: '#F7F5EC', card: '#FFFFFF', ink: '#242A1F', ink60: '#5B6253', ink40: '#646A5A',
  line: '#E7E2D6', line2: '#D9D3C4', ochre: '#B07D2B', brick: '#9E3B2E',
  weekBand: '#F4F5EC', guide: '#EFECE3', horizonLine: '#9DA59A', creamLine: '#3B4B36',
};
const STATUS_COLOR: Record<MilestoneStatus, string> = {
  future: C.ink40, active: C.olive, 'at-risk': C.ochre, blocked: C.brick, complete: C.forest,
};

const toBase64 = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

const loadFont = async (url: string) => toBase64(await (await fetch(url)).arrayBuffer());

/** The cream lockup as a PNG. SVG gets explicit size first so Safari draws it. */
const lockupPng = async (): Promise<{ data: string; ratio: number } | null> => {
  try {
    const svg = await (await fetch(lockupUrl)).text();
    const vb = /viewBox="([\d.\s-]+)"/.exec(svg)?.[1].trim().split(/\s+/).map(Number);
    const vw = vb?.[2] ?? 1978;
    const vh = vb?.[3] ?? 391;
    const sized = svg.replace('<svg ', `<svg width="${vw}" height="${vh}" `);
    const blobUrl = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
    try {
      const img = new Image();
      img.src = blobUrl;
      await img.decode();
      const w = 1200;
      const h = Math.round((w * vh) / vw);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      return { data: canvas.toDataURL('image/png'), ratio: vw / vh };
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  } catch {
    return null;
  }
};

export const pdfFileName = (today: string) => `TACEDGE-Lines-of-Operation-${today}.pdf`;

/** "21 Sep – 30 Nov 2026", or with both years when the window crosses one. */
export const rangeLabel = (startDay: number, days: number): string => {
  const t0 = parseDate(TIMELINE_START);
  const a = addDays(t0, Math.floor(startDay));
  const b = addDays(t0, Math.floor(startDay + days) - 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return a.getFullYear() === b.getFullYear()
    ? `${fmtDayMonth(iso(a))} – ${fmtDayMonth(iso(b))} ${b.getFullYear()}`
    : `${fmtDayMonth(iso(a))} ${a.getFullYear()} – ${fmtDayMonth(iso(b))} ${b.getFullYear()}`;
};

export const buildDiagramPdf = async (input: PdfInput): Promise<Blob> => {
  const [{ jsPDF }, bvp400, bvp600, jbm500, play700, logo] = await Promise.all([
    import('jspdf'),
    loadFont(bvp400Url), loadFont(bvp600Url), loadFont(jbm500Url), loadFont(play700Url),
    lockupPng(),
  ]);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.addFileToVFS('bvp-400.ttf', bvp400); doc.addFont('bvp-400.ttf', 'BVP', 'normal');
  doc.addFileToVFS('bvp-600.ttf', bvp600); doc.addFont('bvp-600.ttf', 'BVP', 'bold');
  doc.addFileToVFS('jbm-500.ttf', jbm500); doc.addFont('jbm-500.ttf', 'JBM', 'normal');
  doc.addFileToVFS('play-700.ttf', play700); doc.addFont('play-700.ttf', 'Play', 'bold');

  const range = rangeLabel(input.startDay, input.days);
  doc.setProperties({
    title: `TACEDGE Strategy · Lines of Operation · ${range}`,
    author: 'TACEDGE',
    creator: 'TACEDGE Strategy',
  });

  const W = 297;
  const H = 210;
  const M = 10;

  const font = (family: 'BVP' | 'JBM' | 'Play', style: 'normal' | 'bold', size: number, color: string, space = 0) => {
    doc.setFont(family, style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    doc.setCharSpace(space);
  };
  const stroke = (color: string, width: number, dash: number[] = []) => {
    doc.setDrawColor(color);
    doc.setLineWidth(width);
    doc.setLineDashPattern(dash, 0);
  };

  /* ---- Page and header band ---- */
  doc.setFillColor(C.cream);
  doc.rect(0, 0, W, H, 'F');
  doc.setFillColor(C.forest);
  doc.rect(0, 0, W, 18, 'F');

  let hx = M;
  if (logo) {
    const lh = 5.2;
    const lw = lh * logo.ratio;
    doc.addImage(logo.data, 'PNG', hx, 6.4, lw, lh);
    hx += lw;
  } else {
    font('Play', 'bold', 13, C.cream);
    doc.text('TACEDGE', hx, 11.2);
    hx += doc.getTextWidth('TACEDGE');
  }
  stroke(C.creamLine, 0.3);
  doc.line(hx + 4, 5.6, hx + 4, 12.4);
  font('JBM', 'normal', 7, C.sage, 0.45);
  doc.text('STRATEGY', hx + 8, 10.9);

  font('Play', 'bold', 12.5, C.cream);
  doc.text('Lines of Operation', W - M, 8.9, { align: 'right' });
  font('JBM', 'normal', 6.5, C.sage);
  doc.text(`${range.toUpperCase()}  ·  ${input.view.label.toUpperCase()} VIEW`, W - M, 13.6, { align: 'right' });

  /* ---- Card ---- */
  const cardX = M;
  const cardY = 24;
  const cardW = W - 2 * M;
  const cardH = 172;
  doc.setFillColor(C.card);
  stroke(C.line, 0.3);
  doc.roundedRect(cardX, cardY, cardW, cardH, 2.5, 2.5, 'FD');

  const railW = 50;
  const headH = 11;
  const x0 = cardX + railW;
  const x1 = cardX + cardW - 3;
  const tw = x1 - x0;
  const bodyTop = cardY + headH;
  const bodyBottom = cardY + cardH;
  const n = Math.max(1, input.loos.length);
  const laneH = (bodyBottom - bodyTop) / n;

  const t0 = parseDate(TIMELINE_START);
  const dayOf = (iso: string) => daysBetween(t0, parseDate(iso));
  const xOfDay = (d: number) => x0 + ((d - input.startDay) / input.days) * tw;
  const xOf = (iso: string) => xOfDay(dayOf(iso));
  const inRange = (x: number) => x >= x0 - 0.5 && x <= x1 + 0.5;
  const mmPerDay = tw / input.days;

  /* ---- Week bands (Month view): every other week, as on screen ---- */
  if (input.view.showWeeks) {
    const firstMonday = addDays(t0, (8 - t0.getDay()) % 7);
    const fm = daysBetween(t0, firstMonday);
    for (let d = fm + Math.floor((input.startDay - fm) / 7) * 7 - 7; d < input.startDay + input.days; d += 7) {
      const idx = Math.round((d - fm) / 7);
      if (idx % 2 !== 0) continue;
      const a = Math.max(x0, xOfDay(d));
      const b = Math.min(x1, xOfDay(d + 7));
      if (b > a) {
        doc.setFillColor(C.weekBand);
        doc.rect(a, cardY + 0.3, b - a, cardH - 0.6, 'F');
      }
    }
  }

  /* ---- Month and year ticks, week labels ---- */
  const mmPerMonth = mmPerDay * 30.4;
  const monthStep = mmPerMonth >= 9 ? 1 : mmPerMonth >= 3.2 ? 3 : 12;
  const startDate = addDays(t0, Math.floor(input.startDay));
  const endDate = addDays(t0, Math.ceil(input.startDay + input.days));
  let firstLabel = true;
  for (let d = new Date(startDate.getFullYear(), startDate.getMonth(), 1); d <= endDate; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const x = xOfDay(daysBetween(t0, d));
    if (!inRange(x)) continue;
    const isYear = d.getMonth() === 0;
    stroke(isYear ? C.line2 : C.guide, isYear ? 0.35 : 0.25);
    doc.line(x, cardY + 0.3, x, bodyBottom - 0.3);
    if (d.getMonth() % monthStep !== 0 || x > x1 - 6) continue;
    font('JBM', 'normal', 6, C.ink40, 0.25);
    doc.text(monthShort(d.getMonth()).toUpperCase(), x + 1.2, cardY + 7.2);
    if (isYear || firstLabel) {
      font('JBM', 'normal', 6.5, C.ink, 0.2);
      doc.text(String(d.getFullYear()), x + 1.2, cardY + 4.2);
    }
    firstLabel = false;
  }
  if (input.view.showWeeks) {
    const firstMonday = addDays(t0, (8 - t0.getDay()) % 7);
    for (let d = new Date(firstMonday); d <= endDate; d = addDays(d, 7)) {
      const x = xOfDay(daysBetween(t0, d));
      if (!inRange(x) || x > x1 - 4) continue;
      stroke(C.line, 0.2);
      doc.line(x, bodyTop - 3.4, x, bodyTop);
      font('JBM', 'normal', 5.5, C.ink40);
      doc.text(String(d.getDate()), x + 0.9, bodyTop - 1.1);
    }
  }

  /* ---- Rail and lanes ---- */
  stroke(C.line, 0.3);
  doc.line(x0, cardY, x0, bodyBottom);
  doc.line(cardX, bodyTop, cardX + cardW, bodyTop);
  font('JBM', 'normal', 5.5, C.ink40, 0.3);
  doc.text('LINES OF OPERATION', cardX + 5, bodyTop - 3.2);

  input.loos.forEach((loo, i) => {
    const top = bodyTop + i * laneH;
    if (i > 0) {
      stroke(C.guide, 0.3);
      doc.line(cardX, top, cardX + cardW, top);
    }
    // Rail label, centred in the lane.
    font('BVP', 'normal', 7, C.ink40);
    const desc = (doc.splitTextToSize(loo.description || '', railW - 10) as string[]).slice(0, 3);
    const blockH = 3 + 4.6 + desc.length * 3.1;
    let y = top + (laneH - blockH) / 2 + 2.2;
    font('JBM', 'normal', 6, C.ink40);
    doc.text(String(loo.number).padStart(2, '0'), cardX + 5, y);
    y += 4.6;
    font('Play', 'bold', 10.5, C.ink);
    doc.text(loo.name, cardX + 5, y);
    y += 3.6;
    font('BVP', 'normal', 7, C.ink40);
    desc.forEach((line) => { doc.text(line, cardX + 5, y); y += 3.1; });

    // The enduring line, with a dashed tail and arrow: it continues.
    const ly = top + laneH * 0.42;
    stroke(C.oliveEdge, 0.55);
    doc.line(x0, ly, x1 - 12, ly);
    stroke(C.oliveEdge, 0.55, [1.4, 1]);
    doc.line(x1 - 12, ly, x1 - 3, ly);
    doc.setLineDashPattern([], 0);
    doc.setFillColor(C.oliveEdge);
    doc.triangle(x1 - 3, ly - 1.2, x1 - 3, ly + 1.2, x1, ly, 'F');
  });

  /* ---- Today ---- */
  const tx = xOf(input.today);
  if (inRange(tx)) {
    stroke(C.olive, 0.25, [0.9, 0.8]);
    doc.line(tx, bodyTop, tx, bodyBottom);
    doc.setLineDashPattern([], 0);
    font('JBM', 'normal', 5, C.card);
    const label = 'TODAY';
    const w = doc.getTextWidth(label) + 3.4;
    doc.setFillColor(C.olive);
    doc.roundedRect(tx - w / 2, cardY + 0.9, w, 3.2, 1.6, 1.6, 'F');
    doc.text(label, tx, cardY + 3.35, { align: 'center' });
  }

  /* ---- Strategic Objectives: spine, diamond and label ---- */
  const objectives = [...input.horizons].sort((a, b) => a.date.localeCompare(b.date));
  objectives.forEach((h) => {
    const x = xOf(h.date);
    if (!inRange(x)) return;
    stroke(C.horizonLine, 0.3);
    doc.line(x, bodyTop, x, bodyBottom);
    const cy = bodyTop + 5;
    const r = 1.9;
    doc.setFillColor(C.forest);
    doc.lines([[r, r], [-r, r], [-r, -r]], x, cy - r, [1, 1], 'F', true);
    if (!input.showLabels) return;
    font('BVP', 'bold', 7.5, C.ink);
    const tWidth = doc.getTextWidth(h.theme);
    const when = `${fmtDayMonth(h.date)} ${parseDate(h.date).getFullYear()}`.toUpperCase();
    const right = x + 3.2 + tWidth <= x1;
    const lx = right ? x + 3.2 : x - 3.2;
    doc.setFillColor(C.card);
    doc.rect(right ? lx - 0.6 : lx - tWidth - 0.6, cy - 2.8, tWidth + 1.2, 6.8, 'F');
    doc.text(h.theme, lx, cy + 0.3, { align: right ? 'left' : 'right' });
    font('JBM', 'normal', 5, C.ink40);
    doc.text(when, lx, cy + 3.3, { align: right ? 'left' : 'right' });
  });

  /* ---- Key Tasks: markers and labels ---- */
  const fullLabelW = input.view.id === 'month' || input.view.id === 'quarter' ? 30 : mmPerDay < 0.3 ? 20 : 26;
  const showMeta = ['month', 'quarter', '6m'].includes(input.view.id);
  const r = 1.55;
  // Label styles, as on screen: full size, then dense for a crowded lane.
  // Block heights are the tallest case: two title lines, plus date and owner.
  const labelStyles = [
    { mode: 'full', width: fullLabelW, blockH: 6 + (showMeta ? 2.9 : 0), lineH: 3, size: 7.2, maxLines: 2 },
    { mode: 'narrow', width: fullLabelW * 0.7, blockH: 5.2, lineH: 2.6, size: 6.3, maxLines: 2 },
    { mode: 'oneline', width: fullLabelW * 0.7, blockH: 2.6, lineH: 2.6, size: 6.3, maxLines: 1 },
  ].map((s) => {
    const tierH = s.blockH + 1.2;
    return {
      ...s,
      tierH,
      maxBelow: tiersThatFit(laneH * (1 - 0.42), 2.8, s.blockH, tierH, 0.8),
      maxAbove: tiersThatFit(laneH * 0.42, 3, s.blockH, tierH, 0.8),
    };
  });

  const marker = (status: MilestoneStatus, x: number, y: number, overdue: boolean) => {
    const col = STATUS_COLOR[status];
    doc.setFillColor(C.card);
    if (overdue) {
      stroke(C.brick, 0.3);
      doc.circle(x, y, r + 0.75, 'FD');
    }
    switch (status) {
      case 'complete':
        doc.setFillColor(col);
        doc.circle(x, y, r, 'F');
        break;
      case 'active':
        stroke(col, 0.4);
        doc.circle(x, y, r, 'FD');
        doc.setFillColor(col);
        doc.circle(x, y, 0.65, 'F');
        break;
      case 'at-risk':
        stroke(col, 0.4);
        doc.triangle(x, y - r * 1.1, x + r * 1.15, y + r * 0.85, x - r * 1.15, y + r * 0.85, 'FD');
        break;
      case 'blocked':
        stroke(col, 0.4);
        doc.rect(x - r * 0.95, y - r * 0.95, r * 1.9, r * 1.9, 'FD');
        break;
      default:
        stroke(col, 0.35);
        doc.circle(x, y, r, 'FD');
    }
  };

  input.loos.forEach((loo, i) => {
    const ly = bodyTop + i * laneH + laneH * 0.42;
    const tasks = input.milestones
      .filter((m) => m.looId === loo.id)
      .sort((a, b) => a.targetDate.localeCompare(b.targetDate))
      .map((m) => ({ m, x: xOf(m.targetDate) }))
      .filter((p) => inRange(p.x));

    // Same rule as the screen: tiers out from the line; dense when crowded.
    let best: { style: typeof labelStyles[number]; slots: ReturnType<typeof placeLabels>; hidden: number; withCx: { m: Milestone; x: number; cx: number }[] } | null = null;
    for (const style of labelStyles) {
      const withCx = tasks.map((p) => ({ ...p, cx: Math.min(Math.max(p.x, x0 + style.width / 2), x1 - style.width / 2) }));
      const slots = placeLabels(
        withCx.map((p) => ({ id: p.m.id, x: p.cx })),
        { width: style.width + 2, gap: 1.5, maxBelow: style.maxBelow, maxAbove: style.maxAbove },
      );
      const hidden = [...slots.values()].filter((s) => s === null).length;
      if (!best || hidden < best.hidden) best = { style, slots, hidden, withCx };
      if (hidden === 0) break;
    }
    const { style, slots, withCx } = best!;
    const labelW = style.width;
    const pdfTierH = style.tierH;

    withCx.forEach(({ m, x, cx }) => {
      const overdue = m.status !== 'complete' && m.targetDate < input.today;
      const slot = input.showLabels ? slots.get(m.id) ?? null : null;
      if (slot) {
        font('BVP', 'normal', style.size, overdue ? C.ink : C.ink60);
        let lines = doc.splitTextToSize(m.title, labelW) as string[];
        if (lines.length > style.maxLines) {
          let last = lines[style.maxLines - 1];
          while (last.length > 1 && doc.getTextWidth(`${last}…`) > labelW) last = last.slice(0, -1);
          lines = [...lines.slice(0, style.maxLines - 1), `${last.trimEnd()}…`];
        }
        const meta = showMeta && style.mode === 'full' ? `${fmtDayMonth(m.targetDate)}${m.owner ? ` · ${m.owner}` : ''}` : '';
        const blockH = lines.length * style.lineH + (meta ? 2.9 : 0);
        const step = slot.level * pdfTierH;
        let y = slot.side === 'above' ? ly - 3 - step - blockH + 2.3 : ly + 5 + step;
        if (slot.level > 0) {
          stroke(C.oliveEdge, 0.2, [0.4, 0.6]);
          if (slot.side === 'below') doc.line(x, ly + 2.4, x, ly + 5 + step - 2.6);
          else doc.line(x, ly - 3 - step + 1, x, ly - 2.4);
          doc.setLineDashPattern([], 0);
        }
        lines.forEach((line) => {
          font('BVP', 'normal', style.size, overdue ? C.ink : C.ink60);
          doc.text(line, cx, y, { align: 'center' });
          y += style.lineH;
        });
        if (meta) {
          font('JBM', 'normal', 5.4, overdue ? C.brick : C.ink40);
          doc.text(meta, cx, y - 0.1, { align: 'center' });
        }
      }
      marker(m.status, x, ly, overdue);
    });
  });

  /* ---- Footer ---- */
  font('JBM', 'normal', 6, C.ink40, 0.45);
  doc.text('SHARED CLARITY.', M, H - 7);
  font('BVP', 'normal', 7, C.ink40);
  doc.text(`${TERMS.tasks} and ${TERMS.objectives} · exported ${fmtDateLong(input.today)}`, W - M, H - 7, { align: 'right' });

  return doc.output('blob');
};
