"use client";

import { useRouter } from "next/navigation";
import { Button, Card, ErrorNote, Headline, Pill, Spinner } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate, kg, m3 } from "@/lib/format";
import { useAction, usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";
import { useDispatch } from "../layout";

export type QueueOrder = {
  id: string;
  outlet: string;
  brand: string;
  temp: string;
  district: string;
  weight_kg: number;
  volume_m3: number;
  window: string;
  flags: string[];
  status: string;
};

type Queue = {
  depot: string;
  date: string;
  total: number;
  chilled: number;
  van_only: number;
  mall_dock: number;
  skipped: number;
  orders: QueueOrder[];
  plan: { id: number; status: string } | null;
};

const FLAG_TONE: Record<string, "bad" | "warn" | "info" | "neutral"> = { SKIPPED: "bad", CHILLED: "info", "VAN ONLY": "warn", "MALL WINDOW": "warn" };

export default function OrdersPage() {
  const { t } = useT();
  const { depot, date } = useDispatch();
  const router = useRouter();
  const { data, error, loading, reload } = usePoll(() => get<Queue>(`/dispatch/queue?depot=${depot}&date=${date}`), 6000, [depot, date]);
  const build = useAction(async () => {
    await post("/dispatch/plan", { depot, date });
    router.push("/dispatcher/plan");
  });

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  const skipped = data.orders.filter((o) => o.flags.includes("SKIPPED"));
  const day = fmtDate(data.date, { weekday: "long" });
  const skippedNames = [...new Set(skipped.map((o) => o.outlet))].slice(0, 2);

  return (
    <div className="rise">
      <p className="text-[13px] font-medium text-muted">{t("disp.orders.eyebrow", { depot, date: fmtDate(data.date) })}</p>
      <Headline className="mt-1">{t("disp.orders.title", { n: data.total, day })}</Headline>
      <p className="mt-3 max-w-[900px] text-[15px] text-muted">
        {t("disp.orders.chilled", { n: data.chilled })}
        {skippedNames.length ? t(skippedNames.length > 1 ? "disp.orders.skipMany" : "disp.orders.skipOne", { names: skippedNames.join(", ") }) : ""}
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="max-h-[56dvh] overflow-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line">
                {(["order", "outlet", "brand", "load", "window", "flag"] as const).map((h) => (
                  <th key={h} className="eyebrow px-4 py-3 font-semibold">
                    {t(`disp.orders.col.${h}` as Key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="h-12 border-b border-line last:border-0">
                  <td className="font-data px-4 font-semibold">{o.id}</td>
                  <td className="px-4 font-medium">{o.outlet}</td>
                  <td className="px-4 text-[14px] text-muted">
                    {o.temp === "chilled" ? `${o.brand} · ${t("disp.orders.kind.chilled")}` : o.brand === "Fresh" ? `${o.brand} · ${t("disp.orders.kind.dry")}` : o.brand}
                  </td>
                  <td className="font-data px-4 tabular">
                    {kg(o.weight_kg)} · {m3(o.volume_m3)}
                  </td>
                  <td className="px-4 text-[14px] text-muted">{o.window}</td>
                  <td className="px-4">
                    <div className="flex flex-wrap gap-1">
                      {o.status === "deferred" ? <Pill tone="warn">{t("disp.flag.deferred")}</Pill> : null}
                      {o.flags.map((f) => (
                        <Pill key={f} tone={FLAG_TONE[f] ?? "neutral"}>
                          {t(`disp.flag.${f}` as Key)}
                        </Pill>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 flex flex-wrap items-center gap-6">
        {[
          [t("disp.orders.total"), data.total],
          [t("disp.orders.chilledTile"), data.chilled],
          [t("disp.orders.vanOnly"), data.van_only],
          [t("disp.orders.mallDock"), data.mall_dock],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="eyebrow">{k}</div>
            <div className="font-display text-[26px] font-medium tabular">{v}</div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <ErrorNote error={build.error} />
          {data.plan ? (
            <Button variant="secondary" size="lg" onClick={() => router.push("/dispatcher/plan")}>
              {t("disp.orders.openPlan", { status: data.plan.status })}
            </Button>
          ) : null}
          {data.plan?.status !== "released" ? (
            <Button size="lg" busy={build.busy} onClick={() => build.run()}>
              {t(data.plan ? "disp.orders.rebuild" : "disp.orders.build", { day })}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
