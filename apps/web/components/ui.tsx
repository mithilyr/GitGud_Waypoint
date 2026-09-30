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
 * `tile` (default): the mark on a filled rounded tile, for app icons and headers.
 * `tile={false}`: the bare mark on a transparent background. The string is masked around each stop ring,
 * so nothing is filled and it sits on any surface; ink and the orange stop follow the theme.
 * Standalone files: /logo/waypoint-mark-for-light.svg and /logo/waypoint-mark-for-dark.svg.
 */
export function Logo({ size = 40, tile = true }: { size?: number; tile?: boolean }) {
  const id = useId();
  const ink = tile ? "var(--logo-ink)" : "var(--mark-ink)";
  const dot = tile ? "var(--logo-dot)" : "var(--mark-dot)";
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={tile ? { width: size, height: size, borderRadius: size * 0.22, background: "var(--logo-tile)" } : { width: size, height: size }}
      role="img"
      aria-label="Waypoint"
    >
      <svg viewBox="0 0 59.04 59.04" width={size} height={size} aria-hidden>
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
      className={`inline-flex h-[22px] max-w-full items-center truncate whitespace-nowrap rounded-full px-2.5 text-[10px] font-bold uppercase tracking-[0.6px] ${toneClass[tone]} ${className}`}
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
  const s = { sm: "h-[34px] px-3 text-[13px]", md: "h-11 px-4 text-[15px]", lg: "h-12 px-5 text-[15px]", xl: "h-[52px] px-5 text-[15px]" }[size];
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
    <button onClick={onClick} aria-pressed={on} className={`h-[30px] shrink-0 rounded-full px-4 text-[13px] font-medium ${on ? "bg-primary text-on-primary" : "bg-neutral text-muted"} ${className}`}>
      {children}
    </button>
  );
}

