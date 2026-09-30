"use client";

import Link from "next/link";
import { Logo } from "@/components/ui";
import { WaypointString } from "@/components/WaypointString";
import { StatusPill } from "@/components/StatusPill";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { useT } from "@/lib/i18n";

const roles = [
  { href: "/dispatcher", key: "dispatcher", who: "Ruwan" },
  { href: "/loader", key: "loader", who: "Kamal" },
  { href: "/driver", key: "driver", who: "Nuwan" },
  { href: "/store", key: "store", who: "Shanika" },
] as const;

export default function Home() {
  const { t } = useT();
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
    <main className="relative mx-auto w-full max-w-[980px] flex-1 px-5 pt-8 sm:px-8">
      {/* Top row: system status on the left, language on the right (wraps on a narrow phone). */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <StatusPill />
        <LanguageSwitch />
      </header>

      {/* Greeting: the mark, big and in the middle, then the title and intro. */}
      <section className="mx-auto mt-16 flex max-w-[640px] flex-col items-center text-center sm:mt-20">
        <Logo size={112} />
        <p className="eyebrow mt-12">{t("home.eyebrow")}</p>
        <h1 className="mt-3 font-display text-[38px] font-medium leading-[1.1] tracking-[-0.015em] [overflow-wrap:anywhere] sm:text-[56px] sm:leading-[1.05]">
          {t("home.title")}
        </h1>
        <p className="mt-5 text-[17px] leading-relaxed text-muted sm:mt-4 sm:text-[16px] sm:leading-normal">
          {t("home.lede")}
        </p>
      </section>

      <ul className="mt-10 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-3">
        {roles.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="hoverable group block rounded-[14px] border border-line bg-surface p-6 transition-colors hover:border-faint sm:rounded-[12px] sm:p-5"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[28px] font-medium sm:text-[24px]">{t(`role.${r.key}` as "role.dispatcher")}</span>
                <span className="eyebrow">{r.who}</span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-muted sm:mt-1 sm:leading-normal">{t(`home.${r.key}.line` as "home.dispatcher.line")}</p>
              <p className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[14px] font-semibold text-muted sm:mt-4 sm:block sm:border-0 sm:pt-0 sm:text-[12px]">
                <span>{t(`home.${r.key}.device` as "home.dispatcher.device")}</span>
                <span aria-hidden className="sm:ml-1">→</span>
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-12 rounded-[14px] border border-line bg-surface p-6 sm:mt-10 sm:rounded-[12px] sm:p-5">
        <p className="eyebrow">{t("home.demo")}</p>
        <p className="mt-2 text-[15px] text-muted sm:mt-1 sm:text-[14px]">{t("home.demoPassword")} <span className="font-data text-ink">waypoint2026</span></p>
        <dl className="mt-4 grid gap-x-8 text-[14px] sm:mt-3 sm:grid-cols-2 sm:gap-y-1.5">
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
      </section>

    </main>
    <div className="pt-16">
      <WaypointString />
    </div>
    </div>
  );
}
