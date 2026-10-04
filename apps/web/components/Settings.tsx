"use client";

import { Button, Card, Headline, Lead } from "./ui";
import { useTheme } from "@/lib/hooks";
import { LANGS, useT } from "@/lib/i18n";
import { useTextSize } from "@/lib/prefs";

/** Section label + card, as on the Settings boards (D5, L7, R9, S7). */
export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 first:mt-0">
      <div className="text-[11px] uppercase tracking-[0.8px] text-muted">
        {title}
      </div>
      <Card className="mt-2 divide-y divide-line px-4">{children}</Card>
    </section>
  );
}

function Row({
  label,
  sub,
  children,
  onClick,
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className="flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-2 py-3 text-left sm:min-h-[52px] sm:flex-nowrap sm:py-2.5"
    >
      <span className="min-w-[40%] flex-1 sm:min-w-0">
        <span className="block text-[15px] font-semibold">{label}</span>
        {sub ? (
          <span className="mt-0.5 block text-[12px] font-normal text-muted lg:text-[13px] lg:font-medium">
            {sub}
          </span>
        ) : null}
      </span>
      {children}
    </Tag>
  );
}

export function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label} sub={sub}>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="relative h-[26px] w-11 shrink-0 rounded-full transition-colors"
        style={{
          background: checked ? "var(--toggle-on)" : "var(--toggle-off)",
        }}
      >
        <span
          className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-[left]"
          style={{ left: checked ? 20 : 2 }}
        />
      </button>
    </Row>
  );
}

export function ValueRow({
  label,
  sub,
  value,
  onClick,
}: {
  label: string;
  sub?: string;
  value?: string;
  onClick?: () => void;
}) {
  return (
    <Row label={label} sub={sub} onClick={onClick}>
      {value ? (
        <span className="text-[13px] text-muted lg:text-[14px] lg:font-medium">
          {value}
        </span>
      ) : null}
      {/* Only rows that do something get the chevron; a read-only value does not look tappable. */}
      {onClick ? (
        <span className="text-[18px] leading-none text-muted" aria-hidden>
          ›
        </span>
      ) : null}
    </Row>
  );
}

export function SegControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}) {
  return (
    <div
      className="inline-flex shrink-0 rounded-[8px] bg-neutral p-0.5"
      role="tablist"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-8 rounded-[6px] px-3 text-[12px] sm:h-[26px] lg:h-7 lg:text-[13px] ${value === o.value ? "font-semibold text-ink" : "text-muted"}`}
          style={
            value === o.value ? { background: "var(--seg-active)" } : undefined
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SegRow<T extends string>({
  label,
  sub,
  value,
  onChange,
  options,
}: {
  label: string;
  sub?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <Row label={label} sub={sub}>
      <SegControl
        value={value}
        onChange={onChange}
        options={options}
        label={label}
      />
    </Row>
  );
}

export function DarkModeRow({ sub }: { sub?: string }) {
  const { t } = useT();
  const { theme, setTheme } = useTheme();
  return (
    <ToggleRow
      label={t("settings.darkMode")}
      sub={sub}
      checked={theme === "dark"}
      onChange={(on) => setTheme(on ? "dark" : "light")}
    />
  );
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

/** The language picker, a segmented control on every screen size. */
export function LanguageRow() {
  const { t, lang, setLang } = useT();
  return (
    <SegRow
      label={t("settings.language")}
      value={lang}
      onChange={setLang}
      options={LANGS}
    />
  );
}

/**
 * The Settings screen every role shares: eyebrow, headline, the role's sections in one column, then Done and Sign out.
 * Roles differ only in the rows they put inside.
 */
export function SettingsLayout({
  lead,
  children,
  onDone,
  onSignOut,
  signOutNote,
}: {
  lead: React.ReactNode;
  children: React.ReactNode;
  onDone: () => void;
  onSignOut: () => void;
  signOutNote?: string;
}) {
  const { t } = useT();
  return (
    <div className="rise mx-auto max-w-[620px]">
      <Lead>{lead}</Lead>
      <Headline className="mt-1">{t("settings.title")}</Headline>
      <div className="mt-6">{children}</div>
      <Button size="xl" block className="mt-8" onClick={onDone}>
        {t("common.done")}
      </Button>
      <Button
        size="xl"
        variant="secondary"
        block
        className="mt-2"
        onClick={onSignOut}
      >
        {t("common.signOut")}
      </Button>
      {signOutNote ? (
        <p className="mt-2 text-center text-[12px] text-muted">{signOutNote}</p>
      ) : null}
    </div>
  );
}
