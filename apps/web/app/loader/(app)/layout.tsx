"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BottomTabs, PhoneHeader } from "@/components/Chrome";
import { Logo, Spinner, toast } from "@/components/ui";
import { get } from "@/lib/api";
import { useAuth, useRequireRole } from "@/lib/auth";
import { hhmm, initial } from "@/lib/format";
import { useClock } from "@/lib/hooks";

const TABS = [
  { href: "/loader/departures", label: "Departures", match: "/loader/departures" },
  { href: "/loader/departures?tab=load", label: "Load", match: "/loader/load" },
  { href: "/loader/issues", label: "Issues" },
  { href: "/loader/help", label: "Help" },
];

type Note = { id: number; kind: string; title: string; body: string };

export default function LoaderShell({ children }: { children: React.ReactNode }) {
  const user = useRequireRole("loader", "/loader");
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
        for (const n of rows.filter((r) => r.id > (seen.current ?? 0)).reverse()) {
          toast(`${n.title}${n.body ? ` · ${n.body}` : ""}`, n.kind === "plan_changed" ? "warn" : "info");
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

  if (!user) return <div className="grid min-h-dvh place-items-center text-muted"><Spinner /></div>;

  const onLoadDetail = path.startsWith("/loader/load/");
  return (
    <div className="min-h-dvh pb-[76px] lg:pb-0">
      {/* Tablet and desktop: top bar with segmented tabs. Phone: compact header and bottom tabs. */}
      <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-line bg-surface px-6 lg:flex">
        <Link href="/loader/departures" className="flex items-center gap-3">
          <Logo size={38} />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold">Waypoint Loader</div>
            <div className="text-[12px] text-muted">{user.depot} depot · {user.dock}</div>
          </div>
        </Link>
        <nav className="mx-auto flex rounded-[8px] bg-neutral p-0.5">
          {TABS.filter((t) => t.label !== "Load").map((t) => (
            <Link key={t.href} href={t.href} className={`flex h-9 items-center rounded-[6px] px-5 text-[14px] font-semibold ${path.startsWith(t.match ?? t.href) ? "bg-surface text-ink shadow-sm" : "text-muted"}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="font-data text-[15px] font-semibold tabular">{hhmm(clock)}</div>
        <button
          onClick={() => {
            logout();
            router.replace("/loader");
          }}
          className="flex h-10 items-center gap-2 rounded-full border border-line pl-1 pr-3 text-[13px] font-medium"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-neutral font-semibold">{initial(user.name)}</span>
          {user.name.split(" ")[0]} · Switch
        </button>
      </header>
      <div className="lg:hidden">
        <PhoneHeader
          label={`${user.depot} · ${user.dock}`}
          back={onLoadDetail ? "/loader/departures" : false}
          right={<span title={user.name} className="grid h-8 w-8 place-items-center rounded-full bg-neutral text-[13px] font-semibold">{initial(user.name)}</span>}
        />
      </div>
      <main className="mx-auto max-w-[1280px] px-4 py-5 lg:px-6">{children}</main>
      <BottomTabs tabs={TABS} />
    </div>
  );
}
