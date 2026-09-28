const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const dtf = new Intl.DateTimeFormat("es-PY", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Asuncion" });
const dttf = new Intl.DateTimeFormat("es-PY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Asuncion" });

export function timeAgo(d: Date | string): string {
  const diff = (new Date(d).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [u, s] of units) if (Math.abs(diff) >= s) return rtf.format(Math.round(diff / s), u);
  return "recién";
}

export const formatDate = (d: Date | string) => dtf.format(new Date(d));
export const formatDateTime = (d: Date | string) => dttf.format(new Date(d));
export const formatNumber = (n: number) => new Intl.NumberFormat("es-PY").format(n);
export const pct = (n: number) => `${Math.round(n * 100)}%`;
