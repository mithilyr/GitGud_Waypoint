"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Logo } from "./ui";

export type TopTab = {
  href: string;
  label: string;
  match?: string;
  also?: string[];
  exact?: boolean;
};

const SHOW_FROM = { md: "hidden md:flex", lg: "hidden lg:flex" } as const;

/**
 * The wide-screen header (Style guide: tablet and desktop header): a 64 px surface bar with a hairline, the logo with
 * the product name over a location line, centred segmented tabs, an optional clock, and a slot on the right (user chip).
 * Below `from`, screens show the phone header and bottom tabs instead.
 */
export function TopBar({
  home,
  title,
  subtitle,
  tabs,
  clock,
  right,
  settings,
  label,
  from = "lg",
}: {
  home: string;
  title: string;
  subtitle?: string;
  tabs: TopTab[];
  clock?: { time: string; date?: string };
  right?: React.ReactNode;
  settings?: { href: string; label: string };
  label?: string;
  from?: keyof typeof SHOW_FROM;
}) {
  const path = usePathname();
  return (
    <header
      className={`sticky top-0 z-30 h-16 items-center gap-4 glass-bar border-b border-line px-6 ${SHOW_FROM[from]}`}
    >
      <Link href={home} className="flex items-center gap-3">
        <Logo size={38} />
        <div className="leading-tight">
          <div className="text-[15px] font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-[12px] font-medium text-muted">{subtitle}</div>
          ) : null}
        </div>
      </Link>
      <nav
        className="mx-auto flex rounded-[8px] bg-neutral p-0.5"
        aria-label={label}
      >
        {tabs.map((t) => {
          const on = t.exact
            ? path === t.href
            : [t.match ?? t.href, ...(t.also ?? [])].some((m) =>
                path.startsWith(m),
              );
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex h-8 items-center rounded-[6px] px-5 text-[14px] ${on ? "border border-line bg-surface font-semibold text-ink" : "font-medium text-muted hover:text-ink"}`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {clock ? (
        <div className="text-right leading-tight">
          <div className="font-data text-[15px] font-semibold tabular">
            {clock.time}
          </div>
          {clock.date ? (
            <div className="text-[11px] text-muted">{clock.date}</div>
          ) : null}
        </div>
      ) : null}
      {settings ? (
        <Link
          href={settings.href}
          aria-label={settings.label}
          title={settings.label}
          className="grid h-9 w-9 place-items-center rounded-[8px] text-muted hover:bg-neutral hover:text-ink"
        >
          <Icon.Settings />
        </Link>
      ) : null}
      {right}
    </header>
  );
}
