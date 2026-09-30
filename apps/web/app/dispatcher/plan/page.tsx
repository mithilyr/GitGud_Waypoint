"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bar, Button, Card, ErrorNote, Headline, Icon, Pill, Sheet, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate, kg, m3 } from "@/lib/format";
import { useAction, usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";
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

const REASONS = ["capacity_volume", "capacity_weight", "no_reefer", "no_van", "time_budget", "fuel_quota", "manual"] as const;
const reasonKey = (code: string) => `disp.plan.reason.${code}` as Key;

export default function PlanPage() {
  const { t } = useT();
  const { depot, date } = useDispatch();
  const router = useRouter();
  const { data, error, loading, reload, setData } = usePoll(() => get<Board>(`/dispatch/plan?depot=${depot}&date=${date}`), 0, [depot, date]);
  const [open, setOpen] = useState<VehicleRow | null>(null);
  const [deferring, setDeferring] = useState<{ order: StopDetail | Deferred; trip?: TripRow } | null>(null);

  const build = useAction(async () => setData(await post<Board>("/dispatch/plan", { depot, date })));
  const release = useAction(async (id: number) => {
    const b = await post<Board>(`/dispatch/plan/${id}/release`);
    setData(b);
    toast(t("disp.plan.releasedToast"));
    router.push("/dispatcher/live");
  });

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  if (!data.plan) {
    return (
      <div className="rise max-w-[640px] py-10">
        <p className="text-[13px] font-medium text-muted">{t("disp.plan.eyebrow", { date: fmtDate(date), depot })}</p>
        <Headline className="mt-1">{t("disp.plan.none")}</Headline>
        <p className="mt-2 text-muted">{t("disp.plan.noneBody")}</p>
        <ErrorNote error={build.error} />
        <Button size="lg" className="mt-5" busy={build.busy} onClick={() => build.run()}>
          {t("disp.plan.buildNow")}
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
      <p className="text-[13px] font-medium text-muted">
        {released
          ? t("disp.plan.eyebrowReleased", { date: fmtDate(plan.service_date), depot: plan.depot, v: plan.version })
          : t("disp.plan.eyebrow", { date: fmtDate(plan.service_date), depot: plan.depot })}
      </p>
      <Headline className="mt-1">
        {released ? t("disp.plan.released") : ready ? t("disp.plan.ready") : t("disp.plan.assigned", { a: summary.vehicles_assigned, b: summary.vehicles_available })}
      </Headline>
      <p className="mt-2 max-w-[760px] text-[15px] text-muted">
        {released
          ? t("disp.plan.releasedBody")
          : ready
            ? summary.orders_deferred
              ? t("disp.plan.readyBodyDeferred", { n: summary.orders_deferred, depot: plan.depot })
              : t("disp.plan.readyBody", { depot: plan.depot })
            : t("disp.plan.blockBody", { u: summary.unassigned, b: summary.blocking })}
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="max-h-[58dvh] overflow-auto">
          <table className="w-full min-w-[1040px] text-left">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-line">
                {(["vehicle", "trip1", "trip2", "volume", "weight", "fuel", "warning"] as const).map((h) => (
                  <th key={h} className="eyebrow px-4 py-3 font-semibold">
                    {t(`disp.plan.col.${h}` as Key)}
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
          <div className="eyebrow">{t("disp.plan.deferredTitle", { n: deferred.length })}</div>
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
                {d.temp === "chilled" ? <Pill tone="info">{t("common.chilled")}</Pill> : null}
                <Pill tone="warn">{REASONS.includes(d.reason as (typeof REASONS)[number]) ? t(reasonKey(d.reason)) : d.reason_label}</Pill>
                {d.second_skip ? <Pill tone="bad">{t("disp.plan.secondSkip")}</Pill> : null}
                <span className="text-[13px] text-muted">
                  {t("disp.plan.toDate", { who: d.source === "dispatcher" ? t("disp.plan.you") : t("disp.plan.engine"), date: fmtDate(d.deferred_to) })}
                  {d.note ? ` · “${d.note}”` : ""}
                </span>
                <AssignMenu vehicles={vehicles} onPick={async (vid) => {
                  try {
                    apply(await post<Board>(`/dispatch/plan/${plan.id}/move`, { order_id: d.order_id, vehicle_id: vid }));
                    toast(t("disp.plan.planned", { outlet: d.outlet, v: vid }), "info");
                  } catch (e) {
                    toast(e instanceof Error ? e.message : t("disp.plan.couldNotMove"), "bad");
                  }
                }} />
              </div>
            ))}
          </Card>
        </section>
      ) : null}

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <p className="text-[14px] text-muted">
          {released ? t("disp.plan.footReleased") : ready ? t("disp.plan.footReady") : t("disp.plan.footBlock", { n: summary.blocking })}
        </p>
        <ErrorNote error={release.error} />
        <div className="ml-auto flex gap-2">
          {!released ? (
            <Button variant="secondary" size="lg" busy={build.busy} onClick={() => build.run()}>
              {t("disp.plan.rebuild")}
            </Button>
          ) : null}
          {released ? (
            <Button size="lg" onClick={() => router.push("/dispatcher/live")}>
              {t("disp.plan.openLive")}
            </Button>
          ) : (
            <Button size="lg" disabled={!ready} busy={release.busy} onClick={() => release.run(plan.id)}>
              {ready ? t("disp.plan.release") : t("disp.plan.fix")}
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
  const { t } = useT();
  const [t1, t2] = [v.trips[0], v.trips[1]];
  const cell = (tr?: TripRow) =>
    tr ? (
      <div>
        <div className="text-[14px] font-semibold">
          {t("disp.plan.tripCell", { brand: tr.brand, district: tr.district, n: tr.stops })}
        </div>
        {tr.chilled ? <span className="text-[12px] text-info">{t("disp.plan.chilledTag")}</span> : null}
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
      <td className="px-4">{v.available ? cell(t1) : <Pill tone="neutral">{t("disp.plan.workshop")}</Pill>}</td>
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
          {v.available && !v.trips.length ? <span className="text-[12px] text-muted">{t("disp.plan.notAssigned")}</span> : null}
        </div>
      </td>
    </tr>
  );
}

function AssignMenu({ vehicles, onPick }: { vehicles: VehicleRow[]; onPick: (vehicleId: string) => void }) {
  const { t } = useT();
  const [v, setV] = useState("");
  return (
    <div className="flex items-center gap-2">
      <select value={v} onChange={(e) => setV(e.target.value)} className="h-9 rounded-[8px] border border-line bg-surface px-2 text-[13px]" aria-label={t("disp.plan.assignTo")}>
        <option value="">{t("disp.plan.planIt")}</option>
        {vehicles
          .filter((x) => x.available)
          .map((x) => (
            <option key={x.vehicle_id} value={x.vehicle_id}>
              {t("disp.plan.full", { v: x.vehicle_id, kind: x.kind, pct: x.volume_pct })}
            </option>
          ))}
      </select>
      <Button size="sm" variant="secondary" disabled={!v} onClick={() => v && onPick(v)}>
        {t("disp.plan.assign")}
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
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  async function move(orderId: string, vehicleId: string) {
    setBusy(orderId);
    try {
      onChange(await post<Board>(`/dispatch/plan/${planId}/move`, { order_id: orderId, vehicle_id: vehicleId }));
      toast(t("disp.plan.movedToast", { v: vehicleId }), "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("disp.plan.couldNotMove"), "bad");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Sheet open={!!v} onClose={onClose} side title={t("disp.plan.vehicle")}>
      {v ? (
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow">{v.kind}</div>
              <div className="font-display text-[28px] font-medium">{v.vehicle_id}</div>
              <div className="font-data text-muted">
                {v.volume_cap_m3} m³ · {kg(v.weight_cap_kg)}
              </div>
            </div>
            <button onClick={onClose} aria-label={t("common.close")} className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral">
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
          {v.trips.map((trip) => (
            <div key={trip.trip_id} className="mt-6">
              <div className="eyebrow">
                {t("disp.plan.trip", { n: trip.trip_no, brand: trip.brand, district: trip.district, t: trip.depart ?? "?", m: trip.minutes })}
              </div>
              <div className="mt-2 divide-y divide-line rounded-[10px] border border-line">
                {trip.stops_detail
                  .slice()
                  .sort((a, b) => a.seq - b.seq)
                  .map((s) => (
                    <div key={s.order_id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                      <span className="font-data w-5 text-muted">{s.seq}</span>
                      <div className="min-w-[120px] flex-1">
                        <div className="font-semibold">{s.outlet}</div>
                        <div className="font-data text-[12px] text-muted">
                          {t("disp.plan.stopLine", { id: s.order_id, w: kg(s.weight_kg), v: m3(s.volume_m3), eta: s.eta ?? "" })}
                        </div>
                      </div>
                      {s.temp === "chilled" ? <Pill tone="info">{t("common.chilled")}</Pill> : null}
                      {s.second_skip ? <Pill tone="bad">{t("disp.plan.skippedLast")}</Pill> : null}
                      <select
                        defaultValue=""
                        disabled={busy === s.order_id}
                        onChange={(e) => e.target.value && move(s.order_id, e.target.value)}
                        className="h-8 max-w-[150px] rounded-[6px] border border-line bg-surface px-1.5 text-[12px]"
                        aria-label={t("disp.plan.moveLabel", { outlet: s.outlet })}
                      >
                        <option value="">{t("disp.plan.moveTo")}</option>
                        {vehicles
                          .filter((x) => x.available && x.vehicle_id !== v.vehicle_id)
                          .map((x) => (
                            <option key={x.vehicle_id} value={x.vehicle_id}>
                              {x.vehicle_id} · {x.kind}
                            </option>
                          ))}
                      </select>
                      <Button size="sm" variant="danger" onClick={() => onDefer(s, trip)}>
                        {t("disp.plan.defer")}
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
          {!v.trips.length ? <p className="mt-6 text-muted">{t("disp.plan.nothingAssigned")}</p> : null}
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
  const { t } = useT();
  const [reason, setReason] = useState<string>("capacity_volume");
  const [note, setNote] = useState("");
  const a = useAction(async () => {
    if (!target) return;
    const b = await post<Board>(`/dispatch/plan/${planId}/defer`, { order_id: target.order.order_id, reason, note: note || null });
    toast(t("disp.plan.deferredToast"));
    setNote("");
    onDone(b);
  });
  const o = target?.order;
  const skipped = o && "second_skip" in o ? o.second_skip : false;
  return (
    <Sheet open={!!target} onClose={onClose} title={t("disp.plan.deferTitle")}>
      {o ? (
        <div className="p-6">
          <div className="eyebrow">{t("disp.plan.deferEyebrow", { id: o.order_id })}</div>
          <div className="mt-1 font-display text-[26px] font-medium">
            {o.outlet} <span className="text-muted">· {o.temp === "chilled" ? t("disp.orders.kind.chilled") : t("disp.plan.kindDry")}</span>
          </div>
          <div className="font-data mt-1 text-muted">
            {kg(o.weight_kg)} · {m3(o.volume_m3)}
          </div>
          {skipped ? (
            <div className="mt-4 rounded-[10px] bg-bad-bg px-3 py-2.5 text-[14px] text-bad" role="alert">
              <b>{t("disp.plan.alreadySkipped")}</b>{t("disp.plan.alreadySkippedBody")}
            </div>
          ) : null}
          <div className="eyebrow mt-5">{t("disp.plan.reason")}</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {REASONS.map((code) => (
              <button
                key={code}
                onClick={() => setReason(code)}
                className={`h-11 rounded-[8px] border text-[14px] font-semibold ${reason === code ? "border-ink bg-neutral" : "border-line"}`}
                aria-pressed={reason === code}
              >
                {t(reasonKey(code))}
              </button>
            ))}
          </div>
          <label className="mt-5 block">
            <span className="eyebrow">{t("disp.plan.note")}</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={t("disp.plan.notePlaceholder")}
              className="mt-1 w-full rounded-[8px] border border-line bg-surface p-3 outline-none focus:border-ink"
            />
          </label>
          <ErrorNote error={a.error} />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button busy={a.busy} onClick={() => a.run()}>
              {nextDate ? t("disp.plan.deferTo", { date: fmtDate(nextDate) }) : t("disp.plan.deferToNext")}
            </Button>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
