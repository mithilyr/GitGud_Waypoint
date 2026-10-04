"use client";

import { Segmented } from "./ui";
import { LANGS, useT, type Lang } from "@/lib/i18n";

// First letter of each language's name, for tight headers (English, Sinhala, Tamil).
const FIRST: Record<Lang, string> = { en: "E", si: "ස", ta: "த" };

/** The language picker. `short` shows only the first letter of each language, for narrow headers. */
export function LanguageSwitch({ short = false }: { short?: boolean }) {
  const { lang, setLang } = useT();
  const options = short ? LANGS.map((o) => ({ ...o, label: FIRST[o.value] })) : LANGS;
  return <Segmented<Lang> value={lang} onChange={setLang} options={options} />;
}
