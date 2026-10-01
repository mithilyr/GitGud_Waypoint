"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

/* ---------- Logo: Route-W (five stops joined into a W; the last, orange stop is delivered) ---------- */
const MARK_STOPS = [
  [7.38, 13.84],
  [18.45, 46.13],
  [29.52, 24.91],
  [40.59, 46.13],
] as const;

/**
 * Default: the bare mark on a transparent background with a faint glow behind it (`--logo-glow`). The string is
 * masked around each stop ring, so nothing is filled and it sits on any surface; ink and the orange stop follow the theme.
 * `tile`: the mark on a filled rounded tile, for app icons only.
 * Standalone files: /logo/waypoint-mark-for-light.svg and /logo/waypoint-mark-for-dark.svg.
 */
export function Logo({ size = 40, tile = false }: { size?: number; tile?: boolean }) {
  const id = useId();
  const ink = tile ? "var(--logo-ink)" : "var(--mark-ink)";
  const dot = tile ? "var(--logo-dot)" : "var(--mark-dot)";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${tile ? "overflow-hidden" : ""}`}
      style={tile ? { width: size, height: size, borderRadius: size * 0.22, background: "var(--logo-tile)" } : { width: size, height: size }}
      role="img"
      aria-label="Waypoint"
    >
      {tile ? null : (
        <span aria-hidden className="pointer-events-none absolute rounded-full" style={{ inset: -size * 0.38, background: "radial-gradient(closest-side, var(--logo-glow), transparent)" }} />
      )}
      <svg className="relative" viewBox="0 0 59.04 59.04" width={size} height={size} aria-hidden>
        {tile ? null : (
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="59.04" height="59.04">
            <rect width="59.04" height="59.04" fill="#fff" />
            {MARK_STOPS.map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="5.9" fill="#000" />
            ))}
            <circle cx="51.66" cy="13.84" r="7.4" fill="#000" />
          </mask>
        )}
        <path
          mask={tile ? undefined : `url(#${id})`}
          d="M7.38 13.84 L18.45 46.13 L29.52 24.91 L40.59 46.13 L51.66 13.84"
          fill="none"
          stroke={ink}
          strokeWidth="4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {MARK_STOPS.map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="4.61" fill={tile ? "var(--logo-tile)" : "none"} stroke={ink} strokeWidth="2.58" />
        ))}
        <circle cx="51.66" cy="13.84" r="6.01" fill={dot} />
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
  Settings: ({ className, size = 20 }: IconProps) => (
    <svg {...base(size)} className={className} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.01A1.7 1.7 0 0 0 20.91 10H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
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
      className={`inline-flex h-6 max-w-full items-center truncate whitespace-nowrap rounded-full px-3 sm:h-[22px] sm:px-2.5 text-[10px] font-bold uppercase tracking-[0.6px] ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "accent";
  /** sm 34 · md 44 · lg 48 · xl 52 (the design's inline, field, secondary and primary call-to-action heights). */
  size?: "sm" | "md" | "lg" | "xl";
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
  const s = { sm: "h-10 px-3 text-[13px] sm:h-[34px]", md: "h-12 px-4 text-[15px] sm:h-11", lg: "h-12 px-5 text-[15px]", xl: "h-14 px-5 text-[15px] sm:h-[52px]" }[size];
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
  return <h1 className={`font-display text-[34px] font-medium leading-[1.1] tracking-[-0.8px] [overflow-wrap:anywhere] ${className}`}>{children}</h1>;
}

/** The one line above a headline: where you are (13 / 500, muted). `mono` for IDs and times. */
export function Lead({ children, mono = false, className = "" }: { children: React.ReactNode; mono?: boolean; className?: string }) {
  return <p className={`${mono ? "font-data " : ""}text-[13px] font-medium text-muted ${className}`}>{children}</p>;
}

/** A sentence-case label above a list or group (13 / 600). Column headers and small caps use `Eyebrow`. */
export function SectionLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-[13px] font-semibold ${className}`}>{children}</div>;
}

/** A stat tile: small caps label, Newsreader value, optional mono sub-line (boards S1, S2, R1). */
export function Tile({ label, value, sub, className = "" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <Card className={`min-h-[108px] p-4 ${className}`}>
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 font-display text-[24px] font-medium leading-tight tabular">{value}</div>
      {sub ? <div className="font-data mt-2 text-[12px] text-muted">{sub}</div> : null}
    </Card>
  );
}

/** A label with its value underneath, used in summary cards (boards S3b, S3c). Put several in a `Card` with `divide-y`. */
export function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-3">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1 text-[14px] font-medium">{value}</div>
    </div>
  );
}

/** A filter / choice chip (30 px, fully rounded); `on` fills it with the primary colour. */
export function Chip({ on, onClick, children, className = "" }: { on: boolean; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} aria-pressed={on} className={`h-10 shrink-0 rounded-full px-4 text-[13px] font-medium sm:h-[30px] ${on ? "bg-primary text-on-primary" : "bg-neutral text-muted"} ${className}`}>
      {children}
    </button>
  );
}

/** The grey − n + stepper (104 × 34). Pass translated labels for the two buttons. */
export function Stepper({ value, onChange, min = 0, max = 500, fewerLabel, moreLabel, valueLabel }: { value: number; onChange: (v: number) => void; min?: number; max?: number; fewerLabel: string; moreLabel: string; valueLabel: string }) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div className="font-data flex h-11 w-[120px] shrink-0 items-center justify-between rounded-[8px] bg-neutral px-1 text-[13px] sm:h-[34px] sm:w-[104px]">
      <button onClick={() => set(value - 1)} className="grid h-10 w-10 place-items-center sm:h-8 sm:w-8" aria-label={fewerLabel}>−</button>
      <input inputMode="numeric" value={value} onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || 0)} className="w-9 bg-transparent text-center outline-none" aria-label={valueLabel} />
      <button onClick={() => set(value + 1)} className="grid h-10 w-10 place-items-center sm:h-8 sm:w-8" aria-label={moreLabel}>+</button>
    </div>
  );
}

/** A full-width row card with a chevron (Help → Settings, and similar). Renders a link when `href` is set, else a button. */
export function NavRow({ label, href, onClick }: { label: string; href?: string; onClick?: () => void }) {
  const inner = (
    <Card className="flex h-[52px] items-center justify-between px-4">
      <span className="text-[15px] font-semibold">{label}</span>
      <span className="text-[18px] leading-none text-muted" aria-hidden>›</span>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">{inner}</Link>
  ) : (
    <button onClick={onClick} className="block w-full text-left">{inner}</button>
  );
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
