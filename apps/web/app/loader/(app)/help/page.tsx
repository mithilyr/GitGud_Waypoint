"use client";

import Link from "next/link";
import { Button, Card, Headline, Lead, NavRow } from "@/components/ui";
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
      <Lead mono>
        {t("loader.depotLine", {
          depot: user?.depot ?? "",
          dock: user?.dock ?? "",
        })}
      </Lead>
      <Headline className="mt-1">{t("loader.nav.help")}</Headline>
      <div className="mt-5 space-y-3">
        {HELP.map(([q, a]) => (
          <Card key={q} className="p-4">
            <div className="text-[14px] font-semibold">{t(q)}</div>
            <p className="mt-2 text-[12px] font-medium text-muted">{t(a)}</p>
          </Card>
        ))}
        <NavRow label={t("settings.title")} href="/loader/settings" />
      </div>
      <Link href="/loader/load" className="mt-6 block">
        <Button size="xl" block>
          {t("loader.help.flag")}
        </Button>
      </Link>
    </div>
  );
}
