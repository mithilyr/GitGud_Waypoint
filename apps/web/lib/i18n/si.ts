import type { Key, driverEn } from "./en";
import { common } from "./domains/common";
import { store } from "./domains/store";
import { storeTrack } from "./domains/storeTrack";
import { storeMisc } from "./domains/storeMisc";
import { auth } from "./domains/auth";
import { disp } from "./domains/disp";
import { loader } from "./domains/loader";
import { driver as driverDomain } from "./domains/driver";

const driver: Record<keyof typeof driverEn, string> = {
  run: "ධාවනය",
  stops: "නැවතුම්",
  sync: "සමමුහුර්ත",
  help: "උදව්",
  tripLeaves: "{n} වන ගමන {t}ට පිටත් වේ.",
  homeLede:
    "{district} {brand} නැවතුම් {count}ක්. සියල්ල පටවා දුරකථනයේ සුරැකී ඇත.",
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

export const si: Record<Key, string> = {
  ...driver,
  ...common.si,
  ...store.si,
  ...storeTrack.si,
  ...storeMisc.si,
  ...auth.si,
  ...disp.si,
  ...loader.si,
  ...driverDomain.si,
};
