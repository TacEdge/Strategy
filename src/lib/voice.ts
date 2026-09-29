/**
 * Spoken (or typed) commands to Key Tasks and Strategic Objectives.
 *
 * Rule-based, runs entirely on the device, no network. One utterance may
 * hold several commands: each "key task" or "strategic objective" starts
 * a new one.
 *
 *   "I want a key task next Friday to meet with Rutledge"
 *   "a new strategic objective at the end of next month to have achieved
 *    our second customer"
 *
 * Each command yields a kind, a title, a date, a Line of Operation and an
 * owner. Anything not heard falls back to a sensible default and is
 * flagged so the confirmation can say so.
 */
import { toIso, addDays, parseDate } from './time';

export type CommandKind = 'task' | 'objective';

export interface ParsedCommand {
  kind: CommandKind;
  title: string;
  date: string; // ISO
  /** The date words that were heard, or null when the default was used. */
  dateHeard: string | null;
  looId: string;
  /** How the line was chosen: said explicitly, inferred, or the default. */
  looSource: 'said' | 'inferred' | 'default';
  owner: string;
}

export interface ParseContext {
  today: Date;
  loos: { id: string; name: string }[];
  /** Existing key tasks, used to place a new one on the line its subject already lives on. */
  tasks: { title: string; looId: string }[];
  defaultLooId: string;
  defaultOwner: string;
}

/* ------------------------------------------------------------------ */
/* Numbers and calendar helpers                                         */
/* ------------------------------------------------------------------ */

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, 'a couple of': 2, 'a few': 3,
};
const NUM = '(\\d{1,3}|a couple of|a few|an|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
const toNumber = (s: string): number => {
  const k = s.toLowerCase().trim();
  return /^\d+$/.test(k) ? Number(k) : NUMBER_WORDS[k] ?? 1;
};

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY = `(${WEEKDAYS.join('|')})`;

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3,
  may: 4, june: 5, jun: 5, july: 6, jul: 6, august: 7, aug: 7,
  september: 8, sept: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10,
  december: 11, dec: 11,
};
// Longest names first so "sept" wins over "sep" and "june" over "jun".
const MONTH = `(${Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')})`;
// Full month names only, for phrases where a bare short form would misfire ("end of may").
const MONTH_FULL = '(january|february|march|april|may|june|july|august|september|october|november|december)';

