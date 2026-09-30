"use client";

import Link from "next/link";
import { Card, Empty, ErrorNote, Eyebrow, Headline, Pill, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import { usePoll } from "@/lib/hooks";
import type { Departure } from "../departures/page";
import type { TripDetail } from "@/components/loader/LoadPanel";

type Row = { vehicle: string; tripId: number; flags: TripDetail["flags"] };

export default function IssuesPage() {
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
      <Eyebrow>Issues</Eyebrow>
      <Headline className="mt-1 !text-[28px]">Flags you have sent.</Headline>
      <p className="mt-1 text-[14px] text-muted">Ruwan&rsquo;s answers appear here as soon as he gives them.</p>
      {!data.length ? (
        <div className="mt-5"><Empty title="No flags.">If a count does not match, flag it from the load list before you release.</Empty></div>
      ) : (
        <div className="mt-4 space-y-3">
          {data.map((r) =>
            r.flags.map((f) => (
              <Link key={f.id} href={`/loader/load/${r.tripId}`}>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-data font-semibold">{r.vehicle}</span>
                    <Pill tone={f.status === "answered" ? "ok" : "warn"}>{f.status === "answered" ? (f.answer === "top_up" ? "Top up" : "Send as is") : "Waiting for Ruwan"}</Pill>
                  </div>
                  <div className="mt-1 font-semibold">{f.stop} · {f.group} {f.found} of {f.planned}</div>
                  <div className="text-[13px] text-muted">{f.reason.replace("_", " ")}</div>
                </Card>
              </Link>
            )),
          )}
        </div>
      )}
    </div>
  );
}
