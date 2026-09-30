import Link from "next/link";
import { Logo, VineRidges } from "@/components/ui";
import { StatusPill } from "@/components/StatusPill";

const roles = [
  { href: "/dispatcher", name: "Dispatcher", who: "Ruwan", device: "Desktop", line: "Order queue, plan board, live runs, demand outlook." },
  { href: "/loader", name: "Loader", who: "Kamal", device: "Dock tablet or phone", line: "Load by stop order, flag shortfalls, release the vehicle." },
  { href: "/driver", name: "Driver", who: "Nuwan", device: "Phone, works offline", line: "Follow the run, record each stop with proof, sync later." },
  { href: "/store", name: "Store manager", who: "Shanika", device: "Phone or desktop", line: "Order before 4 PM, track the ETA, confirm receipt." },
];

export default function Home() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-[980px] flex-col px-4 pb-44 pt-8 sm:px-8">
      <header className="flex items-center gap-3">
        <Logo size={44} />
        <div>
          <div className="text-[15px] font-semibold leading-tight">Waypoint</div>
          <div className="text-[12px] text-muted">Delivery system · Kandy and Peliyagoda depots</div>
        </div>
        <StatusPill />
      </header>

      <section className="mt-12 max-w-[640px]">
        <p className="eyebrow">One operation, one system</p>
        <h1 className="mt-2 font-display text-[44px] font-medium leading-[1.05] tracking-[-0.015em] sm:text-[56px]">
          From the store&rsquo;s order to the signed receipt.
        </h1>
        <p className="mt-4 text-[16px] text-muted">
          Four people, one shared record. Pick who you are to walk one delivery day: order, plan, load, deliver, receive.
        </p>
      </section>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="hoverable group block rounded-[12px] border border-line bg-surface p-5 transition-colors hover:border-faint"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[24px] font-medium">{r.name}</span>
                <span className="eyebrow">{r.who}</span>
              </div>
              <p className="mt-1 text-[14px] text-muted">{r.line}</p>
              <p className="mt-4 text-[12px] font-semibold text-muted">{r.device} →</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-[12px] border border-line bg-surface p-5">
        <p className="eyebrow">Demo accounts</p>
        <p className="mt-1 text-[14px] text-muted">Password for all four: <span className="font-data text-ink">waypoint2026</span></p>
        <dl className="mt-3 grid gap-x-8 gap-y-1.5 text-[14px] sm:grid-cols-2">
          {[
            ["Dispatcher", "dispatcher@waypoint.demo"],
            ["Loader", "loader@waypoint.demo · PIN 1234"],
            ["Driver", "driver@waypoint.demo (sets a PIN on the phone)"],
            ["Store manager", "store@waypoint.demo"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
              <dt className="text-muted">{k}</dt>
              <dd className="font-data text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <VineRidges className="fixed inset-x-0 bottom-0 -z-10" />
    </main>
  );
}
