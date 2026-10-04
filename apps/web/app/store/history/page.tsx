"use client";

import Link from "next/link";
import { Button, Card, Empty, ErrorNote, Headline, Lead, Pill, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";

type Row = { id: string; temp: string; status: string; service_date: string; summary: string; lines: unknown[] };

const TONE: Record<string, "ok" | "warn" | "info" | "neutral" | "bad"> = { received: "ok", issue_reported: "bad", deferred: "warn", delivered: "info", partial: "warn", failed: "bad" };
const STATUSES = ["received", "issue_reported", "deferred", "delivered", "partial", "failed"];

export default function HistoryPage() {
  const { t } = useT();
  const { user } = useAuth();
  const { data, error, loading, reload } = usePoll(() => get<Row[]>("/store/orders"), 8000);
  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;
  return (
    <div className="rise">
      <Lead>{t("store.history.eyebrow", { outlet: user?.outlet?.name ?? "" })}</Lead>
      <Headline className="mt-1">{t("store.history.title")}</Headline>
      {!data.length ? (
        <div className="mt-5"><Empty title={t("store.history.empty")}>{t("store.history.emptyBody")}</Empty></div>
      ) : (
        <div className="mt-5 space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          {data.map((o) => (
            <Link key={o.id} href="/store/track" className="block">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[16px] font-semibold">
                    {fmtDate(o.service_date)} · {o.temp === "chilled" ? t("common.chilled") : t("common.ambient")}
                  </div>
                  <Pill tone={TONE[o.status] ?? "neutral"}>{t(`store.history.status.${STATUSES.includes(o.status) ? o.status : "other"}` as Key)}</Pill>
                </div>
                <div className="mt-1 text-[14px] text-muted">{o.summary}</div>
                <div className="font-data mt-2 text-[12px] text-faint">{t("store.history.lines", { id: o.id, n: o.lines.length })}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Link href="/store" className="mt-6 block lg:inline-block">
        <Button size="lg" block className="lg:px-10">{t("store.order.reorder")}</Button>
      </Link>
    </div>
  );
}