/** The grey − n + stepper (104 × 34). Pass translated labels for the two buttons. */
export function Stepper({ value, onChange, min = 0, max = 500, fewerLabel, moreLabel, valueLabel }: { value: number; onChange: (v: number) => void; min?: number; max?: number; fewerLabel: string; moreLabel: string; valueLabel: string }) {
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  return (
    <div className="font-data flex h-[34px] w-[104px] shrink-0 items-center justify-between rounded-[8px] bg-neutral px-1 text-[13px]">
      <button onClick={() => set(value - 1)} className="grid h-8 w-8 place-items-center" aria-label={fewerLabel}>−</button>
      <input inputMode="numeric" value={value} onChange={(e) => set(Number(e.target.value.replace(/\D/g, "")) || 0)} className="w-9 bg-transparent text-center outline-none" aria-label={valueLabel} />
      <button onClick={() => set(value + 1)} className="grid h-8 w-8 place-items-center" aria-label={moreLabel}>+</button>
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
  // Drawn from the Designathon file (R0a, "Vine Ridges"): tea-row ridges, one long vine, curls with buds, a sprout.
  return (
    <svg viewBox="0 706 390 138" preserveAspectRatio="xMidYMax meet" className={`pointer-events-none mx-auto block w-full max-w-[560px] sm:[mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] ${className}`} aria-hidden>
      <path d="M0,844.0L0,828.6L5,826.2L10,823.3L15,819.9L20,816.0L25,811.8L30,807.2L35,802.6L40,798.0L45,793.6L50,789.8L55,786.7L60,784.4L65,783.1L70,782.9L75,783.6L80,785.2L85,787.5L90,790.2L95,793.2L100,796.1L105,798.7L110,800.8L115,802.1L120,802.6L125,802.1L130,800.7L135,798.4L140,795.3L145,791.6L150,787.3L155,782.8L160,778.1L165,773.5L170,769.2L175,765.4L180,762.2L185,759.9L190,758.4L195,758.0L200,758.4L205,759.9L210,762.2L215,765.4L220,769.2L225,773.5L230,778.1L235,782.8L240,787.3L245,791.6L250,795.3L255,798.4L260,800.7L265,802.1L270,802.6L275,802.1L280,800.8L285,798.7L290,796.1L295,793.2L300,790.2L305,787.5L310,785.2L315,783.6L320,782.9L325,783.1L330,784.4L335,786.7L340,789.8L345,793.6L350,798.0L355,802.6L360,807.2L365,811.8L370,816.0L375,819.9L380,823.3L385,826.2L390,828.6L390,844.0Z" fill="var(--vr-band1)" />
      <path d="M0,844.0L0,853.1L5,850.9L10,848.2L15,845.0L20,841.4L25,837.5L30,833.2L35,828.9L40,824.6L45,820.6L50,817.0L55,814.1L60,812.0L65,810.8L70,810.6L75,811.3L80,812.7L85,814.9L90,817.4L95,820.2L100,822.9L105,825.3L110,827.3L115,828.5L120,828.9L125,828.5L130,827.2L135,825.1L140,822.2L145,818.7L150,814.7L155,810.5L160,806.1L165,801.9L170,797.9L175,794.3L180,791.4L185,789.2L190,787.9L195,787.4L200,787.9L205,789.2L210,791.4L215,794.3L220,797.9L225,801.9L230,806.1L235,810.5L240,814.7L245,818.7L250,822.2L255,825.1L260,827.2L265,828.5L270,828.9L275,828.5L280,827.3L285,825.3L290,822.9L295,820.2L300,817.4L305,814.9L310,812.7L315,811.3L320,810.6L325,810.8L330,812.0L335,814.1L340,817.0L345,820.6L350,824.6L355,828.9L360,833.2L365,837.5L370,841.4L375,845.0L380,848.2L385,850.9L390,853.1L390,844.0Z" fill="var(--vr-band2)" />
      <path d="M0,853.1L5,850.9L10,848.2L15,845.0L20,841.4L25,837.5L30,833.2L35,828.9L40,824.6L45,820.6L50,817.0L55,814.1L60,812.0L65,810.8L70,810.6L75,811.3L80,812.7L85,814.9L90,817.4L95,820.2L100,822.9L105,825.3L110,827.3L115,828.5L120,828.9L125,828.5L130,827.2L135,825.1L140,822.2L145,818.7L150,814.7L155,810.5L160,806.1L165,801.9L170,797.9L175,794.3L180,791.4L185,789.2L190,787.9L195,787.4L200,787.9L205,789.2L210,791.4L215,794.3L220,797.9L225,801.9L230,806.1L235,810.5L240,814.7L245,818.7L250,822.2L255,825.1L260,827.2L265,828.5L270,828.9L275,828.5L280,827.3L285,825.3L290,822.9L295,820.2L300,817.4L305,814.9L310,812.7L315,811.3L320,810.6L325,810.8L330,812.0L335,814.1L340,817.0L345,820.6L350,824.6L355,828.9L360,833.2L365,837.5L370,841.4L375,845.0L380,848.2L385,850.9L390,853.1" fill="none" stroke="var(--vr-line)" strokeWidth="1.5" strokeOpacity="0.218" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0,844.0L0,877.6L5,875.6L10,873.1L15,870.2L20,866.8L25,863.2L30,859.3L35,855.2L40,851.3L45,847.6L50,844.3L55,841.6L60,839.6L65,838.5L70,838.3L75,838.9L80,840.3L85,842.3L90,844.6L95,847.2L100,849.7L105,851.9L110,853.7L115,854.9L120,855.3L125,854.9L130,853.7L135,851.7L140,849.0L145,845.8L150,842.1L155,838.2L160,834.2L165,830.2L170,826.5L175,823.3L180,820.6L185,818.5L190,817.3L195,816.9L200,817.3L205,818.5L210,820.6L215,823.3L220,826.5L225,830.2L230,834.2L235,838.2L240,842.1L245,845.8L250,849.0L255,851.7L260,853.7L265,854.9L270,855.3L275,854.9L280,853.7L285,851.9L290,849.7L295,847.2L300,844.6L305,842.3L310,840.3L315,838.9L320,838.3L325,838.5L330,839.6L335,841.6L340,844.3L345,847.6L350,851.3L355,855.2L360,859.3L365,863.2L370,866.8L375,870.2L380,873.1L385,875.6L390,877.6L390,844.0Z" fill="var(--vr-band3)" />
      <path d="M0,877.6L5,875.6L10,873.1L15,870.2L20,866.8L25,863.2L30,859.3L35,855.2L40,851.3L45,847.6L50,844.3L55,841.6L60,839.6L65,838.5L70,838.3L75,838.9L80,840.3L85,842.3L90,844.6L95,847.2L100,849.7L105,851.9L110,853.7L115,854.9L120,855.3L125,854.9L130,853.7L135,851.7L140,849.0L145,845.8L150,842.1L155,838.2L160,834.2L165,830.2L170,826.5L175,823.3L180,820.6L185,818.5L190,817.3L195,816.9L200,817.3L205,818.5L210,820.6L215,823.3L220,826.5L225,830.2L230,834.2L235,838.2L240,842.1L245,845.8L250,849.0L255,851.7L260,853.7L265,854.9L270,855.3L275,854.9L280,853.7L285,851.9L290,849.7L295,847.2L300,844.6L305,842.3L310,840.3L315,838.9L320,838.3L325,838.5L330,839.6L335,841.6L340,844.3L345,847.6L350,851.3L355,855.2L360,859.3L365,863.2L370,866.8L375,870.2L380,873.1L385,875.6L390,877.6" fill="none" stroke="var(--vr-line)" strokeWidth="1.5" strokeOpacity="0.196" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0,844.0L0,902.1L5,900.2L10,898.0L15,895.3L20,892.2L25,888.9L30,885.3L35,881.6L40,877.9L45,874.5L50,871.5L55,869.0L60,867.2L65,866.2L70,866.0L75,866.6L80,867.9L85,869.7L90,871.8L95,874.2L100,876.5L105,878.6L110,880.2L115,881.2L120,881.6L125,881.2L130,880.1L135,878.3L140,875.9L145,872.9L150,869.5L155,865.9L160,862.2L165,858.6L170,855.2L175,852.2L180,849.7L185,847.9L190,846.7L195,846.3L200,846.7L205,847.9L210,849.7L215,852.2L220,855.2L225,858.6L230,862.2L235,865.9L240,869.5L245,872.9L250,875.9L255,878.3L260,880.1L265,881.2L270,881.6L275,881.2L280,880.2L285,878.6L290,876.5L295,874.2L300,871.8L305,869.7L310,867.9L315,866.6L320,866.0L325,866.2L330,867.2L335,869.0L340,871.5L345,874.5L350,877.9L355,881.6L360,885.3L365,888.9L370,892.2L375,895.3L380,898.0L385,900.2L390,902.1L390,844.0Z" fill="var(--vr-band4)" />
      <path d="M0,902.1L5,900.2L10,898.0L15,895.3L20,892.2L25,888.9L30,885.3L35,881.6L40,877.9L45,874.5L50,871.5L55,869.0L60,867.2L65,866.2L70,866.0L75,866.6L80,867.9L85,869.7L90,871.8L95,874.2L100,876.5L105,878.6L110,880.2L115,881.2L120,881.6L125,881.2L130,880.1L135,878.3L140,875.9L145,872.9L150,869.5L155,865.9L160,862.2L165,858.6L170,855.2L175,852.2L180,849.7L185,847.9L190,846.7L195,846.3L200,846.7L205,847.9L210,849.7L215,852.2L220,855.2L225,858.6L230,862.2L235,865.9L240,869.5L245,872.9L250,875.9L255,878.3L260,880.1L265,881.2L270,881.6L275,881.2L280,880.2L285,878.6L290,876.5L295,874.2L300,871.8L305,869.7L310,867.9L315,866.6L320,866.0L325,866.2L330,867.2L335,869.0L340,871.5L345,874.5L350,877.9L355,881.6L360,885.3L365,888.9L370,892.2L375,895.3L380,898.0L385,900.2L390,902.1" fill="none" stroke="var(--vr-line)" strokeWidth="1.5" strokeOpacity="0.174" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0,844.0L0,926.7L5,924.9L10,922.9L15,920.4L20,917.6L25,914.6L30,911.3L35,907.9L40,904.6L45,901.5L50,898.7L55,896.5L60,894.9L65,893.9L70,893.7L75,894.3L80,895.4L85,897.1L90,899.1L95,901.2L100,903.3L105,905.2L110,906.6L115,907.6L120,907.9L125,907.6L130,906.6L135,905.0L140,902.7L145,900.0L150,897.0L155,893.7L160,890.3L165,887.0L170,883.9L175,881.2L180,878.9L185,877.2L190,876.2L195,875.8L200,876.2L205,877.2L210,878.9L215,881.2L220,883.9L225,887.0L230,890.3L235,893.7L240,897.0L245,900.0L250,902.7L255,905.0L260,906.6L265,907.6L270,907.9L275,907.6L280,906.6L285,905.2L290,903.3L295,901.2L300,899.1L305,897.1L310,895.4L315,894.3L320,893.7L325,893.9L330,894.9L335,896.5L340,898.7L345,901.5L350,904.6L355,907.9L360,911.3L365,914.6L370,917.6L375,920.4L380,922.9L385,924.9L390,926.7L390,844.0Z" fill="var(--vr-band5)" />
      <path d="M0,926.7L5,924.9L10,922.9L15,920.4L20,917.6L25,914.6L30,911.3L35,907.9L40,904.6L45,901.5L50,898.7L55,896.5L60,894.9L65,893.9L70,893.7L75,894.3L80,895.4L85,897.1L90,899.1L95,901.2L100,903.3L105,905.2L110,906.6L115,907.6L120,907.9L125,907.6L130,906.6L135,905.0L140,902.7L145,900.0L150,897.0L155,893.7L160,890.3L165,887.0L170,883.9L175,881.2L180,878.9L185,877.2L190,876.2L195,875.8L200,876.2L205,877.2L210,878.9L215,881.2L220,883.9L225,887.0L230,890.3L235,893.7L240,897.0L245,900.0L250,902.7L255,905.0L260,906.6L265,907.6L270,907.9L275,907.6L280,906.6L285,905.2L290,903.3L295,901.2L300,899.1L305,897.1L310,895.4L315,894.3L320,893.7L325,893.9L330,894.9L335,896.5L340,898.7L345,901.5L350,904.6L355,907.9L360,911.3L365,914.6L370,917.6L375,920.4L380,922.9L385,924.9L390,926.7" fill="none" stroke="var(--vr-line)" strokeWidth="1.5" strokeOpacity="0.152" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0,828.6L4,826.7L8,824.5L12,822.0L16,819.2L20,816.0L24,812.7L28,809.1L32,805.4L36,801.6L40,798.0L44,794.5L48,791.3L52,788.5L56,786.1L60,784.4L64,783.3L68,782.8L72,783.0L76,783.8L80,785.2L84,787.0L88,789.1L92,791.4L96,793.8L100,796.1L104,798.2L108,800.0L112,801.4L116,802.3L120,802.6L124,802.3L128,801.4L132,799.9L136,797.9L140,795.3L144,792.4L148,789.1L152,785.5L156,781.8L160,778.1L164,774.4L168,770.9L172,767.6L176,764.7L180,762.2L184,760.3L188,758.9L192,758.1L196,758.0L200,758.4L204,759.5L208,761.2L212,763.4L216,766.1L220,769.2L224,772.6L228,776.2L232,779.9L236,783.7L240,787.3L244,790.8L248,793.9L252,796.7L256,799.0L260,800.7L264,801.9L268,802.5L272,802.5L276,801.9L280,800.8L284,799.2L288,797.2L292,795.0L296,792.6L300,790.2L304,788.0L308,786.0L312,784.4L316,783.4L320,782.9L324,783.0L328,783.8L332,785.2L336,787.2L340,789.8L344,792.8L348,796.2L352,799.8L356,803.5L360,807.2L364,810.9L368,814.4L372,817.6L376,820.6L380,823.3L384,825.7L388,827.7" fill="none" stroke="var(--vr-line)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M239,786.4C241,802.4,251,814.4,265,812.4C269.8,814,275.1,812.1,277.7,807.8C280.4,803.6,279.9,798,276.4,794.4C272.9,790.7,267.4,789.9,263,792.4C260.6,791.9,258.1,793.2,257,795.4C255.9,797.6,256.5,800.3,258.3,801.9C260.2,803.6,262.9,803.8,265,802.4" fill="none" stroke="var(--vr-line)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="265.0" cy="802.4" r="2.4" fill="var(--vr-bud)" />
      <path d="M151,786.4C149,802.4,139,814.4,125,812.4C120.2,814,114.9,812.1,112.3,807.8C109.6,803.6,110.1,798,113.6,794.4C117.1,790.7,122.6,789.9,127,792.4C129.4,791.9,131.9,793.2,133,795.4C134.1,797.6,133.5,800.3,131.7,801.9C129.8,803.6,127.1,803.8,125,802.4" fill="none" stroke="var(--vr-line)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="125.0" cy="802.4" r="2.4" fill="var(--vr-bud)" />
      <path d="M295,793.2C297,777.2,307,765.2,321,767.2C325.8,765.6,331.1,767.5,333.7,771.8C336.4,776,335.9,781.6,332.4,785.2C328.9,788.9,323.4,789.7,319,787.2C316.6,787.7,314.1,786.4,313,784.2C311.9,782,312.5,779.3,314.3,777.7C316.2,776,318.9,775.8,321,777.2" fill="none" stroke="var(--vr-line)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="321.0" cy="777.2" r="2.4" fill="var(--vr-bud)" />
      <path d="M95,793.2C93,777.2,83,765.2,69,767.2C64.2,765.6,58.9,767.5,56.3,771.8C53.6,776,54.1,781.6,57.6,785.2C61.1,788.9,66.6,789.7,71,787.2C73.4,787.7,75.9,786.4,77,784.2C78.1,782,77.5,779.3,75.7,777.7C73.8,776,71.1,775.8,69,777.2" fill="none" stroke="var(--vr-line)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="69.0" cy="777.2" r="2.4" fill="var(--vr-bud)" />
      <path d="M351,798.9C353,814.9,363,826.9,377,824.9C381.8,826.5,387.1,824.6,389.7,820.3C392.4,816.1,391.9,810.5,388.4,806.9C384.9,803.2,379.4,802.4,375,804.9C372.6,804.4,370.1,805.7,369,807.9C367.9,810.1,368.5,812.8,370.3,814.4C372.2,816.1,374.9,816.3,377,814.9" fill="none" stroke="var(--vr-line)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="377.0" cy="814.9" r="2.4" fill="var(--vr-bud)" />
      <path d="M39,798.9C37,814.9,27,826.9,13,824.9C8.2,826.5,2.9,824.6,0.3,820.3C-2.4,816.1,-1.9,810.5,1.6,806.9C5.1,803.2,10.6,802.4,15,804.9C17.4,804.4,19.9,805.7,21,807.9C22.1,810.1,21.5,812.8,19.7,814.4C17.8,816.1,15.1,816.3,13,814.9" fill="none" stroke="var(--vr-line)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13.0" cy="814.9" r="2.4" fill="var(--vr-bud)" />
      <path d="M265,802.1C269,789.1,280,784.1,289,787.1C284,796.1,275,802.1,265,802.1Z" fill="var(--vr-leaf)" />
      <path d="M125,802.1C121,789.1,110,784.1,101,787.1C106,796.1,115,802.1,125,802.1Z" fill="var(--vr-leaf)" />
      <path d="M323,782.9C327,795.9,338,800.9,347,797.9C342,788.9,333,782.9,323,782.9Z" fill="var(--vr-leaf)" />
      <path d="M67,782.9C63,795.9,52,800.9,43,797.9C48,788.9,57,782.9,67,782.9Z" fill="var(--vr-leaf)" />
      <path d="M371,816.8C367,803.8,356,798.8,347,801.8C352,810.8,361,816.8,371,816.8Z" fill="var(--vr-leaf)" />
      <path d="M19,816.8C23,803.8,34,798.8,43,801.8C38,810.8,29,816.8,19,816.8Z" fill="var(--vr-leaf)" />
      <path d="M195,754.0C184,743,184,726,195,714.0C206,726,206,743,195,754.0Z" fill="var(--vr-bloom)" />
      <path d="M191,752.0C178,748,169,735,169,726.0C180,728,189,737,191,752.0Z" fill="var(--vr-leaf)" />
      <path d="M199,752.0C212,748,221,735,221,726.0C210,728,201,737,199,752.0Z" fill="var(--vr-leaf)" />
      <circle cx="195.0" cy="734.0" r="3.2" fill="var(--vr-bud)" />
    </svg>
  );
}
