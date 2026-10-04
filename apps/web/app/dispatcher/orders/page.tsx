"use client";

import { useRouter } from "next/navigation";
import { ActionBar } from "@/components/ActionBar";
import {
  Button,
  Card,
  ErrorNote,
  Eyebrow,
  Headline,
  Lead,
  Pill,
  Spinner,
} from "@/components/ui";
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

const FLAG_TONE: Record<string, "bad" | "warn" | "info" | "neutral"> = {
  SKIPPED: "bad",
  CHILLED: "info",
  "VAN ONLY": "warn",
  "MALL WINDOW": "warn",
};

export default function OrdersPage() {
  const { t } = useT();
  const { depot, date } = useDispatch();
  const router = useRouter();
  const { data, error, loading, reload } = usePoll(
    () => get<Queue>(`/dispatch/queue?depot=${depot}&date=${date}`),
    6000,
    [depot, date],
  );
  const build = useAction(async () => {
    await post("/dispatch/plan", { depot, date });
    router.push("/dispatcher/plan");
  });

  if (loading && !data)
    return (
      <div className="grid place-items-center py-24 text-muted">
        <Spinner />
      </div>
    );
  if (!data) return <ErrorNote error={error} retry={reload} />;

  const skipped = data.orders.filter((o) => o.flags.includes("SKIPPED"));
  const day = fmtDate(data.date, { weekday: "long" });
  const skippedNames = [...new Set(skipped.map((o) => o.outlet))].slice(0, 2);

  return (
    <div className="rise">
      <Lead>
        {t("disp.orders.eyebrow", { depot, date: fmtDate(data.date) })}
      </Lead>
      <Headline className="mt-1">
        {t("disp.orders.title", { n: data.total, day })}
      </Headline>
      <p className="mt-3 max-w-[900px] text-[15px] text-muted">
        {t("disp.orders.chilled", { n: data.chilled })}
        {skippedNames.length
          ? t(
              skippedNames.length > 1
                ? "disp.orders.skipMany"
                : "disp.orders.skipOne",
              { names: skippedNames.join(", ") },
            )
          : ""}
      </p>

      <Card className="mt-6 hidden overflow-hidden md:block">
        <div className="max-h-[56dvh] overflow-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-line">
                {(
                  [
                    "order",
                    "outlet",
                    "brand",
                    "load",
                    "window",
                    "flag",
                  ] as const
                ).map((h) => (
                  <th key={h} className="eyebrow px-4 py-3 font-semibold">
                    {t(`disp.orders.col.${h}` as Key)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.orders.map((o) => (
                <tr
                  key={o.id}
                  className="h-12 border-b border-line last:border-0"
                >
                  <td className="font-data px-4 font-semibold">{o.id}</td>
                  <td className="px-4 font-medium">{o.outlet}</td>
                  <td className="px-4 text-[14px] text-muted">
                    {o.temp === "chilled"
                      ? `${o.brand} · ${t("disp.orders.kind.chilled")}`
                      : o.brand === "Fresh"
                        ? `${o.brand} · ${t("disp.orders.kind.dry")}`
                        : o.brand}
                  </td>
                  <td className="font-data px-4 tabular">
                    {kg(o.weight_kg)} · {m3(o.volume_m3)}
                  </td>
                  <td className="px-4 text-[14px] text-muted">{o.window}</td>
                  <td className="px-4">
                    <div className="flex flex-wrap gap-1">
                      {o.status === "deferred" ? (
                        <Pill tone="warn">{t("disp.flag.deferred")}</Pill>
                      ) : null}
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

      {/* Phones: one card per order */}
      <div className="mt-5 space-y-3 md:hidden">
        {data.orders.map((o) => (
          <Card key={o.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <span className="font-data text-[14px] font-semibold">
                {o.id}
              </span>
              <div className="flex flex-wrap justify-end gap-1">
                {o.status === "deferred" ? (
                  <Pill tone="warn">{t("disp.flag.deferred")}</Pill>
                ) : null}
                {o.flags.map((f) => (
                  <Pill key={f} tone={FLAG_TONE[f] ?? "neutral"}>
                    {t(`disp.flag.${f}` as Key)}
                  </Pill>
                ))}
              </div>
            </div>
            <div className="mt-1 text-[15px] font-medium">{o.outlet}</div>
            <div className="mt-0.5 text-[13px] text-muted">
              {o.temp === "chilled"
                ? `${o.brand} · ${t("disp.orders.kind.chilled")}`
                : o.brand === "Fresh"
                  ? `${o.brand} · ${t("disp.orders.kind.dry")}`
                  : o.brand}{" "}
              · {o.window}
            </div>
            <div className="font-data mt-1 text-[12px] text-muted tabular">
              {kg(o.weight_kg)} · {m3(o.volume_m3)}
            </div>
          </Card>
        ))}
      </div>

      {/* The totals sit in the bottom bar, clear of the waypoint string. */}
      <ActionBar
        note={
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            {[
              [t("disp.orders.total"), data.total],
              [t("disp.orders.chilledTile"), data.chilled],
              [t("disp.orders.vanOnly"), data.van_only],
              [t("disp.orders.mallDock"), data.mall_dock],
            ].map(([k, v]) => (
              <div key={k}>
                <Eyebrow>{k}</Eyebrow>
                <div className="font-display text-[26px] font-medium leading-none tabular text-ink">
                  {v}
                </div>
              </div>
            ))}
            <ErrorNote error={build.error} />
          </div>
        }
      >
        {data.plan && data.plan.status !== "released" ? (
          <Button
            variant="secondary"
            size="lg"
            busy={build.busy}
            onClick={() => build.run()}
          >
            {t("disp.plan.rebuild")}
          </Button>
        ) : null}
        {data.plan ? (
          <Button size="lg" onClick={() => router.push("/dispatcher/plan")}>
            {t("disp.orders.openPlan")}
          </Button>
        ) : (
          <Button size="lg" busy={build.busy} onClick={() => build.run()}>
            {t("disp.orders.build", { day })}
          </Button>
        )}
      </ActionBar>
    </div>
  );
}
