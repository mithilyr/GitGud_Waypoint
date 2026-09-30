"use client";

import Link from "next/link";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { StatusPill } from "@/components/StatusPill";
import { Logo } from "@/components/ui";
import { WaypointString } from "@/components/WaypointString";
import { useT } from "@/lib/i18n";

type RoleKey = "dispatcher" | "loader" | "driver" | "store";

// One colour per role, from the theme tokens, so the tiles read in Daylight and Dark.
const roles: { href: string; key: RoleKey; who: string; bg: string; fg: string }[] = [
  { href: "/dispatcher", key: "dispatcher", who: "Ruwan", bg: "var(--info-bg)", fg: "var(--info-fg)" },
  { href: "/loader", key: "loader", who: "Kamal", bg: "var(--warn-bg)", fg: "var(--warn-fg)" },
  { href: "/driver", key: "driver", who: "Nuwan", bg: "var(--ok-bg)", fg: "var(--ok-fg)" },
  { href: "/store", key: "store", who: "Shanika", bg: "color-mix(in srgb, var(--logo-dot) 16%, var(--surface))", fg: "var(--mark-dot)" },
];

function RoleIcon({ role }: { role: RoleKey }) {
  const common = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (role) {
    case "dispatcher": // the plan board
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "loader": // a crate
      return (
        <svg {...common}>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.3 7 12 12l8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case "driver": // a truck
      return (
        <svg {...common}>
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
          <path d="M15 18H9" />
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
          <circle cx="17" cy="18" r="2" />
          <circle cx="7" cy="18" r="2" />
        </svg>
      );
    case "store": // a storefront
      return (
        <svg {...common}>
          <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
          <path d="M2 7h20v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-2-.9 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0 2.7 2.7 0 0 1-4 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2z" />
        </svg>
      );
  }
}

export default function Home() {
  const { t } = useT();
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <main className="relative mx-auto w-full max-w-[980px] flex-1 px-5 pb-40 pt-5 sm:px-8 sm:pb-56">
        {/* Slim bar: the mark on the left; language and system status on the right (status drops to its own line on a narrow phone). */}
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Logo size={40} />
          <div className="ml-auto">
            <LanguageSwitch />
          </div>
          <div className="order-last w-full sm:order-none sm:w-auto">
            <StatusPill />
          </div>
        </header>

        <section className="mt-12 sm:mt-14">
          <h1 className="font-display text-[40px] font-medium leading-[1.08] tracking-[-0.015em] [overflow-wrap:anywhere] sm:text-[56px] sm:leading-[1.05]">{t("home.who")}</h1>
          <p className="mt-3 max-w-[560px] text-[17px] leading-relaxed text-muted sm:text-[16px] sm:leading-normal">{t("home.pick")}</p>
        </section>

        <ul className="mt-8 grid grid-cols-2 gap-3">
          {roles.map((r) => (
            <li key={r.href}>
              <Link
                href={r.href}
                className="hoverable group flex h-full flex-col rounded-[16px] border border-line bg-surface p-4 transition-colors hover:border-faint sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-[14px] sm:h-14 sm:w-14" style={{ background: r.bg, color: r.fg }}>
                    <RoleIcon role={r.key} />
                  </span>
                  <span className="eyebrow mt-1 hidden sm:inline">{r.who}</span>
                </div>
                <div className="mt-4 font-display text-[22px] font-medium leading-tight sm:mt-5 sm:text-[26px]">{t(`role.${r.key}` as "role.dispatcher")}</div>
                <p className="mt-1 text-[14px] font-medium leading-snug sm:text-[16px]" style={{ color: r.fg }}>
                  {t(`home.verb.${r.key}` as "home.verb.dispatcher")}
                </p>
                <div className="mt-auto pt-4">
                  <p className="flex items-end justify-between gap-2 border-t border-line pt-3 text-[12px] font-semibold leading-snug text-muted sm:pt-4 sm:text-[13px]">
                    <span>{t(`home.${r.key}.device` as "home.dispatcher.device")}</span>
                    <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <details className="group mt-6 rounded-[16px] border border-line bg-surface">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 text-[15px] font-semibold sm:px-5">
            {t("home.demo")}
            <span aria-hidden className="text-[18px] leading-none text-muted transition-transform group-open:rotate-90">›</span>
          </summary>
          <div className="border-t border-line px-6 pb-5 pt-4 sm:px-5">
            <p className="text-[15px] text-muted sm:text-[14px]">
              {t("home.demoPassword")} <span className="font-data text-ink">waypoint2026</span>
            </p>
            <dl className="mt-3 grid gap-x-8 text-[14px] sm:grid-cols-2 sm:gap-y-1.5">
              {[
                [t("role.dispatcher"), "dispatcher@waypoint.demo"],
                [t("role.loader"), t("home.demoLoader", { email: "loader@waypoint.demo" })],
                [t("role.driver"), t("home.demoDriver", { email: "driver@waypoint.demo" })],
                [t("role.store"), "store@waypoint.demo"],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 border-b border-line py-3 last:border-0 sm:flex-row sm:justify-between sm:gap-3 sm:py-1.5">
                  <dt className="text-[13px] font-medium text-muted sm:text-[14px] sm:font-normal">{k}</dt>
                  <dd className="font-data break-all sm:text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      </main>
      {/* A fixed background along the bottom of the screen: it stays put while the sections scroll over it. */}
      <WaypointString className="fixed inset-x-0 bottom-0 -z-10" />
    </div>
  );
}
