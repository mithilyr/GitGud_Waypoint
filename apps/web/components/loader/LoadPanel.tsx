"use client";

import { useEffect, useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { Bar, Button, Card, ErrorNote, Eyebrow, Icon, Lead, Pill, Sheet, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";

export type Line = {
  id: number;
  group: string;
  unit: string;
  temp: string;
  planned: number;
  loaded: boolean;
  found: number | null;
  flag: string | null;
  flag_status: string | null;
  flag_answer: string | null;
};
type LoadStop = { stop_id: number; load_position: number; ordinal: string; seq: number; name: string; state: "done" | "current" | "todo"; lines: Line[] };
type Change = {
  at: string;
  note: string;
  add: { stop: string; group: string; qty: number; unit: string; temp: string }[];
  remove: { stop: string; group: string; qty: number; unit: string; temp: string; was_loaded: boolean }[];
};
export type TripDetail = {
  trip: { trip_id: number; vehicle_id: string; kind: string; brand: string; district: string; trip_no: number; stops: number; depart: string | null; status: string; driver: string | null };
  vehicle: { id: string; weight_cap_kg: number; volume_cap_m3: number; temp: string };
  loaded: number;
  total: number;
  weight_kg: number;
  volume_m3: number;
  stops: LoadStop[];
  has_chilled: boolean;
  has_ambient: boolean;
  flags: { id: number; stop: string; group: string; found: number; planned: number; reason: string; status: string; answer: string | null }[];
  change: Change | null;
  released: boolean;
  seal_no: string | null;
  reefer_temp: number | null;
  released_by: string | null;
};

const REASONS = ["not_in_stock", "damaged", "wrong_item", "wont_fit"] as const;
const reasonKey = (code: string) => `loader.reason.${code}` as Key;

export function TempPill({ temp }: { temp: string }) {
  const { t } = useT();
  return <Pill tone={temp === "chilled" ? "info" : "neutral"}>{temp === "chilled" ? t("common.chilled") : t("common.ambient")}</Pill>;
}

export function LoadPanel({ tripId, onReleased }: { tripId: number; onReleased?: () => void }) {
  const { t } = useT();
  const { data, error, loading, reload } = usePoll(() => get<TripDetail>(`/loader/trips/${tripId}`), 3000, [tripId]);
  const [flagLine, setFlagLine] = useState<{ line: Line; stop: string } | null>(null);
  const [releasing, setReleasing] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  if (loading && !data) return <div className="grid place-items-center py-16 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  const d = data;
  const left = d.total - d.loaded;
  const volPct = (d.volume_m3 / d.vehicle.volume_cap_m3) * 100;
  const kgPct = (d.weight_kg / d.vehicle.weight_cap_kg) * 100;
  const current = d.stops.find((s) => s.state === "current");
  const later = d.stops.filter((s) => s.state === "todo");

  async function toggle(l: Line) {
    setBusy(l.id);
    try {
      await post(`/loader/lines/${l.id}/load`, { loaded: !l.loaded });
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("loader.load.couldNotUpdate"), "bad");
      reload();
    } finally {
      setBusy(null);
    }
  }
  async function loadAll(stopId: number) {
    try {
      await post(`/loader/trips/${tripId}/stops/${stopId}/load-all`);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("loader.load.couldNotUpdate"), "bad");
    }
  }

  if (d.change) {
    return <PlanChanged d={d} onShow={async () => { await post(`/loader/trips/${tripId}/ack-change`); await reload(); }} />;
  }

  return (
    <div className="rise">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Lead mono>
            {t("loader.load.eyebrow", { v: d.trip.vehicle_id, n: d.trip.trip_no, brand: d.trip.brand, t: d.trip.depart ?? "" })}
            {d.trip.driver ? t("loader.load.eyebrowDriver", { who: d.trip.driver }) : ""}
          </Lead>
          <div className="mt-1 font-display text-[34px] font-medium leading-tight tracking-[-0.8px] tabular">{t("loader.load.progress", { a: d.loaded, b: d.total })}</div>
        </div>
        <div className="grid w-full max-w-[300px] gap-2 text-[12px] text-muted">
          <div>
            <div className="font-data flex justify-between"><span>{t("loader.load.weight")}</span><span>{d.weight_kg.toLocaleString()} / {d.vehicle.weight_cap_kg.toLocaleString()} kg</span></div>
            <Bar pct={kgPct} />
          </div>
          <div>
            <div className="font-data flex justify-between"><span>{t("loader.load.volume")}</span><span>{d.volume_m3} / {d.vehicle.volume_cap_m3} m³</span></div>
            <Bar pct={volPct} />
          </div>
        </div>
      </div>

      {d.released ? (
        <Card className="mt-5 border-ok/40 bg-ok-bg p-4 text-ok">
          <div className="flex items-center gap-2 font-semibold"><Icon.Check /> {t("loader.load.releasedBy", { who: d.released_by?.split(" ")[0] ?? "", seal: d.seal_no ?? "" })}{d.reefer_temp != null ? t("loader.load.reefer", { t: d.reefer_temp }) : ""}</div>
          <p className="mt-1 text-[14px]">{t("loader.load.releasedBody")}</p>
        </Card>
      ) : (
        <p className="mt-4 rounded-[8px] bg-info-bg px-3 py-2 text-[12px] font-semibold text-info">{t("loader.load.hint")}</p>
      )}

      <ol className="mt-3 space-y-2">
        {d.stops.map((s) => {
          const flagged = s.lines.some((l) => l.flag_status);
          if (s.state === "done") {
            return (
              <li key={s.stop_id}>
                <details className="group rounded-[12px] border border-line bg-surface">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 text-[14px]">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-ok-bg text-ok"><Icon.Check size={14} /></span>
                    <span className="font-semibold">{s.ordinal} · {s.name}</span>
                    <span className="text-muted">{flagged ? s.lines.map((l) => (l.flag_status ? t("store.track.ofPlanned", { v: l.found ?? 0, n: l.planned }) + " " + l.group : "")).filter(Boolean).join(", ") : t("loader.load.all", { n: s.lines.reduce((n, l) => n + l.planned, 0) })}</span>
                    {flagged ? <Pill tone="warn" className="ml-auto">{t("loader.load.flagged")}</Pill> : <Icon.Chevron className="ml-auto text-faint transition-transform group-open:rotate-90" />}
                  </summary>
                  <ul className="divide-y divide-line border-t border-line px-4">
                    {s.lines.map((l) => (
                      <LineRow key={l.id} l={l} disabled={d.released || busy === l.id} onToggle={() => toggle(l)} onFlag={() => setFlagLine({ line: l, stop: s.name })} />
                    ))}
                  </ul>
                </details>
              </li>
            );
          }
          if (s.state === "todo") return null;
          return (
            <li key={s.stop_id}>
              <Card className="border-ink/60 p-4">
                <div className="flex items-center justify-between">
                  <Eyebrow className="!text-ink">{t("loader.load.now", { ord: s.ordinal, name: s.name })}</Eyebrow>
                  {!d.released ? (
                    <button onClick={() => loadAll(s.stop_id)} className="text-[13px] font-semibold underline">
                      {t("loader.load.loadAll")}
                    </button>
                  ) : null}
                </div>
                <ul className="mt-2 divide-y divide-line">
                  {s.lines.map((l) => (
                    <LineRow key={l.id} l={l} disabled={d.released || busy === l.id} onToggle={() => toggle(l)} onFlag={() => setFlagLine({ line: l, stop: s.name })} />
                  ))}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>

      {later.length && !d.released ? (
        <p className="mt-3 px-1 text-[13px] text-muted">
          {t("loader.load.then", { names: later.map((s) => s.name).join(", ") })}
        </p>
      ) : null}

      {d.flags.length ? (
        <div className="mt-5">
          <Eyebrow>{t("loader.load.flagsTitle")}</Eyebrow>
          <div className="mt-2 space-y-2">
            {d.flags.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-warn-bg px-3 py-2 text-[14px] text-warn">
                <b>{f.stop}</b> · {f.group} {t("store.track.ofPlanned", { v: f.found, n: f.planned })} · {t(reasonKey(f.reason))}
                <span className="ml-auto font-semibold">{f.status === "answered" ? (f.answer === "top_up" ? t("loader.load.answerTopUp") : t("loader.load.answerAsIs")) : t("loader.load.waiting")}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!d.released ? (
        <div className="sticky bottom-[72px] mt-5 flex gap-2 lg:bottom-4">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            onClick={() => current && setFlagLine({ line: current.lines.find((l) => !l.loaded) ?? current.lines[0], stop: current.name })}
            disabled={!current}
          >
            {t("loader.load.flagProblem")}
          </Button>
          <Button size="xl" className="flex-1" disabled={left > 0} onClick={() => setReleasing(true)}>
            {left > 0 ? t("loader.load.releaseLeft", { n: left }) : t("loader.load.releaseVehicle")}
          </Button>
        </div>
      ) : (
        <div className="mt-5">
          <Button size="xl" variant="secondary" onClick={onReleased}>{t("loader.load.backToDepartures")}</Button>
        </div>
      )}

      <FlagSheet
        open={!!flagLine}
        d={d}
        initial={flagLine}
        onClose={() => setFlagLine(null)}
        onSent={async () => {
          setFlagLine(null);
          toast(t("loader.load.flagSent"), "warn");
          await reload();
        }}
      />
      <ReleaseSheet
        open={releasing}
        d={d}
        onClose={() => setReleasing(false)}
        onDone={async () => {
          setReleasing(false);
          toast(t("loader.load.releasedToast", { v: d.trip.vehicle_id, who: d.trip.driver ?? t("loader.load.theDriver") }));
          await reload();
        }}
      />
    </div>
  );
}

function LineRow({ l, disabled, onToggle, onFlag }: { l: Line; disabled: boolean; onToggle: () => void; onFlag: () => void }) {
  const { t } = useT();
  const flagged = !!l.flag_status;
  return (
    <li className="flex min-h-[60px] items-center gap-3 py-2">
      <button
        onClick={onToggle}
        disabled={disabled || flagged}
        aria-pressed={l.loaded}
        aria-label={t("loader.load.lineLabel", { g: l.group, n: l.planned, unit: l.unit, state: l.loaded ? t("loader.load.stateLoaded") : t("loader.load.stateNot") })}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border-2 ${l.loaded ? (flagged ? "border-warn bg-warn-bg text-warn" : "border-ok bg-ok-bg text-ok") : "border-faint"}`}
      >
        {l.loaded ? (flagged ? <Icon.Alert /> : <Icon.Check />) : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold">{l.group}</div>
        <div className="text-[14px] text-muted">
          {flagged ? (
            <span className="text-warn">{t("loader.load.foundOf", { f: l.found ?? 0, n: l.planned, unit: l.unit, reason: t(reasonKey(l.flag ?? "not_in_stock")) })}</span>
          ) : (
            <span className="font-data text-[13px]">{t("loader.load.units", { n: l.planned, unit: l.unit })}</span>
          )}
        </div>
      </div>
      <TempPill temp={l.temp} />
      {!flagged && !disabled ? (
        <button onClick={onFlag} className="h-9 rounded-[8px] px-2 text-[13px] font-semibold text-muted underline" aria-label={t("loader.load.flagLabel", { g: l.group })}>
          {t("loader.load.flag")}
        </button>
      ) : null}
    </li>
  );
}

function PlanChanged({ d, onShow }: { d: TripDetail; onShow: () => void }) {
  const { t } = useT();
  const c = d.change!;
  const time = new Date(c.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });
  return (
    <div className="rise">
      <Pill tone="warn">{t("loader.changed.tag", { t: time })}</Pill>
      <h2 className="mt-2 font-display text-[28px] font-medium leading-tight tracking-[-0.8px]">{t("loader.changed.title", { v: d.trip.vehicle_id })}</h2>
      <p className="mt-2 text-[14px] text-muted">{t("loader.changed.body", { note: c.note })}</p>
      {c.add.length ? (
        <div className="mt-5">
          <Eyebrow className="text-ok">{t("loader.changed.add")}</Eyebrow>
          <ul className="mt-1 space-y-2">
            {c.add.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
                <div className="flex-1">
                  <div className="font-semibold">{t("loader.changed.item", { stop: a.stop, g: a.group, n: a.qty, unit: a.unit })}</div>
                </div>
                <TempPill temp={a.temp} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {c.remove.length ? (
        <div className="mt-5">
          <Eyebrow className="text-bad">{t("loader.changed.remove")}</Eyebrow>
          <ul className="mt-1 space-y-2">
            {c.remove.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
                <div className="flex-1">
                  <div className="font-semibold">{t("loader.changed.item", { stop: a.stop, g: a.group, n: a.qty, unit: a.unit })}</div>
                  <div className="text-[13px] text-muted">{a.was_loaded ? t("loader.changed.loadedAlready") : t("loader.changed.notLoaded")}</div>
                </div>
                <TempPill temp={a.temp} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-4 text-[13px] text-muted">{t("loader.changed.recheck", { kg: d.vehicle.weight_cap_kg.toLocaleString(), m3: d.vehicle.volume_cap_m3 })}</p>
      <Button size="xl" block className="mt-5" onClick={onShow}>{t("loader.changed.show")}</Button>
    </div>
  );
}

function FlagSheet({ open, d, initial, onClose, onSent }: { open: boolean; d: TripDetail; initial: { line: Line; stop: string } | null; onClose: () => void; onSent: () => void }) {
  const { t } = useT();
  const all = d.stops.flatMap((s) => s.lines.map((l) => ({ l, stop: s.name })));
  const [lineId, setLineId] = useState<number | null>(null);
  const [found, setFound] = useState(0);
  const [reason, setReason] = useState("not_in_stock");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && initial) {
      setLineId(initial.line.id);
      setFound(Math.max(0, initial.line.planned - 1));
      setReason("not_in_stock");
      setPhoto(null);
      setError(null);
    }
  }, [open, initial]);

  const sel = all.find((x) => x.l.id === lineId) ?? null;
  async function send() {
    if (!sel) return;
    setBusy(true);
    setError(null);
    try {
      await post(`/loader/lines/${sel.l.id}/flag`, { found, reason, photo });
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loader.flag.failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={open} onClose={onClose} side={typeof window !== "undefined" && window.innerWidth >= 1024} title={t("loader.flag.title")}>
      {sel ? (
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <Lead mono>{t("loader.flag.eyebrow", { v: d.trip.vehicle_id, stop: sel.stop, temp: sel.l.temp === "chilled" ? t("common.chilled").toLowerCase() : t("common.ambient").toLowerCase() })}</Lead>
              <div className="font-display text-[34px] font-medium leading-tight tracking-[-0.8px]">{sel.l.group}</div>
            </div>
            <button onClick={onClose} aria-label={t("common.close")} className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral"><Icon.Close /></button>
          </div>
          <select value={lineId ?? ""} onChange={(e) => { const id = Number(e.target.value); setLineId(id); const x = all.find((y) => y.l.id === id); if (x) setFound(Math.max(0, x.l.planned - 1)); }} className="mt-3 h-10 w-full rounded-[8px] border border-line bg-surface px-2 text-[14px]" aria-label={t("loader.flag.which")}>
            {all.map(({ l, stop }) => (
              <option key={l.id} value={l.id}>{t("loader.flag.option", { stop, g: l.group, n: l.planned, unit: l.unit })}</option>
            ))}
          </select>
          <Eyebrow className="mt-5">{t("loader.flag.howMany")}</Eyebrow>
          <div className="mt-2 flex items-center gap-4">
            <button onClick={() => setFound((f) => Math.max(0, f - 1))} className="grid h-14 w-14 place-items-center rounded-[12px] border border-line" aria-label={t("loader.flag.fewer")}><Icon.Minus /></button>
            <div className="min-w-16 text-center">
              <div className="font-display text-[44px] leading-none tabular">{found}</div>
              <div className="font-data text-[12px] text-muted">{t("loader.flag.planned", { n: sel.l.planned })}</div>
            </div>
            <button onClick={() => setFound((f) => Math.min(sel.l.planned, f + 1))} className="grid h-14 w-14 place-items-center rounded-[12px] border border-line" aria-label={t("loader.flag.more")}><Icon.Plus /></button>
          </div>
          <Eyebrow className="mt-5">{t("loader.flag.what")}</Eyebrow>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REASONS.map((code) => (
              <button key={code} onClick={() => setReason(code)} aria-pressed={reason === code} className={`h-14 rounded-[12px] border text-[15px] font-semibold ${reason === code ? "border-ink bg-neutral" : "border-line"}`}>
                {t(reasonKey(code))}
              </button>
            ))}
          </div>
          <div className="mt-4"><PhotoButton value={photo} onChange={setPhoto} label={t("loader.flag.photo")} /></div>
          <div className="mt-5 rounded-[12px] bg-neutral p-3 text-[13px]">
            <Eyebrow>{t("loader.flag.told")}</Eyebrow>
            <div className="mt-1"><b>{t("loader.flag.ruwan")}</b>{t("loader.flag.ruwanSub")}</div>
            <div><b>{t("loader.flag.store", { stop: sel.stop })}</b>{t("loader.flag.storeSub", { f: found, n: sel.l.planned })}</div>
          </div>
          <ErrorNote error={error} />
          <Button size="xl" block className="mt-4" busy={busy} disabled={found >= sel.l.planned && reason !== "damaged"} onClick={send}>{t("loader.flag.send")}</Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function ReleaseSheet({ open, d, onClose, onDone }: { open: boolean; d: TripDetail; onClose: () => void; onDone: () => void }) {
  const { t } = useT();
  const [temp, setTemp] = useState("3");
  const [zones, setZones] = useState(true);
  const [seal, setSeal] = useState("KD-44817");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flagged = d.flags;
  async function go() {
    setBusy(true);
    setError(null);
    try {
      await post(`/loader/trips/${d.trip.trip_id}/release`, { reefer_temp: d.has_chilled ? Number(temp) : null, zones_ok: zones, seal_no: seal });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loader.rel.failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title={t("loader.rel.title")}>
      <div className="p-6">
        <Eyebrow>{t("loader.rel.ready")}</Eyebrow>
        <div className="font-display text-[34px] font-medium leading-tight tracking-[-0.8px]">{t("loader.rel.loaded", { v: d.trip.vehicle_id })}</div>
        <p className="font-data text-[13px] text-muted">{t("loader.rel.summary", { a: d.loaded, b: d.total, n: d.trip.stops, t: d.trip.depart ?? "" })}</p>
        {flagged.length ? (
          <div className="mt-4 rounded-[12px] bg-warn-bg p-3 text-[14px] text-warn">
            <Eyebrow className="!text-warn">{t("loader.rel.flags", { n: flagged.length })}</Eyebrow>
            {flagged.map((f) => (
              <div key={f.id}>{t("loader.rel.flagLine", { g: f.group, f: f.found, n: f.planned, stop: f.stop, answer: f.status === "answered" ? (f.answer === "top_up" ? t("loader.load.answerTopUp") : t("loader.load.answerAsIs")) : t("loader.rel.noAnswer") })}</div>
            ))}
          </div>
        ) : null}
        <Eyebrow className="mt-5">{t("loader.rel.before")}</Eyebrow>
        <div className="mt-2 space-y-3">
          {d.has_chilled ? (
            <label className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-4 py-3">
              <span className="font-semibold">{t("loader.rel.reefer")}</span>
              <span className="flex items-center gap-2"><input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} className="font-data h-10 w-20 rounded-[8px] border border-line bg-surface px-2 text-right" /> °C</span>
            </label>
          ) : null}
          {d.has_chilled && d.has_ambient ? (
            <button onClick={() => setZones((z) => !z)} aria-pressed={zones} className="flex w-full items-center justify-between rounded-[12px] border border-line px-4 py-3 text-left">
              <span className="font-semibold">{t("loader.rel.zones")} <span className="block text-[13px] font-normal text-muted">{t("loader.rel.zonesSub")}</span></span>
              <span className={`grid h-7 w-7 place-items-center rounded-full ${zones ? "bg-ok-bg text-ok" : "bg-neutral text-muted"}`}>{zones ? <Icon.Check size={16} /> : null}</span>
            </button>
          ) : null}
          <label className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-4 py-3">
            <span className="font-semibold">{t("loader.rel.sealed")}</span>
            <input value={seal} onChange={(e) => setSeal(e.target.value)} className="font-data h-10 w-36 rounded-[8px] border border-line bg-surface px-2 text-right" aria-label={t("loader.rel.seal")} />
          </label>
        </div>
        <div className="mt-4 rounded-[12px] bg-neutral p-3 text-[13px]">
          {t("loader.rel.confirm", { who: d.trip.driver ?? t("loader.load.theDriver") })}
        </div>
        <ErrorNote error={error} />
        <Button size="xl" block className="mt-4" busy={busy} onClick={go}>{t("loader.rel.go", { v: d.trip.vehicle_id })}</Button>
      </div>
    </Sheet>
  );
}
