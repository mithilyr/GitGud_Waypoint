"use client";

import Link from "next/link";
import { useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { Button, Card, Empty, ErrorNote, Eyebrow, Headline, Icon, Pill, Sheet, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
import { useStore } from "../layout";

type Line = { group: string; unit: string; temp: string; planned: number; expected: number; handed: number | null; flag: string | null };
type Delivery = {
  order: { id: string; temp: string; status: string; service_date: string };
  stop: null | {
    id: number;
    status: string;
    seq: number;
    stops_before: number;
    eta: string | null;
    window_close: string;
    minutes_away: number | null;
    vehicle_id: string;
    vehicle_kind: string;
    driver: string | null;
    trip_status: string;
    depart: string | null;
    no_signal: boolean;
    delivered_at: string | null;
    note: string | null;
    signed_by: string | null;
    photo: string | null;
    lines: Line[];
  };
  steps: { label: string; detail: string; state: "done" | "current" | "todo" }[];
  receipt: null | { status: string; at: string; by: string; lines: { group: string; expected: number; received: number }[] };
  report: null | { code: string; kind: string; line: string | null; at: string };
};
type Track = {
  date: string | null;
  deliveries: Delivery[];
  deferred: { id: string; temp: string; service_date: string; deferral: { reason_text: string; deferred_to: string } | null }[];
};

export default function TrackPage() {
  const { data, error, loading, reload } = usePoll(() => get<Track>("/store/track"), 3000);
  const { pushes } = useStore();
  const [reporting, setReporting] = useState<Delivery | null>(null);
  const [reported, setReported] = useState<{ code: string; reply_by: string } | null>(null);

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  const deferralPush = pushes.find((p) => p.kind === "deferral");
  return (
    <div className="rise space-y-6">
      {data.deferred.map((o) => (
        <DeferralNotice key={o.id} order={o} reason={deferralPush?.meta?.reason_text as string | undefined} second={!!deferralPush?.meta?.second_skip} />
      ))}
      {!data.deliveries.length && !data.deferred.length ? (
        <Empty title="Nothing on its way yet.">Place an order and it shows up here once dispatch plans the run.</Empty>
      ) : null}
      {[...data.deliveries]
        .sort((a, b) => b.steps.filter((x) => x.state === "done").length - a.steps.filter((x) => x.state === "done").length)
        .map((d) => (
        <DeliveryCard key={d.order.id} d={d} onReport={() => setReporting(d)} onChange={reload} />
      ))}
      <ReportSheet
        d={reporting}
        onClose={() => setReporting(null)}
        onSent={(r) => {
          setReporting(null);
          setReported(r);
          reload();
        }}
      />
      <Sheet open={!!reported} onClose={() => setReported(null)}>
        {reported ? (
          <div className="p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-bg text-ok"><Icon.Check size={28} /></div>
            <Eyebrow className="mt-4">Report {reported.code}</Eyebrow>
            <div className="font-display text-[28px] font-medium">Dispatch has your report.</div>
            <p className="mt-2 text-muted">Ruwan in dispatch will reply by {reported.reply_by}.</p>
            <Button size="lg" block className="mt-5" onClick={() => setReported(null)}>Back to delivery</Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function DeferralNotice({ order, reason, second }: { order: Track["deferred"][number]; reason?: string; second: boolean }) {
  return (
    <Card className="border-warn/50 p-5">
      <Pill tone="warn">Order deferred</Pill>
      <Headline className="mt-2 !text-[28px]">
        Your {order.temp === "chilled" ? "chilled " : ""}order moves to {fmtDate(order.deferral?.deferred_to ?? order.service_date)}.
      </Headline>
      <div className="mt-4 grid gap-3">
        <div>
          <div className="eyebrow">Reason</div>
          <div className="text-[16px] font-semibold">{reason ?? order.deferral?.reason_text ?? "Not enough capacity on the route"}</div>
        </div>
        <div>
          <div className="eyebrow">Rescheduled for</div>
          <div className="text-[16px] font-semibold">{fmtDate(order.deferral?.deferred_to ?? order.service_date)} · before 08:00</div>
        </div>
      </div>
      <p className="mt-3 text-[14px] text-muted">
        {second ? "This is the 2nd deferral in a row. " : ""}Deferred outlets are served first on the next run, so it will not be skipped twice in a row.
      </p>
      <Link href="/store/contact" className="mt-3 inline-block text-[14px] font-semibold underline">Contact dispatch</Link>
    </Card>
  );
}

function DeliveryCard({ d, onReport, onChange }: { d: Delivery; onReport: () => void; onChange: () => void }) {
  const s = d.stop;
  const [got, setGot] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!s) {
    return (
      <Card className="p-5">
        <Eyebrow>{d.order.id} · {d.order.temp === "chilled" ? "Chilled" : "Ambient"}</Eyebrow>
        <Headline className="mt-1 !text-[28px]">Order received.</Headline>
        <p className="mt-1 text-muted">Dispatch is planning the run. The truck and ETA appear here once the plan is released.</p>
        <Steps steps={d.steps} />
      </Card>
    );
  }

  const arrived = ["delivered", "partial", "failed"].includes(s.status);
  const closed = !!d.receipt;
  const headline = closed
    ? d.receipt!.status === "issue" ? "Problem reported." : "Receipt confirmed."
    : arrived
      ? `Delivered at ${s.delivered_at}.`
      : s.trip_status === "out"
        ? s.minutes_away ? `Arriving in ${s.minutes_away} minutes.` : `On the way. ETA ${s.eta}.`
        : s.trip_status === "released" ? `Loaded. Leaves ${s.depart}.` : `Being loaded. Leaves ${s.depart}.`;
  const sub = closed
    ? d.receipt!.status === "issue" ? `Report ${d.report?.code ?? ""} is with dispatch.` : `Dispatch and ${s.driver ?? "the driver"} can see your count. This delivery is closed.`
    : arrived
      ? "Confirm what you received, or flag a problem before the driver leaves."
      : `${s.vehicle_id} · ${s.stops_before} stop${s.stops_before === 1 ? "" : "s"} before yours.`;
  const value = (l: Line) => got[l.group] ?? l.handed ?? l.expected;

  async function confirm() {
    if (!s) return;
    setBusy(true);
    setErr(null);
    try {
      await post(`/store/stops/${s.id}/confirm`, { lines: s.lines.map((l) => ({ group: l.group, received: value(l) })) });
      toast("Receipt confirmed. Dispatch can see your count.");
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not confirm");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>{d.order.id} · {d.order.temp === "chilled" ? "Chilled" : "Ambient"}</Eyebrow>
        {s.no_signal && !arrived ? <Pill tone="warn">No signal · ETA from plan</Pill> : <Pill tone={closed || arrived ? "ok" : s.trip_status === "out" ? "info" : "neutral"}>{closed ? "Closed" : arrived ? "Delivered" : s.trip_status === "out" ? "On the way" : "Planned"}</Pill>}
      </div>
      <Headline className="mt-1 !text-[30px]">{headline}</Headline>
      <p className="mt-1 text-[14px] text-muted">{sub}</p>

      {!arrived ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[10px] bg-neutral p-3">
            <div className="eyebrow">ETA</div>
            <div className="font-display text-[28px] leading-tight tabular">{s.eta}</div>
            <div className="text-[12px] text-muted">Window closes {s.window_close}</div>
          </div>
          <div className="rounded-[10px] bg-neutral p-3">
            <div className="eyebrow">Vehicle</div>
            <div className="font-data text-[18px] font-semibold">{s.vehicle_id}</div>
            <div className="text-[12px] text-muted">{s.vehicle_kind}{s.driver ? ` · ${s.driver}` : ""}</div>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-[10px] bg-neutral p-3">
          <div className="eyebrow">Proof of delivery</div>
          <div className="mt-1 flex items-center gap-3">
            {s.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photo} alt="Delivery proof photo" className="h-16 w-16 rounded-[8px] object-cover" />
            ) : null}
            <div className="text-[14px]">
              <div>Taken by {s.driver ?? "driver"} · {s.delivered_at}</div>
              {s.signed_by ? <div className="text-muted">Signed by {s.signed_by}</div> : null}
              {s.note ? <div className="text-muted">“{s.note}”</div> : null}
            </div>
          </div>
        </div>
      )}

      {!arrived ? <Steps steps={d.steps} /> : null}

      {arrived ? (
        <>
          <div className="eyebrow mt-5">What arrived</div>
          <div className="mt-1 divide-y divide-line">
            {s.lines.map((l) => {
              const v = closed ? d.receipt!.lines.find((x) => x.group === l.group)?.received ?? l.handed ?? l.expected : value(l);
              const short = v < l.planned;
              return (
                <div key={l.group} className="flex min-h-14 items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold">{l.group}</div>
                    <div className="text-[12px] text-muted">
                      {l.temp === "chilled" ? "Chilled · " : ""}
                      {l.flag ? `1+ short · flagged at the dock` : `${l.planned} ${l.unit}s ordered`}
                    </div>
                  </div>
                  {closed ? (
                    <span className={`font-data text-[15px] ${short ? "text-warn" : "text-ok"}`}>{v} of {l.planned}</span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setGot((g) => ({ ...g, [l.group]: Math.max(0, value(l) - 1) }))} className="grid h-9 w-9 place-items-center rounded-[8px] border border-line" aria-label={`One fewer ${l.group}`}><Icon.Minus size={16} /></button>
                      <span className={`font-data w-14 text-center text-[15px] ${short ? "text-warn" : ""}`}>{value(l)} of {l.planned}</span>
                      <button onClick={() => setGot((g) => ({ ...g, [l.group]: value(l) + 1 }))} className="grid h-9 w-9 place-items-center rounded-[8px] border border-line" aria-label={`One more ${l.group}`}><Icon.Plus size={16} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!closed ? (
            <>
              <ErrorNote error={err} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="lg" busy={busy} onClick={confirm}>Confirm receipt</Button>
                <Button size="lg" variant="secondary" onClick={onReport}>Report an issue</Button>
              </div>
            </>
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              Signed by {d.receipt!.by.split(" ")[0]} · {d.receipt!.at}
              {d.receipt!.lines.some((l) => l.received < l.expected) ? " · a short line is on the next run" : ""}
            </p>
          )}
        </>
      ) : null}
    </Card>
  );
}

function Steps({ steps }: { steps: Delivery["steps"] }) {
  return (
    <ol className="mt-5 space-y-3">
      {steps.map((st) => (
        <li key={st.label} className="flex items-start gap-3">
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${st.state === "done" ? "border-ok bg-ok text-bg" : st.state === "current" ? "border-accent" : "border-line"}`}>
            {st.state === "done" ? <Icon.Check size={12} /> : null}
          </span>
          <div>
            <div className={`text-[14px] font-semibold ${st.state === "todo" ? "text-faint" : ""}`}>{st.label}</div>
            {st.detail ? <div className="text-[13px] text-warn">{st.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function ReportSheet({ d, onClose, onSent }: { d: Delivery | null; onClose: () => void; onSent: (r: { code: string; reply_by: string }) => void }) {
  const [kind, setKind] = useState("short");
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = d?.stop;
  async function send() {
    if (!s) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await post<{ code: string; reply_by: string }>(`/store/stops/${s.id}/report`, { kind, line: line || s.lines[0]?.group, note, photo });
      setNote("");
      setPhoto(null);
      onSent(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={!!d} onClose={onClose} title="Report a problem">
      {s ? (
        <div className="p-5">
          <Eyebrow>Delivered {s.delivered_at} · {s.vehicle_id} · {s.driver}</Eyebrow>
          <Headline className="mt-1 !text-[26px]">Report a problem.</Headline>
          <p className="text-[14px] text-muted">Tell dispatch what&rsquo;s wrong. A photo helps them settle it faster.</p>
          <div className="eyebrow mt-4">What happened</div>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[["short", "Short"], ["damaged", "Damaged"], ["wrong_item", "Wrong item"], ["other", "Other"]].map(([k, l]) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`h-11 rounded-[8px] border text-[13px] font-semibold ${kind === k ? "border-ink bg-neutral" : "border-line"}`}>{l}</button>
            ))}
          </div>
          <div className="eyebrow mt-4">Which line</div>
          <div className="mt-2 space-y-1.5">
            {s.lines.map((l) => (
              <button key={l.group} onClick={() => setLine(l.group)} aria-pressed={(line || s.lines[0].group) === l.group} className={`flex h-11 w-full items-center justify-between rounded-[8px] border px-3 text-[14px] ${(line || s.lines[0].group) === l.group ? "border-ink bg-neutral" : "border-line"}`}>
                <span className="font-semibold">{l.group}</span>
                <span className="font-data text-muted">{l.handed ?? l.expected} of {l.planned}</span>
              </button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note (optional)" className="mt-3 w-full rounded-[8px] border border-line bg-surface p-3 outline-none focus:border-ink" />
          <div className="mt-3"><PhotoButton value={photo} onChange={setPhoto} label="Photo" /></div>
          <ErrorNote error={err} />
          <Button size="lg" block className="mt-4" busy={busy} onClick={send}>Send report to dispatch</Button>
          <Button variant="ghost" block className="mt-1" onClick={onClose}>Cancel</Button>
        </div>
      ) : null}
    </Sheet>
  );
}
