"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, Logo, VineHorizon } from "./ui";

export type Tab = { href: string; label: string; match?: string; badge?: number };

/** Phone header: back chevron on the left, centred location label (Style guide: phone header). */
export function PhoneHeader({ label, back, right }: { label: string; back?: boolean | string; right?: React.ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-line bg-bg/95 px-3 backdrop-blur">
      <div className="w-16">
        {back ? (
          <button
            onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
            aria-label="Back"
            className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-neutral"
          >
            <Icon.Back />
          </button>
        ) : (
          <Logo size={30} />
        )}
      </div>
      <div className="flex-1 text-center text-[12px] font-medium text-muted">{label}</div>
      <div className="flex w-16 justify-end">{right}</div>
    </header>
  );
}

export function BottomTabs({ tabs }: { tabs: Tab[] }) {
  const path = usePathname();
  return (
    <>
      <div className="fixed inset-x-0 bottom-[60px] z-10 mx-auto max-w-[520px] lg:hidden" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <VineHorizon />
      </div>
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden"
        aria-label="Sections"
      >
        <ul className="mx-auto flex max-w-[520px]">
          {tabs.map((t) => {
            const on = path.startsWith(t.match ?? t.href);
            return (
              <li key={t.href} className="flex-1">
                <Link href={t.href} className={`relative flex h-[60px] flex-col items-center justify-center gap-0.5 text-[12px] font-semibold ${on ? "text-ink" : "text-muted"}`}>
                  <span className={`h-1 w-6 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
                  {t.label}
                  {t.badge ? (
                    <span className="absolute right-[26%] top-2 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold text-bg">{t.badge}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

/** True at tablet width and above (the dock tablet shows departures and the load list side by side). */
export function useWide(min = 1024) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const q = window.matchMedia(`(min-width: ${min}px)`);
    const f = () => setWide(q.matches);
    f();
    q.addEventListener("change", f);
    return () => q.removeEventListener("change", f);
  }, [min]);
  return wide;
}