const ymd = (y: number, m: number, d: number) => new Date(y, m, d);
const endOfMonth = (y: number, m: number) => new Date(y, m + 1, 0);
const addMonths = (d: Date, n: number) => {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = endOfMonth(target.getFullYear(), target.getMonth()).getDate();
  return ymd(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
};
/** Monday-start week index, so "next Friday" can tell this week from next. */
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
const sameWeek = (a: Date, b: Date) => toIso(mondayOf(a)) === toIso(mondayOf(b));

/** The next date that is this weekday, counting today as 0 when allowToday. */
const comingWeekday = (today: Date, dow: number, allowToday: boolean) => {
  let delta = (dow - today.getDay() + 7) % 7;
  if (delta === 0 && !allowToday) delta = 7;
  return addDays(today, delta);
};

/** A day and month with no year: this year, or next year once it has passed. */
const nextOccurrence = (today: Date, month: number, day: number) => {
  const d = ymd(today.getFullYear(), month, day);
  return d < today ? ymd(today.getFullYear() + 1, month, day) : d;
};

/* ------------------------------------------------------------------ */
/* Date phrases                                                         */
/* ------------------------------------------------------------------ */

// Leading prepositions belong to the date phrase and are removed with it.
const LEAD = '(?:(?:by|on|at|before|for|due|due on|due by|from|until|around)\\s+)?(?:the\\s+)?';

interface DateRule {
  re: string;
  resolve: (m: RegExpExecArray, today: Date) => Date | null;
}

const DATE_RULES: DateRule[] = [
  // End / start / middle of a period.
  {
    re: `(end|start|beginning|middle|mid)(?:\\s+of)?\\s+(?:the\\s+)?(this|next|the|current)?\\s*(week|month|quarter|year)`,
    resolve: (m, today) => {
      const edge = m[1].toLowerCase();
      const next = m[2]?.toLowerCase() === 'next';
      const unit = m[3].toLowerCase();
      const y = today.getFullYear();
      const mo = today.getMonth();
      if (unit === 'week') {
        const monday = addDays(mondayOf(today), next ? 7 : 0);
        return edge === 'end' ? addDays(monday, 4) : edge.startsWith('mid') ? addDays(monday, 2) : monday;
      }
      if (unit === 'month') {
        const mm = mo + (next ? 1 : 0);
        if (edge === 'end') return endOfMonth(y, mm);
        return ymd(y, mm, edge.startsWith('mid') ? 15 : 1);
      }
      if (unit === 'quarter') {
        const q = Math.floor(mo / 3) + (next ? 1 : 0);
        if (edge === 'end') return endOfMonth(y, q * 3 + 2);
        return edge.startsWith('mid') ? ymd(y, q * 3 + 1, 15) : ymd(y, q * 3, 1);
      }
      const yy = y + (next ? 1 : 0);
      if (edge === 'end') return ymd(yy, 11, 31);
      return edge.startsWith('mid') ? ymd(yy, 5, 30) : ymd(yy, 0, 1);
    },
  },
  {
    re: `(end|start|beginning|middle|mid)(?:\\s+of)?\\s+${MONTH_FULL}(?:\\s+(\\d{4}))?`,
    resolve: (m, today) => {
      const edge = m[1].toLowerCase();
      const month = MONTHS[m[2].toLowerCase()];
      let y = m[3] ? Number(m[3]) : today.getFullYear();
      if (!m[3] && month < today.getMonth()) y += 1;
      if (edge === 'end') return endOfMonth(y, month);
      return ymd(y, month, edge.startsWith('mid') ? 15 : 1);
    },
  },
  // 15 October, 15th of October 2027
  {
    re: `(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}(?:,?\\s+(\\d{4}))?`,
    resolve: (m, today) => {
      const day = Number(m[1]);
      const month = MONTHS[m[2].toLowerCase()];
      if (day < 1 || day > 31) return null;
      return m[3] ? ymd(Number(m[3]), month, day) : nextOccurrence(today, month, day);
    },
  },
  // October 15, October the 15th
  {
    re: `${MONTH}\\s+(?:the\\s+)?(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?`,
    resolve: (m, today) => {
      const month = MONTHS[m[1].toLowerCase()];
      const day = Number(m[2]);
      if (day < 1 || day > 31) return null;
      return m[3] ? ymd(Number(m[3]), month, day) : nextOccurrence(today, month, day);
    },
  },
  // Friday week, Friday after next
  {
    re: `${WEEKDAY}\\s+(week|after\\s+next)`,
    resolve: (m, today) => {
      const dow = WEEKDAYS.indexOf(m[1].toLowerCase());
      const coming = comingWeekday(today, dow, false);
      if (/week/i.test(m[2])) return addDays(coming, 7);
      const next = sameWeek(coming, today) ? addDays(coming, 7) : coming;
      return addDays(next, 7);
    },
  },
  // next Friday, this Friday, Friday
  {
    re: `(?:(this coming|this|coming|next)\\s+)?${WEEKDAY}`,
    resolve: (m, today) => {
      const which = m[1]?.toLowerCase();
      const dow = WEEKDAYS.indexOf(m[2].toLowerCase());
      if (which === 'next') {
        // "Next Friday" said early in the week means the Friday of next week.
        const coming = comingWeekday(today, dow, false);
        return sameWeek(coming, today) ? addDays(coming, 7) : coming;
      }
      return comingWeekday(today, dow, which === 'this');
    },
  },
  // in two weeks, in 3 days, two weeks from now, in a fortnight
  {
    re: `(?:in\\s+)?(?:a\\s+)?fortnight(?:'s)?(?:\\s+time)?`,
    resolve: (_m, today) => addDays(today, 14),
  },
  {
    re: `(?:in\\s+${NUM}\\s+(days?|weeks?|months?|years?)(?:'?s?'?\\s+time)?|${NUM}\\s+(days?|weeks?|months?|years?)\\s+from\\s+(?:now|today))`,
    resolve: (m, today) => {
      const n = toNumber(m[1] ?? m[3]);
      const unit = (m[2] ?? m[4]).toLowerCase();
      if (unit.startsWith('day')) return addDays(today, n);
      if (unit.startsWith('week')) return addDays(today, n * 7);
      if (unit.startsWith('month')) return addMonths(today, n);
      return addMonths(today, n * 12);
    },
  },
  { re: `day\\s+after\\s+tomorrow`, resolve: (_m, today) => addDays(today, 2) },
  { re: `tomorrow`, resolve: (_m, today) => addDays(today, 1) },
  { re: `(?:today|tonight|this\\s+afternoon|this\\s+morning)`, resolve: (_m, today) => today },
  {
    re: `(next|this)\\s+(week|month|quarter|year)`,
    resolve: (m, today) => {
      const next = m[1].toLowerCase() === 'next';
      const unit = m[2].toLowerCase();
      const y = today.getFullYear();
      const mo = today.getMonth();
      if (unit === 'week') return next ? addDays(mondayOf(today), 7) : comingWeekday(today, 5, true);
      if (unit === 'month') return next ? ymd(y, mo + 1, 1) : endOfMonth(y, mo);
      if (unit === 'quarter') {
        const q = Math.floor(mo / 3) + (next ? 1 : 0);
        return next ? ymd(y, q * 3, 1) : endOfMonth(y, q * 3 + 2);
      }
      return next ? ymd(y + 1, 0, 1) : ymd(y, 11, 31);
    },
  },
  // "the 15th" (this month, or next month once it has passed). Needs "the"
  // and must end the phrase, so "our 2nd customer" stays in the title.
  {
    re: `(?:on\\s+|by\\s+)?the\\s+(\\d{1,2})(?:st|nd|rd|th)(?=\\s*(?:$|[,.]|\\s(?:to|for|and|by|at|we|i)\\b))`,
    resolve: (m, today) => {
      const day = Number(m[1]);
      if (day < 1 || day > 31) return null;
      const d = ymd(today.getFullYear(), today.getMonth(), day);
      return d < today ? ymd(today.getFullYear(), today.getMonth() + 1, day) : d;
    },
  },
];

const findDate = (text: string, today: Date): { date: Date; start: number; end: number; heard: string } | null => {
  for (const rule of DATE_RULES) {
    const re = new RegExp(`(?:^|\\b)${LEAD}${rule.re}\\b`, 'i');
    const m = re.exec(text);
    if (!m) continue;
    const date = rule.resolve(m, today);
    if (!date) continue;
    const start = m.index + (m[0].length - m[0].trimStart().length);
    return { date, start, end: m.index + m[0].length, heard: m[0].trim() };
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Kind, line of operation, owner                                       */
/* ------------------------------------------------------------------ */

const KIND_RE = /\b(strategic\s+objectives?|objectives?|key\s+tasks?|tasks?)\b/gi;
const kindOf = (word: string): CommandKind => (/objective/i.test(word) ? 'objective' : 'task');

/** Words that point to a default line, keyed by the line's name. */
const LINE_HINTS: Record<string, RegExp> = {
  commercial: /\b(customers?|clients?|contracts?|agreements?|pilots?|sign(?:ed|ing)?|deals?|proposals?|quotes?|pricing|price|revenue|sales?|sell|tender|purchase order|invoice|meet(?:ing)?\s+with|meet)\b/i,
  product: /\b(build|built|design(?:ed)?|develop(?:ed|ment)?|features?|release[ds]?|prototype|app|platform|beta|mvp|ship(?:ped)?|test(?:ing|ed)?|product|integration|api|bug)\b/i,
  company: /\b(hire[ds]?|hiring|recruit(?:ed|ing)?|team|brand(?:ing)?|marketing|website|funding|raise[ds]?|investors?|board|accountant|lawyer|runway|finance|budget|insurance|office|staff|culture|linkedin|social media|campaign)\b/i,
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findLine = (text: string, loos: ParseContext['loos']) => {
  for (const loo of loos) {
    const name = escapeRe(loo.name);
    const re = new RegExp(
      `\\b(?:(?:on|in|under|to)\\s+(?:the\\s+)?${name}(?:\\s+(?:line(?:\\s+of\\s+operation)?|loo))?|${name}\\s+(?:line(?:\\s+of\\s+operation)?|loo))\\b`,
      'i',
    );
    const m = re.exec(text);
    if (m) return { looId: loo.id, start: m.index, end: m.index + m[0].length };
  }
  return null;
};

const inferLine = (title: string, ctx: ParseContext): string | null => {
  // A name already on the diagram (e.g. a customer) keeps its line.
  // The first word is capitalised anyway, so it only counts when an existing
  // title carries it mid-sentence, as a name ("...agreed with Rutledge").
  const words = title.match(/\b[A-Z][a-zA-Z'&-]{2,}\b/g) ?? [];
  const firstWord = title.split(/\s+/)[0];
  for (const n of words) {
    const re = n === firstWord
      ? new RegExp(`\\s${escapeRe(n)}\\b`)
      : new RegExp(`\\b${escapeRe(n)}\\b`, 'i');
    const hit = ctx.tasks.find((t) => re.test(t.title));
    if (hit && ctx.loos.some((l) => l.id === hit.looId)) return hit.looId;
  }
  // Otherwise the line whose hint words appear most; ties go to line order.
  let best: { id: string; score: number } | null = null;
  for (const loo of ctx.loos) {
    const hint = LINE_HINTS[loo.name.toLowerCase()];
    if (!hint) continue;
    const score = title.match(new RegExp(hint.source, 'gi'))?.length ?? 0;
    if (score > 0 && (!best || score > best.score)) best = { id: loo.id, score };
  }
  return best?.id ?? null;
};

const OWNER_RE = /\b(?:owned\s+by|owner\s+(?:is\s+)?|assign(?:ed)?\s+to|for\s+owner)\s+([A-Z][a-zA-Z'-]+)/i;

/* ------------------------------------------------------------------ */
/* Title clean-up                                                       */
/* ------------------------------------------------------------------ */

const LEAD_FILLER = new Set([
  'i', 'want', 'wanna', 'need', 'would', 'like', "i'd", 'please', 'can', 'could', 'you', 'add', 'create',
  'make', 'put', 'set', 'up', 'new', 'another', 'to', 'have', 'that', 'which', 'is', 'will', 'called',
  'named', 'titled', 'of', 'um', 'uh', 'er', 'erm', 'okay', 'ok', 'so', 'and', 'then', 'also', 'plus',
  'for', 'with', 'where', 'we',
]);
const TRAIL_FILLER = new Set([
  'i', 'want', 'wanna', 'need', 'would', 'like', "i'd", 'please', 'add', 'create', 'make', 'put', 'new',
  'another', 'and', 'then', 'also', 'plus', 'um', 'uh', 'er', 'erm', 'okay', 'ok', 'thanks', 'thank',
  'you', 'on', 'by', 'at', 'for', 'to', 'the', 'with', 'in', 'due',
]);
// Articles are dropped only when lower case, so "Plan A" survives.
const ARTICLES = new Set(['a', 'an']);

const tidy = (raw: string): string => {
  const words = raw.replace(/[,;:.!?]+/g, ' ').split(/\s+/).filter(Boolean);
  // Keep "with X" when X is the point of the title ("meet with Rutledge").
  while (words.length) {
    const w = words[0];
    const lw = w.toLowerCase();
    if (lw === 'with' && words.length > 1) break;
    if (LEAD_FILLER.has(lw) || (ARTICLES.has(w))) words.shift();
    else break;
  }
  while (words.length) {
    const w = words[words.length - 1];
    const lw = w.toLowerCase();
    if (TRAIL_FILLER.has(lw) || ARTICLES.has(w)) words.pop();
    else break;
  }
  const s = words.join(' ');
  return s ? s[0].toUpperCase() + s.slice(1) : '';
};

const cut = (text: string, start: number, end: number) => `${text.slice(0, start)} ${text.slice(end)}`;

/* ------------------------------------------------------------------ */
/* Entry point                                                          */
/* ------------------------------------------------------------------ */

const DEFAULT_DAYS: Record<CommandKind, number> = { task: 7, objective: 90 };

/** Split an utterance at each "key task" / "strategic objective". */
const segments = (text: string): { kind: CommandKind; body: string }[] => {
  const hits = [...text.matchAll(KIND_RE)];
  if (hits.length === 0) return [{ kind: 'task', body: text }];
  const out: { kind: CommandKind; body: string }[] = [];
  const prefix = tidy(text.slice(0, hits[0].index));
  hits.forEach((h, i) => {
    const start = h.index! + h[0].length;
    const end = i + 1 < hits.length ? hits[i + 1].index! : text.length;
    const body = text.slice(start, end);
    out.push({ kind: kindOf(h[0]), body: i === 0 && prefix ? `${prefix} ${body}` : body });
  });
  return out;
};

export const parseCommands = (utterance: string, ctx: ParseContext): ParsedCommand[] => {
  const text = utterance.replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const results: ParsedCommand[] = [];

  for (const seg of segments(text)) {
    let body = seg.body;

    const found = findDate(body, ctx.today);
    let date: Date;
    let dateHeard: string | null = null;
    if (found) {
      date = found.date;
      dateHeard = found.heard;
      body = cut(body, found.start, found.end);
    } else {
      date = addDays(ctx.today, DEFAULT_DAYS[seg.kind]);
    }

    let looId: string | null = null;
    let looSource: ParsedCommand['looSource'] = 'default';
    const line = findLine(body, ctx.loos);
    if (line) {
      looId = line.looId;
      looSource = 'said';
      body = cut(body, line.start, line.end);
    }

    let owner = ctx.defaultOwner;
    const om = OWNER_RE.exec(body);
    if (om) {
      owner = om[1][0].toUpperCase() + om[1].slice(1);
      body = cut(body, om.index, om.index + om[0].length);
    }

    const title = tidy(body);
    if (!title) continue;

    if (!looId) {
      const inferred = inferLine(title, ctx);
      if (inferred) { looId = inferred; looSource = 'inferred'; }
    }

    results.push({
      kind: seg.kind,
      title,
      date: toIso(date),
      dateHeard,
      looId: looId ?? ctx.defaultLooId,
      looSource,
      owner,
    });
  }
  return results;
};

/** "Friday 9 October" — the form read back to the user. */
export const spokenDate = (iso: string): string => {
  const d = parseDate(iso);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
  const day = WEEKDAYS[d.getDay()];
  return `${day[0].toUpperCase()}${day.slice(1)} ${d.getDate()} ${months[d.getMonth()]}`;
};
