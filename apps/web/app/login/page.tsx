"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, ErrorNote, Logo, VineRidges } from "@/components/ui";
import { HOME, Role, useAuth } from "@/lib/auth";

const DEMO: Record<Role, { email: string; label: string }> = {
  dispatcher: { email: "dispatcher@waypoint.demo", label: "Dispatcher" },
  loader: { email: "loader@waypoint.demo", label: "Loader" },
  driver: { email: "driver@waypoint.demo", label: "Driver" },
  store: { email: "store@waypoint.demo", label: "Store manager" },
};

function LoginForm() {
  const params = useSearchParams();
  const role = (params.get("role") as Role) in DEMO ? (params.get("role") as Role) : "dispatcher";
  const router = useRouter();
  const { login } = useAuth();
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
      setError(err instanceof Error ? err.message : "Could not sign in");
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
          <div className="text-[12px] text-muted">{DEMO[role].label} sign-in</div>
        </div>
      </div>
      <h1 className="font-display text-[34px] font-medium leading-[1.1]">Sign in</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="eyebrow">Email</span>
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
          <span className="eyebrow">Password</span>
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
        <Button type="submit" size="lg" block busy={busy}>
          Sign in
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
          Fill the demo {DEMO[role].label.toLowerCase()} account
        </Button>
      </form>
      <VineRidges className="fixed inset-x-0 bottom-0 -z-10" />
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
