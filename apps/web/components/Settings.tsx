"use client";

import { useState } from "react";
import { Card, Sheet } from "./ui";
import { useTheme } from "@/lib/hooks";
import { LANGS, useT } from "@/lib/i18n";
import { useTextSize } from "@/lib/prefs";

/** Section label + card, as on the Settings boards (D5, L7, R9, S7). */
export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="text-[11px] uppercase tracking-[0.8px] text-muted">{title}</div>
      <Card className="mt-2 divide-y divide-line px-4">{children}</Card>
    </section>
  );
}

function Row({ label, sub, children, onClick }: { label: string; sub?: string; children?: React.ReactNode; onClick?: () => void }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} className="flex min-h-[52px] w-full items-center gap-3 py-2.5 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub ? <span className="mt-0.5 block text-[12px] font-normal text-muted lg:text-[13px] lg:font-medium">{sub}</span> : null}
      </span>
      {children}
    </Tag>
  );
}

export function ToggleRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={label} sub={sub}>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-[26px] w-11 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "var(--toggle-on)" : "var(--toggle-off)" }}
      >
        <span className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left]" style={{ left: checked ? 20 : 2 }} />
      </button>
    </Row>
  );
}

export function ValueRow({ label, sub, value, onClick }: { label: string; sub?: string; value?: string; onClick?: () => void }) {
  return (
    <Row label={label} sub={sub} onClick={onClick}>
      {value ? <span className="text-[13px] text-muted lg:text-[14px] lg:font-medium">{value}</span> : null}
      <span className="text-[18px] leading-none text-muted" aria-hidden>›</span>
    </Row>
  );
}

export function SegControl<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: string }) {
  return (
    <div className="inline-flex shrink-0 rounded-[8px] bg-neutral p-0.5" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-[26px] rounded-[6px] px-3 text-[12px] lg:h-7 lg:text-[13px] ${value === o.value ? "font-semibold text-ink" : "text-muted"}`}
          style={value === o.value ? { background: "var(--seg-active)" } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SegRow<T extends string>({ label, sub, value, onChange, options }: { label: string; sub?: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <Row label={label} sub={sub}>
      <SegControl value={value} onChange={onChange} options={options} label={label} />
    </Row>
  );
}

export function DarkModeRow({ sub }: { sub?: string }) {
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  return <ToggleRow label={t("settings.darkMode")} sub={sub} checked={theme === "dark"} onChange={(on) => setTheme(on ? "dark" : "light")} />;
}

export function TextSizeRow() {
  const { t } = useT();
  const [size, setSize] = useTextSize();
  return (
    <SegRow
      label={t("settings.textSize")}
      value={size}
      onChange={setSize}
      options={[
        { value: "normal", label: t("settings.normal") },
        { value: "large", label: t("settings.large") },
      ]}
    />
  );
}

/** Phone: a row with the current language and a chevron that opens the picker. Desktop (`inline`): a segmented control. */
export function LanguageRow({ inline = false }: { inline?: boolean }) {
  const { t, lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  if (inline) return <SegRow label={t("settings.language")} value={lang} onChange={setLang} options={LANGS} />;
  return (
    <>
      <ValueRow label={t("settings.language")} value={LANGS.find((l) => l.value === lang)?.label} onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t("settings.language")}>
        <div className="p-5">
          <div className="font-display text-[26px] font-medium">{t("settings.language")}</div>
          <div className="mt-3 space-y-2">
            {LANGS.map((l) => (
              <button
                key={l.value}
                onClick={() => {
                  setLang(l.value);
                  setOpen(false);
                }}
                aria-pressed={lang === l.value}
                className={`flex h-12 w-full items-center justify-between rounded-[8px] border px-4 text-[16px] font-semibold ${lang === l.value ? "border-ink bg-surface" : "border-line text-muted"}`}
              >
                {l.label}
                {lang === l.value ? <span aria-hidden>✓</span> : null}
              </button>
            ))}
          </div>
        </div>
      </Sheet>
    </>
  );
}
