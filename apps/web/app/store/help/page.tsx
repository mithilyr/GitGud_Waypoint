"use client";

import Link from "next/link";
import { HelpLayout } from "@/components/HelpLayout";
import { Button } from "@/components/ui";
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
    <HelpLayout
      lead={t("store.outlet", { name: user?.outlet?.name ?? "" })}
      title={t("store.help.title")}
      items={HELP.map(([q, a]) => ({ q: t(q), a: t(a) }))}
      settings={{ label: t("settings.title"), href: "/store/settings" }}
      action={
        <Link href="/store/contact" className="block">
          <Button size="xl" block>
            {t("store.help.contact")}
          </Button>
        </Link>
      }
    />
  );
}
