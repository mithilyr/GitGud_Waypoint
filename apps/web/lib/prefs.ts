"use client";

import { useCallback, useEffect, useState } from "react";

/** A per-device preference kept in localStorage (alert toggles, text size, density). */
export function usePref<T extends string | boolean>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null)
        setValue((typeof initial === "boolean" ? saved === "1" : saved) as T);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(
          key,
          typeof next === "boolean" ? (next ? "1" : "0") : next,
        );
      } catch {
        /* ignore */
      }
    },
    [key],
  );
  return [value, set] as const;
}

export type TextSize = "normal" | "large";
export type Density = "comfortable" | "compact";

/** Text size and density are applied as attributes on <html> (see globals.css). */
export function useTextSize() {
  const [size, setSize] = usePref<TextSize>("wp_text", "normal");
  useEffect(() => {
    document.documentElement.dataset.textSize = size;
  }, [size]);
  return [size, setSize] as const;
}

export function useDensity() {
  const [density, setDensity] = usePref<Density>("wp_density", "comfortable");
  useEffect(() => {
    document.documentElement.dataset.density = density;
  }, [density]);
  return [density, setDensity] as const;
}
