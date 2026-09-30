"use client";

import Link from "next/link";
import { Button, Card, Headline } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import type { Key } from "@/lib/i18n/en";

const HELP: [Key, Key][] = [
  ["loader.help.q1", "loader.help.a1"],
  ["loader.help.q2", "loader.help.a2"],
  ["loader.help.q3", "loader.help.a3"],
];

export default function HelpPage() {
  const { t } = useT();
  const { user } = useAuth();
  return (
    <div className="rise mx-auto max-w-[620px]">
      <p className="font-data text-[13px] font-medium text-muted">{t("loader.depotLine", { depot: user?.depot ?? "", dock: user?.dock ?? "" })}</p>
      <Headline className="mt-1">{t("loader.nav.help")}</Headline>
      <div className="mt-5 space-y-3">
        {HELP.map(([q, a]) => (
          <Card key={q} className="p-4">
            <div className="text-[14px] font-semibold">{t(q)}</div>
            <p className="mt-2 text-[12px] font-medium text-muted">{t(a)}</p>
          </Card>
        ))}
        <Link href="/loader/settings" className="block">
          <Card className="flex h-[52px] items-center justify-between px-4">
            <span className="text-[14px] font-semibold">{t("settings.title")}</span>
            <span className="text-[18px] leading-none text-muted" aria-hidden>›</span>
          </Card>
        </Link>
      </div>
      <Link href="/loader/departures?tab=load" className="mt-6 block">
        <Button size="lg" block className="!h-[52px] !text-[15px]">{t("loader.help.flag")}</Button>
      </Link>
    </div>
  );
}
