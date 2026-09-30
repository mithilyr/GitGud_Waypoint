// Interface words only. IDs, outlet names, numbers and times never change with the language.
// Sinhala and Tamil were drafted with Claude (strings on the Penpot boards are copied verbatim)
// and still need a native-speaker review; see docs/ai-disclosure.md.
export const driverEn = {
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

import { common } from "./domains/common";
import { store } from "./domains/store";
import { storeTrack } from "./domains/storeTrack";
import { storeMisc } from "./domains/storeMisc";
import { auth } from "./domains/auth";
import { disp } from "./domains/disp";
import { loader } from "./domains/loader";
import { driver as driverDomain } from "./domains/driver";

export const en = { ...driverEn, ...common.en, ...store.en, ...storeTrack.en, ...storeMisc.en, ...auth.en, ...disp.en, ...loader.en, ...driverDomain.en } as const;

export type Key = keyof typeof en;
