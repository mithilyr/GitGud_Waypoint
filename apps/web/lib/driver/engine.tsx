"use client";

// The driver's offline engine. Every action is applied to the phone's own copy of the run and put in an
// outbox (IndexedDB) FIRST; sending is a separate, retried step. So nothing depends on signal, and a
// retry can never double-apply because the server dedupes on the client UUID.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ApiError,
  getToken,
  isNetworkError,
  post,
  get,
  setForceOffline,
  setToken,
} from "@/lib/api";
import { User, useAuth } from "@/lib/auth";
import { uuid } from "@/lib/format";
import {
  kvDel,
  kvGet,
  kvSet,
  outboxAll,
  outboxDelete,
  outboxPut,
  type OutboxEvent,
} from "./idb";
import { checkPin, makePinRecord } from "./pin";

export type Item = {
  group: string;
  unit: string;
  temp: string;
  planned: number;
  expected: number;
  flag: string | null;
};
export type Delivery = {
  outcome: string;
  items: { group: string; unit: string; planned: number; handed: number }[];
  note?: string | null;
  reason?: string | null;
  signed_by?: string | null;
  photo?: string | null;
};
export type StopT = {
  id: number;
  seq: number;
  name: string;
  district: string;
  eta: string | null;
  window_open: string;
  window_close: string;
  access: string;
  mall_window: string | null;
  status: "pending" | "arrived" | "delivered" | "partial" | "failed";
  removed: boolean;
  late_risk: number;
  items: Item[];
  delivery: Delivery | null;
  arrived_at: string | null;
  done_at: string | null;
};
export type TripT = {
  trip_id: number;
  trip_no: number;
  brand: string;
  district: string;
  status: "planned" | "loading" | "released" | "out" | "completed";
  depart: string | null;
  checks: {
    load_released: boolean;
    released_by: string | null;
    released_at: string | null;
    dock: string | null;
    reefer_temp: number | null;
    seal_no: string | null;
    chilled: boolean;
  };
  stops: StopT[];
};
export type Notice = {
  id: number;
  kind: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  meta: Record<string, unknown>;
};
export type ConflictT = {
  id: number;
  stop_id: number;
  stop: string;
  line: string;
  driver_count: number;
  store_count: number;
  stance: string | null;
};
export type Run = {
  server_time: string;
  driver: { id: number; name: string; code: string | null };
  vehicle: { id: string; kind: string; temp: string } | null;
  dispatcher: { name: string; phone: string | null } | null;
  date: string | null;
  depot: string;
  trips: TripT[];
  fuel: { quota_l: number; left_l: number; used_pct: number } | null;
  notices: Notice[];
  conflicts: ConflictT[];
};

type Profile = { user: User; pin: { salt: string; hash: string } | null };
export type Phase = "loading" | "signin" | "pin-setup" | "locked" | "ready";

type Engine = {
  phase: Phase;
  profile: Profile | null;
  run: Run | null;
  outbox: OutboxEvent[];
  online: boolean;
  simulate: boolean;
  offlineSince: string | null;
  lastSync: string | null;
  syncing: boolean;
  message: string | null;
  setPin: (pin: string) => Promise<void>;
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  forget: () => Promise<void>;
  record: (e: Omit<OutboxEvent, "client_uuid" | "device_ts">) => Promise<void>;
  sync: () => Promise<void>;
  setSimulate: (v: boolean) => void;
};

const Ctx = createContext<Engine | null>(null);
export const useDriver = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDriver outside DriverProvider");
  return c;
};

