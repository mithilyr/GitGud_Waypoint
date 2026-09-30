"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { Button, Card, ErrorNote, Eyebrow, Headline, Icon, Logo, Pill, Sheet, Spinner, VineHorizon, VineRidges } from "@/components/ui";
import { DriverProvider, useDriver, type TripT } from "@/lib/driver/engine";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/lib/hooks";
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
  if (phase === "signin") return <SignIn />;
  if (phase === "pin-setup") return <PinScreen mode="setup" />;
  if (phase === "locked") return <PinScreen mode="unlock" />;
  return <Shell />;
}

/* ---------- R0a · first-time sign in ---------- */
function SignIn() {
  const { signIn } = useDriver();
  const { lang, setLang } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col px-5 pb-6 pt-8">
      <div className="flex items-center gap-3">
        <Logo size={40} />
        <div>
          <div className="text-[15px] font-semibold leading-tight">Waypoint</div>
          <div className="text-[12px] text-muted">Driver</div>
        </div>
      </div>
      <h1 className="mt-8 font-display text-[34px] font-medium leading-[1.1]">Sign in to see your runs.</h1>
      <div className="mt-5 grid grid-cols-3 gap-2">
        {([["si", "සිංහල"], ["ta", "தமிழ்"], ["en", "English"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={`h-12 rounded-[10px] border text-[16px] font-semibold ${lang === k ? "border-ink bg-surface" : "border-line text-muted"}`}>
            {label}
          </button>
        ))}
      </div>
      <form
        className="mt-5 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await signIn(email.trim(), password);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not sign in");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          <span className="eyebrow">Email</span>
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink" />
        </label>
        <label className="block">
          <span className="eyebrow">Password</span>
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-12 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink" />
        </label>
        <ErrorNote error={error} />
        <Button type="submit" size="lg" block busy={busy}>Verify and continue</Button>
        <Button
          type="button"
          variant="secondary"
          block
          onClick={() => {
            setEmail("driver@waypoint.demo");
            setPassword("waypoint2026");
          }}
        >
          Fill the demo driver account
        </Button>
      </form>
      <p className="mt-3 text-center text-[13px] text-muted">You do this once. After that, a 4-digit PIN opens the app, even with no signal.</p>
      <div className="mt-auto pt-6 opacity-80"><VineRidges /></div>
    </main>
  );
}

