"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BottomTabs, PhoneHeader } from "@/components/Chrome";
import { Icon, Spinner } from "@/components/ui";
import { get, post } from "@/lib/api";
import { useAuth, useRequireRole } from "@/lib/auth";

const TABS = [
  { href: "/store", label: "Order", match: "/store/order" },
  { href: "/store/track", label: "Track" },
  { href: "/store/history", label: "History" },
  { href: "/store/help", label: "Help" },
];

export type Push = { id: number; kind: string; title: string; body: string; meta: Record<string, string | boolean>; at: string; read: boolean };
type StoreCtx = { pushes: Push[]; refreshPushes: () => void };
const Ctx = createContext<StoreCtx>({ pushes: [], refreshPushes: () => {} });
export const useStore = () => useContext(Ctx);

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = useRequireRole("store");
  const { logout } = useAuth();
  const router = useRouter();
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
          const fresh = rows.find((r) => r.id > (seen.current ?? 0) && ["deferral", "shortfall", "delivered"].includes(r.kind));
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

  if (!user) return <div className="grid min-h-dvh place-items-center text-muted"><Spinner /></div>;

  return (
    <Ctx.Provider value={{ pushes, refreshPushes: load }}>
      <div className="min-h-dvh pb-[110px]">
        <PhoneHeader
          label={`${user.outlet?.name ?? "Outlet"} outlet`}
          right={
            <button onClick={() => { logout(); router.replace("/"); }} className="text-[12px] font-semibold text-muted underline">
              Sign out
            </button>
          }
        />
        {banner ? (
          <div className="rise fixed inset-x-0 top-2 z-40 mx-auto w-[calc(100%-24px)] max-w-[496px]">
            <button
              onClick={async () => {
                await post(`/store/notifications/${banner.id}/read`).catch(() => {});
                setBanner(null);
                router.push("/store/track");
              }}
              className="flex w-full items-start gap-3 rounded-[14px] border border-line bg-surface p-3 text-left shadow-xl"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary text-[13px] font-bold text-on-primary">W</span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow">Waypoint · Dispatch · now</span>
                <span className="mt-0.5 block font-semibold">{banner.title}</span>
                <span className="block text-[14px] text-muted">{banner.body}</span>
              </span>
              <Icon.Chevron className="mt-2 text-faint" />
            </button>
          </div>
        ) : null}
        <main className="mx-auto max-w-[520px] px-4 py-5">{children}</main>
        <BottomTabs tabs={TABS} />
      </div>
    </Ctx.Provider>
  );
}
