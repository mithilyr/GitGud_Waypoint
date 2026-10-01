"use client";

import { Segmented } from "./ui";
import { LANGS, useT, type Lang } from "@/lib/i18n";

export function LanguageSwitch() {
  const { lang, setLang } = useT();
  return <Segmented<Lang> value={lang} onChange={setLang} options={LANGS} />;
}
