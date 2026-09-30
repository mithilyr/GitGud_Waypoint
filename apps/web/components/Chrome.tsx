"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, VineHorizon } from "./ui";
import { useT } from "@/lib/i18n";

export type Tab = { href: string; label: string; match?: string; also?: string[]; exact?: boolean; badge?: number };

/** Phone header: back chevron on the left (none on a role's first screen), centred location label (Style guide: phone header). */
export function PhoneHeader({ label, back, right }: { label: string; back?: boolean | string; right?: React.ReactNode }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center bg-bg px-3">
      <div className="w-16">
        {back ? (
          <button
            onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
            aria-label={t("common.back")}
            className="grid h-[29px] w-[29px] place-items-center rounded-full text-ink hover:bg-neutral"
          >
            <Icon.Back />
          </button>
        ) : null}
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
      <div className="fixed inset-x-0 bottom-[64px] z-10 mx-auto max-w-[520px] lg:hidden" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <VineHorizon />
      </div>
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface lg:hidden"
        aria-label="Sections"
      >
        <ul className="mx-auto flex max-w-[520px]">
          {tabs.map((t) => {
            const on = t.exact ? path === t.href : [t.match ?? t.href, ...(t.also ?? [])].some((m) => path.startsWith(m));
            return (
              <li key={t.href} className="flex-1">
                <Link href={t.href} className={`relative flex h-16 flex-col items-center justify-center gap-[6px] pt-1 text-[13px] ${on ? "font-bold text-ink" : "font-medium text-faint"}`}>
                  {t.label}
                  <span className={`h-[5px] w-[5px] rounded-full ${on ? "bg-primary" : "bg-transparent"}`} />
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
