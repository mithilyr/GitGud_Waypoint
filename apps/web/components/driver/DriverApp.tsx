"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { Button, Card, ErrorNote, Eyebrow, Headline, Icon, Lead, Logo, NavRow, Pill, SectionLabel, Sheet, Spinner, Tile } from "@/components/ui";
import { WaypointString } from "@/components/WaypointString";
import { HOME, useAuth } from "@/lib/auth";
import { DriverProvider, useDriver, type TripT } from "@/lib/driver/engine";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";
import { fmtDate } from "@/lib/format";
import { SettingsButton, useWide } from "@/components/Chrome";
import { DarkModeRow, LanguageRow, SettingsSection, TextSizeRow, ToggleRow, ValueRow } from "@/components/Settings";
import { usePref } from "@/lib/prefs";
import { SignaturePad } from "./SignaturePad";

export default function DriverApp() {
  return (
    <DriverProvider>
      <Gate />
    </DriverProvider>
  );
}

function Gate() {
  const { phase } = useDriver();
  if (phase === "loading") return <div className="grid min-h-dvh place-items-center text-muted"><Spinner /></div>;
  if (phase === "signin") return <ToSignIn />;
  if (phase === "pin-setup") return <PinScreen mode="setup" />;
  if (phase === "locked") return <PinScreen mode="unlock" />;
  return <Shell />;
}

/* ---------- R0a · first-time sign in: the single sign-in page (/) replaces a driver-only form ---------- */
function ToSignIn() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    // Somebody else's account is open on this device: send them to their own screens, not the driver's sign-in.
    if (user && user.role !== "driver") router.replace(HOME[user.role]);
    else {
      logout();
      router.replace("/");
    }
  }, [ready, user, logout, router]);
  return <div className="grid min-h-dvh place-items-center text-muted"><Spinner /></div>;
}

