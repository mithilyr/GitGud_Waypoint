"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

type State = "checking" | "up" | "waking";

// Free hosting puts the API to sleep when idle; the first request can take a minute.
// Retry instead of reporting it as broken.
export function StatusPill() {
  const { t } = useT();
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let stop = false;
    let tries = 0;
    async function check() {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const h = await r.json();
        if (h.status === "ok" && h.db === "ok") {
          if (!stop) setState("up");
          return;
        }
      } catch {
        /* fall through to retry */
      }
      tries += 1;
      if (stop) return;
      setState("waking");
      if (tries < 30) setTimeout(check, 4000);
    }
    check();
    return () => {
      stop = true;
    };
  }, []);

  const text = state === "up" ? t("status.online") : state === "waking" ? t("status.waking") : t("status.checking");
  const tone = state === "up" ? "text-ok" : state === "waking" ? "text-muted" : "text-muted";
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 text-[12px] ${tone}`} role="status">
      <span className="h-2 w-2 rounded-full bg-current" />
      {text}
    </span>
  );
}
