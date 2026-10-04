/** Date locale follows the language chosen in the app (set by LanguageProvider). Numbers and times stay in Latin digits. */
let dateLocale = "en-GB";
export function setDateLocale(lang: "en" | "si" | "ta") {
  dateLocale = { en: "en-GB", si: "si-LK", ta: "ta-LK" }[lang];
}

export function fmtDate(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  },
) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString(dateLocale + "-u-nu-latn", opts);
}

export function fmtLong(iso: string | null | undefined) {
  return fmtDate(iso, { weekday: "long", day: "numeric", month: "long" });
}

export function kg(n: number) {
  return `${Math.round(n).toLocaleString("en-GB")} kg`;
}

export function m3(n: number) {
  return `${n.toFixed(1)} m³`;
}

export function hhmm(d: Date) {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  });
}

export function initial(name: string) {
  return name.trim().charAt(0).toUpperCase();
}

export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export const TEMP_LABEL: Record<string, string> = {
  chilled: "Chilled",
  ambient: "Ambient",
};
