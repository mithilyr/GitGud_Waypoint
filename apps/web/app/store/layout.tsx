"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BottomTabs, PhoneHeader } from "@/components/Chrome";
import { TopBar } from "@/components/TopBar";
import { WaypointString } from "@/components/WaypointString";
import { Icon, Spinner } from "@/components/ui";
import { get, post } from "@/lib/api";
import { useAuth, useRequireRole } from "@/lib/auth";
import { initial } from "@/lib/format";
import { useT } from "@/lib/i18n";

export type Push = {
  id: number;
  kind: string;
  title: string;
  body: string;
  meta: Record<string, string | boolean>;
  at: string;
  read: boolean;
};
type StoreCtx = { pushes: Push[]; refreshPushes: () => void };
const Ctx = createContext<StoreCtx>({ pushes: [], refreshPushes: () => {} });
export const useStore = () => useContext(Ctx);

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useRequireRole("store");
  const { t } = useT();
  const { logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const tabs = [
    { href: "/store", label: t("store.nav.order"), exact: true },
    { href: "/store/track", label: t("store.nav.track") },
    { href: "/store/history", label: t("store.nav.history") },
    {
      href: "/store/help",
      label: t("store.nav.help"),
      also: ["/store/settings", "/store/contact"],
    },
  ];
  const back = path.startsWith("/store/settings")
    ? "/store/help"
    : path.startsWith("/store/contact")
      ? "/store/help"
      : undefined;
  const [pushes, setPushes] = useState<Push[]>([]);
  const [banner, setBanner] = useState<Push | null>(null);
  const seen = useRef<number | null>(null);

  const load = async () => {
    try {
      const rows = await get<Push[]>("/store/notifications");
      setPushes(rows);
      if (rows.length) {
        if (seen.current === null) seen.current = rows[0].id;
        else if (rows[0].id > seen.current) {
          const fresh = rows.find(
            (r) =>
              r.id > (seen.current ?? 0) &&
              ["deferral", "shortfall", "delivered"].includes(r.kind),
          );
          seen.current = rows[0].id;
          if (fresh) setBanner(fresh);
        }
      }
    } catch {
      /* offline counters keep the last state */
    }
  };
  useEffect(() => {
    if (!user) return;
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 9000);
    return () => clearTimeout(t);
  }, [banner]);

  if (!user)
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <Spinner />
      </div>
    );

  return (
    <Ctx.Provider value={{ pushes, refreshPushes: load }}>
      <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-10">
        <TopBar
          home="/store"
          title={t("store.brand")}
          subtitle={t("store.outlet", { name: user.outlet?.name ?? "" })}
          tabs={tabs}
          label={t("store.nav.sections")}
          settings={{ href: "/store/settings", label: t("settings.title") }}
          right={
            <button
              onClick={() => {
                logout();
                router.replace("/");
              }}
              className="flex h-9 items-center gap-2 rounded-[8px] border border-line bg-surface pl-2 pr-3 text-[13px] font-semibold"
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">
                {initial(user.name)}
              </span>
              {t("store.switch", { name: user.name.split(" ")[0] })}
            </button>
          }
        />
        <div className="lg:hidden">
          <PhoneHeader
            label={t("store.outlet", { name: user.outlet?.name ?? "" })}
            back={back}
            settings="/store/settings"
          />
        </div>
        {banner ? (
          <div className="rise fixed inset-x-0 top-2 z-40 mx-auto w-[calc(100%-24px)] max-w-[496px]">
            <button
              onClick={async () => {
                await post(`/store/notifications/${banner.id}/read`).catch(
                  () => {},
                );
                setBanner(null);
                router.push("/store/track");
              }}
              className="flex w-full items-start gap-3 rounded-[14px] border border-line bg-surface p-3 text-left shadow-xl"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary text-[13px] font-bold text-on-primary">
                W
              </span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow">{t("store.banner.eyebrow")}</span>
                <span className="mt-0.5 block font-semibold">
                  {banner.title}
                </span>
                <span className="block text-[14px] text-muted">
                  {banner.body}
                </span>
              </span>
              <Icon.Chevron className="mt-2 text-faint" />
            </button>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-[520px] px-6 py-6 lg:max-w-[1120px] lg:px-8 lg:py-8">
          {children}
        </main>
        <WaypointString compact still className="mt-auto pt-10 lg:hidden" />
        <WaypointString
          still
          className="fixed inset-x-0 bottom-0 -z-10 hidden lg:block"
        />
        <BottomTabs tabs={tabs} />
      </div>
    </Ctx.Provider>
  );
}
