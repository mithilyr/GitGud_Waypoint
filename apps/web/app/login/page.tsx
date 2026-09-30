"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ErrorNote, Logo } from "@/components/ui";
import { WaypointString } from "@/components/WaypointString";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { HOME, Role, useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

const DEMO: Record<Role, { email: string }> = {
  dispatcher: { email: "dispatcher@waypoint.demo" },
  loader: { email: "loader@waypoint.demo" },
  driver: { email: "driver@waypoint.demo" },
  store: { email: "store@waypoint.demo" },
};

function LoginForm() {
  const params = useSearchParams();
  const asked = params.get("role") ?? "";
  const role: Role = Object.hasOwn(DEMO, asked) ? (asked as Role) : "dispatcher";
  const router = useRouter();
  const { t } = useT();
  const { login } = useAuth();
  const roleLabel = t(`role.${role}` as "role.dispatcher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const u = await login(email.trim(), password);
      router.replace(HOME[u.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-5 pb-44 pt-10">
      <div className="mb-8 flex items-center gap-3">
        <Logo size={44} />
        <div>
          <div className="text-[15px] font-semibold leading-tight">Waypoint</div>
          <div className="text-[12px] text-muted">{t("login.signInFor", { role: roleLabel })}</div>
        </div>
      </div>
      <h1 className="font-display text-[34px] font-medium leading-[1.1] tracking-[-0.8px]">{t("login.title")}</h1>
      <div className="mt-4"><LanguageSwitch /></div>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="eyebrow">{t("login.email")}</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 h-12 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink"
          />
        </label>
        <label className="block">
          <span className="eyebrow">{t("login.password")}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 h-12 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink"
          />
        </label>
        <ErrorNote error={error} />
        <Button type="submit" size="xl" block busy={busy}>
          {t("login.submit")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          block
          onClick={() => {
            setEmail(DEMO[role].email);
            setPassword("waypoint2026");
          }}
        >
          {t("login.fill", { role: roleLabel })}
        </Button>
      </form>
      <WaypointString className="fixed inset-x-0 bottom-0 -z-10 !h-[140px] sm:!h-[200px]" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
