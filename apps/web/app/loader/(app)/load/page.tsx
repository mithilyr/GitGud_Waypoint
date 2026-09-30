"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWide } from "@/components/Chrome";
import { Empty, ErrorNote, Spinner } from "@/components/ui";
import { get } from "@/lib/api";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { KEY, type Departure } from "../departures/page";

/**
 * The Load tab. On a phone it opens the vehicle you were last loading, else the one most in need of loading
 * (loading, plan changed, not started, then the first). On a tablet or desktop the load list sits beside the departures, so it goes there.
 */
export default function LoadIndex() {
  const router = useRouter();
  const wide = useWide();
  const { t } = useT();
  const { data, error, reload } = usePoll(() => get<{ depot: string; trips: Departure[] }>("/loader/departures"));

  useEffect(() => {
    if (wide) {
      router.replace("/loader/departures");
      return;
    }
    if (!data || !data.trips.length) return;
    const saved = Number(sessionStorage.getItem(KEY));
    const pick =
      data.trips.find((x) => x.trip_id === saved) ??
      data.trips.find((x) => x.status === "LOADING") ??
      data.trips.find((x) => x.status === "PLAN CHANGED") ??
      data.trips.find((x) => x.status === "NOT STARTED") ??
      data.trips[0];
    router.replace(`/loader/load/${pick.trip_id}`);
  }, [wide, data, router]);

  if (error && !data) return <ErrorNote error={error} retry={reload} />;
  if (data && !data.trips.length) {
    return (
      <div className="mx-auto max-w-[520px]">
        <Empty title={t("loader.dep.empty")}>{t("loader.dep.emptyBody", { depot: data.depot })}</Empty>
      </div>
    );
  }
  return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;
}
