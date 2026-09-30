"use client";

import { useRouter } from "next/navigation";
import { Button, Card, Eyebrow, ErrorNote, Headline, Pill, Spinner } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate, kg, m3 } from "@/lib/format";
import { useAction, usePoll } from "@/lib/hooks";
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
      <Eyebrow>
        Orders · {depot} depot · for {fmtDate(data.date)}
      </Eyebrow>
      <Headline className="mt-1">
        {data.total} orders queued for {day}.
      </Headline>
      <p className="mt-2 max-w-[720px] text-[15px] text-muted">
        {data.chilled} are chilled and need a reefer slot.
        {skippedNames.length
          ? ` ${skippedNames.join(" and ")} ${skippedNames.length > 1 ? "were" : "was"} skipped on the last run, so ${skippedNames.length > 1 ? "they are" : "it is"} planned first.`
          : ""}
      </p>

      <Card className="mt-6 overflow-hidden">
        <div className="max-h-[56dvh] overflow-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line">
                {["Order", "Outlet", "Brand", "Load", "Window", "Flag"].map((h) => (
                  <th key={h} className="eyebrow px-4 py-3 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr key={o.id} className="h-12 border-b border-line last:border-0">
                  <td className="font-data px-4">{o.id}</td>
                  <td className="px-4 font-semibold">{o.outlet}</td>
                  <td className="px-4 text-[14px] text-muted">
                    {o.brand} · {o.temp === "chilled" ? "chilled" : o.brand === "Fresh" ? "dry" : o.district}
                  </td>
                  <td className="font-data px-4 tabular">
                    {kg(o.weight_kg)} · {m3(o.volume_m3)}
                  </td>
                  <td className="px-4 text-[14px] text-muted">{o.window}</td>
                  <td className="px-4">
                    <div className="flex flex-wrap gap-1">
                      {o.status === "deferred" ? <Pill tone="warn">Deferred</Pill> : null}
                      {o.flags.map((f) => (
                        <Pill key={f} tone={FLAG_TONE[f] ?? "neutral"}>
                          {f === "SKIPPED" ? "Skipped last run" : f}
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
          ["Total", data.total],
          ["Chilled", data.chilled],
          ["Van-only", data.van_only],
          ["Mall-dock", data.mall_dock],
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
              Open the {data.plan.status} plan
            </Button>
          ) : null}
          {data.plan?.status !== "released" ? (
            <Button size="lg" busy={build.busy} onClick={() => build.run()}>
              {data.plan ? "Rebuild" : "Build"} {day}&rsquo;s plan →
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
