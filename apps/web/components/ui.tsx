"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/* ---------- Logo: Route-W (five stops joined into a W; the last, orange stop is delivered) ---------- */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size, height: size, borderRadius: size * 0.22, background: "var(--logo-tile)" }}
      aria-label="Waypoint"
    >
      <svg viewBox="0 0 59.04 59.04" width={size} height={size} aria-hidden>
        <path
          d="M7.38 13.84 L18.45 46.13 L29.52 24.91 L40.59 46.13 L51.66 13.84"
          fill="none"
          stroke="var(--logo-ink)"
          strokeWidth="4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {[
          [7.38, 13.84],
          [18.45, 46.13],
          [29.52, 24.91],
          [40.59, 46.13],
        ].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="4.61" fill="var(--logo-tile)" stroke="var(--logo-ink)" strokeWidth="2.58" />
        ))}
        <circle cx="51.66" cy="13.84" r="6.01" fill="var(--logo-dot)" />
      </svg>
    </span>
  );
}

/* ---------- Icons ---------- */
type IconProps = { className?: string; size?: number };
const base = (size: number) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

export const Icon = {
  Back: ({ className, size = 22 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  ),
  Check: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  Alert: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 8v5M12 16.5v.01" />
      <circle cx="12" cy="12" r="9.5" />
    </svg>
  ),
  Plus: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  Minus: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 12h14" />
    </svg>
  ),
  Phone: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
    </svg>
  ),
  Camera: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  ),
  Refresh: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M20 11a8 8 0 00-14-4L4 9M4 4v5h5M4 13a8 8 0 0014 4l2-2M20 20v-5h-5" />
    </svg>
  ),
  Chevron: ({ className, size = 18 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  ),
  Close: ({ className, size = 20 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  Wifi: ({ className, size = 16 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <path d="M2 9a15 15 0 0120 0M5 12.5a10 10 0 0114 0M8.5 16a5 5 0 017 0M12 19.5v.01" />
    </svg>
  ),
};

/* ---------- Pills, buttons, cards ---------- */
export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
const toneClass: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-info-bg text-info",
  neutral: "bg-neutral text-muted",
};

export function Pill({ tone = "neutral", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.6px] ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
  size?: "md" | "lg" | "sm";
  block?: boolean;
  busy?: boolean;
};

export function Button({ variant = "primary", size = "md", block, busy, className = "", children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: "bg-primary text-on-primary hover:opacity-90",
    secondary: "bg-surface text-ink border border-line hover:bg-neutral",
    danger: "bg-surface text-bad border border-bad-line hover:bg-bad-bg",
    ghost: "bg-transparent text-muted hover:text-ink",
    accent: "bg-accent text-[#111] hover:opacity-90",
  }[variant];
  const s = { sm: "h-9 px-3 text-[13px]", md: "h-11 px-4 text-[15px]", lg: "h-14 px-5 text-[16px]" }[size];
  return (
    <button
      {...rest}
      disabled={disabled || busy}
      className={`hoverable inline-flex select-none items-center justify-center gap-2 rounded-[6px] font-semibold transition-[opacity,background] duration-150 active:scale-[0.985] disabled:opacity-40 ${s} ${v} ${block ? "w-full" : ""} ${className}`}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} aria-label="Loading" />;
}

export function Card({ children, className = "", ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`rounded-[12px] border border-line bg-surface ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function Headline({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h1 className={`font-display text-[34px] font-medium leading-[1.1] tracking-[-0.8px] ${className}`}>{children}</h1>;
}

export function Bar({ pct, tone }: { pct: number; tone?: Tone }) {
  const t = tone ?? (pct > 100 ? "bad" : pct > 90 ? "warn" : "ok");
  const color = { ok: "var(--ok-fg)", warn: "var(--warn-fg)", bad: "var(--bad-fg)", info: "var(--info-fg)", neutral: "var(--muted)" }[t];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral">
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color }} />
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-[8px] bg-neutral p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 rounded-[6px] px-3 text-[13px] font-semibold transition-colors ${value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-[20px]">{title}</p>
      {children ? <p className="mx-auto mt-1 max-w-sm text-[14px] text-muted">{children}</p> : null}
    </div>
  );
}

export function ErrorNote({ error, retry }: { error: unknown; retry?: () => void }) {
  if (!error) return null;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] bg-bad-bg px-3 py-2 text-[13px] text-bad" role="alert">
      <span>{msg}</span>
      {retry ? (
        <button onClick={retry} className="font-semibold underline">
          Retry
        </button>
      ) : null}
    </div>
  );
}

/* ---------- Modal / sheet ---------- */
export function Sheet({ open, onClose, children, side = false, title }: { open: boolean; onClose: () => void; children: React.ReactNode; side?: boolean; title?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open || !mounted) return null;
  // Rendered on document.body so no animated or clipped ancestor can trap the fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex" style={{ background: "var(--overlay)" }} onClick={onClose} role="dialog" aria-modal aria-label={title}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`rise bg-surface text-ink shadow-xl ${side ? "ml-auto h-full w-full max-w-[460px] overflow-y-auto" : "m-auto max-h-[92dvh] w-full max-w-[560px] self-end overflow-y-auto rounded-t-[16px] sm:self-center sm:rounded-[16px]"}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** A phone-sized full screen above the app (boards S1a, S3a, S3b): same background as a page, closes on Escape. */
export function FullScreen({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open || !mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg text-ink" role="dialog" aria-modal aria-label={title}>
      <div className="rise mx-auto min-h-full max-w-[520px] px-6 pb-8 pt-14">{children}</div>
    </div>,
    document.body,
  );
}

/* ---------- Toasts ---------- */
type ToastMsg = { id: number; text: string; tone: Tone };
let toastId = 0;
export function toast(text: string, tone: Tone = "ok") {
  window.dispatchEvent(new CustomEvent("wp-toast", { detail: { id: ++toastId, text, tone } satisfies ToastMsg }));
}

export function ToastHost() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    const h = (e: Event) => {
      const t = (e as CustomEvent<ToastMsg>).detail;
      setItems((x) => [...x, t]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== t.id)), 4200);
    };
    window.addEventListener("wp-toast", h);
    return () => window.removeEventListener("wp-toast", h);
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`rise pointer-events-auto max-w-md rounded-[10px] px-4 py-2.5 text-[14px] font-medium shadow-lg ${toneClass[t.tone]} border border-line`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

/* ---------- Motifs: Liyawela vine, tea-row ridges (cultural motif from the style guide) ---------- */
export function VineHorizon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 390 34" preserveAspectRatio="none" className={`pointer-events-none w-full ${className}`} height="34" aria-hidden>
      <path d="M0 26 Q40 14 80 22 T160 20 T240 22 T320 18 T390 24 V34 H0Z" fill="var(--muted)" opacity="0.07" />
      <path d="M0 30 Q50 22 100 28 T200 26 T300 28 T390 27" fill="none" stroke="var(--muted)" strokeOpacity="0.28" strokeWidth="1" />
      {[30, 88, 146, 214, 266, 330].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i % 2 ? 22 : 25})`} opacity="0.45">
          <path d="M0 4 Q2 -3 7 -4 Q6 2 0 4Z" fill="var(--ok-fg)" opacity="0.5" />
          <circle cx="9" cy="-6" r="1.6" fill="var(--logo-dot)" opacity="0.7" />
        </g>
      ))}
    </svg>
  );
}

export function VineRidges({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 390 170" preserveAspectRatio="xMidYMax slice" className={`pointer-events-none w-full ${className}`} aria-hidden>
      <path d="M0 110 Q60 70 130 100 T260 90 T390 96 V170 H0Z" fill="var(--muted)" opacity="0.07" />
      <path d="M0 130 Q70 100 140 124 T270 116 T390 120 V170 H0Z" fill="var(--muted)" opacity="0.1" />
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <path key={r} d={`M0 ${138 + r * 5} Q90 ${126 + r * 5} 190 ${138 + r * 5} T390 ${134 + r * 5}`} fill="none" stroke="var(--ok-fg)" strokeOpacity="0.16" strokeWidth="1.2" />
      ))}
      <path d="M20 150 C60 90 100 130 150 70 S250 60 300 30" fill="none" stroke="var(--ok-fg)" strokeOpacity="0.5" strokeWidth="1.6" strokeLinecap="round" />
      {[
        [60, 110],
        [110, 108],
        [160, 76],
        [215, 66],
        [262, 50],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q8 -12 18 -10 q-2 12 -18 10z`} fill="var(--ok-fg)" opacity="0.4" />
      ))}
      <circle cx="304" cy="28" r="4" fill="var(--logo-dot)" opacity="0.9" />
      <circle cx="132" cy="94" r="3" fill="var(--logo-dot)" opacity="0.6" />
    </svg>
  );
}