/** Apply one event to a copy of the run, exactly as the server will when it arrives. */
export function applyLocal(run: Run, e: OutboxEvent): Run {
  const r: Run = JSON.parse(JSON.stringify(run));
  const trip = r.trips.find((t) => t.trip_id === e.trip_id);
  const stop = trip?.stops.find((s) => s.id === e.stop_id);
  switch (e.kind) {
    case "trip_start":
      if (trip && trip.status === "released") trip.status = "out";
      break;
    case "arrive":
      if (stop && stop.status === "pending") {
        stop.status = "arrived";
        stop.arrived_at = hhmm(e.device_ts);
      }
      break;
    case "deliver":
      if (stop && trip) {
        const p = e.payload ?? {};
        const items = (
          (p.items as { group: string; handed: number }[]) ?? []
        ).map((i) => {
          const it = stop.items.find((x) => x.group === i.group);
          return {
            group: i.group,
            unit: it?.unit ?? "crate",
            planned: it?.expected ?? i.handed,
            handed: i.handed,
          };
        });
        let outcome = (p.outcome as string) ?? "delivered";
        if (outcome !== "failed")
          outcome = items.some((i) => i.handed < i.planned)
            ? "partial"
            : "delivered";
        stop.status = outcome as StopT["status"];
        stop.done_at = hhmm(e.device_ts);
        stop.delivery = {
          outcome,
          items,
          note: p.note as string,
          reason: p.reason as string,
          signed_by: p.signed_by as string,
          photo: p.photo as string,
        };
        if (
          trip.stops
            .filter((s) => !s.removed)
            .every((s) => ["delivered", "partial", "failed"].includes(s.status))
        )
          trip.status = "completed";
      }
      break;
    case "conflict_answer": {
      const c = r.conflicts.find(
        (x) => x.id === Number(e.payload?.conflict_id),
      );
      if (c) c.stance = String(e.payload?.stance);
      break;
    }
    case "notice_read": {
      const n = r.notices.find(
        (x) => x.id === Number(e.payload?.notification_id),
      );
      if (n) n.read = true;
      break;
    }
  }
  return r;
}

