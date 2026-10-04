"use client";

import Link from "next/link";
import { HelpLayout } from "@/components/HelpLayout";
import { Button } from "@/components/ui";
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
    <HelpLayout
      lead={t("loader.depotLine", {
        depot: user?.depot ?? "",
        dock: user?.dock ?? "",
      })}
      title={t("loader.nav.help")}
      items={HELP.map(([q, a]) => ({ q: t(q), a: t(a) }))}
      settings={{ label: t("settings.title"), href: "/loader/settings" }}
      action={
        <Link href="/loader/load" className="block">
          <Button size="xl" block>
            {t("loader.help.flag")}
          </Button>
        </Link>
      }
    />
  );
}
