"use client";

import Link from "next/link";
import { Card, Empty, ErrorNote, Headline, Pill, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";
import type { Departure } from "../departures/page";
import type { TripDetail } from "@/components/loader/LoadPanel";

type Row = { vehicle: string; tripId: number; flags: TripDetail["flags"] };

export default function IssuesPage() {
  const { t } = useT();
  const { data, error, loading, reload } = usePoll(async () => {
    const deps = await get<{ trips: Departure[] }>("/loader/departures");
    const rows: Row[] = [];
    for (const t of deps.trips) {
      const d = await get<TripDetail>(`/loader/trips/${t.trip_id}`);
      if (d.flags.length) rows.push({ vehicle: t.vehicle_id, tripId: t.trip_id, flags: d.flags });
    }
    return rows;
  }, 5000);

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;
  return (
    <div className="rise mx-auto max-w-[620px]">
      <Headline className="mt-1">{t("loader.issues.title")}</Headline>
      <p className="mt-2 text-[14px] text-muted">{t("loader.issues.lede")}</p>
      {!data.length ? (
        <div className="mt-5"><Empty title={t("loader.issues.none")}>{t("loader.issues.noneBody")}</Empty></div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((r) =>
            r.flags.map((f) => (
              <Link key={f.id} href={`/loader/load/${r.tripId}`}>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-data font-semibold">{r.vehicle}</span>
                    <Pill tone={f.status === "answered" ? "ok" : "warn"}>{f.status === "answered" ? (f.answer === "top_up" ? t("loader.issues.topUp") : t("loader.issues.asIs")) : t("loader.load.waiting")}</Pill>
                  </div>
                  <div className="mt-1 font-semibold">{t("loader.issues.line", { stop: f.stop, g: f.group, f: f.found, n: f.planned })}</div>
                  <div className="text-[13px] text-muted">{t(`loader.reason.${f.reason}` as Key)}</div>
                </Card>
              </Link>
            )),
          )}
        </div>
      )}
    </div>
  );
}
