"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, ErrorNote, Eyebrow, Headline, Lead, Pill, Spinner, toast, type Tone } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";
import { useDispatch } from "../layout";

type Run = {
  trip_id: number;
  vehicle_id: string;
  driver: string | null;
  kind: string;
  brand: string;
  district: string;
  trip_no: number;
  status: string;
  state: { key: string; label: string; tone: string };
  depart: string | null;
  progress: { done: number; total: number };
  next_stop: { name: string; eta: string | null; seq: number } | null;
  offline: { at: string; text: string; synced: string }[];
  back_online: string | null;
  conflicts: number;
  stops: { id: number; seq: number; name: string; eta: string | null; status: string; at: string | null }[];
};
type Need =
  | { type: "count"; id: number; title: string; vehicle_id: string; driver_count: number; store_count: number; driver_stance: string | null; photo: string | null; actions: string[] }
  | { type: "reassigned"; id: number; title: string; vehicle_id: string; detail: string; actions: string[] }
  | { type: "flag"; id: number; title: string; vehicle_id: string; detail: string; actions: string[] };
type Live = {
  plan: { id: number; depot: string; service_date: string } | null;
  headline: { out: number; needs_you: number };
  runs: Run[];
  needs_you: Need[];
  issues: { stop_id: number; outlet: string; vehicle_id: string }[];
  deferrals?: { outlet: string; temp: string; reason: string; deferred_to: string | null; second_skip: boolean }[];
};

const tone = (t: string): Tone => (t === "ok" ? "ok" : t === "warn" ? "warn" : t === "danger" ? "bad" : "neutral");

