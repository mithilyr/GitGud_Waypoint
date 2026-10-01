"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./ui";
import { useT } from "@/lib/i18n";

export type Tab = { href: string; label: string; match?: string; also?: string[]; exact?: boolean; badge?: number };

/** Phone header: back chevron on the left (none on a role's first screen), centred location label (Style guide: phone header). */
export function PhoneHeader({ label, back, right, settings }: { label: string; back?: boolean | string; right?: React.ReactNode; settings?: string | (() => void) }) {
  const router = useRouter();
  const { t } = useT();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center bg-bg px-3">
      <div className="w-16">
        {back ? (
          <button
            onClick={() => (typeof back === "string" ? router.push(back) : router.back())}
            aria-label={t("common.back")}
            className="-ml-2 grid h-11 w-11 place-items-center rounded-full text-ink hover:bg-neutral"
          >
            <Icon.Back />
          </button>
        ) : null}
      </div>
      <div className="flex-1 text-center text-[12px] font-medium text-muted">{label}</div>
      <div className="flex w-16 justify-end">
        {right}
        {settings ? <SettingsButton to={settings} label={t("settings.title")} /> : null}
      </div>
    </header>
  );
}

const HIDE_FROM = { md: "md:hidden", lg: "lg:hidden" } as const;

/** Phone bottom tab bar. Hidden from the `below` breakpoint up, where a TopBar takes over. */
/** The gear that opens Settings from any screen: a link when given a path, else a button. */
export function SettingsButton({ to, label }: { to: string | (() => void); label: string }) {
  const cls = "-mr-2 grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-neutral hover:text-ink";
  return typeof to === "string" ? (
    <Link href={to} aria-label={label} className={cls}>
      <Icon.Settings />
    </Link>
  ) : (
    <button onClick={to} aria-label={label} className={cls}>
      <Icon.Settings />
    </button>
  );
}

export function BottomTabs({ tabs, below = "lg" }: { tabs: Tab[]; below?: keyof typeof HIDE_FROM }) {
  const path = usePathname();
  return (
    <>
      <nav
        className={`safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface ${HIDE_FROM[below]}`}
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
