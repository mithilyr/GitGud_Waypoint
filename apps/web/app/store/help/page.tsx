"use client";

import Link from "next/link";
import { Button, Card, Headline, Lead, NavRow } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";

const HELP: [Key, Key][] = [
  ["store.help.q1", "store.help.a1"],
  ["store.help.q2", "store.help.a2"],
  ["store.help.q3", "store.help.a3"],
];

export default function HelpPage() {
  const { t } = useT();
  const { user } = useAuth();
  return (
    <div className="rise">
      <Lead>{t("store.outlet", { name: user?.outlet?.name ?? "" })}</Lead>
      <Headline className="mt-1">{t("store.help.title")}</Headline>
      <div className="mt-5 space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-4 lg:space-y-0">
        {HELP.map(([q, a]) => (
          <Card key={q} className="p-4">
            <div className="text-[16px] font-semibold">{t(q)}</div>
            <p className="mt-2 text-[14px] text-muted">{t(a)}</p>
          </Card>
        ))}
        <NavRow label={t("settings.title")} href="/store/settings" />
      </div>
      <Link href="/store/contact" className="mt-6 block lg:inline-block">
        <Button size="lg" block className="lg:px-10">{t("store.help.contact")}</Button>
      </Link>
    </div>
  );
}
