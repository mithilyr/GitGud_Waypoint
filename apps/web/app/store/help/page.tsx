"use client";

import Link from "next/link";
import { Button, Card, Headline } from "@/components/ui";
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
      <p className="text-[13px] font-medium text-muted">{t("store.outlet", { name: user?.outlet?.name ?? "" })}</p>
      <Headline className="mt-1">{t("store.help.title")}</Headline>
      <div className="mt-5 space-y-3">
        {HELP.map(([q, a]) => (
          <Card key={q} className="p-4">
            <div className="text-[16px] font-semibold">{t(q)}</div>
            <p className="mt-2 text-[14px] text-muted">{t(a)}</p>
          </Card>
        ))}
        <Link href="/store/settings" className="block">
          <Card className="flex h-[52px] items-center justify-between px-4">
            <span className="text-[16px] font-semibold">{t("settings.title")}</span>
            <span className="text-[18px] leading-none text-muted" aria-hidden>›</span>
          </Card>
        </Link>
      </div>
      <Link href="/store/contact" className="mt-6 block">
        <Button size="lg" block className="!h-12 !text-[15px]">{t("store.help.contact")}</Button>
      </Link>
    </div>
  );
}
