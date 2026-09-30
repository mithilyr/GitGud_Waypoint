"use client";

import Link from "next/link";
import { Icon } from "./ui";
import { useT } from "@/lib/i18n";

/** "← Home": the way back to the start page from a sign-in screen. */
export function HomeLink({ className = "" }: { className?: string }) {
  const { t } = useT();
  return (
    <Link href="/" className={`-ml-2 inline-flex h-10 items-center gap-1 rounded-full px-2 text-[13px] font-medium text-muted hover:bg-neutral hover:text-ink ${className}`}>
      <Icon.Back size={18} />
      {t("common.home")}
    </Link>
  );
}
