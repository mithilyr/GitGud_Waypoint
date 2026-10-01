"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BottomTabs, SettingsButton } from "@/components/Chrome";
import { TopBar } from "@/components/TopBar";
import { WaypointString } from "@/components/WaypointString";
import { Eyebrow, Icon, Logo, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { useAuth, useRequireRole } from "@/lib/auth";
import { fmtDate, hhmm, initial } from "@/lib/format";
import { useClock } from "@/lib/hooks";
import { useT } from "@/lib/i18n";

type DispatchCtx = { depot: string; setDepot: (d: string) => void; date: string; depots: string[] };
const Ctx = createContext<DispatchCtx | null>(null);
export const useDispatch = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("outside dispatcher layout");
  return c;
};

type Note = { id: number; kind: string; title: string; body: string };

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole("dispatcher");
  const { logout } = useAuth();
  const router = useRouter();
  const clock = useClock();
  const { t } = useT();
  const tabs = [
    { href: "/dispatcher/orders", label: t("disp.tab.orders") },
    { href: "/dispatcher/plan", label: t("disp.tab.plan") },
    { href: "/dispatcher/live", label: t("disp.tab.live") },
    { href: "/dispatcher/demand", label: t("disp.tab.demand") },
  ];
  const [depot, setDepotState] = useState("Kandy");
  const [date, setDate] = useState<string | null>(null);
  const [depots, setDepots] = useState<string[]>(["Kandy", "Peliyagoda"]);
  const [menu, setMenu] = useState(false);
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;
    get<{ depots: string[]; default_depot: string; service_date: string }>("/dispatch/context").then((c) => {
      setDepots(c.depots);
      setDate(c.service_date);
      const saved = sessionStorage.getItem("wp_depot");
      setDepotState(saved && c.depots.includes(saved) ? saved : c.default_depot);
    });
  }, [user]);

  // New orders, flags, conflicts and reports arrive as small toasts, so nothing waits for a phone call.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const tick = async () => {
      try {
        const rows = await get<Note[]>("/dispatch/notifications");
        if (!alive || rows.length === 0) return;
        if (seen.current === null) {
          seen.current = rows[0].id;
          return;
        }
        const fresh = rows.filter((r) => r.id > (seen.current ?? 0)).reverse();
        for (const n of fresh) {
          const bad = ["loader_flag", "count_conflict", "issue_report", "dispute", "reassigned_conflict"].includes(n.kind);
          toast(`${n.title}${n.body ? ` · ${n.body}` : ""}`, bad ? "warn" : "info");
        }
        if (fresh.length) seen.current = rows[0].id;
      } catch {
        /* offline: try again next tick */
      }
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [user]);

  if (!user || !date) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <Spinner />
      </div>
    );
  }

  const userMenu = (
  <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        className="flex h-9 items-center gap-2 rounded-[8px] border border-line bg-surface pl-2 pr-3 text-[13px] font-semibold"
        aria-haspopup="menu"
        aria-expanded={menu}
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">{initial(user.name)}</span>
        <span className="hidden sm:inline">{t("disp.switch", { name: user.name.split(" ")[0] })}</span>
      </button>
      {menu ? (
        <div className="rise absolute right-0 top-12 z-40 w-64 rounded-[12px] border border-line bg-surface p-2 shadow-lg" role="menu">
          <div className="px-3 py-2">
            <Eyebrow>{t("disp.menu.depot")}</Eyebrow>
            <div className="mt-1.5 flex gap-1.5">
              {depots.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDepotState(d);
                    sessionStorage.setItem("wp_depot", d);
                    setMenu(false);
                  }}
                  className={`h-8 flex-1 rounded-[6px] text-[13px] font-semibold ${d === depot ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <MenuItem
            onClick={() => {
              setMenu(false);
              router.push("/dispatcher/settings");
            }}
          >
            {t("disp.menu.settings")}
          </MenuItem>
          <MenuItem
            onClick={async () => {
              if (!confirm(t("disp.menu.resetConfirm"))) return;
              await post("/demo/reset");
              setMenu(false);
              toast(t("disp.menu.resetDone"), "ok");
              router.push("/dispatcher/orders");
              setTimeout(() => location.reload(), 300);
            }}
          >
            {t("disp.menu.reset")}
          </MenuItem>
          <MenuItem
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            {t("common.signOut")}
          </MenuItem>
        </div>
      ) : null}
    </div>
  
  );

  return (
    <Ctx.Provider
      value={{
        depot,
        depots,
        date,
        setDepot: (d) => {
          setDepotState(d);
          sessionStorage.setItem("wp_depot", d);
        },
      }}
    >
      <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <TopBar
          from="md"
          home="/dispatcher/orders"
          title={t("disp.brand")}
          subtitle={t("disp.office")}
          tabs={tabs}
          label={t("disp.sections")}
          clock={{ time: hhmm(clock), date: fmtDate(new Date().toISOString().slice(0, 10)) }}
          settings={{ href: "/dispatcher/settings", label: t("settings.title") }}
          right={userMenu}
        />
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-5 md:hidden">
          <Link href="/dispatcher/orders" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-[15px] font-semibold">{t("disp.brand")}</span>
          </Link>
          <div className="flex items-center gap-1">
            <SettingsButton to="/dispatcher/settings" label={t("settings.title")} />
            {userMenu}
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1440px] px-5 pb-6 pt-6 sm:px-8 md:pb-16">{children}</div>
        <WaypointString compact still className="mt-auto pt-6 md:hidden" />
        <BottomTabs below="md" tabs={tabs.map((x) => ({ href: x.href, label: x.label }))} />
      </div>
    </Ctx.Provider>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="hoverable flex h-10 w-full items-center justify-between rounded-[8px] px-3 text-left text-[14px] hover:bg-neutral" role="menuitem">
      {children}
      <Icon.Chevron size={16} className="text-faint" />
    </button>
  );
}
