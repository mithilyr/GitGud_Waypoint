"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useWide } from "@/components/Chrome";
import { LoadPanel } from "@/components/loader/LoadPanel";
import { Card, Empty, ErrorNote, Headline, Lead, Pill, Spinner, type Tone } from "@/components/ui";
import { get } from "@/lib/api";
import { fmtLong } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";

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
  const { t } = useT();
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
  const active = trips.find((x) => x.trip_id === sel) ?? (wide ? trips.find((x) => x.status === "LOADING") ?? trips.find((x) => x.status === "PLAN CHANGED") ?? trips.find((x) => x.status === "NOT STARTED") ?? trips[0] : undefined);

  const list = (
    <div>
      <Lead>{data.date ? fmtLong(data.date) : ""}</Lead>
      <Headline className="mt-1">{t("loader.dep.leaving", { dock: data.dock })}</Headline>
      <p className="mt-2 text-[14px] leading-[1.5] text-muted">{t("loader.dep.lede")}</p>
      {!trips.length ? (
        <div className="mt-5"><Empty title={t("loader.dep.empty")}>{t("loader.dep.emptyBody", { depot: data.depot })}</Empty></div>
      ) : (
        <ul className="mt-4 space-y-2">
          {trips.map((tr) => (
            <li key={tr.trip_id}>
              <button
                onClick={() => {
                  sessionStorage.setItem(KEY, String(tr.trip_id));
                  setSel(tr.trip_id);
                  if (!wide) router.push(`/loader/load/${tr.trip_id}`);
                }}
                aria-current={active?.trip_id === tr.trip_id}
                className={`hoverable w-full rounded-[12px] border bg-surface p-4 text-left ${active?.trip_id === tr.trip_id && wide ? "border-ink" : "border-line"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-data text-[17px] font-semibold">{tr.vehicle_id}</span>
                  <Pill tone={TONE[tr.status] ?? "neutral"}>
                    {tr.status === "LOADING" ? t("loader.dep.loading", { a: tr.loaded, b: tr.total }) : t(`loader.dep.status.${tr.status}` as Key)}
                  </Pill>
                </div>
                <div className="mt-0.5 text-[14px] text-muted">
                  {t("loader.dep.tripLine", { kind: tr.kind, brand: tr.brand, district: tr.district, n: tr.stops })}
                </div>
                <div className="font-data mt-0.5 text-[12px] text-muted">
                  {tr.status === "RELEASED" || tr.status === "LEFT" ? t("loader.dep.released", { t: tr.released_at ?? "" }) : t("loader.dep.leaves", { t: tr.depart ?? "" })}
                  {tr.driver ? ` · ${tr.driver}` : ""}
                </div>
                {tr.change_note ? <div className="mt-2 text-[12px] font-semibold text-bad">{t("loader.dep.changed", { n: tr.change_lines, t: tr.change_at ?? "" })}</div> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-[12px] font-medium text-muted">{t("loader.dep.noSheets")}</p>
    </div>
  );

  if (!wide) return <div className="rise mx-auto max-w-[520px]">{list}</div>;
  return (
    <div className="rise grid grid-cols-[380px_1fr] gap-6">
      {list}
      <Card className="p-5">{active ? <LoadPanel tripId={active.trip_id} onReleased={reload} /> : <Empty title={t("loader.dep.pick")} />}</Card>
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
