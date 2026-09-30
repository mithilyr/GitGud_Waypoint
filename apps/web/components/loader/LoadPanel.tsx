"use client";

import { useEffect, useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { Bar, Button, Card, ErrorNote, Eyebrow, Icon, Pill, Sheet, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { usePoll } from "@/lib/hooks";

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

const REASONS: [string, string][] = [
  ["not_in_stock", "Not in stock"],
  ["damaged", "Damaged"],
  ["wrong_item", "Wrong item"],
  ["wont_fit", "Won't fit"],
];

const REASON_TEXT: Record<string, string> = { not_in_stock: "not in stock", damaged: "damaged", wrong_item: "wrong item", wont_fit: "won't fit" };

export function TempPill({ temp }: { temp: string }) {
  return <Pill tone={temp === "chilled" ? "info" : "neutral"}>{temp === "chilled" ? "Chilled" : "Ambient"}</Pill>;
}

export function LoadPanel({ tripId, onReleased }: { tripId: number; onReleased?: () => void }) {
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
      toast(e instanceof Error ? e.message : "Could not update", "bad");
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
      toast(e instanceof Error ? e.message : "Could not update", "bad");
    }
  }

  if (d.change) {
    return <PlanChanged d={d} onShow={async () => { await post(`/loader/trips/${tripId}/ack-change`); await reload(); }} />;
  }

  return (
    <div className="rise">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Eyebrow>
            {d.trip.vehicle_id} · Trip {d.trip.trip_no} {d.trip.brand} · leaves {d.trip.depart}
            {d.trip.driver ? ` · Driver ${d.trip.driver}` : ""}
          </Eyebrow>
          <div className="mt-1 font-display text-[30px] font-medium leading-tight tabular">
            {d.loaded} of {d.total} <span className="text-muted">loaded</span>
          </div>
        </div>
        <div className="grid w-full max-w-[300px] gap-2 text-[12px] text-muted">
          <div>
            <div className="font-data flex justify-between"><span>Weight</span><span>{d.weight_kg.toLocaleString()} / {d.vehicle.weight_cap_kg.toLocaleString()} kg</span></div>
            <Bar pct={kgPct} />
          </div>
          <div>
            <div className="font-data flex justify-between"><span>Volume</span><span>{d.volume_m3} / {d.vehicle.volume_cap_m3} m³</span></div>
            <Bar pct={volPct} />
          </div>
        </div>
      </div>

      {d.released ? (
        <Card className="mt-5 border-ok/40 bg-ok-bg p-4 text-ok">
          <div className="flex items-center gap-2 font-semibold"><Icon.Check /> Released by {d.released_by?.split(" ")[0]} · seal {d.seal_no}{d.reefer_temp != null ? ` · reefer ${d.reefer_temp} °C` : ""}</div>
          <p className="mt-1 text-[14px]">The driver sees &ldquo;Load released&rdquo; and Ruwan sees the departure.</p>
        </Card>
      ) : (
        <p className="mt-4 text-[13px] text-muted">Last stop goes in first, so the driver unloads in order.</p>
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
                    <span className="text-muted">{flagged ? s.lines.map((l) => (l.flag_status ? `${l.group} ${l.found} of ${l.planned}` : "")).filter(Boolean).join(", ") : `all ${s.lines.reduce((n, l) => n + l.planned, 0)}`}</span>
                    {flagged ? <Pill tone="warn" className="ml-auto">Flagged</Pill> : <Icon.Chevron className="ml-auto text-faint transition-transform group-open:rotate-90" />}
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
                  <Eyebrow className="!text-ink">Load now · {s.ordinal} · {s.name}</Eyebrow>
                  {!d.released ? (
                    <button onClick={() => loadAll(s.stop_id)} className="text-[13px] font-semibold underline">
                      Load all
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
          Then {later.map((s) => s.name).join(" and ")}, nearest the door.
        </p>
      ) : null}

      {d.flags.length ? (
        <div className="mt-5">
          <Eyebrow>Flags on this load</Eyebrow>
          <div className="mt-2 space-y-2">
            {d.flags.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-warn-bg px-3 py-2 text-[14px] text-warn">
                <b>{f.stop}</b> · {f.group} {f.found} of {f.planned} · {REASON_TEXT[f.reason]}
                <span className="ml-auto font-semibold">{f.status === "answered" ? (f.answer === "top_up" ? "Ruwan: top up" : "Ruwan: send as is") : "Waiting for Ruwan"}</span>
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
            Flag problem
          </Button>
          <Button size="lg" className="flex-1" disabled={left > 0} onClick={() => setReleasing(true)}>
            {left > 0 ? `Release · ${left} left` : "Release vehicle"}
          </Button>
        </div>
      ) : (
        <div className="mt-5">
          <Button size="lg" variant="secondary" onClick={onReleased}>Back to departures</Button>
        </div>
      )}

      <FlagSheet
        open={!!flagLine}
        d={d}
        initial={flagLine}
        onClose={() => setFlagLine(null)}
        onSent={async () => {
          setFlagLine(null);
          toast("Flag sent. Ruwan and the store know before the truck leaves.", "warn");
          await reload();
        }}
      />
      <ReleaseSheet
        open={releasing}
        d={d}
        onClose={() => setReleasing(false)}
        onDone={async () => {
          setReleasing(false);
          toast(`${d.trip.vehicle_id} released. ${d.trip.driver ?? "The driver"} sees “Load released”.`);
          await reload();
        }}
      />
    </div>
  );
}

function LineRow({ l, disabled, onToggle, onFlag }: { l: Line; disabled: boolean; onToggle: () => void; onFlag: () => void }) {
  const flagged = !!l.flag_status;
  return (
    <li className="flex min-h-[60px] items-center gap-3 py-2">
      <button
        onClick={onToggle}
        disabled={disabled || flagged}
        aria-pressed={l.loaded}
        aria-label={`${l.group}, ${l.planned} ${l.unit}s, ${l.loaded ? "loaded" : "not loaded"}`}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border-2 ${l.loaded ? (flagged ? "border-warn bg-warn-bg text-warn" : "border-ok bg-ok-bg text-ok") : "border-faint"}`}
      >
        {l.loaded ? (flagged ? <Icon.Alert /> : <Icon.Check />) : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-semibold">{l.group}</div>
        <div className="text-[14px] text-muted">
          {flagged ? (
            <span className="text-warn">{l.found} of {l.planned} {l.unit}s · {REASON_TEXT[l.flag ?? ""]}</span>
          ) : (
            <>{l.planned} {l.unit}{l.planned === 1 ? "" : "s"}</>
          )}
        </div>
      </div>
      <TempPill temp={l.temp} />
      {!flagged && !disabled ? (
        <button onClick={onFlag} className="h-9 rounded-[8px] px-2 text-[13px] font-semibold text-muted underline" aria-label={`Flag ${l.group}`}>
          Flag
        </button>
      ) : null}
    </li>
  );
}

function PlanChanged({ d, onShow }: { d: TripDetail; onShow: () => void }) {
  const c = d.change!;
  const time = new Date(c.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" });
  return (
    <div className="rise">
      <Pill tone="warn">Plan changed · {time}</Pill>
      <h2 className="mt-2 font-display text-[30px] font-medium leading-tight">{d.trip.vehicle_id}&rsquo;s list changed while you were loading.</h2>
      <p className="mt-1 text-muted">{c.note}. The old list is locked, so no one loads from it by mistake.</p>
      {c.add.length ? (
        <div className="mt-5">
          <div className="eyebrow text-ok">Add</div>
          <ul className="mt-1 space-y-2">
            {c.add.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
                <div className="flex-1">
                  <div className="font-semibold">{a.stop} · {a.group} {a.qty} {a.unit}s</div>
                </div>
                <TempPill temp={a.temp} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {c.remove.length ? (
        <div className="mt-5">
          <div className="eyebrow text-bad">Take off</div>
          <ul className="mt-1 space-y-2">
            {c.remove.map((a, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
                <div className="flex-1">
                  <div className="font-semibold">{a.stop} · {a.group} {a.qty} {a.unit}s</div>
                  <div className="text-[13px] text-muted">{a.was_loaded ? "Already loaded · unload it" : "Not loaded yet"}</div>
                </div>
                <TempPill temp={a.temp} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <p className="mt-4 text-[13px] text-muted">Weight and volume are re-checked against {d.vehicle.weight_cap_kg.toLocaleString()} kg and {d.vehicle.volume_cap_m3} m³ on the new list.</p>
      <Button size="lg" block className="mt-5" onClick={onShow}>Show updated list</Button>
    </div>
  );
}

function FlagSheet({ open, d, initial, onClose, onSent }: { open: boolean; d: TripDetail; initial: { line: Line; stop: string } | null; onClose: () => void; onSent: () => void }) {
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
      setError(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={open} onClose={onClose} side={typeof window !== "undefined" && window.innerWidth >= 1024} title="Flag shortfall or damage">
      {sel ? (
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>{d.trip.vehicle_id} · for {sel.stop} · {sel.l.temp}</Eyebrow>
              <div className="font-display text-[26px] font-medium">{sel.l.group}</div>
            </div>
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral"><Icon.Close /></button>
          </div>
          <select value={lineId ?? ""} onChange={(e) => { const id = Number(e.target.value); setLineId(id); const x = all.find((y) => y.l.id === id); if (x) setFound(Math.max(0, x.l.planned - 1)); }} className="mt-3 h-10 w-full rounded-[8px] border border-line bg-surface px-2 text-[14px]" aria-label="Which line">
            {all.map(({ l, stop }) => (
              <option key={l.id} value={l.id}>{stop} · {l.group} ({l.planned} {l.unit}s)</option>
            ))}
          </select>
          <div className="eyebrow mt-5">How many did you find?</div>
          <div className="mt-2 flex items-center gap-4">
            <button onClick={() => setFound((f) => Math.max(0, f - 1))} className="grid h-14 w-14 place-items-center rounded-[12px] border border-line" aria-label="One fewer"><Icon.Minus /></button>
            <div className="min-w-16 text-center">
              <div className="font-display text-[44px] leading-none tabular">{found}</div>
              <div className="text-[12px] text-muted">{sel.l.planned} planned</div>
            </div>
            <button onClick={() => setFound((f) => Math.min(sel.l.planned, f + 1))} className="grid h-14 w-14 place-items-center rounded-[12px] border border-line" aria-label="One more"><Icon.Plus /></button>
          </div>
          <div className="eyebrow mt-5">What happened?</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REASONS.map(([code, label]) => (
              <button key={code} onClick={() => setReason(code)} aria-pressed={reason === code} className={`h-14 rounded-[12px] border text-[15px] font-semibold ${reason === code ? "border-ink bg-neutral" : "border-line"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4"><PhotoButton value={photo} onChange={setPhoto} label="Add photo (optional)" /></div>
          <div className="mt-5 rounded-[12px] bg-neutral p-3 text-[13px]">
            <div className="eyebrow">Told right away</div>
            <div className="mt-1"><b>Ruwan, dispatcher</b> · can top up from another vehicle or send as is</div>
            <div><b>{sel.stop} store</b> · sees {found} of {sel.l.planned} before the truck leaves</div>
          </div>
          <ErrorNote error={error} />
          <Button size="lg" block className="mt-4" busy={busy} disabled={found >= sel.l.planned && reason !== "damaged"} onClick={send}>Send flag</Button>
        </div>
      ) : null}
    </Sheet>
  );
}

function ReleaseSheet({ open, d, onClose, onDone }: { open: boolean; d: TripDetail; onClose: () => void; onDone: () => void }) {
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
      setError(e instanceof Error ? e.message : "Could not release");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={open} onClose={onClose} title="Release vehicle">
      <div className="p-6">
        <Eyebrow>Ready to release</Eyebrow>
        <div className="font-display text-[28px] font-medium leading-tight">{d.trip.vehicle_id} is loaded.</div>
        <p className="text-muted">{d.loaded} of {d.total} items · {d.trip.stops} stops in stop order · leaves {d.trip.depart}</p>
        {flagged.length ? (
          <div className="mt-4 rounded-[12px] bg-warn-bg p-3 text-[14px] text-warn">
            <div className="eyebrow !text-warn">{flagged.length} flag{flagged.length > 1 ? "s" : ""}</div>
            {flagged.map((f) => (
              <div key={f.id}>{f.group} {f.found} of {f.planned} · {f.stop} · {f.status === "answered" ? (f.answer === "top_up" ? "Ruwan: top up" : "Ruwan: send as is") : "no answer yet, will go as is"}</div>
            ))}
          </div>
        ) : null}
        <div className="eyebrow mt-5">Before the doors close</div>
        <div className="mt-2 space-y-3">
          {d.has_chilled ? (
            <label className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-4 py-3">
              <span className="font-semibold">Reefer temperature</span>
              <span className="flex items-center gap-2"><input inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} className="font-data h-10 w-20 rounded-[8px] border border-line bg-surface px-2 text-right" /> °C</span>
            </label>
          ) : null}
          {d.has_chilled && d.has_ambient ? (
            <button onClick={() => setZones((z) => !z)} aria-pressed={zones} className="flex w-full items-center justify-between rounded-[12px] border border-line px-4 py-3 text-left">
              <span className="font-semibold">Chilled and ambient apart <span className="block text-[13px] font-normal text-muted">Separate zones</span></span>
              <span className={`grid h-7 w-7 place-items-center rounded-full ${zones ? "bg-ok-bg text-ok" : "bg-neutral text-muted"}`}>{zones ? <Icon.Check size={16} /> : null}</span>
            </button>
          ) : null}
          <label className="flex items-center justify-between gap-3 rounded-[12px] border border-line px-4 py-3">
            <span className="font-semibold">Doors sealed</span>
            <input value={seal} onChange={(e) => setSeal(e.target.value)} className="font-data h-10 w-36 rounded-[8px] border border-line bg-surface px-2 text-right" aria-label="Seal number" />
          </label>
        </div>
        <div className="mt-4 rounded-[12px] bg-neutral p-3 text-[13px]">
          {d.trip.driver ?? "The driver"} confirms on the phone and sees &ldquo;Load released&rdquo; on the home screen. Ruwan sees the departure the moment you release.
        </div>
        <ErrorNote error={error} />
        <Button size="lg" block className="mt-4" busy={busy} onClick={go}>Release {d.trip.vehicle_id}</Button>
      </div>
    </Sheet>
  );
}
