"use client";

import { useRouter } from "next/navigation";
import { Button, Headline, Lead } from "@/components/ui";
import { DarkModeRow, LanguageRow, SettingsSection, TextSizeRow, ToggleRow, ValueRow } from "@/components/Settings";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { usePref } from "@/lib/prefs";

export default function StoreSettingsPage() {
  const { t } = useT();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [received, setReceived] = usePref<boolean>("wp_store_received", true);
  const [deferral, setDeferral] = usePref<boolean>("wp_store_deferral", true);
  return (
    <div className="rise lg:mx-auto lg:max-w-[640px]">
      <Lead>{t("store.settings.sub", { who: user?.name?.split(" ")[0] ?? "", outlet: user?.outlet?.name ?? "" })}</Lead>
      <Headline className="mt-1">{t("settings.title")}</Headline>
      <div className="mt-6">
        <SettingsSection title={t("settings.display")}>
          <DarkModeRow sub={t("settings.darkModeSub")} />
          <LanguageRow />
          <TextSizeRow />
        </SettingsSection>
        <SettingsSection title={t("store.settings.alerts")}>
          <ToggleRow label={t("store.settings.received")} sub={t("store.settings.receivedSub")} checked={received} onChange={setReceived} />
          <ToggleRow label={t("store.settings.deferral")} sub={t("store.settings.deferralSub")} checked={deferral} onChange={setDeferral} />
          <ValueRow label={t("store.settings.cutoffReminder")} value={t("store.settings.cutoffValue")} />
          <ValueRow label={t("store.settings.truckReminder")} value={t("store.settings.truckValue")} />
        </SettingsSection>
      </div>
      <Button size="lg" block className="mt-8" onClick={() => router.push("/store/help")}>{t("common.done")}</Button>
      <Button
        variant="ghost"
        block
        className="mt-2"
        onClick={() => {
          logout();
          router.replace("/");
        }}
      >
        {t("store.settings.signOutRow")}
      </Button>
    </div>
  );
}