/* ---------- R0b · PIN (unlock works offline; setup is the second half of first sign-in) ---------- */
function PinScreen({ mode }: { mode: "setup" | "unlock" }) {
  const { profile, setPin, unlock, forget, online, simulate } = useDriver();
  const { t } = useT();
  const [pin, setPinValue] = useState("");
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function press(k: string) {
    setError(null);
    if (k === "⌫") return setPinValue((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPinValue(next);
    if (next.length < 4) return;
    if (mode === "unlock") {
      if (!(await unlock(next))) {
        setError(t("drv.pin.wrong"));
        setTimeout(() => setPinValue(""), 300);
      }
    } else if (first === null) {
      setFirst(next);
      setPinValue("");
    } else if (first === next) {
      await setPin(next);
    } else {
      setError(t("drv.pin.mismatch"));
      setFirst(null);
      setTimeout(() => setPinValue(""), 300);
    }
  }
  const name = profile?.user.name ?? "";
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
    <main className="relative mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center px-5 pb-6 pt-4">
      <Logo size={48} />
      <div className="mt-4 text-center">
        <div className="font-display text-[26px] font-medium">{name}</div>
        <div className="font-data text-[12px] text-muted">{t("drv.pin.depot", { code: profile?.user.driver_code ?? "", depot: profile?.user.depot ?? "" })}</div>
      </div>
      <h1 className="mt-6 text-[18px] font-semibold">{mode === "setup" ? (first === null ? t("drv.pin.choose") : t("drv.pin.again")) : t("drv.pin.enter")}</h1>
      <div className="mt-3 flex gap-3" aria-label={t("drv.pin.digits", { n: pin.length })}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${i < pin.length ? "border-ink bg-ink" : "border-faint"}`} />)}
      </div>
      <div className="mt-2 min-h-6 text-[13px] text-bad">{error}</div>
      <div className="mt-2 grid w-full max-w-[320px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k ? (
            <button key={i} onClick={() => press(k)} className="hoverable h-16 rounded-[14px] border border-line bg-surface text-[24px] font-medium active:bg-neutral" aria-label={k === "⌫" ? t("drv.pin.delete") : k}>{k}</button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted">
        <span className={`h-2 w-2 rounded-full ${online ? "bg-ok" : "bg-warn"}`} />
        {online ? t("online") : simulate ? t("drv.pin.simulated") : t("noSignal")}
      </p>
      <p className="mt-1 max-w-[300px] text-center text-[12px] text-muted">
        {mode === "unlock" ? t("drv.pin.unlockNote") : t("drv.pin.setupNote")}
      </p>
      {mode === "setup" ? <p className="mt-2 max-w-[300px] text-center text-[12px] text-muted">{t("drv.pin.demo")}</p> : null}
      <button onClick={forget} className="mt-4 text-[13px] font-semibold text-muted underline">{t("drv.pin.notYou", { name: name.split(" ")[0] || t("drv.pin.you") })}</button>
    </main>
    <div className="pt-6">
      <WaypointString />
    </div>
  </div>
  );
}

/* ---------- shell: header, offline banner, tabs and the screen stack ---------- */
type Screen = { name: "home" } | { name: "stops" } | { name: "stop"; id: number } | { name: "record"; id: number } | { name: "sync" } | { name: "help" } | { name: "call" } | { name: "settings" };

function Shell() {
  const d = useDriver();
  const { t } = useT();
  const [stack, setStack] = useState<Screen[]>([{ name: "home" }]);
  const screen = stack[stack.length - 1];
  const push = useCallback((s: Screen) => setStack((x) => [...x, s]), []);
  const back = useCallback(() => setStack((x) => (x.length > 1 ? x.slice(0, -1) : x)), []);
  const goTab = useCallback((name: "home" | "stops" | "sync" | "help") => setStack([{ name }]), []);
  const run = d.run;

  const trip = useMemo<TripT | undefined>(() => run?.trips.find((x) => x.status !== "completed") ?? run?.trips[run.trips.length - 1], [run]);
  const [tripId, setTripId] = useState<number | null>(null);
  const current = run?.trips.find((x) => x.trip_id === tripId) ?? trip;
  const label = `${run?.depot ?? d.profile?.user.depot} · ${run?.vehicle?.id ?? d.profile?.user.vehicle_id}`;
  const unreadPlanChange = run?.notices.find((n) => n.kind === "plan_changed" && !n.read);
  const pending = d.outbox.length;
  const needsAnswer = run?.conflicts.filter((c) => !c.stance).length ?? 0;
  const wide = useWide();
  const nextStop = current?.stops.find((x) => !x.removed && (x.status === "pending" || x.status === "arrived")) ?? current?.stops.find((x) => !x.removed);
  const tab = screen.name === "home" ? "home" : screen.name === "sync" ? "sync" : screen.name === "help" || screen.name === "call" || screen.name === "settings" ? "help" : "stops";
  const [planAlert] = usePref<boolean>("wp_driver_plan_alert", true);

  // Auto-lock after 5 minutes without a touch (the Settings row says so). The run and outbox stay on the phone;
  // the PIN opens it again and sync resumes.
  const [idle, setIdle] = useState(0);
  const lock = d.lock;
  useEffect(() => {
    const reset = () => setIdle(0);
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    const t = setInterval(() => setIdle((i) => i + 1), 1000);
    return () => {
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    if (idle >= 300) lock();
  }, [idle, lock]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:max-w-[1120px] lg:pb-8">
      <header className="sticky top-0 z-20 flex h-14 items-center bg-bg px-3 lg:h-16 lg:border-b lg:border-line lg:px-6">
        <div className="w-16">
          {stack.length > 1 ? (
            <button onClick={back} aria-label={t("common.back")} className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-neutral"><Icon.Back /></button>
          ) : null}
        </div>
        <div className="flex-1 text-center text-[12px] font-medium text-muted lg:hidden">{label}</div>
        {/* Desktop: the four sections as tabs in the header. */}
        <nav className="mx-auto hidden rounded-[8px] bg-neutral p-0.5 lg:flex" aria-label={t("drv.shell.sections")}>
          {(
            [
              ["home", t("run")],
              ["stops", t("stops")],
              ["sync", t("sync")],
              ["help", t("help")],
            ] as const
          ).map(([k, text]) => (
            <button key={k} onClick={() => goTab(k)} className={`flex h-8 items-center rounded-[6px] px-5 text-[14px] ${tab === k ? "border border-line bg-surface font-semibold text-ink" : "font-medium text-muted hover:text-ink"}`}>
              {text}
              {k === "sync" && pending + needsAnswer ? <span className="ml-2 grid h-4 min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-bg">{pending + needsAnswer}</span> : null}
            </button>
          ))}
        </nav>
        <span className="mr-3 hidden whitespace-nowrap text-[12px] font-medium text-muted lg:block">{label}</span>
        <div className="flex w-16 justify-end lg:w-auto">
          <SettingsButton to={() => push({ name: "settings" })} label={t("settings.title")} />
        </div>
      </header>

      {!d.online ? (
        <div className="mx-auto w-full max-w-[520px] px-4 pt-3 lg:max-w-[1120px] lg:px-6" role="status">
          <div className="rounded-[12px] border border-warn/30 bg-warn-bg px-4 py-3 text-warn">
            <div className="text-[13px] font-bold uppercase tracking-wide">{t("drv.shell.offlineSince", { t: d.offlineSince ? new Date(d.offlineSince).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }) : t("drv.shell.now") })}</div>
            <div className="text-[15px] font-semibold">{t("drv.shell.keepGoing")}</div>
            {pending ? <div className="mt-1 text-[13px]">{t("drv.shell.saved", { n: pending })}</div> : null}
          </div>
        </div>
      ) : null}

      <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-10 lg:px-6">
      {/* Desktop: the stop list stays on the left while a stop is open on the right. */}
      {wide && run && current && !["sync", "help", "call", "settings"].includes(screen.name) ? (
        <aside className="py-6">
          <Stops trip={current} onOpen={(id) => setStack([{ name: "stop", id }])} />
        </aside>
      ) : null}
      <main className="mx-auto w-full max-w-[520px] px-6 py-6 lg:max-w-[640px] lg:px-0">
        {/* Settings, Help and Sync work without a run too, so the driver can always sign out. */}
        {screen.name === "settings" ? (
          <SettingsScreen />
        ) : screen.name === "help" ? (
          <HelpScreen onCall={() => push({ name: "call" })} onSettings={() => push({ name: "settings" })} />
        ) : screen.name === "sync" ? (
          <SyncScreen />
        ) : !run || !current ? (
          <Card className="p-6 text-center">
            <p className="font-display text-[24px]">{t("drv.shell.noRun")}</p>
            <p className="mt-1 text-muted">{t("drv.shell.noRunBody")}</p>
            <Button className="mt-4" variant="secondary" onClick={() => d.sync()} busy={d.syncing}>{t("syncNow")}</Button>
          </Card>
        ) : screen.name === "home" ? (
          <Home trip={current} onPick={setTripId} onStart={() => push({ name: "stops" })} />
        ) : screen.name === "stops" ? (
          wide && nextStop ? (
            <StopDetail trip={current} stopId={nextStop.id} onRecord={() => push({ name: "record", id: nextStop.id })} onDone={() => goTab("stops")} />
          ) : (
            <Stops trip={current} onOpen={(id) => push({ name: "stop", id })} />
          )
        ) : screen.name === "stop" ? (
          <StopDetail trip={current} stopId={screen.id} onRecord={() => push({ name: "record", id: screen.id })} onDone={() => goTab("stops")} />
        ) : screen.name === "record" ? (
          <Record trip={current} stopId={screen.id} onSaved={() => goTab("stops")} />
        ) : (
          <CallScreen onBack={back} />
        )}
      </main>
      </div>

      {/* With plan alerts off the change waits for the Run tab instead of interrupting another screen. */}
      <Sheet open={!!unreadPlanChange && (planAlert || screen.name === "home")} onClose={() => {}} title={t("drv.change.title")}>
        {unreadPlanChange && current ? (
          <div className="p-6">
            <Pill tone="warn">{t("drv.change.tag", { t: unreadPlanChange.at })}</Pill>
            <h2 className="mt-2 font-display text-[28px] font-medium leading-tight">{unreadPlanChange.body || unreadPlanChange.title}</h2>
            <div className="mt-3 space-y-1.5">
              {current.stops.filter((s) => s.removed).map((s) => (
                <div key={s.id} className="rounded-[10px] bg-bad-bg px-3 py-2 text-[14px] text-bad">{t("drv.change.removed", { name: s.name })}</div>
              ))}
              <div className="rounded-[10px] bg-neutral px-3 py-2 text-[14px]">{t("drv.change.upToDate")}</div>
            </div>
            <Button size="xl" block className="mt-5" onClick={() => d.record({ kind: "notice_read", trip_id: current.trip_id, payload: { notification_id: unreadPlanChange.id }, label: "Read plan change" })}>
              {t("gotIt")}
            </Button>
          </div>
        ) : null}
      </Sheet>

      <WaypointString compact still className="mt-auto pt-10 lg:hidden" />
      <WaypointString still className="fixed inset-x-0 bottom-0 -z-10 hidden lg:block" />
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden" aria-label={t("drv.shell.sections")}>
        <ul className="mx-auto flex max-w-[520px]">
          {(
            [
              ["home", t("run"), 0],
              ["stops", t("stops"), 0],
              ["sync", t("sync"), pending + needsAnswer],
              ["help", t("help"), 0],
            ] as const
          ).map(([k, label, badge]) => (
            <li key={k} className="flex-1">
              <button onClick={() => goTab(k)} className={`relative flex h-16 w-full flex-col items-center justify-center gap-[6px] pt-1 text-[13px] ${tab === k ? "font-bold text-ink" : "font-medium text-faint"}`}>
                {label}
                <span className={`h-[5px] w-[5px] rounded-full ${tab === k ? "bg-primary" : "bg-transparent"}`} />
                {badge ? <span className="absolute right-[24%] top-2 grid h-4 min-w-4 place-items-center rounded-full bg-warn px-1 text-[10px] font-bold text-bg">{badge}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/* ---------- R1 · Today's run ---------- */
function Home({ trip, onPick, onStart }: { trip: TripT; onPick: (id: number) => void; onStart: () => void }) {
  const d = useDriver();
  const { t } = useT();
  const run = d.run!;
  const [tyres, setTyres] = useState(false);
  const stops = trip.stops.filter((s) => !s.removed);
  const win = `${stops.map((s) => s.window_open).sort()[0]} – ${stops.map((s) => s.window_close).sort().slice(-1)[0]}`;
  const out = trip.status === "out";
  const done = trip.status === "completed";
  const ready = trip.checks.load_released;
  const dateLabel = run.date ? fmtDate(run.date, { weekday: "long", day: "numeric", month: "long" }) : "";
  const Check = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className="flex min-h-11 items-center gap-3 py-1.5">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${ok ? "bg-ok-bg text-ok" : "border-2 border-faint"}`}>{ok ? <Icon.Check size={14} /> : null}</span>
      <span className={ok ? "" : "text-muted"}>{children}</span>
    </li>
  );
  return (
    <div className="rise">
      <Lead>{t("drv.home.eyebrow", { date: dateLabel, depot: run.depot })}</Lead>
      <Headline className="mt-1">{done ? t("tripDone") : t("tripLeaves", { n: trip.trip_no, t: trip.depart ?? "" })}</Headline>
      <p className="mt-1 text-[15px] text-muted">{t("homeLede", { count: stops.length, brand: trip.brand, district: trip.district })}</p>
      {run.trips.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {run.trips.map((x) => (
            <button key={x.trip_id} onClick={() => onPick(x.trip_id)} aria-pressed={x.trip_id === trip.trip_id} className={`h-9 rounded-full px-4 text-[13px] font-semibold ${x.trip_id === trip.trip_id ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>
              {t("drv.home.trip", { n: x.trip_no, district: x.district })}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Tile label={t("stops")} value={stops.length} sub={win} />
        <Tile label={t("vehicle")} value={run.vehicle?.id} sub={`${run.vehicle?.kind ?? ""}${trip.checks.chilled && trip.checks.reefer_temp != null ? ` · ${trip.checks.reefer_temp} °C` : ""}`} />
      </div>
      <Card className="mt-4 p-4">
        <SectionLabel>{t("beforeYouLeave")}</SectionLabel>
        <ul className="mt-1 divide-y divide-line">
          <Check ok>{t("runSaved")}</Check>
          <Check ok={ready}>{ready ? t("loadReleased", { who: trip.checks.released_by?.split(" ")[0] ?? "", dock: trip.checks.dock ?? "Dock 3" }) : t("loadPending")}</Check>
          {trip.checks.chilled ? <Check ok={ready && trip.checks.reefer_temp != null}>{trip.checks.reefer_temp != null ? t("reefer", { t: trip.checks.reefer_temp }) : t("drv.home.reefer")}</Check> : null}
          <li className="flex min-h-11 items-center gap-3 py-1.5">
            <button onClick={() => setTyres((x) => !x)} aria-pressed={tyres} className="flex w-full items-center gap-3 text-left">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${tyres ? "bg-ok-bg text-ok" : "border-2 border-faint"}`}>{tyres ? <Icon.Check size={14} /> : null}</span>
              <span className={tyres ? "" : "text-muted"}>{t("tyres")}</span>
            </button>
          </li>
        </ul>
        {trip.checks.seal_no ? <p className="font-data mt-2 text-[12px] text-muted">{t("drv.home.seal", { s: trip.checks.seal_no })}</p> : null}
      </Card>
      {run.fuel ? (
        <p className="mt-3 px-1 text-[13px] text-muted">{t("drv.home.fuel", { left: run.fuel.left_l, quota: run.fuel.quota_l })}</p>
      ) : null}
      <div className="mt-5">
        {out || done ? (
          <Button size="xl" block onClick={onStart}>{done ? t("stops") : t("continueTrip", { n: trip.trip_no })}</Button>
        ) : (
          <Button
            size="xl"
            block
            disabled={!ready || !tyres}
            onClick={async () => {
              await d.record({ kind: "trip_start", trip_id: trip.trip_id, label: `Trip ${trip.trip_no} started` });
              onStart();
            }}
          >
            {t("startTrip", { n: trip.trip_no })}
          </Button>
        )}
        {!out && !done && (!ready || !tyres) ? <p className="mt-2 text-center text-[13px] text-muted">{!ready ? t("loadPending") : t("drv.home.tickFirst")}</p> : null}
      </div>
    </div>
  );
}

/* ---------- R2 · Stop list ---------- */
function Stops({ trip, onOpen }: { trip: TripT; onOpen: (id: number) => void }) {
  const { outbox } = useDriver();
  const { t } = useT();
  const stops = trip.stops.filter((s) => !s.removed);
  const doneN = stops.filter((s) => ["delivered", "partial", "failed"].includes(s.status)).length;
  const next = stops.find((s) => s.status === "pending" || s.status === "arrived");
  const unsent = new Set(outbox.filter((e) => e.stop_id).map((e) => e.stop_id));
  const idx = next ? stops.indexOf(next) + 1 : stops.length;
  return (
    <div className="rise">
      <Lead>{t("drv.stops.eyebrow", { n: trip.trip_no, brand: trip.brand, district: trip.district })}</Lead>
      <Headline className="mt-1">{next ? t("drv.stops.stopOf", { i: idx, n: stops.length }) : t("tripDone")}</Headline>
      <p className="mt-2 text-[14px] text-muted">{t("drv.stops.progress", { d: doneN, r: stops.length - doneN })}</p>
      <ol className="mt-5 space-y-3">
        {trip.stops.map((s) => {
          const isDone = ["delivered", "partial", "failed"].includes(s.status);
          const isNext = next?.id === s.id;
          if (s.removed) {
            return (
              <li key={s.id} className="rounded-[12px] border border-dashed border-line px-4 py-3 text-[14px] text-muted line-through">{t("drv.stops.removed", { name: s.name })}</li>
            );
          }
          return (
            <li key={s.id}>
              <button onClick={() => onOpen(s.id)} className={`hoverable w-full rounded-[12px] border bg-surface px-4 py-3 text-left ${isNext ? "border-ink" : "border-line"}`}>
                <div className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${isDone ? "bg-ok-bg text-ok" : isNext ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>{isDone ? <Icon.Check size={14} /> : s.seq}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-semibold">{s.name}</div>
                    <div className="text-[13px] text-muted">{isDone ? `${s.status === "partial" ? t("drv.status.partial") : s.status === "failed" ? t("drv.status.failed") : t("delivered")} · ${s.done_at}` : t("drv.stops.window", { a: s.window_open, b: s.window_close })}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-data text-[15px] font-semibold tabular">{s.eta}</div>
                    {isNext ? <Pill tone="info">{t("next")}</Pill> : null}
                    {isDone && unsent.has(s.id) ? <Pill tone="warn">{t("notSent")}</Pill> : null}
                    {!isDone && !isNext && s.late_risk >= 20 ? <Pill tone="bad">{t("drv.stops.late", { n: s.late_risk })}</Pill> : null}
                  </div>
                </div>
                {isNext && s.late_risk >= 20 ? <div className="mt-2"><Pill tone="bad">{t("drv.stops.late", { n: s.late_risk })}</Pill></div> : null}
              </button>
            </li>
          );
        })}
      </ol>
      {next ? <Button size="xl" block className="mt-4" onClick={() => onOpen(next.id)}>{t("gotoStop", { name: next.name })}</Button> : null}
    </div>
  );
}

/* ---------- R3 · Stop detail (and R3b: the same screen with no signal) ---------- */
function StopDetail({ trip, stopId, onRecord, onDone }: { trip: TripT; stopId: number; onRecord: () => void; onDone: () => void }) {
  const d = useDriver();
  const { t } = useT();
  const s = trip.stops.find((x) => x.id === stopId);
  const [busy, setBusy] = useState(false);
  if (!s) return <p className="text-muted">{t("drv.stop.gone")}</p>;
  const stops = trip.stops.filter((x) => !x.removed);
  const isDone = ["delivered", "partial", "failed"].includes(s.status);
  const late = s.late_risk >= 20;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${s.district}, Sri Lanka`)}`;
  return (
    <div className="rise">
      <Lead>{t("drv.stop.eyebrow", { i: stops.indexOf(s) + 1, n: stops.length, brand: trip.brand })}</Lead>
      <Headline className="mt-1">{s.name}</Headline>
      <div className="mt-1 text-[14px] text-muted">{s.district} · <a className="underline" href={mapsUrl} target="_blank" rel="noreferrer">{t("drv.stop.openMaps")}</a></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="p-3"><Eyebrow>{t("drv.stop.arrive")}</Eyebrow><div className="font-data text-[18px] font-semibold tabular">{s.eta}</div>{isDone ? null : <Pill tone={late ? "bad" : "ok"}>{late ? t("drv.stop.late", { n: s.late_risk }) : t("drv.stop.onTime")}</Pill>}</Card>
        <Card className="p-3"><Eyebrow>{t("drv.stop.window")}</Eyebrow><div className="font-data text-[14px] font-semibold">{s.window_open}–{s.window_close}</div></Card>
        <Card className="p-3"><Eyebrow>{t("drv.stop.access")}</Eyebrow><div className="text-[14px] font-semibold leading-tight">{s.access}</div></Card>
      </div>
      <SectionLabel className="mt-5">{t("drv.stop.unload")}</SectionLabel>
      <Card className="mt-2 divide-y divide-line">
        {s.items.map((i) => (
          <div key={i.group} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <div className="flex-1">
              <div className="text-[16px] font-semibold">{i.group}</div>
              <div className="font-data text-[12px] text-muted">{t("drv.stop.units", { n: i.expected, unit: i.unit })}{i.expected < i.planned ? t("drv.stop.loaderFound", { a: i.expected, b: i.planned }) : ""}</div>
            </div>
            <Pill tone={i.temp === "chilled" ? "info" : "neutral"}>{i.temp === "chilled" ? t("common.chilled") : t("common.ambient")}</Pill>
          </div>
        ))}
      </Card>

      {isDone ? (
        <Card className="mt-4 p-4">
          <Pill tone={s.status === "failed" ? "bad" : s.status === "partial" ? "warn" : "ok"}>{s.status === "failed" ? t("drv.status.failed") : s.status === "partial" ? t("drv.status.partial") : t("drv.status.delivered")}</Pill>
          <p className="mt-2 text-[14px]">{t("drv.stop.recorded", { t: s.done_at ?? "" })}{s.delivery?.signed_by ? t("drv.stop.receivedBy", { who: s.delivery.signed_by }) : ""}. {s.delivery?.items.map((i) => `${i.group} ${i.handed}/${i.planned}`).join(" · ")}</p>
          <Button className="mt-3" variant="secondary" block onClick={onDone}>{t("drv.stop.backToStops")}</Button>
        </Card>
      ) : s.status === "pending" ? (
        <div className="mt-5">
          <Button
            size="xl"
            block
            disabled={trip.status !== "out" || busy}
            onClick={async () => {
              setBusy(true);
              await d.record({ kind: "arrive", trip_id: trip.trip_id, stop_id: s.id, label: `${s.name} arrived` });
              setBusy(false);
            }}
          >
            {t("arrived")}
          </Button>
          <p className="mt-2 text-center text-[13px] text-muted">{trip.status === "out" ? t("drv.stop.available") : t("drv.stop.startFirst")}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          <Button size="xl" block onClick={onRecord}>{t("markDelivered")}</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onRecord}><Icon.Camera /> {t("drv.stop.proofPhoto")}</Button>
            <Button variant="danger" onClick={onRecord}>{t("drv.stop.report")}</Button>
          </div>
          <p className="text-center text-[12px] text-muted">{t("drv.stop.arrivedNote", { t: s.arrived_at ?? "" })}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- R4 · Record delivery ---------- */
function Record({ trip, stopId, onSaved }: { trip: TripT; stopId: number; onSaved: () => void }) {
  const d = useDriver();
  const { t } = useT();
  const s = trip.stops.find((x) => x.id === stopId);
  const [mode, setMode] = useState<"delivered" | "partial" | "failed">("delivered");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("store_closed");
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onSig = useCallback((v: string | null) => setSignature(v), []);
  useEffect(() => {
    if (s) setCounts(Object.fromEntries(s.items.map((i) => [i.group, i.expected])));
  }, [s]);
  if (!s) return null;

  const handed = (g: string, expected: number) => (mode === "delivered" ? expected : mode === "failed" ? 0 : counts[g] ?? expected);
  const short = s.items.some((i) => handed(i.group, i.expected) < i.expected);

  async function save() {
    if (!s) return;
    if (mode !== "failed" && !photo && !signature && !name.trim()) {
      setError(t("drv.rec.needProof"));
      return;
    }
    if (mode === "partial" && !short) {
      setError(t("drv.rec.needShort"));
      return;
    }
    setBusy(true);
    await d.record({
      kind: "deliver",
      trip_id: trip.trip_id,
      stop_id: s.id,
      label: `${s.name} ${mode}`,
      payload: {
        outcome: mode,
        items: s.items.map((i) => ({ group: i.group, handed: handed(i.group, i.expected) })),
        note: note || null,
        reason: mode === "failed" ? reason : null,
        signed_by: name.trim() || null,
        photo,
        signature,
      },
    });
    setBusy(false);
    onSaved();
  }

  return (
    <div className="rise">
      <Lead>{t("drv.rec.eyebrow", { name: s.name, t: s.arrived_at ?? "" })}</Lead>
      <Headline className="mt-1">{t("drv.rec.title")}</Headline>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([["delivered", t("drv.rec.all")], ["partial", t("drv.rec.partial")], ["failed", t("drv.rec.failed")]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setMode(k); setError(null); }} aria-pressed={mode === k} className={`h-12 rounded-[10px] border text-[14px] font-semibold ${mode === k ? "border-ink bg-neutral" : "border-line"}`}>{l}</button>
        ))}
      </div>

      {mode !== "failed" ? (
        <>
          <Eyebrow className="mt-5">{t("drv.rec.handed")}</Eyebrow>
          <Card className="mt-2 divide-y divide-line">
            {s.items.map((i) => (
              <div key={i.group} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <div className="flex-1">
                  <div className="text-[16px] font-semibold">{i.group}</div>
                  <div className="font-data text-[12px] text-muted">{t("drv.rec.ofPlanned", { n: i.expected })}</div>
                </div>
                {mode === "partial" ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCounts((c) => ({ ...c, [i.group]: Math.max(0, (c[i.group] ?? i.expected) - 1) }))} className="grid h-11 w-11 place-items-center rounded-[10px] border border-line" aria-label={t("drv.rec.fewer", { g: i.group })}><Icon.Minus /></button>
                    <span className="font-data w-8 text-center text-[20px]">{counts[i.group] ?? i.expected}</span>
                    <button onClick={() => setCounts((c) => ({ ...c, [i.group]: Math.min(i.expected, (c[i.group] ?? i.expected) + 1) }))} className="grid h-11 w-11 place-items-center rounded-[10px] border border-line" aria-label={t("drv.rec.more", { g: i.group })}><Icon.Plus /></button>
                  </div>
                ) : (
                  <span className="font-data text-[20px]">{i.expected}</span>
                )}
              </div>
            ))}
          </Card>
        </>
      ) : (
        <>
          <Eyebrow className="mt-5">{t("drv.rec.why")}</Eyebrow>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(["store_closed", "cannot_unload", "refused", "other"] as const).map((k) => (
              <button key={k} onClick={() => setReason(k)} aria-pressed={reason === k} className={`h-12 rounded-[10px] border text-[14px] font-semibold ${reason === k ? "border-ink bg-neutral" : "border-line"}`}>{t(`drv.rec.${k}` as Key)}</button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">{t("drv.rec.told")}</p>
        </>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={mode === "partial" ? t("drv.rec.notePartial") : t("drv.rec.note")} className="mt-4 w-full rounded-[10px] border border-line bg-surface p-3 outline-none focus:border-ink" />

      {mode !== "failed" ? (
        <>
          <Eyebrow className="mt-5">{t("drv.rec.proof")}</Eyebrow>
          <div className="mt-2 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("drv.rec.receivedBy")} className="h-12 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink" />
            <SignaturePad onChange={onSig} />
            <PhotoButton value={photo} onChange={setPhoto} label={t("drv.rec.photo")} />
          </div>
        </>
      ) : (
        <div className="mt-4"><PhotoButton value={photo} onChange={setPhoto} label={t("drv.rec.photoOpt")} /></div>
      )}

      <ErrorNote error={error} />
      <Button size="xl" block className="mt-4" busy={busy} onClick={save}>{t("saveStop")}</Button>
      <p className="mt-2 text-center text-[12px] text-muted">{t("drv.rec.savedNote")}</p>
    </div>
  );
}

/* ---------- R5 · Sync outbox ---------- */
function SyncScreen() {
  const d = useDriver();
  const { t } = useT();
  const run = d.run!;
  const conflicts = run.conflicts;
  const pending = d.outbox;
  const total = pending.length;
  return (
    <div className="rise">
      <Lead>{d.online ? t("drv.sync.last", { t: d.lastSync ? new Date(d.lastSync).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }) : "—" }) : t("noSignal")}</Lead>
      <Headline className="mt-1">{!d.online ? t("drv.sync.savedPhone") : total ? t("drv.sync.sending", { n: total }) : t("drv.sync.backOnline")}</Headline>
      <p className="mt-2 text-[14px] text-muted">{d.message ?? (total ? t("drv.sync.recordsKeep") : t("drv.sync.reached"))}</p>

      {conflicts.map((c) => (
        <Card key={c.id} className="mt-4 border-warn/50 p-4">
          <Pill tone="warn">{t("drv.sync.needsAnswer")}</Pill>
          <div className="mt-2 font-display text-[22px] font-medium">{c.stop} · {c.line}</div>
          <p className="mt-1 text-[14px] text-muted">{t("drv.sync.conflictBody", { a: c.driver_count, b: c.store_count })}</p>
          {c.stance ? (
            <p className="mt-2 text-[14px] font-semibold">{c.stance === "accept" ? t("drv.sync.youChoseAccept", { n: c.store_count }) : t("drv.sync.youChoseDispute", { n: c.driver_count })}</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => d.record({ kind: "conflict_answer", trip_id: run.trips[0].trip_id, stop_id: c.stop_id, payload: { conflict_id: c.id, stance: "dispute" }, label: `Dispute ${c.line}` })}>{t("drv.sync.disputeBtn", { n: c.driver_count })}</Button>
              <Button onClick={() => d.record({ kind: "conflict_answer", trip_id: run.trips[0].trip_id, stop_id: c.stop_id, payload: { conflict_id: c.id, stance: "accept" }, label: `Accept ${c.line}` })}>{t("drv.sync.acceptBtn", { n: c.store_count })}</Button>
            </div>
          )}
        </Card>
      ))}

      <Eyebrow className="mt-6">{(total ? t("drv.sync.savedTitle") : t("drv.sync.outbox"))}</Eyebrow>
      {total ? (
        <ul className="mt-2 divide-y divide-line rounded-[12px] border border-line bg-surface">
          {pending.map((e) => (
            <li key={e.client_uuid} className="flex items-center gap-3 px-4 py-3">
              <span className="font-data w-12 text-[13px] text-muted">{new Date(e.device_ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" })}</span>
              <span className="flex-1 text-[14px]">{e.label ?? e.kind}</span>
              <Pill tone={e.state === "sending" ? "info" : "warn"}>{e.state === "sending" ? t("drv.sync.sendingPill") : t("notSent")}</Pill>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-[12px] border border-dashed border-line px-4 py-6 text-center text-muted">{t("drv.sync.nothing")}</p>
      )}
      <Button size="xl" block className="mt-4" busy={d.syncing} onClick={() => d.sync()}>{t("syncNow")}</Button>
    </div>
  );
}

/* ---------- R7 · Help (and R8 calling dispatch, R9 settings) ---------- */
function HelpScreen({ onCall, onSettings }: { onCall: () => void; onSettings: () => void }) {
  const d = useDriver();
  const { t } = useT();
  const HELP: [Key, Key][] = [
    ["drv.help.q1", "drv.help.a1"],
    ["drv.help.q2", "drv.help.a2"],
    ["drv.help.q3", "drv.help.a3"],
  ];
  return (
    <div className="rise">
      <Lead>{t("drv.help.eyebrow", { depot: d.run?.depot ?? "", v: d.run?.vehicle?.id ?? "" })}</Lead>
      <Headline className="mt-1">{t("help")}</Headline>
      <div className="mt-5 space-y-3">
        {HELP.map(([q, a]) => (
          <Card key={q} className="p-4"><div className="text-[15px] font-semibold">{t(q)}</div><p className="mt-2 text-[13px] text-muted">{t(a)}</p></Card>
        ))}
        <NavRow label={t("settings.title")} onClick={onSettings} />
      </div>
      <Button size="xl" block className="mt-6" onClick={onCall}><Icon.Phone /> {t("drv.help.call", { name: d.run?.dispatcher?.name ?? t("drv.help.dispatch") })}</Button>
    </div>
  );
}

function SettingsScreen() {
  const d = useDriver();
  const { t } = useT();
  const [wifi, setWifi] = usePref<boolean>("wp_driver_wifi", false);
  const [planAlert, setPlanAlert] = usePref<boolean>("wp_driver_plan_alert", true);
  return (
    <div className="rise">
      <Lead>{t("drv.settings.sub", { who: d.profile?.user.name ?? "", v: d.run?.vehicle?.id ?? d.profile?.user.vehicle_id ?? "", depot: d.run?.depot ?? d.profile?.user.depot ?? "" })}</Lead>
      <Headline className="mt-1">{t("settings.title")}</Headline>
      <div className="mt-6">
        <SettingsSection title={t("settings.display")}>
          <DarkModeRow sub={t("drv.settings.darkSub")} />
          <LanguageRow />
          <TextSizeRow />
        </SettingsSection>
        <SettingsSection title={t("drv.settings.offline")}>
          <ToggleRow label={t("drv.settings.wifi")} sub={t("drv.settings.wifiSub")} checked={wifi} onChange={setWifi} />
          <ToggleRow label={t("drv.settings.planAlert")} sub={t("drv.settings.planAlertSub")} checked={planAlert} onChange={setPlanAlert} />
          <ToggleRow label={t("drv.settings.simulate")} sub={t("drv.settings.simulateSub")} checked={d.simulate} onChange={d.setSimulate} />
        </SettingsSection>
        <SettingsSection title={t("drv.settings.security")}>
          <ValueRow label={t("drv.settings.lockNow")} onClick={d.lock} />
          <ValueRow label={t("drv.settings.autoLock")} value={t("drv.settings.autoLockValue")} />
        </SettingsSection>
      </div>
      <Button size="xl" variant="secondary" block className="mt-8" onClick={d.forget}>{t("common.signOut")}</Button>
      <p className="mt-2 text-center text-[12px] text-muted">{t("drv.settings.signOutNote")}</p>
    </div>
  );
}

function CallScreen({ onBack }: { onBack: () => void }) {
  const d = useDriver();
  const { t } = useT();
  const run = d.run!;
  const trip = run.trips.find((x) => x.status === "out") ?? run.trips[0];
  const stop = trip?.stops.find((s) => s.status === "pending" || s.status === "arrived");
  const line = `${run.vehicle?.id} · stop ${stop?.seq ?? "?"}${stop ? `, ${stop.name}` : ""} · ${stop?.eta ?? ""}`;
  const phone = run.dispatcher?.phone?.replace(/\s/g, "") ?? "";
  const name = run.dispatcher?.name ?? t("drv.help.dispatch");
  return (
    <div className="rise">
      <Lead>{t("drv.call.eyebrow", { v: run.vehicle?.id ?? "" })}</Lead>
      <Headline className="mt-1">{t("drv.call.title", { name })}</Headline>
      <p className="mt-2 text-[14px] text-muted">{t("drv.call.lede")}</p>
      <Card className="mt-5 p-4">
        <div className="text-[15px] font-semibold">{t("drv.call.sees", { name })}</div>
        <p className="font-data mt-2 text-[13px]">{t("drv.call.line", { v: run.vehicle?.id ?? "", n: stop?.seq ?? "?", stop: stop ? `, ${stop.name}` : "", eta: stop?.eta ?? "" })}</p>
        <p className="mt-2 text-[13px] text-muted">{t("drv.call.same")}</p>
      </Card>
      <a href={d.online ? `tel:${phone}` : `sms:${phone}?body=${encodeURIComponent(line)}`} className="mt-6 block">
        <Button size="xl" block><Icon.Phone /> {d.online ? t("drv.call.now") : t("drv.call.text")}</Button>
      </a>
      <Button variant="secondary" block className="mt-2" onClick={onBack}>{t("drv.call.back")}</Button>
    </div>
  );
}
