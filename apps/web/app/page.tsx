"use client";

import Link from "next/link";
import { Logo, VineRidges } from "@/components/ui";
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
    <main className="relative mx-auto flex min-h-dvh max-w-[980px] flex-col px-4 pb-44 pt-8 sm:px-8">
      <header className="flex items-center gap-3">
        <Logo size={44} />
        <div>
          <div className="text-[15px] font-semibold leading-tight">Waypoint</div>
          <div className="text-[12px] text-muted">{t("home.tagline")}</div>
        </div>
        <StatusPill />
        <div className="ml-3"><LanguageSwitch /></div>
      </header>

      <section className="mt-12 max-w-[640px]">
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1 className="mt-2 font-display text-[44px] font-medium leading-[1.05] tracking-[-0.015em] sm:text-[56px]">
          {t("home.title")}
        </h1>
        <p className="mt-4 text-[16px] text-muted">
          {t("home.lede")}
        </p>
      </section>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="hoverable group block rounded-[12px] border border-line bg-surface p-5 transition-colors hover:border-faint"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[24px] font-medium">{t(`role.${r.key}` as "role.dispatcher")}</span>
                <span className="eyebrow">{r.who}</span>
              </div>
              <p className="mt-1 text-[14px] text-muted">{t(`home.${r.key}.line` as "home.dispatcher.line")}</p>
              <p className="mt-4 text-[12px] font-semibold text-muted">{t(`home.${r.key}.device` as "home.dispatcher.device")} →</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-[12px] border border-line bg-surface p-5">
        <p className="eyebrow">{t("home.demo")}</p>
        <p className="mt-1 text-[14px] text-muted">{t("home.demoPassword")} <span className="font-data text-ink">waypoint2026</span></p>
        <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-[14px] sm:grid-cols-2">
          {[
            [t("role.dispatcher"), "dispatcher@waypoint.demo"],
            [t("role.loader"), t("home.demoLoader", { email: "loader@waypoint.demo" })],
            [t("role.driver"), t("home.demoDriver", { email: "driver@waypoint.demo" })],
            [t("role.store"), "store@waypoint.demo"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
              <dt className="text-muted">{k}</dt>
              <dd className="font-data text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <VineRidges className="fixed inset-x-0 bottom-0 -z-10" />
    </main>
  );
}
