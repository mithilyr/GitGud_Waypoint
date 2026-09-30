"use client";

import Link from "next/link";
import { Button, Card, Empty, ErrorNote, Eyebrow, Headline, Pill, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { usePoll } from "@/lib/hooks";

type Row = { id: string; temp: string; status: string; service_date: string; summary: string; lines: unknown[] };

const TONE: Record<string, "ok" | "warn" | "info" | "neutral" | "bad"> = { received: "ok", issue_reported: "bad", deferred: "warn", delivered: "info", partial: "warn", failed: "bad" };

export default function HistoryPage() {
  const { data, error, loading, reload } = usePoll(() => get<Row[]>("/store/orders"), 8000);
  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;
  return (
    <div className="rise">
      <Eyebrow>Past orders</Eyebrow>
      <Headline className="mt-1">History</Headline>
      {!data.length ? (
        <div className="mt-4"><Empty title="No orders yet.">Your orders and how each delivery went are listed here.</Empty></div>
      ) : (
        <div className="mt-4 space-y-2">
          {data.map((o) => (
            <Link key={o.id} href="/store/track">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{fmtDate(o.service_date)} · {o.temp === "chilled" ? "Chilled" : "Ambient"}</div>
                  <Pill tone={TONE[o.status] ?? "neutral"}>{o.status.replace("_", " ")}</Pill>
                </div>
                <div className="mt-0.5 text-[14px] text-muted">{o.summary}</div>
                <div className="font-data mt-1 text-[12px] text-faint">{o.id} · {o.lines.length} lines</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Link href="/store" className="mt-5 block">
        <Button size="lg" block variant="secondary">Reorder last week</Button>
      </Link>
    </div>
  );
}
