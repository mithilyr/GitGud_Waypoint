"use client";

import { useEffect, useState } from "react";

export type Lang = "en" | "si" | "ta";

// Interface words only. IDs, outlet names, numbers and times never change with the language.
// The Sinhala and Tamil below were drafted with Claude from the Designathon exemplars (R1-SI, L2-TA)
// and still need a native-speaker review; see docs/ai-disclosure.md.
const en = {
  run: "Run",
  stops: "Stops",
  sync: "Sync",
  help: "Help",
  tripLeaves: "Trip {n} leaves at {t}.",
  homeLede: "{count} {brand} stops in {district}. Everything is loaded and saved to your phone.",
  vehicle: "Vehicle",
  beforeYouLeave: "Before you leave",
  runSaved: "Run saved for offline use",
  loadReleased: "Load released · {who}, {dock}",
  loadPending: "Waiting for the loader to release the load",
  reefer: "Reefer temperature {t} °C",
  tyres: "Tyres, lights and doors",
  startTrip: "Start trip {n}",
  continueTrip: "Continue trip {n}",
  delivered: "Delivered",
  next: "Next",
  notSent: "Not sent",
  arrived: "I've arrived",
  markDelivered: "Mark delivered",
  saveStop: "Save stop",
  syncNow: "Sync now",
  gotIt: "Got it",
  noSignal: "No signal",
  online: "Online",
  gotoStop: "Go to {name}",
  tripDone: "Run complete.",
} as const;

const si: Partial<Record<keyof typeof en, string>> = {
  run: "ධාවනය",
  stops: "නැවතුම්",
  sync: "සමමුහුර්ත",
  help: "උදව්",
  tripLeaves: "{n} වන ගමන {t}ට පිටත් වේ.",
  homeLede: "{district} {brand} නැවතුම් {count}ක්. සියල්ල පටවා දුරකථනයේ සුරැකී ඇත.",
  vehicle: "වාහනය",
  beforeYouLeave: "පිටත් වීමට පෙර",
  runSaved: "ධාවනය ඔෆ්ලයින් සඳහා සුරැකිණි",
  loadReleased: "පැටවීම මුදාහරින ලදී · {who}",
  loadPending: "පැටවුම්කරු පැටවීම මුදාහරින තුරු රැඳී සිටින්න",
  reefer: "සිසිල් උෂ්ණත්වය {t}°C",
  tyres: "ටයර්, ලයිට් සහ දොර",
  startTrip: "{n} වන ගමන ආරම්භ කරන්න",
  continueTrip: "{n} වන ගමන දිගටම කරන්න",
  delivered: "බෙදා හැරියා",
  next: "ඊළඟ",
  notSent: "යැවී නැත",
  arrived: "මම පැමිණියා",
  markDelivered: "බෙදා හැරියා ලෙස සලකුණු කරන්න",
  saveStop: "නැවතුම සුරකින්න",
  syncNow: "දැන් සමමුහුර්ත කරන්න",
  gotIt: "තේරුණා",
  noSignal: "සංඥාව නැත",
  online: "සම්බන්ධයි",
  gotoStop: "{name} වෙත යන්න",
  tripDone: "ධාවනය අවසන්.",
};

const ta: Partial<Record<keyof typeof en, string>> = {
  run: "பயணம்",
  stops: "நிறுத்தங்கள்",
  sync: "ஒத்திசை",
  help: "உதவி",
  tripLeaves: "பயணம் {n} {t} மணிக்குப் புறப்படும்.",
  homeLede: "{district} {brand} நிறுத்தங்கள் {count}. அனைத்தும் ஏற்றப்பட்டு தொலைபேசியில் சேமிக்கப்பட்டுள்ளது.",
  vehicle: "வாகனம்",
  beforeYouLeave: "புறப்படுவதற்கு முன்",
  runSaved: "பயணம் ஆஃப்லைனுக்காக சேமிக்கப்பட்டது",
  loadReleased: "ஏற்றம் விடுவிக்கப்பட்டது · {who}",
  loadPending: "ஏற்றுநர் ஏற்றத்தை விடுவிக்கும் வரை காத்திருக்கவும்",
  reefer: "குளிர் வெப்பநிலை {t}°C",
  tyres: "டயர், விளக்குகள், கதவுகள்",
  startTrip: "பயணம் {n} தொடங்கு",
  continueTrip: "பயணம் {n} தொடர்",
  delivered: "வழங்கப்பட்டது",
  next: "அடுத்து",
  notSent: "அனுப்பப்படவில்லை",
  arrived: "வந்துவிட்டேன்",
  markDelivered: "வழங்கியதாகக் குறி",
  saveStop: "நிறுத்தத்தைச் சேமி",
  syncNow: "இப்போது ஒத்திசை",
  gotIt: "புரிந்தது",
  noSignal: "சிக்னல் இல்லை",
  online: "இணைப்பில்",
  gotoStop: "{name} செல்",
  tripDone: "பயணம் முடிந்தது.",
};

const dict = { en, si, ta } as const;

export type Key = keyof typeof en;

export function translate(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const raw = (dict[lang] as Partial<Record<Key, string>>)[key] ?? en[key];
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const LANG_KEY = "wp_lang";

export function useLang() {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved && saved in dict) setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  };
  const t = (key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars);
  return { lang, setLang, t };
}
