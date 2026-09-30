"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, ErrorNote, Eyebrow, Headline, Pill, Spinner, toast, type Tone } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
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
  const { depot, date } = useDispatch();
  const { data, error, loading, reload } = usePoll(() => get<Live>(`/dispatch/live?depot=${depot}&date=${date}`), 3000, [depot, date]);
  const [busy, setBusy] = useState<string | null>(null);

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;
  if (!data.plan) {
    return (
      <div className="rise max-w-[640px] py-10">
        <Eyebrow>Live runs · {depot} depot</Eyebrow>
        <Headline className="mt-1">Nothing is out yet.</Headline>
        <p className="mt-2 text-muted">Release the plan and the live board fills as loaders release vehicles and drivers start their runs.</p>
        <Link href="/dispatcher/plan" className="mt-4 inline-block font-semibold underline">
          Go to the plan board
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
      toast(e instanceof Error ? e.message : "Failed", "bad");
    } finally {
      setBusy(null);
    }
  }

  const { runs, needs_you: needs } = data;
  const spot = runs.find((r) => r.offline.length) ?? null;

  return (
    <div className="hill-wash -mx-4 rounded-[16px] px-4 py-2 sm:-mx-6 sm:px-6">
      <div className="rise">
        <Eyebrow>
          Live runs · {depot} depot · {fmtDate(data.plan.service_date)}
        </Eyebrow>
        <Headline className="mt-1">
          {data.headline.out} vehicle{data.headline.out === 1 ? "" : "s"} out. {data.headline.needs_you ? `${data.headline.needs_you} need${data.headline.needs_you === 1 ? "s" : ""} you.` : "Nothing needs you."}
        </Headline>

        {needs.length ? (
          <div className="mt-5 space-y-3">
            {needs.map((n) => (
              <Card key={`${n.type}${n.id}`} className="border-bad-line p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-[240px] flex-1">
                    <Pill tone="bad">Needs your decision</Pill>
                    <div className="mt-2 font-display text-[22px] font-medium">{n.title}</div>
                    <div className="font-data text-muted">{n.vehicle_id}</div>
                    {n.type === "count" ? (
                      <div className="mt-3 grid max-w-[420px] grid-cols-2 gap-3">
                        <div className="rounded-[10px] bg-neutral p-3">
                          <div className="eyebrow">Driver (offline)</div>
                          <div className="font-display text-[28px]">{n.driver_count}</div>
                          {n.driver_stance ? <div className="text-[12px] text-muted">Driver: {n.driver_stance === "dispute" ? "disputes" : "accepts store"}</div> : null}
                        </div>
                        <div className="rounded-[10px] bg-neutral p-3">
                          <div className="eyebrow">Store confirmed</div>
                          <div className="font-display text-[28px]">{n.store_count}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-[14px] text-muted">{n.detail}</p>
                    )}
                    {n.type === "count" && n.photo ? (
                      // Proof-of-delivery photo is a data URL captured on the phone.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.photo} alt="Driver's proof photo" className="mt-3 h-28 rounded-[10px] border border-line object-cover" />
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {n.type === "count" ? (
                      <>
                        <Button busy={busy === `c${n.id}a`} onClick={() => act(`c${n.id}a`, `/dispatch/conflicts/${n.id}/resolve`, { action: "accept_store" }, `Accepted the store's ${n.store_count}.`)}>
                          Accept {n.store_count} (store)
                        </Button>
                        <Button variant="secondary" busy={busy === `c${n.id}b`} onClick={() => act(`c${n.id}b`, `/dispatch/conflicts/${n.id}/resolve`, { action: "accept_driver" }, `Accepted the driver's ${n.driver_count}.`)}>
                          Accept {n.driver_count} (driver)
                        </Button>
                      </>
                    ) : null}
                    {n.type === "reassigned" ? (
                      <Button busy={busy === `c${n.id}`} onClick={() => act(`c${n.id}`, `/dispatch/conflicts/${n.id}/resolve`, { action: "acknowledge" }, "Noted.")}>
                        Acknowledge
                      </Button>
                    ) : null}
                    {n.type === "flag" ? (
                      <>
                        <Button busy={busy === `f${n.id}a`} onClick={() => act(`f${n.id}a`, `/dispatch/flags/${n.id}/answer`, { answer: "top_up" }, "Loader told to top up from another vehicle.")}>
                          Top up
                        </Button>
                        <Button variant="secondary" busy={busy === `f${n.id}b`} onClick={() => act(`f${n.id}b`, `/dispatch/flags/${n.id}/answer`, { answer: "send_as_is" }, "Loader told to send as is. The store knows.")}>
                          Send as is
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
                Trip {spot.trip_no} {spot.brand} · {spot.district} · {spot.kind.toLowerCase()}
              </span>
              <Pill tone={tone(spot.state.tone)}>{spot.back_online ? `Back online ${spot.back_online}` : spot.state.label}</Pill>
            </div>
            <div className="eyebrow mt-3">What happened offline</div>
            <ul className="mt-1 divide-y divide-line">
              {spot.offline.map((o, i) => (
                <li key={i} className="flex gap-4 py-1.5 text-[14px]">
                  <span className="font-data w-12 text-muted">{o.at}</span>
                  <span>{o.text}</span>
                  <span className="ml-auto text-[12px] text-muted">synced {o.synced}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-muted">Every offline record keeps the phone&rsquo;s timestamp, so the order of events is kept even when uploads arrive late.</p>
          </Card>
        ) : null}

        <Card className="mt-5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line">
                  {["Vehicle", "Trip", "Progress", "Next stop", "Status"].map((h) => (
                    <th key={h} className="eyebrow px-4 py-3 font-semibold">
                      {h}
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
                      <div className="text-[12px] text-muted">Trip {r.trip_no} · leaves {r.depart}</div>
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
                        {r.progress.done}/{r.progress.total} stops
                      </div>
                    </td>
                    <td className="px-4 text-[14px]">
                      {r.next_stop ? (
                        <>
                          {r.next_stop.name}
                          <div className="font-data text-[12px] text-muted">stop {r.next_stop.seq} · {r.next_stop.eta}</div>
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

        {data.deferrals?.length ? (
          <section className="mt-8">
            <Eyebrow>Deferrals · skipped on the previous run go first</Eyebrow>
            <Card className="mt-2 divide-y divide-line">
              {data.deferrals.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[14px]">
                  <span className="font-semibold">{d.outlet}</span>
                  {d.temp === "chilled" ? <Pill tone="info">Chilled</Pill> : null}
                  <Pill tone="warn">{d.reason}</Pill>
                  <span className="text-muted">planned first on {fmtDate(d.deferred_to)}</span>
                  {d.second_skip ? <Pill tone="bad">2nd skip</Pill> : null}
                </div>
              ))}
            </Card>
          </section>
        ) : null}

        {data.issues.length ? (
          <p className="mt-6 text-[14px] text-muted">
            Store reports open for: {data.issues.map((i) => `${i.outlet} (${i.vehicle_id})`).join(", ")}.
          </p>
        ) : null}
      </div>
    </div>
  );
}
