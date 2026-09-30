"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button, Card, ErrorNote, Eyebrow, Headline, Icon, Sheet, Spinner, toast } from "@/components/ui";
import { get, post } from "@/lib/api";
import { fmtDate, fmtLong } from "@/lib/format";
import { usePoll } from "@/lib/hooks";

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
  const { data: home } = usePoll(() => get<Home>("/store/home"), 30000);
  const { data: catalog } = usePoll(() => get<Item[]>("/store/catalog"));
  const [basket, setBasket] = useState<Basket>({});
  const [seeded, setSeeded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);

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
    ? "Cutoff has passed today."
    : c.minutes_left >= 60
      ? `Cutoff in ${Math.floor(c.minutes_left / 60)} h ${c.minutes_left % 60} min.`
      : `Cutoff in ${c.minutes_left} minutes.`;

  async function place() {
    setBusy(true);
    setError(null);
    try {
      setPlaced(await post<Placed>("/store/orders", { lines: lines.map(([sku, qty]) => ({ sku, qty })) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the order");
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
      toast(`Copied ${last.lines.length} lines from ${fmtDate(last.date)}. Change anything before you place it.`, "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "No earlier order to copy", "warn");
    }
  }

  return (
    <div className="rise">
      <Eyebrow>
        {home.outlet.name} outlet · {home.manager.split(" ")[0]} · {fmtDate(new Date().toISOString().slice(0, 10))}
      </Eyebrow>
      <Headline className="mt-1">{countdown}</Headline>
      <p className="mt-1 text-[15px] text-muted">Orders placed after {c.label} wait for the next run.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="eyebrow">Items</div>
          <div className="font-display text-[24px] font-medium">{lines.length} lines</div>
        </Card>
        <Card className="p-3">
          <div className="eyebrow">Expected</div>
          <div className="font-display text-[24px] font-medium leading-tight">{fmtDate(c.service_date, { weekday: "short", day: "numeric" })}</div>
          <div className="text-[13px] text-muted">{c.window}</div>
        </Card>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <Eyebrow>Order lines</Eyebrow>
        <button onClick={() => setBasket({})} className="text-[13px] font-semibold text-muted underline">
          Clear
        </button>
      </div>
      <Card className="mt-2 divide-y divide-line">
        {lines.map(([sku, qty]) => (
          <div key={sku} className="flex min-h-14 items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{byId[sku]?.name ?? sku}</div>
              {byId[sku]?.temp === "chilled" ? <span className="text-[12px] text-info">chilled</span> : <span className="text-[12px] text-muted">{byId[sku]?.category}</span>}
            </div>
            <Stepper value={qty} onChange={(q) => set(sku, q)} />
          </div>
        ))}
        {!lines.length ? <div className="px-4 py-6 text-center text-muted">Nothing in this order yet.</div> : null}
      </Card>

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setAdding(true)}>
          <Icon.Plus /> Add item
        </Button>
        <Button variant="secondary" className="flex-1" onClick={reorder}>
          Reorder last week
        </Button>
      </div>

      <div className="mt-5">
        <ErrorNote error={error} />
        <Button size="lg" block className="mt-2" busy={busy} disabled={!lines.length} onClick={place}>
          Place order
        </Button>
        <p className="mt-2 text-center text-[12px] text-muted">
          Cutoff {c.label} · delivers {fmtDate(c.service_date)} {c.window}
        </p>
      </div>

      <AddItems open={adding} onClose={() => setAdding(false)} catalog={catalog} basket={basket} set={set} />
      <Sheet open={!!placed} onClose={() => setPlaced(null)} title="Order received">
        {placed ? (
          <div className="p-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-bg text-ok"><Icon.Check size={28} /></div>
            <Eyebrow className="mt-4">Received by dispatch · {placed.received_at}</Eyebrow>
            <div className="mt-1 font-display text-[30px] font-medium leading-tight">Ruwan has your order.</div>
            <p className="mt-2 text-muted">{placed.message} The truck and ETA show on Track from the morning of {fmtLong(placed.service_date)}.</p>
            <div className="mx-auto mt-4 max-w-[300px] rounded-[12px] bg-neutral p-3 text-left">
              {placed.orders.map((o) => (
                <div key={o.id} className="flex justify-between text-[14px]">
                  <span className="font-data">{o.id}</span>
                  <span className="text-muted">{o.temp === "chilled" ? "Chilled" : "Ambient"}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between text-[14px]"><span className="text-muted">Delivery</span><span>{fmtDate(placed.service_date)} · {c.window}</span></div>
            </div>
            <Link href="/store/track" className="mt-5 block">
              <Button size="lg" block>Track this order</Button>
            </Link>
            <Button variant="ghost" block className="mt-1" onClick={() => setPlaced(null)}>Done</Button>
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onChange(value - 1)} className="grid h-9 w-9 place-items-center rounded-[8px] border border-line" aria-label="One fewer"><Icon.Minus size={16} /></button>
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        className="font-data h-9 w-12 rounded-[8px] border border-line bg-surface text-center"
        aria-label="Quantity"
      />
      <button onClick={() => onChange(value + 1)} className="grid h-9 w-9 place-items-center rounded-[8px] border border-line" aria-label="One more"><Icon.Plus size={16} /></button>
    </div>
  );
}

function AddItems({ open, onClose, catalog, basket, set }: { open: boolean; onClose: () => void; catalog: Item[]; basket: Basket; set: (sku: string, q: number) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const cats = ["All", ...Array.from(new Set(catalog.map((c) => c.category)))];
  const shown = catalog.filter((i) => (cat === "All" || i.category === cat) && i.name.toLowerCase().includes(q.toLowerCase()));
  const often = shown.filter((i) => i.often);
  const rest = shown.filter((i) => !i.often);
  const row = (i: Item) => (
    <div key={i.sku} className="flex min-h-14 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold">{i.name}</div>
        <div className="text-[12px] text-muted">
          {i.temp === "chilled" ? "Chilled" : "Dry"} · Rs {i.price.toLocaleString()} · {i.pack}
        </div>
      </div>
      {basket[i.sku] ? <Stepper value={basket[i.sku]} onChange={(v) => set(i.sku, v)} /> : <Button size="sm" variant="secondary" onClick={() => set(i.sku, 1)}>Add</Button>}
    </div>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Add items">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <Headline className="!text-[26px]">Add items.</Headline>
            <p className="text-[13px] text-muted">From the depot catalogue. Items join this order until the 4:00 PM cutoff.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral"><Icon.Close /></button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search milk, rice, soap…" className="mt-3 h-11 w-full rounded-[8px] border border-line bg-surface px-3 outline-none focus:border-ink" />
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold ${cat === c ? "bg-primary text-on-primary" : "bg-neutral text-muted"}`}>{c}</button>
          ))}
        </div>
        {often.length ? <div className="eyebrow mt-3">Often ordered here</div> : null}
        <div className="divide-y divide-line">{often.map(row)}</div>
        {rest.length ? <div className="eyebrow mt-3">All items</div> : null}
        <div className="divide-y divide-line">{rest.map(row)}</div>
        <Button size="lg" block className="mt-4" onClick={onClose}>Done · {Object.values(basket).filter((v) => v > 0).length} lines</Button>
      </div>
    </Sheet>
  );
}

