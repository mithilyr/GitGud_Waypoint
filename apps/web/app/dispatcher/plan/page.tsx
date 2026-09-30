"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, Button, Card, Eyebrow, ErrorNote, Headline, Icon, Pill, Sheet, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate, kg, m3 } from "@/lib/format";
import { useAction, usePoll } from "@/lib/hooks";
import { useDispatch } from "../layout";

type Warning = { rule: string; severity: "red" | "amber"; text: string };
type StopDetail = { order_id: string; outlet: string; temp: string; weight_kg: number; volume_m3: number; eta: string | null; seq: number; second_skip: boolean };
type TripRow = {
  trip_id: number;
  trip_no: number;
  brand: string;
  district: string;
  stops: number;
  chilled: boolean;
  volume_m3: number;
  weight_kg: number;
  minutes: number;
  depart: string | null;
  status: string;
  stops_detail: StopDetail[];
};
type VehicleRow = {
  vehicle_id: string;
  kind: string;
  type: string;
  temp: string;
  weight_cap_kg: number;
  volume_cap_m3: number;
  available: boolean;
  workshop_note: string | null;
  trips: TripRow[];
  volume_pct: number;
  weight_pct: number;
  volume_m3: number;
  weight_kg: number;
  fuel_left_pct: number;
  warnings: Warning[];
};
type Deferred = {
  order_id: string;
  outlet: string;
  brand: string;
  temp: string;
  weight_kg: number;
  volume_m3: number;
  reason: string;
  reason_label: string;
  note: string | null;
  source: string;
  deferred_to: string | null;
  second_skip: boolean;
};
type Board = {
  plan: { id: number; depot: string; service_date: string; status: string; version: number } | null;
  summary: { vehicles_total: number; vehicles_available: number; vehicles_assigned: number; unassigned: number; blocking: number; caution: number; orders_served: number; orders_deferred: number };
  vehicles: VehicleRow[];
  deferred: Deferred[];
};

const REASONS = [
  ["capacity_volume", "Capacity (volume)"],
  ["capacity_weight", "Capacity (weight)"],
  ["no_reefer", "No reefer"],
  ["no_van", "No van"],
  ["time_budget", "Time budget"],
  ["fuel_quota", "Fuel quota"],
  ["manual", "Manual"],
] as const;

