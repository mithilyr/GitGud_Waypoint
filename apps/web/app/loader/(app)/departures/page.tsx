"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useWide } from "@/components/Chrome";
import { LoadPanel } from "@/components/loader/LoadPanel";
import { Card, Empty, ErrorNote, Eyebrow, Headline, Pill, Spinner, type Tone } from "@/components/ui";
import { get } from "@/lib/api";
import { fmtLong } from "@/lib/format";
import { usePoll } from "@/lib/hooks";

export type Departure = {
  trip_id: number;
  vehicle_id: string;
  kind: string;
  brand: string;
  district: string;
  trip_no: number;
  stops: number;
  depart: string | null;
  status: string;
  loaded: number;
  total: number;
  driver: string | null;
  released_at: string | null;
  change_note: string | null;
  change_at: string | null;
  change_lines: number;
};

const TONE: Record<string, Tone> = { RELEASED: "ok", LEFT: "ok", LOADING: "info", "PLAN CHANGED": "warn", "NOT STARTED": "neutral" };
const KEY = "wp_loader_trip";

function Departures() {
  const router = useRouter();
  const params = useSearchParams();
  const wide = useWide();
  const { data, error, loading, reload } = usePoll(() => get<{ date: string | null; dock: string; depot: string; trips: Departure[] }>("/loader/departures"), 3000);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    const saved = Number(sessionStorage.getItem(KEY));
    if (saved) setSel(saved);
  }, []);
  useEffect(() => {
    if (params.get("tab") === "load" && sel && !wide) router.replace(`/loader/load/${sel}`);
  }, [params, sel, wide, router]);

  if (loading && !data) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
  if (!data) return <ErrorNote error={error} retry={reload} />;

  const trips = data.trips;
  const active = trips.find((t) => t.trip_id === sel) ?? (wide ? trips.find((t) => t.status === "LOADING") ?? trips.find((t) => t.status === "PLAN CHANGED") ?? trips.find((t) => t.status === "NOT STARTED") ?? trips[0] : undefined);

  const list = (
    <div>
      <Eyebrow>Leaving {data.dock}{data.date ? ` · ${fmtLong(data.date)}` : ""}</Eyebrow>
      <Headline className="mt-1 !text-[28px]">Leaving {data.dock}</Headline>
      <p className="mt-1 text-[14px] text-muted">In departure order. Changes from the dispatcher show here straight away.</p>
      {!trips.length ? (
        <div className="mt-5"><Empty title="Nothing to load yet.">When Ruwan releases the plan, the {data.depot} vehicles appear here in departure order.</Empty></div>
      ) : (
        <ul className="mt-4 space-y-2">
          {trips.map((t) => (
            <li key={t.trip_id}>
              <button
                onClick={() => {
                  sessionStorage.setItem(KEY, String(t.trip_id));
                  setSel(t.trip_id);
                  if (!wide) router.push(`/loader/load/${t.trip_id}`);
                }}
                aria-current={active?.trip_id === t.trip_id}
                className={`hoverable w-full rounded-[12px] border bg-surface p-4 text-left ${active?.trip_id === t.trip_id && wide ? "border-ink" : "border-line"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-data text-[18px] font-semibold">{t.vehicle_id}</span>
                  <Pill tone={TONE[t.status] ?? "neutral"}>
                    {t.status === "LOADING" ? `Loading ${t.loaded}/${t.total}` : t.status === "LEFT" ? "Left" : t.status}
                  </Pill>
                </div>
                <div className="mt-0.5 text-[14px] text-muted">
                  {t.kind} · {t.brand} · {t.district} · {t.stops} stop{t.stops === 1 ? "" : "s"}
                </div>
                <div className="mt-0.5 text-[13px] text-muted">
                  {t.status === "RELEASED" || t.status === "LEFT" ? `Released ${t.released_at}` : `Leaves ${t.depart}`}
                  {t.driver ? ` · ${t.driver}` : ""}
                </div>
                {t.change_note ? <div className="mt-2 text-[13px] font-semibold text-warn">↻ {t.change_lines} line{t.change_lines === 1 ? "" : "s"} changed at {t.change_at} · review</div> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[13px] text-muted">No printed sheets. Always load from this list.</p>
    </div>
  );

  if (!wide) return <div className="rise mx-auto max-w-[520px]">{list}</div>;
  return (
    <div className="rise grid grid-cols-[380px_1fr] gap-6">
      {list}
      <Card className="p-5">{active ? <LoadPanel tripId={active.trip_id} onReleased={reload} /> : <Empty title="Pick a vehicle." />}</Card>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Departures />
    </Suspense>
  );
}
