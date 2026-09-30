"use client";

import Link from "next/link";
import { useState } from "react";
import { PhotoButton } from "@/components/PhotoButton";
import { Button, Card, Empty, ErrorNote, FullScreen, Headline, Icon, Pill, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";
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
type Sent = { code: string; reply_by: string; kind: string; line: string; photo: boolean };

const STEP_KEY: Record<string, Key> = {
  "Order placed": "store.track.step.placed",
  Loaded: "store.track.step.loaded",
  "On the way": "store.track.step.onTheWay",
  Arriving: "store.track.step.arriving",
  Delivered: "store.track.step.delivered",
};

const tile = "min-h-[108px] p-4";
const tileLabel = "text-[11px] font-semibold uppercase text-muted";

export default function TrackPage() {
  const { t } = useT();
  const { user } = useAuth();
  const outlet = user?.outlet?.name ?? "";
  const { data, error, loading, reload } = usePoll(() => get<Track>("/store/track"), 3000);
  const { pushes } = useStore();
  const [reporting, setReporting] = useState<Delivery | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  const deferralPush = pushes.find((p) => p.kind === "deferral");
  return (
    <div className="rise space-y-10">
      {data.deferred
        .filter((o) => !dismissed.includes(o.id))
        .map((o) => (
          <DeferralNotice
            key={o.id}
            order={o}
            outlet={outlet}
            reason={deferralPush?.meta?.reason_text as string | undefined}
            second={!!deferralPush?.meta?.second_skip}
            onDismiss={() => setDismissed((d) => [...d, o.id])}
          />
        ))}
      {!data.deliveries.length && !data.deferred.filter((o) => !dismissed.includes(o.id)).length ? <Empty title={t("store.track.nothing")}>{t("store.track.nothingBody")}</Empty> : null}
      {[...data.deliveries]
        .sort((a, b) => b.steps.filter((x) => x.state === "done").length - a.steps.filter((x) => x.state === "done").length)
        .map((d) => (
          <DeliveryView key={d.order.id} d={d} outlet={outlet} onReport={() => setReporting(d)} onChange={reload} />
        ))}
      <ReportScreen
        d={reporting}
        onClose={() => setReporting(null)}
        onSent={(r) => {
          setReporting(null);
          setSent(r);
          reload();
        }}
      />
      <SentScreen sent={sent} d={data.deliveries.find((x) => x.report?.code === sent?.code) ?? null} onClose={() => setSent(null)} />
    </div>
  );
}

function DeferralNotice({ order, outlet, reason, second, onDismiss }: { order: Track["deferred"][number]; outlet: string; reason?: string; second: boolean; onDismiss: () => void }) {
  const { t } = useT();
  const to = fmtDate(order.deferral?.deferred_to ?? order.service_date);
  return (
    <div>
      <p className="text-[13px] font-medium text-muted">{t("store.track.eyebrowToday", { outlet })}</p>
      <Headline className="mt-1">{t("store.track.deferredTitle")}</Headline>
      <p className="mt-2 text-[15px] text-muted">{t("store.track.deferredLede", { kind: order.temp === "chilled" ? t("store.track.chilledKind") : "", date: to })}</p>
      <div className="mt-5 rounded-[12px] bg-warn-bg p-5 text-warn">
        <div className="text-[11px] font-bold uppercase tracking-[0.8px]">{t("store.track.reason")}</div>
        <div className="mt-2 text-[16px] font-semibold text-ink">{reason ?? order.deferral?.reason_text ?? t("store.track.reasonDefault")}</div>
        <div className="my-4 h-px bg-warn/25" />
        <div className="text-[10px] font-bold uppercase tracking-[0.6px]">{t("store.track.rescheduled")}</div>
        <div className="font-data mt-2 text-[14px] font-semibold text-ink">{t("store.track.before08", { date: to })}</div>
      </div>
      <p className="mt-5 text-[14px] text-muted">
        {second ? t("store.track.secondSkip") : ""}
        {t("store.track.serveFirst")}
      </p>
      <Button size="lg" block className="mt-6 !h-12 !text-[15px]" onClick={onDismiss}>{t("store.track.gotIt")}</Button>
      <Link href="/store/contact" className="mt-2 block">
        <Button size="lg" block variant="secondary" className="!h-12 !text-[15px]">{t("store.track.contact")}</Button>
      </Link>
    </div>
  );
}

function DeliveryView({ d, outlet, onReport, onChange }: { d: Delivery; outlet: string; onReport: () => void; onChange: () => void }) {
  const { t } = useT();
  const s = d.stop;
  const [got, setGot] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const kindLabel = d.order.temp === "chilled" ? t("common.chilled") : t("common.ambient");

  if (!s) {
    return (
      <div>
        <p className="text-[13px] font-medium text-muted">{d.order.id} · {kindLabel}</p>
        <Headline className="mt-1">{t("store.track.received")}</Headline>
        <p className="mt-2 text-[15px] text-muted">{t("store.track.receivedBody")}</p>
        <Steps steps={d.steps} />
      </div>
    );
  }

  const arrived = ["delivered", "partial", "failed"].includes(s.status);
  const closed = !!d.receipt;
  const value = (l: Line) => got[l.group] ?? l.handed ?? l.expected;
  const driver = s.driver ?? t("store.track.theDriver");

  if (closed) {
    const r = d.receipt!;
    const issue = r.status === "issue";
    const rows = r.lines.length ? r.lines : s.lines.map((l) => ({ group: l.group, expected: l.planned, received: l.handed ?? l.expected }));
    const full = rows.filter((l) => l.received >= l.expected).length;
    const shorts = rows.filter((l) => l.received < l.expected);
    return (
      <div>
        <div className={`grid h-14 w-14 place-items-center rounded-full ${issue ? "bg-warn-bg text-warn" : "bg-ok-bg text-ok"}`}>{issue ? <span className="text-[22px] font-bold" aria-hidden>!</span> : <Icon.Check size={26} />}</div>
        <p className="mt-6 text-[13px] font-medium text-muted">{t("store.closed.eyebrow", { outlet, at: r.at })}</p>
        <Headline className="mt-1">{issue ? t("store.track.problemReported") : t("store.track.receiptConfirmed")}</Headline>
        <p className="mt-2 text-[15px] text-muted">
          {issue ? t("store.track.reportWith", { code: d.report?.code ?? "" }) : t("store.track.closedSub", { who: driver })}
        </p>
        <Card className="mt-6 divide-y divide-line px-4">
          <SummaryRow label={t("store.closed.received")} value={t("store.closed.linesOf", { n: full, total: rows.length })} />
          {shorts.length ? (
            <SummaryRow
              label={t("store.closed.short")}
              value={shorts.map((l) => t("store.closed.shortLine", { g: l.group, n: l.expected - l.received, unit: s.lines.find((x) => x.group === l.group)?.unit ?? "" })).join(", ")}
            />
          ) : null}
          <SummaryRow label={t("store.closed.signed")} value={t("store.closed.signedVal", { who: r.by.split(" ")[0], at: r.at })} />
        </Card>
        <Link href="/store" className="mt-8 block">
          <Button size="lg" block className="!h-12 !text-[15px]">{t("store.closed.backOrders")}</Button>
        </Link>
      </div>
    );
  }

  const headline = arrived
    ? t("store.track.deliveredAt", { t: s.delivered_at ?? "" })
    : s.trip_status === "out"
      ? s.minutes_away
        ? t("store.track.arrivingIn", { n: s.minutes_away })
        : t("store.track.onTheWay", { eta: s.eta ?? "" })
      : s.trip_status === "released"
        ? t("store.track.loadedLeaves", { t: s.depart ?? "" })
        : t("store.track.beingLoaded", { t: s.depart ?? "" });
  const sub = arrived ? t("store.track.confirmSub") : t("store.track.stopsBefore", { v: s.vehicle_id, n: s.stops_before });

  async function confirm() {
    if (!s) return;
    setBusy(true);
    setErr(null);
    try {
      await post(`/store/stops/${s.id}/confirm`, { lines: s.lines.map((l) => ({ group: l.group, received: value(l) })) });
      toast(t("store.track.confirmedToast"));
      onChange();
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("store.track.confirmFailed"));
    } finally {
      setBusy(false);
    }
  }

  const shortCount = s.lines.filter((l) => value(l) < l.planned).length;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-medium text-muted">{arrived ? t("store.track.eyebrowArrived", { outlet }) : t("store.track.eyebrowToday", { outlet })}</p>
        {s.no_signal && !arrived ? <Pill tone="warn">{t("store.track.noSignalEta")}</Pill> : <Pill tone={arrived ? "ok" : s.trip_status === "out" ? "info" : "neutral"}>{arrived ? t("store.track.statusDelivered") : s.trip_status === "out" ? t("store.track.statusOnTheWay") : t("store.track.statusPlanned")}</Pill>}
      </div>
      <Headline className="mt-1">{headline}</Headline>
      <p className="mt-2 text-[15px] text-muted">{sub}</p>

      {!arrived ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Card className={tile}>
              <div className={tileLabel}>{t("store.track.eta")}</div>
              <div className="mt-1 font-display text-[24px] font-medium leading-tight tabular">{s.eta}</div>
              <div className="font-data mt-3 text-[12px] text-muted">{t("store.track.windowCloses", { t: s.window_close })}</div>
            </Card>
            <Card className={tile}>
              <div className={tileLabel}>{t("store.track.vehicle")}</div>
              <div className="mt-1 font-display text-[24px] font-medium leading-tight">{s.vehicle_id}</div>
              <div className="font-data mt-3 text-[12px] text-muted">{s.vehicle_kind}{s.driver ? ` · ${s.driver}` : ""}</div>
            </Card>
          </div>
          <Steps steps={d.steps} />
        </>
      ) : (
        <>
          <div className="mt-5 flex items-center gap-4">
            {s.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.photo} alt={t("store.track.proof")} className="h-20 w-20 shrink-0 rounded-[10px] object-cover" />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[10px] bg-neutral text-faint"><Icon.Check size={22} /></div>
            )}
            <div>
              <div className="text-[13px] font-semibold">{t("store.track.proof")}</div>
              <div className="font-data mt-1 text-[12px] text-muted">{t("store.track.takenBy", { who: s.driver ?? t("store.track.driver"), t: s.delivered_at ?? "" })}</div>
              {s.signed_by ? <div className="font-data mt-1 text-[12px] text-muted">{t("store.track.signedBy", { who: s.signed_by })}</div> : null}
              {shortCount ? <div className="font-data mt-1 text-[12px] text-muted">{t("store.track.flaggedShort")}</div> : null}
            </div>
          </div>

          <div className="mt-6 text-[13px] font-semibold">{t("store.track.whatArrived")}</div>
          <div className="mt-2 divide-y divide-line">
            {s.lines.map((l) => {
              const v = value(l);
              const short = v < l.planned;
              return (
                <div key={l.group} className="flex min-h-11 items-center gap-3 py-3">
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${short ? "bg-bad-bg text-bad" : "bg-ok-bg text-ok"}`} aria-hidden>{short ? "!" : "✓"}</span>
                  <div className="min-w-0 flex-1 text-[14px] font-medium">{l.group}</div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setGot((g) => ({ ...g, [l.group]: Math.max(0, v - 1) }))} className="grid h-7 w-7 place-items-center rounded-full bg-neutral" aria-label={t("store.track.fewerLine", { g: l.group })}><Icon.Minus size={14} /></button>
                    <span className={`font-data min-w-14 text-center text-[12px] font-semibold ${short ? "text-warn" : ""}`}>{t("store.track.ofPlanned", { v, n: l.planned })}</span>
                    <button onClick={() => setGot((g) => ({ ...g, [l.group]: v + 1 }))} className="grid h-7 w-7 place-items-center rounded-full bg-neutral" aria-label={t("store.track.moreLine", { g: l.group })}><Icon.Plus size={14} /></button>
                  </div>
                </div>
              );
            })}
          </div>
          <ErrorNote error={err} />
          <Button size="lg" block className="mt-6 !h-[52px] !text-[15px]" busy={busy} onClick={confirm}>{t("store.track.confirm")}</Button>
          <Button size="lg" block variant="secondary" className="mt-2 !h-12 !text-[15px]" onClick={onReport}>{t("store.track.report")}</Button>
        </>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3">
      <div className="text-[11px] font-semibold uppercase text-muted">{label}</div>
      <div className="mt-1 text-[14px] font-medium">{value}</div>
    </div>
  );
}

function Steps({ steps }: { steps: Delivery["steps"] }) {
  const { t } = useT();
  return (
    <div className="mt-6">
      <div className="text-[13px] font-semibold">{t("store.track.progress")}</div>
      <ol className="mt-3">
        {steps.map((st, i) => (
          <li key={st.label} className="relative flex items-start gap-4 pb-[18px] last:pb-0">
            {i < steps.length - 1 ? <span className="absolute left-[6px] top-[14px] h-[32px] w-[2px] bg-line" aria-hidden /> : null}
            <span
              className={`relative mt-[2px] h-[14px] w-[14px] shrink-0 rounded-full border ${st.state === "done" ? "border-primary bg-primary" : st.state === "current" ? "border-accent bg-accent" : "border-faint bg-surface"}`}
            />
            <div>
              <div className={`text-[14px] ${st.state === "current" ? "font-bold" : "font-medium"} ${st.state === "todo" ? "text-ink" : ""}`}>{STEP_KEY[st.label] ? t(STEP_KEY[st.label]) : st.label}</div>
              {st.detail ? <div className="text-[13px] text-warn">{st.detail}</div> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReportScreen({ d, onClose, onSent }: { d: Delivery | null; onClose: () => void; onSent: (r: Sent) => void }) {
  const { t } = useT();
  const [kind, setKind] = useState("short");
  const [line, setLine] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const s = d?.stop;
  const kinds: [string, Key][] = [
    ["short", "store.report.short"],
    ["damaged", "store.report.damaged"],
    ["wrong_item", "store.report.wrong"],
    ["other", "store.report.other"],
  ];
  async function send() {
    if (!s) return;
    setBusy(true);
    setErr(null);
    try {
      const chosen = line || s.lines[0]?.group;
      const r = await post<{ code: string; reply_by: string }>(`/store/stops/${s.id}/report`, { kind, line: chosen, note, photo });
      const out = { ...r, kind, line: chosen ?? "", photo: !!photo };
      setNote("");
      setPhoto(null);
      onSent(out);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("store.report.failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <FullScreen open={!!d} onClose={onClose} title={t("store.report.title")}>
      {s ? (
        <div>
          <p className="text-[13px] font-medium text-muted">{t("store.report.eyebrow", { t: s.delivered_at ?? "", v: s.vehicle_id, who: s.driver ?? "" })}</p>
          <Headline className="mt-1">{t("store.report.title")}</Headline>
          <p className="mt-2 text-[15px] text-muted">{t("store.report.lede")}</p>
          <div className="mt-5 text-[11px] font-semibold uppercase text-muted">{t("store.report.what")}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {kinds.map(([k, label]) => (
              <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`h-[30px] rounded-full px-4 text-[13px] font-medium ${kind === k ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>{t(label)}</button>
            ))}
          </div>
          <div className="mt-5 text-[11px] font-semibold uppercase text-muted">{t("store.report.which")}</div>
          <div className="mt-1 divide-y divide-line">
            {s.lines.map((l) => {
              const on = (line || s.lines[0].group) === l.group;
              return (
                <button key={l.group} onClick={() => setLine(l.group)} aria-pressed={on} className="flex min-h-11 w-full items-center gap-3 py-3 text-left">
                  <span className={`h-[18px] w-[18px] shrink-0 rounded-full border-surface bg-surface ${on ? "border-[5px] outline outline-1 outline-primary" : "border border-faint"}`} style={on ? { borderColor: "var(--primary)", background: "var(--surface)" } : undefined} />
                  <span className="min-w-0 flex-1 text-[14px] font-medium">{l.group}</span>
                  <span className="font-data text-[12px] font-semibold">{t("store.track.ofPlanned", { v: l.handed ?? l.expected, n: l.planned })}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 text-[11px] font-semibold uppercase text-muted">{t("store.report.photo")}</div>
          <div className="mt-2"><PhotoButton value={photo} onChange={setPhoto} label={t("store.report.photo")} /></div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t("store.report.note")} className="mt-5 w-full rounded-[8px] border border-line bg-surface p-4 text-[13px] font-medium outline-none focus:border-ink" />
          <ErrorNote error={err} />
          <Button size="lg" block className="mt-5 !h-[52px] !text-[15px]" busy={busy} onClick={send}>{t("store.report.send")}</Button>
          <Button size="lg" block variant="secondary" className="mt-2 !h-12 !text-[15px]" onClick={onClose}>{t("common.cancel")}</Button>
        </div>
      ) : null}
    </FullScreen>
  );
}

function SentScreen({ sent, d, onClose }: { sent: Sent | null; d: Delivery | null; onClose: () => void }) {
  const { t } = useT();
  const { user } = useAuth();
  const kindKey: Record<string, Key> = { short: "store.report.short", damaged: "store.report.damaged", wrong_item: "store.report.wrong", other: "store.report.other" };
  const line = d?.stop?.lines.find((l) => l.group === sent?.line);
  return (
    <FullScreen open={!!sent} onClose={onClose} title={t("store.track.reportedTitle")}>
      {sent ? (
        <div>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-ok-bg text-ok"><Icon.Check size={26} /></div>
          <p className="mt-6 text-[13px] font-medium text-muted">{t("store.sent.eyebrow", { code: sent.code, at: d?.report?.at ?? "" })}</p>
          <Headline className="mt-1">{t("store.track.reportedTitle")}</Headline>
          <p className="mt-2 text-[15px] text-muted">{t("store.track.reportedBody", { t: sent.reply_by })}</p>
          <Card className="mt-6 divide-y divide-line px-4">
            <SummaryRow
              label={t("store.sent.problem")}
              value={t("store.sent.problemVal", { kind: t(kindKey[sent.kind] ?? "store.report.other"), line: line ? `${sent.line}, ${t("store.track.ofPlanned", { v: line.handed ?? line.expected, n: line.planned })}` : sent.line })}
            />
            <SummaryRow label={t("store.sent.photo")} value={sent.photo ? t("store.sent.photoCount", { n: 1 }) : t("store.sent.noPhoto")} />
          </Card>
          <Button size="lg" block className="mt-8 !h-12 !text-[15px]" onClick={onClose}>{t("store.track.backToDelivery")}</Button>
          <Link href="/store" className="mt-2 block" aria-label={user?.outlet?.name}>
            <Button size="lg" block variant="secondary" className="!h-12 !text-[15px]">{t("store.closed.backOrders")}</Button>
          </Link>
        </div>
      ) : null}
    </FullScreen>
  );
}
