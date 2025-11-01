// src/lib/date.ts
const MS_PER_DAY = 86_400_000;
const SOD = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function toLocalDate(dateStr: string) {
  // Handle YYYY-MM-DD safely in local time
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(dateStr);
  return SOD(d);
}

export function elapsedDays(fromISO: string, now: Date = new Date()) {
  const from = toLocalDate(fromISO);
  const today = SOD(now);
  return Math.max(0, Math.floor((today.getTime() - from.getTime()) / MS_PER_DAY));
}
