// i18n simples e isomórfico. Português por defeito; inglês pronto em messages/en.json.
import pt from "@/messages/pt.json";
import en from "@/messages/en.json";

export type Locale = "pt" | "en";
const dictionaries: Record<Locale, unknown> = { pt, en };
let current: Locale = "pt";

export function setLocale(l: Locale) {
  current = l;
  if (typeof document !== "undefined") document.documentElement.lang = l === "pt" ? "pt-PT" : "en";
}
export const getLocale = () => current;

function lookup(dict: unknown, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(dictionaries[current], key) ?? lookup(dictionaries.pt, key) ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw;
}

const fmtLocale = () => (current === "pt" ? "pt-PT" : "en-GB");
export const fmtDate = (iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Intl.DateTimeFormat(fmtLocale(), { timeZone: "Africa/Luanda", ...opts }).format(new Date(iso)) : "—";
export const fmtDateTime = (iso?: string | null) =>
  fmtDate(iso, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const fmtNumber = (n: number, opts?: Intl.NumberFormatOptions) => new Intl.NumberFormat(fmtLocale(), opts).format(n);
export const fmtRelative = (iso: string, now = new Date()) => {
  const diff = (new Date(iso).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(fmtLocale(), { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
};