function hhmm(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Colombo",
  });
}

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [serverRun, setServerRun] = useState<Run | null>(null);
  const [outbox, setOutbox] = useState<OutboxEvent[]>([]);
  const [netDown, setNetDown] = useState(false);
  const [simulate, setSim] = useState(false);
  const [offlineSince, setOfflineSince] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const outboxRef = useRef<OutboxEvent[]>([]);
  outboxRef.current = outbox;
  const busy = useRef(false);

  const online = !simulate && !netDown;

  // What the driver sees: the last server copy with everything still in the outbox replayed on top.
  const run = useMemo(
    () => (serverRun ? outbox.reduce(applyLocal, serverRun) : null),
    [serverRun, outbox],
  );

  const markOffline = useCallback(() => {
    setNetDown(true);
    setOfflineSince((s) => s ?? new Date().toISOString());
  }, []);
  const markOnline = useCallback(() => {
    setNetDown(false);
    setOfflineSince(null);
  }, []);

  // Boot: restore the profile, the last run and the outbox from the phone.
  useEffect(() => {
    (async () => {
      const sim = localStorage.getItem("wp_sim_offline") === "1";
      setSim(sim);
      setForceOffline(sim);
      if (sim) setOfflineSince(new Date().toISOString());
      const prof = await kvGet<Profile>("profile");
      const saved = await kvGet<Run>("run");
      const box = await outboxAll();
      const token = await kvGet<string>("token");
      if (token && !getToken()) setToken(token);
      setOutbox(box);
      if (saved) setServerRun(saved);
      if (prof) {
        setProfile(prof);
        setPhase(prof.pin ? "locked" : "pin-setup");
      } else setPhase("signin");
    })();
  }, []);

  const persistRun = useCallback((r: Run) => {
    setServerRun(r);
    kvSet("run", r);
  }, []);

  const sync = useCallback(async () => {
    if (busy.current || phase !== "ready") return;
    busy.current = true;
    setSyncing(true);
    // "Send photos on Wi-Fi only": while on mobile data, records that carry a proof photo stay in the outbox.
    const conn = (navigator as Navigator & { connection?: { type?: string } })
      .connection;
    const holdPhotos =
      localStorage.getItem("wp_driver_wifi") === "1" &&
      conn?.type === "cellular";
    const batch = outboxRef.current.filter(
      (e) => !(holdPhotos && e.payload?.photo),
    );
    try {
      if (batch.length) {
        setOutbox((o) => o.map((e) => ({ ...e, state: "sending" as const })));
        const res = await post<{
          results: { client_uuid: string; status: string; message: string }[];
          run: Run;
        }>("/sync", {
          events: batch.map((e) => ({
            client_uuid: e.client_uuid,
            kind: e.kind,
            trip_id: e.trip_id,
            stop_id: e.stop_id,
            device_ts: e.device_ts,
            payload: e.payload ?? {},
          })),
        });
        for (const e of batch) await outboxDelete(e.client_uuid);
        setOutbox((o) =>
          o.filter((e) => !batch.some((b) => b.client_uuid === e.client_uuid)),
        );
        const notes = res.results
          .filter((r) => r.status === "conflict" || r.status === "rejected")
          .map((r) => r.message)
          .filter(Boolean);
        if (notes.length) setMessage(notes[0]);
        persistRun(res.run);
      } else {
        persistRun(await get<Run>("/driver/run"));
      }
      markOnline();
      setLastSync(new Date().toISOString());
    } catch (e) {
      setOutbox((o) => o.map((x) => ({ ...x, state: "waiting" as const })));
      if (isNetworkError(e)) markOffline();
      else if (e instanceof ApiError && e.status === 401) setPhase("signin");
      else setMessage(e instanceof Error ? e.message : "Could not sync");
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [phase, persistRun, markOnline, markOffline]);

  // Keep trying: a heartbeat when idle, a resend when the outbox is not empty.
  useEffect(() => {
    if (phase !== "ready") return;
    sync();
    const t = setInterval(sync, 7000);
    const onOnline = () => sync();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(t);
      window.removeEventListener("online", onOnline);
    };
  }, [phase, sync]);

  const record: Engine["record"] = useCallback(
    async (e) => {
      const full: OutboxEvent = {
        ...e,
        client_uuid: uuid(),
        device_ts: new Date().toISOString(),
        state: "waiting",
      };
      await outboxPut(full);
      setOutbox((o) => [...o, full]);
      // Try straight away; if there is no signal this simply stays saved on the phone.
      setTimeout(() => sync(), 50);
    },
    [sync],
  );

  const setPin: Engine["setPin"] = useCallback(
    async (pin) => {
      if (!profile) return;
      const next = { ...profile, pin: await makePinRecord(pin) };
      await kvSet("profile", next);
      setProfile(next);
      setPhase("ready");
    },
    [profile],
  );

  const unlock: Engine["unlock"] = useCallback(
    async (pin) => {
      if (!profile?.pin) return false;
      const ok = await checkPin(pin, profile.pin);
      if (ok) setPhase("ready");
      return ok;
    },
    [profile],
  );

  const lock = useCallback(
    () => setPhase(profile?.pin ? "locked" : "signin"),
    [profile],
  );

  const forget = useCallback(async () => {
    if (
      outboxRef.current.length &&
      !confirm(
        "Some records have not been sent. Signing out now would lose them. Sign out anyway?",
      )
    )
      return;
    for (const k of ["profile", "run", "token"]) await kvDel(k);
    for (const e of outboxRef.current) await outboxDelete(e.client_uuid);
    setToken(null);
    setProfile(null);
    setServerRun(null);
    setOutbox([]);
    logout();
    setPhase("signin");
  }, [logout]);

  const setSimulate = useCallback(
    (v: boolean) => {
      localStorage.setItem("wp_sim_offline", v ? "1" : "0");
      setSim(v);
      setForceOffline(v);
      if (v) setOfflineSince(new Date().toISOString());
      else {
        setOfflineSince(null);
        setNetDown(false);
        setTimeout(() => sync(), 100);
      }
    },
    [sync],
  );

  return (
    <Ctx.Provider
      value={{
        phase,
        profile,
        run,
        outbox,
        online,
        simulate,
        offlineSince,
        lastSync,
        syncing,
        message,
        setPin,
        unlock,
        lock,
        forget,
        record,
        sync,
        setSimulate,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
