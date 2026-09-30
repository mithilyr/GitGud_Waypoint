"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, ErrorNote, FullScreen, Headline, Icon, Sheet, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate, fmtLong } from "@/lib/format";
import { usePoll } from "@/lib/hooks";
import { useT } from "@/lib/i18n";

type Home = {
  outlet: { id: string; name: string; brand: string; district: string; depot: string };
  manager: string;
  cutoff: { label: string; minutes_left: number; passed: boolean; enforced: boolean; service_date: string; window: string };
};
type Item = { sku: string; name: string; category: string; temp: string; price: number; pack: string; often: boolean };
type Basket = Record<string, number>;
type Placed = { orders: { id: string; temp: string }[]; lines: number; service_date: string; received_at: string; message: string };

const USUAL: Basket = { MLK1: 24, YOG1: 6, CRD1: 4, DHL5: 10, RCE5: 12, EGG3: 8 };

export default function OrderPage() {
  const { t } = useT();
  const { data: home } = usePoll(() => get<Home>("/store/home"), 30000);
  const { data: catalog } = usePoll(() => get<Item[]>("/store/catalog"));
  const [basket, setBasket] = useState<Basket>({});
  const [seeded, setSeeded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [showAll, setShowAll] = useState(false);

  const byId = useMemo(() => Object.fromEntries((catalog ?? []).map((i) => [i.sku, i])), [catalog]);

  useEffect(() => {
    if (catalog && !seeded) {
      const b: Basket = {};
      for (const [sku, q] of Object.entries(USUAL)) if (catalog.some((c) => c.sku === sku)) b[sku] = q;
      // Style and Tech outlets have no usual grocery list: start from what they order often.
      if (!Object.keys(b).length) for (const c of catalog.filter((c) => c.often).slice(0, 3)) b[c.sku] = 2;
      setBasket(b);
      setSeeded(true);
    }
  }, [catalog, seeded]);

  if (!home || !catalog) return <div className="grid place-items-center py-24 text-muted"><Spinner /></div>;

  const lines = Object.entries(basket).filter(([, q]) => q > 0);
  const set = (sku: string, q: number) => setBasket((b) => ({ ...b, [sku]: Math.max(0, Math.min(500, q)) }));
  const c = home.cutoff;
  const countdown = c.passed
    ? t("store.order.cutoffPassed")
    : c.minutes_left >= 60
      ? t("store.order.cutoffH", { h: Math.floor(c.minutes_left / 60), m: c.minutes_left % 60 })
      : t("store.order.cutoffMin", { m: c.minutes_left });
  const temps = new Set(lines.map(([sku]) => byId[sku]?.temp));
  const mix = [temps.has("ambient") || temps.has("dry") ? t("common.dry") : null, temps.has("chilled") ? t("common.chilled") : null].filter(Boolean).join(" · ");
  const visible = showAll ? lines : lines.slice(0, 4);

  async function place() {
    setBusy(true);
    setError(null);
    try {
      setPlaced(await post<Placed>("/store/orders", { lines: lines.map(([sku, qty]) => ({ sku, qty })) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("store.order.failed"));
    } finally {
      setBusy(false);
    }
  }

  async function reorder() {
    try {
      const last = await get<{ date: string; lines: { sku: string; qty: number }[] }>("/store/last-order");
      const b: Basket = {};
      for (const l of last.lines) b[l.sku] = (b[l.sku] ?? 0) + l.qty;
      setBasket(b);
      toast(t("store.order.copied", { n: last.lines.length, date: fmtDate(last.date) }), "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : t("store.order.noEarlier"), "warn");
    }
  }

  return (
    <div className="rise">
      <p className="text-[13px] font-medium text-muted">
        {t("store.order.eyebrow", { outlet: home.outlet.name, who: home.manager.split(" ")[0], date: fmtDate(new Date().toISOString().slice(0, 10)) })}
      </p>
      <Headline className="mt-1">{countdown}</Headline>
      <p className="mt-2 text-[15px] text-muted">{t("store.order.afterCutoff", { cutoff: c.label })}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Card className="min-h-[108px] p-4">
          <div className="text-[11px] font-semibold uppercase text-muted">{t("store.order.items")}</div>
          <div className="mt-1 font-display text-[22px] font-medium leading-tight">{t("store.order.lineCount", { n: lines.length })}</div>
          <div className="font-data mt-3 text-[12px] text-muted">{mix}</div>
        </Card>
        <Card className="min-h-[108px] p-4">
          <div className="text-[11px] font-semibold uppercase text-muted">{t("store.order.expected")}</div>
          <div className="mt-1 font-display text-[22px] font-medium leading-tight">{fmtDate(c.service_date, { weekday: "short", day: "numeric" })}</div>
          <div className="font-data mt-3 text-[12px] text-muted">{c.window}</div>
        </Card>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="text-[13px] font-semibold">{t("store.order.orderLines")}</div>
        {lines.length ? <button onClick={() => setBasket({})} className="text-[13px] font-medium text-muted underline">{t("store.order.clear")}</button> : null}
      </div>
      <div className="mt-2 divide-y divide-line">
        {visible.map(([sku, qty]) => (
          <button key={sku} onClick={() => setAdding(true)} className="flex min-h-11 w-full items-center gap-3 py-3 text-left">
            <div className="min-w-0 flex-1 truncate text-[14px] font-medium">{byId[sku]?.name ?? sku}</div>
            <div className="font-data text-[13px] text-muted">× {qty}</div>
          </button>
        ))}
        {!lines.length ? <div className="py-6 text-center text-muted">{t("store.order.empty")}</div> : null}
      </div>
      {lines.length > 4 ? (
        <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-[13px] font-medium text-muted">
          {showAll ? t("store.order.showLess") : t("store.order.moreItems", { n: lines.length - 4 })}
        </button>
      ) : null}

      <div className="mt-4 flex gap-3">
        <Button variant="secondary" className="h-auto min-h-11 flex-1 !px-2 py-2 !text-[15px] leading-tight" onClick={() => setAdding(true)}>
          {t("store.order.addItem")}
        </Button>
        <Button variant="secondary" className="h-auto min-h-11 flex-1 !px-2 py-2 !text-[14px] leading-tight" onClick={reorder}>
          {t("store.order.reorder")}
        </Button>
      </div>

      <div className="mt-6">
        <ErrorNote error={error} />
        <Button size="lg" block className="mt-2 !h-[52px] !text-[15px]" busy={busy} disabled={!lines.length} onClick={place}>
          {t("store.order.place")}
        </Button>
        <p className="font-data mt-3 text-center text-[12px] text-muted">{t("store.order.foot", { cutoff: c.label, date: fmtDate(c.service_date), window: c.window })}</p>
      </div>

      <AddItems open={adding} onClose={() => setAdding(false)} catalog={catalog} basket={basket} set={set} outlet={home.outlet.name} cutoff={c.label} />
      <Sheet open={!!placed} onClose={() => setPlaced(null)} title={t("store.placed.title")}>
        {placed ? (
          <div className="p-6">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-ok-bg text-ok"><Icon.Check size={22} /></div>
            <div className="mt-4 text-[11px] font-semibold uppercase text-muted">{t("store.placed.eyebrow", { at: placed.received_at })}</div>
            <div className="mt-1 font-display text-[26px] font-medium leading-tight tracking-[-0.8px]">{t("store.placed.title")}</div>
            <p className="mt-2 text-[14px] text-muted">{t("store.placed.body", { message: placed.message, date: fmtLong(placed.service_date) })}</p>
            <div className="mt-4 space-y-2 border-t border-line pt-4">
              {placed.orders.map((o) => (
                <div key={o.id} className="flex items-baseline gap-4">
                  <span className="w-20 text-[11px] font-semibold uppercase text-muted">{t("store.placed.order")}</span>
                  <span className="font-data text-[12px]">{o.id}</span>
                  <span className="ml-auto text-[12px] text-muted">{o.temp === "chilled" ? t("common.chilled") : t("common.ambient")}</span>
                </div>
              ))}
              <div className="flex items-baseline gap-4">
                <span className="w-20 text-[11px] font-semibold uppercase text-muted">{t("store.placed.delivery")}</span>
                <span className="font-data text-[12px]">{fmtDate(placed.service_date)} · {c.window}</span>
              </div>
            </div>
            <Link href="/store/track" className="mt-5 block">
              <Button size="lg" block className="!h-12 !text-[15px]">{t("store.placed.track")}</Button>
            </Link>
            <Button variant="secondary" block className="mt-2" onClick={() => setPlaced(null)}>{t("common.done")}</Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useT();
  return (
    <div className="font-data flex h-[34px] w-[104px] shrink-0 items-center justify-between rounded-[8px] bg-neutral px-1 text-[13px]">
      <button onClick={() => onChange(value - 1)} className="grid h-8 w-8 place-items-center" aria-label={t("store.add.fewer")}>−</button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        className="w-9 bg-transparent text-center outline-none"
        aria-label={t("store.add.qty")}
      />
      <button onClick={() => onChange(value + 1)} className="grid h-8 w-8 place-items-center" aria-label={t("store.add.more")}>+</button>
    </div>
  );
}

function AddItems({ open, onClose, catalog, basket, set, outlet, cutoff }: { open: boolean; onClose: () => void; catalog: Item[]; basket: Basket; set: (sku: string, q: number) => void; outlet: string; cutoff: string }) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(catalog.map((c) => c.category)))];
  const shown = catalog.filter((i) => (cat === "All" || i.category === cat) && i.name.toLowerCase().includes(q.toLowerCase()));
  const often = shown.filter((i) => i.often);
  const rest = shown.filter((i) => !i.often);
  const n = Object.values(basket).filter((v) => v > 0).length;
  const row = (i: Item) => (
    <div key={i.sku} className="flex min-h-14 items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium">{i.name}</div>
        <div className="font-data mt-0.5 text-[12px] text-muted">
          {i.temp === "chilled" ? t("common.chilled") : t("common.dry")} · Rs {i.price.toLocaleString()}
        </div>
      </div>
      {basket[i.sku] ? <Stepper value={basket[i.sku]} onChange={(v) => set(i.sku, v)} /> : <Button size="sm" variant="secondary" className="!h-[34px] w-16" onClick={() => set(i.sku, 1)}>{t("store.add.add")}</Button>}
    </div>
  );
  return (
    <FullScreen open={open} onClose={onClose} title={t("store.add.title")}>
      <div>
        <div className="flex items-start justify-between">
          <p className="text-[13px] font-medium text-muted">{t("store.add.eyebrow", { outlet })}</p>
          <button onClick={onClose} aria-label={t("common.close")} className="-mr-2 -mt-2 grid h-9 w-9 place-items-center rounded-full hover:bg-neutral"><Icon.Close /></button>
        </div>
        <Headline className="mt-1">{t("store.add.title")}</Headline>
        <p className="mt-2 text-[15px] text-muted">{t("store.add.lede", { cutoff })}</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("store.add.search")} className="mt-4 h-11 w-full rounded-[8px] border border-line bg-surface px-4 text-[14px] font-medium outline-none focus:border-ink" />
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`h-[30px] shrink-0 rounded-full px-4 text-[13px] font-medium ${cat === c ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>{c === "All" ? t("store.add.all") : c}</button>
          ))}
        </div>
        {often.length ? <div className="mt-5 text-[13px] font-semibold">{t("store.add.often")}</div> : null}
        <div className="divide-y divide-line">{often.map(row)}</div>
        {rest.length ? <div className="mt-5 text-[13px] font-semibold">{t("store.add.rest")}</div> : null}
        <div className="divide-y divide-line">{rest.map(row)}</div>
        <Button size="lg" block className="mt-5 !h-[52px] !text-[15px]" onClick={onClose}>{n ? t("store.add.cta", { n }) : t("store.add.ctaNone")}</Button>
        <p className="font-data mt-3 text-center text-[12px] text-muted">{t("store.add.caption", { cutoff })}</p>
      </div>
    </FullScreen>
  );
}
