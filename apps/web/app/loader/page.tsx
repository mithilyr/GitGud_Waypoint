"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ErrorNote, Logo, Spinner } from "@/components/ui";
import { WaypointString } from "@/components/WaypointString";
import { get } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initial } from "@/lib/format";
import { useT } from "@/lib/i18n";

type Person = { id: number; name: string; dock: string | null };

/** L1 · Dock sign-in on the shared tablet: tap your name, enter a 4-digit PIN. */
export default function LoaderSignIn() {
  const { t } = useT();
  const router = useRouter();
  const { user, ready, pinLogin } = useAuth();
  const [people, setPeople] = useState<Person[] | null>(null);
  const [who, setWho] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    get<Person[]>("/auth/people?role=loader&depot=Kandy")
      .then((p) => {
        setPeople(p);
        setWho(p[0] ?? null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (ready && user?.role === "loader") router.replace("/loader/departures");
  }, [ready, user, router]);

  async function press(k: string) {
    if (!who) return;
    setError(null);
    if (k === "⌫") return setPin((p) => p.slice(0, -1));
    const next = (pin + k).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      try {
        await pinLogin(who.id, next);
        router.replace("/loader/departures");
      } catch (e) {
        setError(e instanceof Error ? e.message : t("loader.signin.wrongPin"));
        setTimeout(() => setPin(""), 350);
      }
    }
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
    <main className="relative mx-auto flex w-full max-w-[520px] flex-1 flex-col px-5 pb-6 pt-8">
      <div className="flex items-center gap-3">
        <Logo size={40} />
        <div>
          <div className="text-[15px] font-semibold leading-tight">Waypoint</div>
          <div className="text-[13px] font-medium text-muted">{t("loader.signin.sub")}</div>
        </div>
      </div>
      <h1 className="mt-8 font-display text-[32px] font-medium leading-[1.2] tracking-[-0.7px]">{t("loader.signin.title")}</h1>
      <p className="mt-1 text-[14px] text-muted">{t("loader.signin.lede")}</p>
      <div className="mt-4"><LanguageSwitch /></div>

      {people === null ? (
        <div className="grid place-items-center py-10 text-muted"><Spinner /></div>
      ) : (
        <ul className="mt-5 grid gap-2">
          {people.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => {
                  setWho(p);
                  setPin("");
                  setError(null);
                }}
                aria-pressed={who?.id === p.id}
                className={`flex h-14 w-full items-center gap-3 rounded-[12px] border px-3 text-left ${who?.id === p.id ? "border-ink bg-surface" : "border-line bg-surface/60"}`}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-neutral font-semibold">{initial(p.name)}</span>
                <span className="text-[16px] font-semibold">{p.name}</span>
                {who?.id === p.id ? <span className="ml-auto text-[12px] font-medium text-muted">{t("loader.signin.selected")}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-center">
        <p className="text-[14px] font-semibold">{who ? t("loader.signin.enterPin", { name: who.name.split(" ")[0] }) : t("loader.signin.pickName")}</p>
        <div className="mt-3 flex justify-center gap-3" aria-label={t("loader.signin.digits", { n: pin.length })}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-3.5 w-3.5 rounded-full border-2 ${i < pin.length ? "border-ink bg-ink" : "border-faint"}`} />
          ))}
        </div>
        <div className="mt-2 min-h-5"><ErrorNote error={error} /></div>
      </div>

      <div className="mx-auto mt-2 grid w-full max-w-[320px] grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((k, i) =>
          k ? (
            <button
              key={i}
              onClick={() => press(k)}
              className="hoverable h-14 rounded-[12px] border border-line bg-surface text-[22px] font-medium active:bg-neutral"
              aria-label={k === "⌫" ? t("loader.signin.delete") : k}
            >
              {k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <p className="mt-4 text-center text-[12px] text-muted">{t("loader.signin.demoPins")}</p>
    </main>
    <div className="pt-6">
      <WaypointString />
    </div>
  </div>
  );
}
