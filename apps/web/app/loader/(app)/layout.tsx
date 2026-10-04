"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BottomTabs, PhoneHeader } from "@/components/Chrome";
import { TopBar } from "@/components/TopBar";
import { WaypointString } from "@/components/WaypointString";
import { Spinner, toast } from "@/components/ui";
import { get } from "@/lib/api";
import { useAuth, useRequireRole } from "@/lib/auth";
import { hhmm, initial } from "@/lib/format";
import { useClock } from "@/lib/hooks";
import { useT } from "@/lib/i18n";

type Note = { id: number; kind: string; title: string; body: string };

export default function LoaderShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useRequireRole("loader");
  const { t } = useT();
  const TABS = [
    {
      href: "/loader/departures",
      label: t("loader.nav.departures"),
      match: "/loader/departures",
      wide: true,
    },
    {
      href: "/loader/load",
      label: t("loader.nav.load"),
      match: "/loader/load",
      wide: false,
    },
    { href: "/loader/issues", label: t("loader.nav.issues"), wide: true },
    {
      href: "/loader/help",
      label: t("loader.nav.help"),
      also: ["/loader/settings"],
      wide: true,
    },
  ];
  const { logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const clock = useClock();
  const seen = useRef<number | null>(null);
  const [idle, setIdle] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const tick = async () => {
      try {
        const rows = await get<Note[]>("/loader/notifications");
        if (!alive || !rows.length) return;
        if (seen.current === null) {
          seen.current = rows[0].id;
          return;
        }
        for (const n of rows
          .filter((r) => r.id > (seen.current ?? 0))
          .reverse()) {
          toast(
            `${n.title}${n.body ? ` · ${n.body}` : ""}`,
            n.kind === "plan_changed" ? "warn" : "info",
          );
        }
        seen.current = rows[0].id;
      } catch {
        /* keep working on the last list */
      }
    };
    tick();
    const t = setInterval(tick, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  // Shared tablet: sign out after 5 minutes without a touch (Settings promises this).
  useEffect(() => {
    const reset = () => setIdle(0);
    const events = ["pointerdown", "keydown"];
    events.forEach((e) => window.addEventListener(e, reset));
    const t = setInterval(() => setIdle((i) => i + 1), 1000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearInterval(t);
    };
  }, []);
  useEffect(() => {
    if (idle >= 300 && user) {
      logout();
      router.replace("/loader");
    }
  }, [idle, user, logout, router]);

  if (!user)
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <Spinner />
      </div>
    );

  const onLoadDetail = path.startsWith("/loader/load/");
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      {/* Tablet and desktop: top bar with segmented tabs. Phone: compact header and bottom tabs. */}
      <TopBar
        home="/loader/departures"
        title={t("loader.brand")}
        subtitle={t("loader.depotLine", {
          depot: user.depot ?? "",
          dock: user.dock ?? "",
        })}
        tabs={TABS.filter((x) => x.wide)}
        label={t("loader.nav.sections")}
        clock={{ time: hhmm(clock) }}
        settings={{ href: "/loader/settings", label: t("settings.title") }}
        right={
          <button
            onClick={() => {
              logout();
              router.replace("/loader");
            }}
            className="flex h-9 items-center gap-2 rounded-[8px] border border-line bg-surface pl-2 pr-3 text-[13px] font-semibold"
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">
              {initial(user.name)}
            </span>
            {t("loader.switch", { name: user.name.split(" ")[0] })}
          </button>
        }
      />
      <div className="lg:hidden">
        <PhoneHeader
          label={t("loader.depotDock", {
            depot: user.depot ?? "",
            dock: user.dock ?? "",
          })}
          back={
            onLoadDetail
              ? "/loader/departures"
              : path.startsWith("/loader/settings")
                ? "/loader/help"
                : false
          }
          settings="/loader/settings"
        />
      </div>
      <main className="mx-auto w-full max-w-[1280px] px-6 py-6 lg:px-6">
        {children}
      </main>
      <WaypointString compact still className="mt-auto pt-10 lg:hidden" />
      <WaypointString
        still
        className="fixed inset-x-0 bottom-0 -z-10 opacity-40 blur-[2px] hidden lg:block"
      />
      <BottomTabs tabs={TABS} />
    </div>
  );
}
