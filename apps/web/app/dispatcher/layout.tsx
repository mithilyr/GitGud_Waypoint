"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Icon, Logo, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { useAuth, useRequireRole } from "@/lib/auth";
import { fmtDate, hhmm, initial } from "@/lib/format";
import { useClock, useTheme } from "@/lib/hooks";

type DispatchCtx = { depot: string; setDepot: (d: string) => void; date: string; depots: string[] };
const Ctx = createContext<DispatchCtx | null>(null);
export const useDispatch = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("outside dispatcher layout");
  return c;
};

const TABS = [
  { href: "/dispatcher/orders", label: "Orders" },
  { href: "/dispatcher/plan", label: "Plan" },
  { href: "/dispatcher/live", label: "Live" },
  { href: "/dispatcher/demand", label: "Demand" },
];

type Note = { id: number; kind: string; title: string; body: string };

export default function DispatcherLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole("dispatcher");
  const { logout } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const clock = useClock();
  const { theme, setTheme } = useTheme();
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
      <div className="min-h-dvh">
        <header className="sticky top-0 z-30 border-b border-line bg-surface">
          <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
            <Link href="/dispatcher/orders" className="flex items-center gap-3">
              <Logo size={38} />
              <div className="hidden leading-tight sm:block">
                <div className="text-[15px] font-semibold">Waypoint Dispatch</div>
                <div className="text-[12px] text-muted">Peliyagoda planning office</div>
              </div>
            </Link>
            <nav className="mx-auto flex rounded-[8px] bg-neutral p-0.5" aria-label="Sections">
              {TABS.map((t) => {
                const on = path.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`flex h-9 items-center rounded-[6px] px-3.5 text-[14px] font-semibold sm:px-5 ${on ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <div className="hidden text-right leading-tight md:block">
              <div className="font-data text-[15px] font-semibold tabular">{hhmm(clock)}</div>
              <div className="text-[11px] text-muted">{fmtDate(new Date().toISOString().slice(0, 10))}</div>
            </div>
            <div className="relative">
              <button
                onClick={() => setMenu((m) => !m)}
                className="flex h-10 items-center gap-2 rounded-full border border-line pl-1 pr-3 text-[13px] font-medium"
                aria-haspopup="menu"
                aria-expanded={menu}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral font-semibold">{initial(user.name)}</span>
                <span className="hidden sm:inline">{user.name.split(" ")[0]} · Switch</span>
              </button>
              {menu ? (
                <div className="rise absolute right-0 top-12 z-40 w-64 rounded-[12px] border border-line bg-surface p-2 shadow-lg" role="menu">
                  <div className="px-3 py-2">
                    <div className="eyebrow">Depot</div>
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
                  <MenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Switch to Daylight" : "Switch to Dark"}</MenuItem>
                  <MenuItem
                    onClick={async () => {
                      if (!confirm("Reset the demo day? All orders, plans, loads and deliveries go back to the start.")) return;
                      await post("/demo/reset");
                      setMenu(false);
                      toast("Demo day reset. Queue restored.", "ok");
                      router.push("/dispatcher/orders");
                      setTimeout(() => location.reload(), 300);
                    }}
                  >
                    Reset the demo day
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      logout();
                      router.replace("/");
                    }}
                  >
                    Sign out
                  </MenuItem>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-6 sm:px-6">{children}</div>
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
