"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { StatusPill } from "@/components/StatusPill";
import { Button, ErrorNote, Logo, Spinner } from "@/components/ui";
import { WaypointString } from "@/components/WaypointString";
import { getToken } from "@/lib/api";
import { HOME, Role, useAuth } from "@/lib/auth";
import { seedDriverDevice } from "@/lib/driver/device";
import { useT } from "@/lib/i18n";

const DEMO_PASSWORD = "waypoint2026";
const DEMO: { role: Role; email: string }[] = [
  { role: "dispatcher", email: "dispatcher@waypoint.demo" },
  { role: "loader", email: "loader@waypoint.demo" },
  { role: "driver", email: "driver@waypoint.demo" },
  { role: "store", email: "store@waypoint.demo" },
];
const ROLES: Role[] = ["dispatcher", "loader", "driver", "store"];

/**
 * The one way in. Everybody signs in here with their own account; the account's role decides which screens open
 * (dispatcher board, loader departures, driver run, store order), and each area refuses any other role.
 */
export default function SignIn() {
  const { t } = useT();
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in: go straight to your own screens.
  useEffect(() => {
    if (ready && user) router.replace(HOME[user.role]);
  }, [ready, user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email.trim(), password);
      const token = getToken();
      if (u.role === "driver" && token) await seedDriverDevice(token, u);
      router.replace(HOME[u.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
      setBusy(false);
    }
  }

  if (!ready || user) {
    return (
      <div className="grid min-h-dvh place-items-center text-muted">
        <Spinner />
      </div>
    );
  }

  const field = "mt-1 h-12 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink";
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <header className="mx-auto flex w-full max-w-[1100px] items-center gap-3 px-5 pt-5 sm:px-8">
        <Logo size={40} />
        <span className="text-[15px] font-semibold">Waypoint</span>
        <div className="ml-auto">
          <LanguageSwitch short />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1100px] flex-1 content-start gap-10 px-5 pb-44 pt-8 sm:px-8 sm:pb-56 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-20 lg:pt-16">
        {/* Desktop only: what Waypoint is. On a phone the sign-in form is the first thing you see. */}
        <section className="hidden lg:block lg:pt-10">
          <h1 className="font-display text-[56px] font-medium leading-[1.05] tracking-[-0.015em] [overflow-wrap:anywhere]">{t("home.title")}</h1>
          <p className="mt-4 max-w-[520px] text-[16px] leading-normal text-muted">{t("home.lede")}</p>
          <ul className="mt-8 flex flex-wrap gap-2" aria-hidden>
            {ROLES.map((r) => (
              <li key={r} className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-muted">
                {t(`role.${r}` as "role.dispatcher")}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="font-display text-[34px] font-medium leading-[1.12] tracking-[-0.8px] sm:text-[38px] lg:text-[34px]">{t("login.title")}</h2>
          <p className="mt-2 text-[15px] text-muted">{t("login.lede")}</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="eyebrow">{t("login.email")}</span>
              <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="eyebrow">{t("login.password")}</span>
              <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </label>
            <ErrorNote error={error} />
            <Button type="submit" size="xl" block busy={busy}>
              {t("login.submit")}
            </Button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted">
            {t("login.dock")}{" "}
            <Link href="/loader" className="font-semibold text-ink underline underline-offset-2">
              {t("login.dockLink")}
            </Link>
          </p>

          <details className="group mt-6 rounded-[12px] border border-line bg-surface">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[14px] font-semibold">
              {t("home.demo")}
              <span aria-hidden className="text-[18px] leading-none text-muted transition-transform group-open:rotate-90">›</span>
            </summary>
            <div className="border-t border-line px-4 pb-3 pt-3">
              <p className="text-[13px] text-muted">
                {t("home.demoPassword")} <span className="font-data text-ink">{DEMO_PASSWORD}</span>
              </p>
              <ul className="mt-1">
                {DEMO.map((d) => (
                  <li key={d.role} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium">{t(`role.${d.role}` as "role.dispatcher")}</div>
                      <div className="font-data truncate text-[12px] text-muted">{d.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(d.email);
                        setPassword(DEMO_PASSWORD);
                        setError(null);
                      }}
                      className="h-9 shrink-0 rounded-[8px] border border-line px-3 text-[13px] font-semibold hover:bg-neutral"
                    >
                      {t("login.demoUse")}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </details>

          <div className="mt-5 flex justify-center">
            <StatusPill />
          </div>
        </section>
      </main>
      {/* A fixed background along the bottom of the screen: it stays put while the page scrolls over it. */}
      <WaypointString className="fixed inset-x-0 bottom-0 -z-10" />
    </div>
  );
}