export default function PlanPage() {
  const { depot, date } = useDispatch();
  const router = useRouter();
  const { data, error, loading, reload, setData } = usePoll(() => get<Board>(`/dispatch/plan?depot=${depot}&date=${date}`), 0, [depot, date]);
  const [open, setOpen] = useState<VehicleRow | null>(null);
  const [deferring, setDeferring] = useState<{ order: StopDetail | Deferred; trip?: TripRow } | null>(null);

  const build = useAction(async () => setData(await post<Board>("/dispatch/plan", { depot, date })));
  const release = useAction(async (id: number) => {
    const b = await post<Board>(`/dispatch/plan/${id}/release`);
    setData(b);
    toast("Plan released. Load lists are on the dock tablet and runs are on the drivers' phones.");
    router.push("/dispatcher/live");
  });

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  if (!data.plan) {
    return (
      <div className="rise max-w-[640px] py-10">
        <Eyebrow>
          Plan · {fmtDate(date)} · {depot} depot
        </Eyebrow>
        <Headline className="mt-1">No plan yet.</Headline>
        <p className="mt-2 text-muted">The engine assigns every queued order to a vehicle and trip, or defers it with a reason. You review and release.</p>
        <ErrorNote error={build.error} />
        <Button size="lg" className="mt-5" busy={build.busy} onClick={() => build.run()}>
          Build the plan →
        </Button>
      </div>
    );
  }

  const { plan, summary, vehicles, deferred } = data;
  const released = plan.status === "released";
  const ready = summary.blocking === 0;
  const apply = (b: Board) => setData(b);

  return (
    <div className="rise">
      <Eyebrow>
        Plan · {fmtDate(plan.service_date)} · {plan.depot} depot {released ? `· released, v${plan.version}` : ""}
      </Eyebrow>
      <Headline className="mt-1">
        {released ? "Plan released." : ready ? "Plan ready to release." : `${summary.vehicles_assigned} of ${summary.vehicles_available} vehicles assigned.`}
      </Headline>
      <p className="mt-2 max-w-[760px] text-[15px] text-muted">
        {released
          ? "Any change now reaches the loader and driver as a clear notice with what to add and take off."
          : ready
            ? `No blocking warnings${summary.orders_deferred ? `. ${summary.orders_deferred} orders are deferred with a reason each` : ""}. Releasing sends load lists to the ${plan.depot} dock and runs to drivers.`
            : `${summary.unassigned} unassigned, ${summary.blocking} rule warning${summary.blocking === 1 ? "" : "s"}. Fix ${summary.blocking === 1 ? "it" : "both"} before you release the plan.`}
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="max-h-[58dvh] overflow-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-line">
                {["Vehicle", "Trip 1", "Trip 2", "Volume", "Weight", "Fuel left (wk)", "Warning"].map((h) => (
                  <th key={h} className="eyebrow px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <VehicleTr key={v.vehicle_id} v={v} onOpen={() => setOpen(v)} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {deferred.length ? (
        <section className="mt-8">
          <Eyebrow>Deferred · {deferred.length} orders</Eyebrow>
          <Card className="mt-2 divide-y divide-line">
            {deferred.map((d) => (
              <div key={d.order_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-[160px]">
                  <div className="font-semibold">{d.outlet}</div>
                  <div className="font-data text-muted">{d.order_id}</div>
                </div>
                <div className="font-data tabular text-[13px] text-muted">
                  {kg(d.weight_kg)} · {m3(d.volume_m3)}
                </div>
                {d.temp === "chilled" ? <Pill tone="info">Chilled</Pill> : null}
                <Pill tone="warn">{d.reason_label}</Pill>
                {d.second_skip ? <Pill tone="bad">2nd skip in a row</Pill> : null}
                <span className="text-[13px] text-muted">
                  {d.source === "dispatcher" ? "You" : "Engine"} · to {fmtDate(d.deferred_to)}
                  {d.note ? ` · “${d.note}”` : ""}
                </span>
                <AssignMenu vehicles={vehicles} onPick={async (vid) => {
                  try {
                    apply(await post<Board>(`/dispatch/plan/${plan.id}/move`, { order_id: d.order_id, vehicle_id: vid }));
                    toast(`${d.outlet} planned on ${vid}. Check the warnings.`, "info");
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Could not move", "bad");
                  }
                }} />
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-[14px] text-muted">
          {released
            ? "Released. Edits above notify the dock and the driver."
            : ready
              ? "No warnings. Releasing sends load lists to the dock and runs to drivers."
              : `${summary.blocking} warning${summary.blocking === 1 ? "" : "s"} block release. Open a row to reassign or defer.`}
        </p>
        <ErrorNote error={release.error} />
        <div className="ml-auto flex gap-2">
          {!released ? (
            <Button variant="secondary" size="lg" busy={build.busy} onClick={() => build.run()}>
              Rebuild
            </Button>
          ) : null}
          {released ? (
            <Button size="lg" onClick={() => router.push("/dispatcher/live")}>
              Open live runs →
            </Button>
          ) : (
            <Button size="lg" disabled={!ready} busy={release.busy} onClick={() => release.run(plan.id)}>
              {ready ? "Release plan →" : "Fix warnings to release"}
            </Button>
          )}
        </div>
      </div>

      <VehicleSheet
        v={open ? vehicles.find((x) => x.vehicle_id === open.vehicle_id) ?? null : null}
        vehicles={vehicles}
        planId={plan.id}
        onClose={() => setOpen(null)}
        onChange={apply}
        onDefer={(order, trip) => setDeferring({ order, trip })}
      />
      <DeferSheet
        target={deferring}
        planId={plan.id}
        nextDate={deferred[0]?.deferred_to ?? null}
        onClose={() => setDeferring(null)}
        onDone={(b) => {
          apply(b);
          setDeferring(null);
          setOpen(null);
        }}
      />
    </div>
  );
}

function VehicleTr({ v, onOpen }: { v: VehicleRow; onOpen: () => void }) {
  const [t1, t2] = [v.trips[0], v.trips[1]];
  const cell = (t?: TripRow) =>
    t ? (
      <div>
        <div className="text-[14px] font-semibold">
          {t.brand} · {t.district} · {t.stops} stop{t.stops === 1 ? "" : "s"}
        </div>
        {t.chilled ? <span className="text-[12px] text-info">chilled</span> : null}
      </div>
    ) : (
      <span className="text-faint">—</span>
    );
  return (
    <tr onClick={v.available || v.trips.length ? onOpen : undefined} className={`hoverable h-[60px] cursor-pointer border-b border-line last:border-0 hover:bg-neutral/60 ${!v.available ? "opacity-60" : ""}`}>
      <td className="px-4">
        <div className="font-data font-semibold">{v.vehicle_id}</div>
        <div className="text-[12px] text-muted">{v.kind}</div>
      </td>
      <td className="px-4">{v.available ? cell(t1) : <Pill tone="neutral">Workshop</Pill>}</td>
      <td className="px-4">{cell(t2)}</td>
      <td className="w-[170px] whitespace-nowrap px-4">
        {v.trips.length ? (
          <>
            <div className="font-data tabular text-[12px]">
              {v.volume_m3.toFixed(1)}/{v.volume_cap_m3} m³ · {v.volume_pct}%
            </div>
            <Bar pct={v.volume_pct} />
          </>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="w-[130px] px-4">
        {v.trips.length ? (
          <>
            <div className="font-data tabular text-[12px]">{v.weight_pct}%</div>
            <Bar pct={v.weight_pct} />
          </>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="font-data tabular px-4">{v.fuel_left_pct}%</td>
      <td className="px-4">
        <div className="flex flex-wrap gap-1">
          {!v.available ? <span className="text-[12px] text-muted">{v.workshop_note}</span> : null}
          {v.warnings.map((w, i) => (
            <Pill key={i} tone={w.severity === "red" ? "bad" : "warn"}>
              {w.text}
            </Pill>
          ))}
          {v.available && !v.trips.length ? <span className="text-[12px] text-muted">Not assigned</span> : null}
        </div>
      </td>
    </tr>
  );
}

function AssignMenu({ vehicles, onPick }: { vehicles: VehicleRow[]; onPick: (vehicleId: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2">
      <select value={v} onChange={(e) => setV(e.target.value)} className="h-9 rounded-[8px] border border-line bg-surface px-2 text-[13px]" aria-label="Assign to vehicle">
        <option value="">Plan it on…</option>
        {vehicles
          .filter((x) => x.available)
          .map((x) => (
            <option key={x.vehicle_id} value={x.vehicle_id}>
              {x.vehicle_id} · {x.kind} · {x.volume_pct}% full
            </option>
          ))}
      </select>
      <Button size="sm" variant="secondary" disabled={!v} onClick={() => v && onPick(v)}>
        Assign
      </Button>
    </div>
  );
}

function VehicleSheet({
  v,
  vehicles,
  planId,
  onClose,
  onChange,
  onDefer,
}: {
  v: VehicleRow | null;
  vehicles: VehicleRow[];
  planId: number;
  onClose: () => void;
  onChange: (b: Board) => void;
  onDefer: (o: StopDetail, t: TripRow) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  async function move(orderId: string, vehicleId: string) {
    setBusy(orderId);
    try {
      onChange(await post<Board>(`/dispatch/plan/${planId}/move`, { order_id: orderId, vehicle_id: vehicleId }));
      toast(`Moved to ${vehicleId}. Warnings updated.`, "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not move", "bad");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Sheet open={!!v} onClose={onClose} side title="Vehicle">
      {v ? (
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <Eyebrow>{v.kind}</Eyebrow>
              <div className="font-display text-[28px] font-medium">{v.vehicle_id}</div>
              <div className="font-data text-muted">
                {v.volume_cap_m3} m³ · {kg(v.weight_cap_kg)}
              </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral">
              <Icon.Close />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {v.warnings.map((w, i) => (
              <Pill key={i} tone={w.severity === "red" ? "bad" : "warn"}>
                {w.text}
              </Pill>
            ))}
          </div>
          {v.trips.map((t) => (
            <div key={t.trip_id} className="mt-6">
              <Eyebrow>
                Trip {t.trip_no} · {t.brand} · {t.district} · leaves {t.depart ?? "?"} · {t.minutes} min
              </Eyebrow>
              <div className="mt-2 divide-y divide-line rounded-[10px] border border-line">
                {t.stops_detail
                  .slice()
                  .sort((a, b) => a.seq - b.seq)
                  .map((s) => (
                    <div key={s.order_id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                      <span className="font-data w-5 text-muted">{s.seq}</span>
                      <div className="min-w-[120px] flex-1">
                        <div className="font-semibold">{s.outlet}</div>
                        <div className="font-data text-[12px] text-muted">
                          {s.order_id} · {kg(s.weight_kg)} · {m3(s.volume_m3)} · ETA {s.eta}
                        </div>
                      </div>
                      {s.temp === "chilled" ? <Pill tone="info">Chilled</Pill> : null}
                      {s.second_skip ? <Pill tone="bad">Skipped last run</Pill> : null}
                      <select
                        defaultValue=""
                        disabled={busy === s.order_id}
                        onChange={(e) => e.target.value && move(s.order_id, e.target.value)}
                        className="h-8 max-w-[150px] rounded-[6px] border border-line bg-surface px-1.5 text-[12px]"
                        aria-label={`Move ${s.outlet}`}
                      >
                        <option value="">Move to…</option>
                        {vehicles
                          .filter((x) => x.available && x.vehicle_id !== v.vehicle_id)
                          .map((x) => (
                            <option key={x.vehicle_id} value={x.vehicle_id}>
                              {x.vehicle_id} · {x.kind}
                            </option>
                          ))}
                      </select>
                      <Button size="sm" variant="danger" onClick={() => onDefer(s, t)}>
                        Defer
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {!v.trips.length ? <p className="mt-6 text-muted">Nothing is assigned to this vehicle.</p> : null}
        </div>
      ) : null}
    </Sheet>
  );
}

function DeferSheet({
  target,
  planId,
  nextDate,
  onClose,
  onDone,
}: {
  target: { order: StopDetail | Deferred; trip?: TripRow } | null;
  planId: number;
  nextDate: string | null;
  onClose: () => void;
  onDone: (b: Board) => void;
}) {
  const [reason, setReason] = useState<string>("capacity_volume");
  const [note, setNote] = useState("");
  const a = useAction(async () => {
    if (!target) return;
    const b = await post<Board>(`/dispatch/plan/${planId}/defer`, { order_id: target.order.order_id, reason, note: note || null });
    toast("Deferred. The store has been told the reason and the new date.");
    setNote("");
    onDone(b);
  });
  const o = target?.order;
  const skipped = o && "second_skip" in o ? o.second_skip : false;
  return (
    <Sheet open={!!target} onClose={onClose} title="Defer order">
      {o ? (
        <div className="p-6">
          <Eyebrow>Defer order · {o.order_id}</Eyebrow>
          <div className="mt-1 font-display text-[26px] font-medium">
            {o.outlet} <span className="text-muted">· {o.temp === "chilled" ? "chilled" : "dry"}</span>
          </div>
          <div className="font-data mt-1 text-muted">
            {kg(o.weight_kg)} · {m3(o.volume_m3)}
          </div>
          {skipped ? (
            <div className="mt-4 rounded-[10px] bg-bad-bg px-3 py-2.5 text-[14px] text-bad" role="alert">
              <b>Already skipped on the last run.</b> Deferring again makes it the 2nd skip in a row. The store is told either way.
            </div>
          ) : null}
          <div className="eyebrow mt-5">Reason</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REASONS.map(([code, label]) => (
              <button
                key={code}
                onClick={() => setReason(code)}
                className={`h-11 rounded-[8px] border text-[14px] font-semibold ${reason === code ? "border-ink bg-neutral" : "border-line"}`}
                aria-pressed={reason === code}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="mt-5 block">
            <span className="eyebrow">Note (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. Borrowed VEH057's slot for Peradeniya instead"
              className="mt-1 w-full rounded-[8px] border border-line bg-surface p-3 outline-none focus:border-ink"
            />
          </label>
          <ErrorNote error={a.error} />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button busy={a.busy} onClick={() => a.run()}>
              Defer to {nextDate ? fmtDate(nextDate) : "the next run"}
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
