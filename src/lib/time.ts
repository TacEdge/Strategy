const DAY = 86400000;

export const parseDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const toIso = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const daysBetween = (a: Date, b: Date): number =>
  Math.round((b.getTime() - a.getTime()) / DAY);

export const addDays = (d: Date, days: number): Date =>
  new Date(d.getTime() + days * DAY);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

/** 15 Sep 2026 */
export const fmtDate = (iso: string): string => {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** 31 December 2026 */
export const fmtDateLong = (iso: string): string => {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
};

/** 15 Sep */
export const fmtDayMonth = (iso: string): string => {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const monthShort = (m: number): string => MONTHS[m];

export const todayIso = (): string => toIso(new Date());

export const nowStamp = (): string => new Date().toISOString();
