"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Loads data now and again every `ms` milliseconds (the live board, load list and tracking use this). */
export function usePoll<T>(fn: () => Promise<T>, ms = 0, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const reload = useCallback(async () => {
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    reload();
    if (!ms) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, ms);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms, reload, ...deps]);

  return { data, error, loading, reload, setData };
}

/** Runs an async action with a busy flag and an error message. */
export function useAction<A extends unknown[], R>(fn: (...a: A) => Promise<R>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async (...a: A): Promise<R | undefined> => {
      setBusy(true);
      setError(null);
      try {
        return await fn(...a);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [fn],
  );
  return { run, busy, error, clear: () => setError(null) };
}

export function useTheme() {
  const [theme, setThemeState] = useState<"light" | "dark">("light");
  useEffect(() => {
    setThemeState(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const setTheme = (t: "light" | "dark") => {
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem("wp_theme", t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
  };
  return { theme, setTheme };
}

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  return now;
}
