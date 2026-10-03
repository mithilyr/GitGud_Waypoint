"use client";

import { Card, ErrorNote, Eyebrow, Headline, Lead, Pill, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";

type Day = {
  date: string;
  dow: string;
  operating: boolean;
  festival: string | null;
  festival_ramp: number;
  payday: boolean;
  depots: Record<string, { demand_m3: number; capacity_m3: number; pct: number }>;
};
type Outlook = {
  start: string;
  days: Day[];
  at_risk: { date: string; depot: string; pct: number; action: string }[];
  headline: string;
  assumptions: string;
};

export default function DemandPage() {
  const { t } = useT();
  const { data, error, loading, reload } = usePoll(() => get<Outlook>("/dispatch/demand"));
  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  const depots = Object.keys(data.days[0].depots);
  const max = Math.max(...data.days.flatMap((d) => depots.map((p) => Math.max(d.depots[p].demand_m3, d.depots[p].capacity_m3))));

  return (
    <div className="rise fit-col md:pb-4">
      <Lead>{t("disp.demand.eyebrow", { date: fmtDate(data.start) })}</Lead>
      <Headline className="mt-1">{data.headline}</Headline>
      <p className="mt-2 max-w-[760px] text-[15px] text-muted">{t("disp.demand.lede")}</p>

      <div className="mt-5 grid gap-4 md:min-h-0 md:flex-1 md:overflow-auto md:content-start md:pb-4 lg:grid-cols-2">
        {depots.map((depot) => (
          <Card key={depot} className="p-4">
            <div className="flex items-baseline justify-between">
              <div className="font-display text-[22px] font-medium">{depot}</div>
              <div className="flex items-center gap-3 text-[12px] text-muted">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-info" /> {t("disp.demand.demand")}</span>
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-ink" /> {t("disp.demand.capacity")}</span>
              </div>
            </div>
            <div className="mt-3 flex h-[190px] items-end gap-1.5 md:h-[clamp(96px,19dvh,190px)]">
              {data.days.map((d) => {
                const x = d.depots[depot];
                const over = x.pct > 100;
                const cap = (x.capacity_m3 / max) * 100;
                return (
                  <div key={d.date} className="relative flex h-full flex-1 flex-col items-center justify-end" title={`${fmtDate(d.date)}: ${x.demand_m3} m³ vs ${x.capacity_m3} m³ (${x.pct}%)`}>
                    <div className="absolute inset-x-0 border-t-2 border-ink" style={{ bottom: `${cap}%` }} />
                    <div
                      className={`w-full rounded-t-[4px] ${!d.operating ? "bg-neutral" : over ? "bg-bad" : "bg-info"}`}
                      style={{ height: `${d.operating ? (x.demand_m3 / max) * 100 : 3}%`, opacity: d.operating ? 1 : 0.6 }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex gap-1.5">
              {data.days.map((d) => (
                <div key={d.date} className="flex-1 text-center">
                  <div className="text-[10px] font-semibold text-muted">{d.dow}</div>
                  <div className="font-data text-[11px]">{d.date.slice(8)}</div>
                  <div className="h-3 text-[9px] text-warn">{d.payday ? t("disp.demand.pay") : d.festival_ramp >= 0.5 ? "▲" : ""}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <section className="mt-6 md:mt-4 md:shrink-0">
        <Eyebrow>{t("disp.demand.atRisk")}</Eyebrow>
        {data.at_risk.length ? (
          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.at_risk.map((r) => (
              <Card key={r.date + r.depot} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{fmtDate(r.date)}</div>
                  <Pill tone="bad">{t("disp.demand.pctOf", { n: r.pct })}</Pill>
                </div>
                <div className="text-[13px] text-muted">{t("disp.demand.freshChilled", { depot: r.depot })}</div>
                <p className="mt-3 font-display text-[20px] leading-tight">{r.action}</p>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-muted">{t("disp.demand.none")}</p>
        )}
      </section>
      <p className="mt-4 max-w-[760px] text-[12px] text-muted md:shrink-0">{data.assumptions}</p>
    </div>
  );
}
