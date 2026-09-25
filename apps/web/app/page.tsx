import Link from "next/link";
import { apiGet } from "@/lib/api";

// Render on each request so the API status is live, not baked in at build time.
export const dynamic = "force-dynamic";

const roles = [
  { href: "/dispatcher", name: "Dispatcher", device: "Desktop" },
  { href: "/loader", name: "Loader", device: "Tablet / phone" },
  { href: "/driver", name: "Driver", device: "Phone (offline-first)" },
  { href: "/store", name: "Store manager", device: "Phone / desktop" },
];

async function apiStatus(): Promise<string> {
  try {
    const h = await apiGet<{ status: string; db: string }>("/health");
    return `API ${h.status} · DB ${h.db}`;
  } catch {
    return "API unreachable";
  }
}

export default async function Home() {
  const status = await apiStatus();
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Waypoint Delivery System</h1>
      <p className="text-sm text-neutral-500">{status}</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {roles.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="block rounded-lg border p-4 hover:bg-neutral-50">
              <span className="font-medium">{r.name}</span>
              <span className="block text-sm text-neutral-500">{r.device}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