/* ---------- R0b · PIN (unlock works offline; setup is the second half of first sign-in) ---------- */
function PinScreen({ mode }: { mode: "setup" | "unlock" }) {
  const { profile, setPin, unlock, forget, online, simulate } = useDriver();
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
        setError("That PIN is not right");
        setTimeout(() => setPinValue(""), 300);
      }
    } else if (first === null) {
      setFirst(next);
      setPinValue("");
    } else if (first === next) {
      await setPin(next);
    } else {
      setError("The two PINs did not match. Start again.");
      setFirst(null);
      setTimeout(() => setPinValue(""), 300);
    }
  }
  const name = profile?.user.name ?? "";
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[480px] flex-col items-center px-5 pb-6 pt-10">
      <Logo size={48} />
      <div className="mt-4 text-center">
        <div className="font-display text-[26px] font-medium">{name}</div>
        <div className="text-[13px] text-muted">{profile?.user.driver_code} · {profile?.user.depot} depot</div>
      </div>
      <h1 className="mt-6 text-[18px] font-semibold">{mode === "setup" ? (first === null ? "Choose a 4-digit PIN" : "Enter it again") : "Enter your PIN"}</h1>
      <div className="mt-3 flex gap-3" aria-label={`${pin.length} of 4 digits`}>
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${i < pin.length ? "border-ink bg-ink" : "border-faint"}`} />)}
      </div>
      <div className="mt-2 min-h-6 text-[13px] text-bad">{error}</div>
      <div className="mt-2 grid w-full max-w-[320px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k ? (
            <button key={i} onClick={() => press(k)} className="hoverable h-16 rounded-[14px] border border-line bg-surface text-[24px] font-medium active:bg-neutral" aria-label={k === "⌫" ? "Delete" : k}>{k}</button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <p className="mt-4 flex items-center gap-1.5 text-[13px] text-muted">
        <span className={`h-2 w-2 rounded-full ${online ? "bg-ok" : "bg-warn"}`} />
        {online ? "Online" : simulate ? "No signal (simulated)" : "No signal"}
      </p>
      <p className="mt-1 max-w-[300px] text-center text-[12px] text-muted">
        {mode === "unlock" ? "No signal needed to unlock. Your run downloads when you reach signal or the depot Wi-Fi." : "This PIN stays on this phone."}
      </p>
      <button onClick={forget} className="mt-4 text-[13px] font-semibold text-muted underline">Not {name.split(" ")[0] || "you"}? Sign in with your email</button>
      <div className="mt-auto w-full pt-6 opacity-80"><VineRidges /></div>
    </main>
  );
}

/* ---------- shell: header, offline banner, tabs and the screen stack ---------- */
type Screen = { name: "home" } | { name: "stops" } | { name: "stop"; id: number } | { name: "record"; id: number } | { name: "sync" } | { name: "help" } | { name: "call" };

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
  const tab = screen.name === "home" ? "home" : screen.name === "sync" ? "sync" : screen.name === "help" || screen.name === "call" ? "help" : "stops";

  return (
    <div className="min-h-dvh pb-[118px]">
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-bg/95 px-3 backdrop-blur">
        <div className="w-20">
          {stack.length > 1 ? (
            <button onClick={back} aria-label="Back" className="grid h-10 w-10 place-items-center rounded-full hover:bg-neutral"><Icon.Back /></button>
          ) : (
            <Logo size={30} />
          )}
        </div>
        <div className="flex-1 text-center text-[12px] font-medium text-muted">{label}</div>
        <div className="flex w-20 justify-end">
          <span className={`inline-flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold ${d.online ? "text-ok" : "text-warn"}`}>
            <span className="h-2 w-2 rounded-full bg-current" />
            {d.online ? t("online") : t("noSignal")}
          </span>
        </div>
      </header>

      {!d.online ? (
        <div className="mx-auto max-w-[520px] px-4 pt-3" role="status">
          <div className="rounded-[12px] border border-warn/30 bg-warn-bg px-4 py-3 text-warn">
            <div className="text-[13px] font-bold uppercase tracking-wide">Offline since {d.offlineSince ? new Date(d.offlineSince).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }) : "now"}</div>
            <div className="text-[15px] font-semibold">Keep going. Everything you record is saved here and sends when signal returns.</div>
            {pending ? <div className="mt-1 text-[13px]">{pending} record{pending === 1 ? "" : "s"} saved on this phone</div> : null}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-[520px] px-4 py-4">
        {!run || !current ? (
          <Card className="p-6 text-center">
            <p className="font-display text-[24px]">No run for you yet.</p>
            <p className="mt-1 text-muted">Dispatch has not released a plan with your vehicle. This screen updates by itself.</p>
            <Button className="mt-4" variant="secondary" onClick={() => d.sync()} busy={d.syncing}>{t("syncNow")}</Button>
          </Card>
        ) : screen.name === "home" ? (
          <Home trip={current} onPick={setTripId} onStart={() => push({ name: "stops" })} />
        ) : screen.name === "stops" ? (
          <Stops trip={current} onOpen={(id) => push({ name: "stop", id })} />
        ) : screen.name === "stop" ? (
          <StopDetail trip={current} stopId={screen.id} onRecord={() => push({ name: "record", id: screen.id })} onDone={() => goTab("stops")} />
        ) : screen.name === "record" ? (
          <Record trip={current} stopId={screen.id} onSaved={() => goTab("stops")} />
        ) : screen.name === "sync" ? (
          <SyncScreen />
        ) : screen.name === "help" ? (
          <HelpScreen onCall={() => push({ name: "call" })} />
        ) : (
          <CallScreen onBack={back} />
        )}
      </main>

      <Sheet open={!!unreadPlanChange} onClose={() => {}} title="Plan changed">
        {unreadPlanChange && current ? (
          <div className="p-6">
            <Pill tone="warn">Plan changed · {unreadPlanChange.at}</Pill>
            <h2 className="mt-2 font-display text-[28px] font-medium leading-tight">{unreadPlanChange.body || unreadPlanChange.title}</h2>
            <div className="mt-3 space-y-1.5">
              {current.stops.filter((s) => s.removed).map((s) => (
                <div key={s.id} className="rounded-[10px] bg-bad-bg px-3 py-2 text-[14px] text-bad">Removed from your run: <b>{s.name}</b></div>
              ))}
              <div className="rounded-[10px] bg-neutral px-3 py-2 text-[14px]">Your stop list is up to date below. Ruwan sees when you have read this.</div>
            </div>
            <Button size="lg" block className="mt-5" onClick={() => d.record({ kind: "notice_read", trip_id: current.trip_id, payload: { notification_id: unreadPlanChange.id }, label: "Read plan change" })}>
              {t("gotIt")}
            </Button>
          </div>
        ) : null}
      </Sheet>

      <div className="fixed inset-x-0 bottom-[60px] z-10 mx-auto max-w-[520px]"><VineHorizon /></div>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface" aria-label="Sections">
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
              <button onClick={() => goTab(k)} className={`relative flex h-[60px] w-full flex-col items-center justify-center gap-0.5 text-[12px] font-semibold ${tab === k ? "text-ink" : "text-muted"}`}>
                <span className={`h-1 w-6 rounded-full ${tab === k ? "bg-accent" : "bg-transparent"}`} />
                {label}
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
  const dateLabel = run.date ? new Date(run.date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : "";
  const Check = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className="flex min-h-11 items-center gap-3 py-1.5">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${ok ? "bg-ok-bg text-ok" : "border-2 border-faint"}`}>{ok ? <Icon.Check size={14} /> : null}</span>
      <span className={ok ? "" : "text-muted"}>{children}</span>
    </li>
  );
  return (
    <div className="rise">
      <Eyebrow>{dateLabel} · {run.depot} depot</Eyebrow>
      <Headline className="mt-1">{done ? t("tripDone") : t("tripLeaves", { n: trip.trip_no, t: trip.depart ?? "" })}</Headline>
      <p className="mt-1 text-[15px] text-muted">{t("homeLede", { count: stops.length, brand: trip.brand, district: trip.district })}</p>
      {run.trips.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {run.trips.map((x) => (
            <button key={x.trip_id} onClick={() => onPick(x.trip_id)} aria-pressed={x.trip_id === trip.trip_id} className={`h-9 rounded-full px-4 text-[13px] font-semibold ${x.trip_id === trip.trip_id ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>
              Trip {x.trip_no} · {x.district}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-3"><div className="eyebrow">{t("stops")}</div><div className="font-display text-[28px]">{stops.length}</div><div className="font-data text-[12px] text-muted">{win}</div></Card>
        <Card className="p-3"><div className="eyebrow">{t("vehicle")}</div><div className="font-data text-[22px] font-semibold">{run.vehicle?.id}</div><div className="text-[12px] text-muted">{run.vehicle?.kind}{trip.checks.chilled && trip.checks.reefer_temp != null ? ` · ${trip.checks.reefer_temp} °C` : ""}</div></Card>
      </div>
      <Card className="mt-4 p-4">
        <Eyebrow>{t("beforeYouLeave")}</Eyebrow>
        <ul className="mt-1 divide-y divide-line">
          <Check ok>{t("runSaved")}</Check>
          <Check ok={ready}>{ready ? t("loadReleased", { who: trip.checks.released_by?.split(" ")[0] ?? "", dock: trip.checks.dock ?? "Dock 3" }) : t("loadPending")}</Check>
          {trip.checks.chilled ? <Check ok={ready && trip.checks.reefer_temp != null}>{trip.checks.reefer_temp != null ? t("reefer", { t: trip.checks.reefer_temp }) : "Reefer temperature"}</Check> : null}
          <li className="flex min-h-11 items-center gap-3 py-1.5">
            <button onClick={() => setTyres((x) => !x)} aria-pressed={tyres} className="flex w-full items-center gap-3 text-left">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${tyres ? "bg-ok-bg text-ok" : "border-2 border-faint"}`}>{tyres ? <Icon.Check size={14} /> : null}</span>
              <span className={tyres ? "" : "text-muted"}>{t("tyres")}</span>
            </button>
          </li>
        </ul>
        {trip.checks.seal_no ? <p className="font-data mt-2 text-[12px] text-muted">Seal {trip.checks.seal_no}</p> : null}
      </Card>
      {run.fuel ? (
        <p className="mt-3 px-1 text-[13px] text-muted">Fuel left this week: <b className="text-ink">{run.fuel.left_l} L</b> of {run.fuel.quota_l} L quota.</p>
      ) : null}
      <div className="mt-5">
        {out || done ? (
          <Button size="lg" block onClick={onStart}>{done ? t("stops") : t("continueTrip", { n: trip.trip_no })}</Button>
        ) : (
          <Button
            size="lg"
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
        {!out && !done && (!ready || !tyres) ? <p className="mt-2 text-center text-[13px] text-muted">{!ready ? t("loadPending") : "Tick the tyres, lights and doors check to start."}</p> : null}
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
      <Eyebrow>Trip {trip.trip_no} · {trip.brand} · {trip.district}</Eyebrow>
      <Headline className="mt-1">{next ? `Stop ${idx} of ${stops.length}` : t("tripDone")}</Headline>
      <p className="mt-1 text-[14px] text-muted">{doneN} delivered · {stops.length - doneN} to go</p>
      <ol className="mt-4 space-y-2">
        {trip.stops.map((s) => {
          const isDone = ["delivered", "partial", "failed"].includes(s.status);
          const isNext = next?.id === s.id;
          if (s.removed) {
            return (
              <li key={s.id} className="rounded-[12px] border border-dashed border-line px-4 py-3 text-[14px] text-muted line-through">{s.name} · removed by dispatch</li>
            );
          }
          return (
            <li key={s.id}>
              <button onClick={() => onOpen(s.id)} className={`hoverable w-full rounded-[12px] border bg-surface px-4 py-3 text-left ${isNext ? "border-ink" : "border-line"}`}>
                <div className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${isDone ? "bg-ok-bg text-ok" : isNext ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>{isDone ? <Icon.Check size={14} /> : s.seq}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[16px] font-semibold">{s.name}</div>
                    <div className="text-[13px] text-muted">{isDone ? `${s.status === "partial" ? "Partial" : s.status === "failed" ? "Failed" : t("delivered")} · ${s.done_at}` : `Window ${s.window_open}–${s.window_close}`}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-data text-[15px] font-semibold tabular">{s.eta}</div>
                    {isNext ? <Pill tone="info">{t("next")}</Pill> : null}
                    {isDone && unsent.has(s.id) ? <Pill tone="warn">{t("notSent")}</Pill> : null}
                    {!isDone && !isNext && s.late_risk >= 20 ? <Pill tone="bad">Late risk {s.late_risk}%</Pill> : null}
                  </div>
                </div>
                {isNext && s.late_risk >= 20 ? <div className="mt-2"><Pill tone="bad">Late risk {s.late_risk}%</Pill></div> : null}
              </button>
            </li>
          );
        })}
      </ol>
      {next ? <Button size="lg" block className="mt-4" onClick={() => onOpen(next.id)}>{t("gotoStop", { name: next.name })}</Button> : null}
    </div>
  );
}

/* ---------- R3 · Stop detail (and R3b: the same screen with no signal) ---------- */
function StopDetail({ trip, stopId, onRecord, onDone }: { trip: TripT; stopId: number; onRecord: () => void; onDone: () => void }) {
  const d = useDriver();
  const { t } = useT();
  const s = trip.stops.find((x) => x.id === stopId);
  const [busy, setBusy] = useState(false);
  if (!s) return <p className="text-muted">That stop is no longer on your run.</p>;
  const stops = trip.stops.filter((x) => !x.removed);
  const isDone = ["delivered", "partial", "failed"].includes(s.status);
  const late = s.late_risk >= 20;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${s.district}, Sri Lanka`)}`;
  return (
    <div className="rise">
      <Eyebrow>Stop {stops.indexOf(s) + 1} of {stops.length} · Waypoint {trip.brand}</Eyebrow>
      <Headline className="mt-1">{s.name}</Headline>
      <div className="mt-1 text-[14px] text-muted">{s.district} · <a className="underline" href={mapsUrl} target="_blank" rel="noreferrer">Open in Maps</a></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Card className="p-3"><div className="eyebrow">Arrive</div><div className="font-data text-[18px] font-semibold tabular">{s.eta}</div>{isDone ? null : <Pill tone={late ? "bad" : "ok"}>{late ? `Late ${s.late_risk}%` : "On time"}</Pill>}</Card>
        <Card className="p-3"><div className="eyebrow">Window</div><div className="font-data text-[14px] font-semibold">{s.window_open}–{s.window_close}</div></Card>
        <Card className="p-3"><div className="eyebrow">Access</div><div className="text-[14px] font-semibold leading-tight">{s.access}</div></Card>
      </div>
      <Eyebrow className="mt-5">Unload here</Eyebrow>
      <Card className="mt-2 divide-y divide-line">
        {s.items.map((i) => (
          <div key={i.group} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <div className="flex-1">
              <div className="text-[16px] font-semibold">{i.group}</div>
              <div className="text-[13px] text-muted">{i.expected} {i.unit}{i.expected === 1 ? "" : "s"}{i.expected < i.planned ? ` (loader found ${i.expected} of ${i.planned})` : ""}</div>
            </div>
            <Pill tone={i.temp === "chilled" ? "info" : "neutral"}>{i.temp === "chilled" ? "Chilled" : "Ambient"}</Pill>
          </div>
        ))}
      </Card>

      {isDone ? (
        <Card className="mt-4 p-4">
          <Pill tone={s.status === "failed" ? "bad" : s.status === "partial" ? "warn" : "ok"}>{s.status}</Pill>
          <p className="mt-2 text-[14px]">Recorded {s.done_at}{s.delivery?.signed_by ? ` · received by ${s.delivery.signed_by}` : ""}. {s.delivery?.items.map((i) => `${i.group} ${i.handed}/${i.planned}`).join(" · ")}</p>
          <Button className="mt-3" variant="secondary" block onClick={onDone}>Back to stops</Button>
        </Card>
      ) : s.status === "pending" ? (
        <div className="mt-5">
          <Button
            size="lg"
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
          <p className="mt-2 text-center text-[13px] text-muted">{trip.status === "out" ? "Available when stopped" : "Start the trip from the Run tab first."}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          <Button size="lg" block onClick={onRecord}>{t("markDelivered")}</Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onRecord}><Icon.Camera /> Proof photo</Button>
            <Button variant="danger" onClick={onRecord}>Report issue</Button>
          </div>
          <p className="text-center text-[12px] text-muted">Arrived {s.arrived_at}. Saved on this phone first, then sent when online.</p>
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
      setError("Add proof: a photo, a signature, or the name of who received it.");
      return;
    }
    if (mode === "partial" && !short) {
      setError("Partial means at least one line is short. Lower a count or choose All delivered.");
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
      <Eyebrow>{s.name} · arrived {s.arrived_at}</Eyebrow>
      <Headline className="mt-1">Record delivery</Headline>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {([["delivered", "All delivered"], ["partial", "Partial"], ["failed", "Failed"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { setMode(k); setError(null); }} aria-pressed={mode === k} className={`h-12 rounded-[10px] border text-[14px] font-semibold ${mode === k ? "border-ink bg-neutral" : "border-line"}`}>{l}</button>
        ))}
      </div>

      {mode !== "failed" ? (
        <>
          <Eyebrow className="mt-5">Handed over</Eyebrow>
          <Card className="mt-2 divide-y divide-line">
            {s.items.map((i) => (
              <div key={i.group} className="flex min-h-16 items-center gap-3 px-4 py-2">
                <div className="flex-1">
                  <div className="text-[16px] font-semibold">{i.group}</div>
                  <div className="text-[12px] text-muted">of {i.expected} planned</div>
                </div>
                {mode === "partial" ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setCounts((c) => ({ ...c, [i.group]: Math.max(0, (c[i.group] ?? i.expected) - 1) }))} className="grid h-11 w-11 place-items-center rounded-[10px] border border-line" aria-label={`One fewer ${i.group}`}><Icon.Minus /></button>
                    <span className="font-data w-8 text-center text-[20px]">{counts[i.group] ?? i.expected}</span>
                    <button onClick={() => setCounts((c) => ({ ...c, [i.group]: Math.min(i.expected, (c[i.group] ?? i.expected) + 1) }))} className="grid h-11 w-11 place-items-center rounded-[10px] border border-line" aria-label={`One more ${i.group}`}><Icon.Plus /></button>
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
          <Eyebrow className="mt-5">Why</Eyebrow>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[["store_closed", "Store closed"], ["cannot_unload", "Cannot unload"], ["refused", "Refused"], ["other", "Other"]].map(([k, l]) => (
              <button key={k} onClick={() => setReason(k)} aria-pressed={reason === k} className={`h-12 rounded-[10px] border text-[14px] font-semibold ${reason === k ? "border-ink bg-neutral" : "border-line"}`}>{l}</button>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">Ruwan is told straight away.</p>
        </>
      )}

      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={mode === "partial" ? "1 crate short. Damaged in transit." : "Note (optional)"} className="mt-4 w-full rounded-[10px] border border-line bg-surface p-3 outline-none focus:border-ink" />

      {mode !== "failed" ? (
        <>
          <Eyebrow className="mt-5">Proof</Eyebrow>
          <div className="mt-2 space-y-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Received by (name)" className="h-12 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink" />
            <SignaturePad onChange={onSig} />
            <PhotoButton value={photo} onChange={setPhoto} label="Proof photo" />
          </div>
        </>
      ) : (
        <div className="mt-4"><PhotoButton value={photo} onChange={setPhoto} label="Photo (optional)" /></div>
      )}

      <ErrorNote error={error} />
      <Button size="lg" block className="mt-4" busy={busy} onClick={save}>{t("saveStop")}</Button>
      <p className="mt-2 text-center text-[12px] text-muted">Saved on this phone first, then sent when online.</p>
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
      <Eyebrow>{d.online ? `Last sync ${d.lastSync ? new Date(d.lastSync).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }) : "—"}` : "No signal"}</Eyebrow>
      <Headline className="mt-1">{!d.online ? "Saved on this phone." : total ? `Sending ${total}…` : "Back online."}</Headline>
      <p className="mt-1 text-[14px] text-muted">{d.message ?? (total ? "Records keep the time you made them, in the order they happened." : "Everything you recorded has reached dispatch.")}</p>

      {conflicts.map((c) => (
        <Card key={c.id} className="mt-4 border-warn/50 p-4">
          <Pill tone="warn">Needs your answer</Pill>
          <div className="mt-2 font-display text-[22px] font-medium">{c.stop} · {c.line}</div>
          <p className="mt-1 text-[14px] text-muted">You recorded {c.driver_count}, the store confirmed {c.store_count} while you were offline. Neither count is overwritten.</p>
          {c.stance ? (
            <p className="mt-2 text-[14px] font-semibold">You chose to {c.stance === "accept" ? `accept ${c.store_count}` : `dispute (${c.driver_count})`}. Ruwan will settle it.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => d.record({ kind: "conflict_answer", trip_id: run.trips[0].trip_id, stop_id: c.stop_id, payload: { conflict_id: c.id, stance: "dispute" }, label: `Dispute ${c.line}` })}>Dispute · {c.driver_count}</Button>
              <Button onClick={() => d.record({ kind: "conflict_answer", trip_id: run.trips[0].trip_id, stop_id: c.stop_id, payload: { conflict_id: c.id, stance: "accept" }, label: `Accept ${c.line}` })}>Accept · {c.store_count}</Button>
            </div>
          )}
        </Card>
      ))}

      <Eyebrow className="mt-6">{total ? "Saved on this phone" : "Outbox"}</Eyebrow>
      {total ? (
        <ul className="mt-2 divide-y divide-line rounded-[12px] border border-line bg-surface">
          {pending.map((e) => (
            <li key={e.client_uuid} className="flex items-center gap-3 px-4 py-3">
              <span className="font-data w-12 text-[13px] text-muted">{new Date(e.device_ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" })}</span>
              <span className="flex-1 text-[14px]">{e.label ?? e.kind}</span>
              <Pill tone={e.state === "sending" ? "info" : "warn"}>{e.state === "sending" ? "Sending" : t("notSent")}</Pill>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-[12px] border border-dashed border-line px-4 py-6 text-center text-muted">Nothing waiting. New records appear here until they are sent.</p>
      )}
      <Button size="lg" block className="mt-4" busy={d.syncing} onClick={() => d.sync()}>{t("syncNow")}</Button>
    </div>
  );
}

/* ---------- R7 · Help, settings (and R8 calling dispatch) ---------- */
function HelpScreen({ onCall }: { onCall: () => void }) {
  const d = useDriver();
  const { theme, setTheme } = useTheme();
  const { lang, setLang } = useT();
  return (
    <div className="rise">
      <Eyebrow>Works offline · {d.run?.depot} · {d.run?.vehicle?.id}</Eyebrow>
      <Headline className="mt-1">Help</Headline>
      <div className="mt-4 space-y-2">
        {[
          ["Lost signal?", "Keep delivering. Everything saves on your phone and sends by itself when the signal returns."],
          ["Store count is different", "Accept the store's count or dispute yours on the Sync tab. Nothing is overwritten; Ruwan reviews disputes."],
          ["Cannot unload, or store is closed", "Record the stop as Failed and pick a reason. Ruwan is told straight away."],
        ].map(([q, a]) => (
          <Card key={q} className="p-4"><div className="font-semibold">{q}</div><p className="mt-1 text-[14px] text-muted">{a}</p></Card>
        ))}
      </div>
      <Button size="lg" block className="mt-4" onClick={onCall}><Icon.Phone /> Call {d.run?.dispatcher?.name ?? "dispatch"} · dispatcher</Button>

      <Eyebrow className="mt-8">Settings</Eyebrow>
      <Card className="mt-2 divide-y divide-line">
        <Row title="Language" note="Interface words only; IDs and outlet names never change.">
          <div className="flex gap-1">
            {([["en", "EN"], ["si", "SI"], ["ta", "TA"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={`h-9 w-11 rounded-[8px] text-[13px] font-semibold ${lang === k ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>{l}</button>
            ))}
          </div>
        </Row>
        <Row title="Dark mode" note="Easier at 04:00">
          <Button variant="secondary" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "On" : "Off"}</Button>
        </Row>
        <Row title="Simulate no signal" note="For demos: works like airplane mode inside this app.">
          <Button variant={d.simulate ? "accent" : "secondary"} size="sm" onClick={() => d.setSimulate(!d.simulate)}>{d.simulate ? "On" : "Off"}</Button>
        </Row>
        <Row title="Lock now" note="Ask for the PIN again.">
          <Button variant="secondary" size="sm" onClick={d.lock}>Lock</Button>
        </Row>
        <Row title="Sign out of this phone" note="Only when the outbox is empty.">
          <Button variant="danger" size="sm" onClick={d.forget}>Sign out</Button>
        </Row>
      </Card>
    </div>
  );
}

function Row({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-[13px] text-muted">{note}</div>
      </div>
      {children}
    </div>
  );
}

function CallScreen({ onBack }: { onBack: () => void }) {
  const d = useDriver();
  const run = d.run!;
  const trip = run.trips.find((t) => t.status === "out") ?? run.trips[0];
  const stop = trip?.stops.find((s) => s.status === "pending" || s.status === "arrived");
  const line = `${run.vehicle?.id} · stop ${stop?.seq ?? "?"}${stop ? `, ${stop.name}` : ""} · ${stop?.eta ?? ""}`;
  const phone = run.dispatcher?.phone?.replace(/\s/g, "") ?? "";
  return (
    <div className="rise">
      <Eyebrow>Peliyagoda dispatch · {run.vehicle?.id}</Eyebrow>
      <Headline className="mt-1">Calling {run.dispatcher?.name ?? "dispatch"}</Headline>
      <p className="mt-1 text-[14px] text-muted">Opening your phone&rsquo;s dialler. With no signal, a text with your vehicle, stop and time is sent instead.</p>
      <Card className="mt-4 p-4">
        <div className="eyebrow">What Ruwan sees</div>
        <p className="font-data mt-1">{line}</p>
        <p className="mt-1 text-[13px] text-muted">The same line as your entry on the Live board.</p>
      </Card>
      <a href={d.online ? `tel:${phone}` : `sms:${phone}?body=${encodeURIComponent(line)}`} className="mt-4 block">
        <Button size="lg" block><Icon.Phone /> {d.online ? "Call now" : "Send text"}</Button>
      </a>
      <Button variant="ghost" block className="mt-1" onClick={onBack}>Back to Help</Button>
    </div>
  );
}