export default function LivePage() {
  const { t } = useT();
  const { depot, date } = useDispatch();
  const { data, error, loading, reload } = usePoll(() => get<Live>(`/dispatch/live?depot=${depot}&date=${date}`), 3000, [depot, date]);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;
  if (!data.plan) {
    return (
      <div className="rise max-w-[640px] py-10">
        <Lead>{t("disp.live.eyebrowNone", { depot })}</Lead>
        <Headline className="mt-1">{t("disp.live.nothing")}</Headline>
        <p className="mt-2 text-muted">{t("disp.live.nothingBody")}</p>
        <Link href="/dispatcher/plan" className="mt-5 inline-block">
          <Button size="lg">{t("disp.live.goPlan")}</Button>
        </Link>
      </div>
    );
  }

  async function act(key: string, path: string, body: unknown, msg: string) {
    setBusy(key);
    try {
      await post(path, body);
      toast(msg);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("disp.live.failed"), "bad");
    } finally {
      setBusy(null);
    }
  }

  const { runs, needs_you: needs } = data;
  const spot = runs.find((r) => r.offline.length) ?? null;

  return (
    <div className="hill-wash -mx-4 rounded-[16px] px-4 py-2 sm:-mx-6 sm:px-6">
      <div className="rise">
        <Lead>{t("disp.live.eyebrow", { depot, date: fmtDate(data.plan.service_date) })}</Lead>
        <Headline className="mt-1">
          {t("disp.live.title", { out: data.headline.out, needs: data.headline.needs_you ? t("disp.live.needsSome", { n: data.headline.needs_you }) : t("disp.live.needsNone") })}
        </Headline>

        {needs.length ? (
          <div className="mt-5 space-y-3">
            {needs.map((n) => (
              <Card key={`${n.type}${n.id}`} className="border-bad-line p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-[240px] flex-1">
                    <Pill tone="bad">{t("disp.live.decision")}</Pill>
                    <div className="mt-2 font-display text-[22px] font-medium">{n.title}</div>
                    <div className="font-data text-muted">{n.vehicle_id}</div>
                    {n.type === "count" ? (
                      <div className="mt-3 grid max-w-[420px] grid-cols-2 gap-3">
                        <div className="rounded-[10px] bg-neutral p-3">
                          <Eyebrow>{t("disp.live.driverOffline")}</Eyebrow>
                          <div className="font-display text-[28px]">{n.driver_count}</div>
                          {n.driver_stance ? <div className="text-[12px] text-muted">{n.driver_stance === "dispute" ? t("disp.live.driverDisputes") : t("disp.live.driverAccepts")}</div> : null}
                        </div>
                        <div className="rounded-[10px] bg-neutral p-3">
                          <Eyebrow>{t("disp.live.storeConfirmed")}</Eyebrow>
                          <div className="font-display text-[28px]">{n.store_count}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-[14px] text-muted">{n.detail}</p>
                    )}
                    {n.type === "count" && n.photo ? (
                      // Proof-of-delivery photo is a data URL captured on the phone.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.photo} alt={t("disp.live.photoAlt")} className="mt-3 h-28 rounded-[10px] border border-line object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {n.type === "count" ? (
                      <>
                        <Button busy={busy === `c${n.id}a`} onClick={() => act(`c${n.id}a`, `/dispatch/conflicts/${n.id}/resolve`, { action: "accept_store" }, t("disp.live.acceptedStore", { n: n.store_count }))}>
                          {t("disp.live.acceptStore", { n: n.store_count })}
                        </Button>
                        <Button variant="secondary" busy={busy === `c${n.id}b`} onClick={() => act(`c${n.id}b`, `/dispatch/conflicts/${n.id}/resolve`, { action: "accept_driver" }, t("disp.live.acceptedDriver", { n: n.driver_count }))}>
                          {t("disp.live.acceptDriver", { n: n.driver_count })}
                        </Button>
                      </>
                    ) : null}
                    {n.type === "reassigned" ? (
                      <Button busy={busy === `c${n.id}`} onClick={() => act(`c${n.id}`, `/dispatch/conflicts/${n.id}/resolve`, { action: "acknowledge" }, t("disp.live.noted"))}>
                        {t("disp.live.ack")}
                      </Button>
                    ) : null}
                    {n.type === "flag" ? (
                      <>
                        <Button busy={busy === `f${n.id}a`} onClick={() => act(`f${n.id}a`, `/dispatch/flags/${n.id}/answer`, { answer: "top_up" }, t("disp.live.topUpToast"))}>
                          {t("disp.live.topUp")}
                        </Button>
                        <Button variant="secondary" busy={busy === `f${n.id}b`} onClick={() => act(`f${n.id}b`, `/dispatch/flags/${n.id}/answer`, { answer: "send_as_is" }, t("disp.live.sendAsIsToast"))}>
                          {t("disp.live.sendAsIs")}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {spot ? (
          <Card className="mt-5 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[22px] font-medium">
                {spot.vehicle_id} · {spot.driver}
              </span>
              <span className="text-muted">
                {t("disp.live.tripLine", { n: spot.trip_no, brand: spot.brand, district: spot.district, kind: spot.kind.toLowerCase() })}
              </span>
              <Pill tone={tone(spot.state.tone)}>{spot.back_online ? t("disp.live.backOnline", { t: spot.back_online }) : spot.state.label}</Pill>
            </div>
            <Eyebrow className="mt-3">{t("disp.live.whatOffline")}</Eyebrow>
            <ul className="mt-1 divide-y divide-line">
              {spot.offline.map((o, i) => (
                <li key={i} className="flex gap-4 py-1.5 text-[14px]">
                  <span className="font-data w-12 text-muted">{o.at}</span>
                  <span>{o.text}</span>
                  <span className="ml-auto text-[12px] text-muted">{t("disp.live.synced", { t: o.synced })}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-muted">{t("disp.live.offlineNote")}</p>
          </Card>
        ) : null}

        <Card className="mt-5 hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line">
                  {(["vehicle", "trip", "progress", "next", "status"] as const).map((h) => (
                    <th key={h} className="eyebrow px-4 py-3 font-semibold">
                      {t(`disp.live.col.${h}` as Key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.trip_id} className="h-[60px] border-b border-line last:border-0">
                    <td className="px-4">
                      <div className="font-data font-semibold">{r.vehicle_id}</div>
                      <div className="text-[12px] text-muted">{r.driver ?? "—"}</div>
                    </td>
                    <td className="px-4 text-[14px]">
                      {r.brand} · {r.district}
                      <div className="text-[12px] text-muted">{t("disp.live.leaves", { n: r.trip_no, t: r.depart ?? "" })}</div>
                    </td>
                    <td className="px-4">
                      <div className="flex items-center gap-1">
                        {r.stops.map((s) => (
                          <span
                            key={s.id}
                            title={`${s.name} · ${s.status}`}
                            className={`h-2.5 w-5 rounded-full ${["delivered", "partial"].includes(s.status) ? "bg-ok" : s.status === "failed" ? "bg-bad" : s.status === "arrived" ? "bg-warn" : "bg-neutral"}`}
                          />
                        ))}
                      </div>
                      <div className="font-data mt-1 text-[12px] text-muted">
                        {t("disp.live.stopsDone", { a: r.progress.done, b: r.progress.total })}
                      </div>
                    </td>
                    <td className="px-4 text-[14px]">
                      {r.next_stop ? (
                        <>
                          {r.next_stop.name}
                          <div className="font-data text-[12px] text-muted">{t("disp.live.stopSeq", { n: r.next_stop.seq, eta: r.next_stop.eta ?? "" })}</div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4">
                      <Pill tone={tone(r.state.tone)}>{r.state.label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Phones: one card per run */}
        <div className="mt-5 space-y-2 md:hidden">
          {runs.map((r) => (
            <Card key={r.trip_id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-data text-[15px] font-semibold">{r.vehicle_id}</div>
                  <div className="text-[12px] text-muted">{r.driver ?? "—"}</div>
                </div>
                <Pill tone={tone(r.state.tone)}>{r.state.label}</Pill>
              </div>
              <div className="mt-2 text-[14px]">
                {r.brand} · {r.district}
                <div className="text-[12px] text-muted">{t("disp.live.leaves", { n: r.trip_no, t: r.depart ?? "" })}</div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {r.stops.map((s) => (
                  <span key={s.id} title={`${s.name} · ${s.status}`} className={`h-2.5 flex-1 rounded-full ${["delivered", "partial"].includes(s.status) ? "bg-ok" : s.status === "failed" ? "bg-bad" : s.status === "arrived" ? "bg-warn" : "bg-neutral"}`} />
                ))}
              </div>
              <div className="font-data mt-1 flex justify-between text-[12px] text-muted">
                <span>{t("disp.live.stopsDone", { a: r.progress.done, b: r.progress.total })}</span>
                {r.next_stop ? <span>{r.next_stop.name} · {r.next_stop.eta}</span> : null}
              </div>
            </Card>
          ))}
        </div>

        {data.deferrals?.length ? (
          <section className="mt-8">
            <Eyebrow>{t("disp.live.deferrals")}</Eyebrow>
            <Card className="mt-2 divide-y divide-line">
              {data.deferrals.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[14px]">
                  <span className="font-semibold">{d.outlet}</span>
                  {d.temp === "chilled" ? <Pill tone="info">{t("common.chilled")}</Pill> : null}
                  <Pill tone="warn">{d.reason}</Pill>
                  <span className="text-muted">{t("disp.live.plannedFirst", { date: fmtDate(d.deferred_to) })}</span>
                  {d.second_skip ? <Pill tone="bad">{t("disp.live.secondSkip")}</Pill> : null}
                </div>
              ))}
            </Card>
          </section>
        ) : null}

        {data.issues.length ? (
          <p className="mt-6 text-[14px] text-muted">
            {t("disp.live.issuesOpen", { list: data.issues.map((i) => `${i.outlet} (${i.vehicle_id})`).join(", ") })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
