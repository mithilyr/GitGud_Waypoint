"use client";

import { useEffect, useRef } from "react";

/** A finger-drawn signature. Emits a small PNG data URL, or null when cleared. */
export function SignaturePad({
  onChange,
}: {
  onChange: (dataUrl: string | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.strokeStyle =
      getComputedStyle(document.documentElement).getPropertyValue("--text") ||
      "#111";

    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      // Large text uses CSS zoom, so pointer pixels and canvas pixels differ by this factor.
      const k = c.clientWidth / r.width || 1;
      return [(e.clientX - r.left) * k, (e.clientY - r.top) * k] as const;
    };
    const down = (e: PointerEvent) => {
      drawing.current = true;
      c.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e: PointerEvent) => {
      if (!drawing.current) return;
      const [x, y] = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      dirty.current = true;
    };
    const up = () => {
      if (!drawing.current) return;
      drawing.current = false;
      if (dirty.current) onChange(c.toDataURL("image/png"));
    };
    c.addEventListener("pointerdown", down);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", up);
    c.addEventListener("pointerleave", up);
    return () => {
      c.removeEventListener("pointerdown", down);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", up);
      c.removeEventListener("pointerleave", up);
    };
  }, [onChange]);

  return (
    <div>
      <canvas
        ref={ref}
        className="h-28 w-full touch-none rounded-[10px] border border-dashed border-faint bg-surface"
        aria-label="Signature area"
      />
      <button
        type="button"
        className="mt-1 text-[12px] font-semibold text-muted underline"
        onClick={() => {
          const c = ref.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          dirty.current = false;
          onChange(null);
        }}
      >
        Clear signature
      </button>
    </div>
  );
}
