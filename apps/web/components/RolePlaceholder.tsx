import Link from "next/link";

type Props = { role: string; device: string; screens: string[]; owner: string };

// Temporary page shell for each role area. Replace with the Day-5 designs.
export function RolePlaceholder({ role, device, screens, owner }: Props) {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/" className="text-sm underline">← All roles</Link>
      <h1 className="mt-4 text-2xl font-semibold">{role}</h1>
      <p className="text-sm text-neutral-500">Target device: {device} · Owner: {owner}</p>
      <h2 className="mt-6 font-medium">Screens to build (from the Day-5 design)</h2>
      <ul className="mt-2 list-disc pl-6">
        {screens.map((s) => <li key={s}>{s}</li>)}
      </ul>
    </main>
  );
}
