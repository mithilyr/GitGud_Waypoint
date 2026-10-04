"use client";

import { useRouter } from "next/navigation";
import {
  DarkModeRow,
  LanguageRow,
  SettingsLayout,
  SettingsSection,
  TextSizeRow,
  ToggleRow,
  ValueRow,
} from "@/components/Settings";
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
    <SettingsLayout
      lead={t("store.settings.sub", {
        who: user?.name?.split(" ")[0] ?? "",
        outlet: user?.outlet?.name ?? "",
      })}
      onDone={() => router.push("/store")}
      onSignOut={() => {
        logout();
        router.replace("/");
      }}
    >
      <div>
        <SettingsSection title={t("settings.display")}>
          <DarkModeRow sub={t("settings.darkModeSub")} />
          <LanguageRow />
          <TextSizeRow />
        </SettingsSection>
        <SettingsSection title={t("store.settings.alerts")}>
          <ToggleRow
            label={t("store.settings.received")}
            sub={t("store.settings.receivedSub")}
            checked={received}
            onChange={setReceived}
          />
          <ToggleRow
            label={t("store.settings.deferral")}
            sub={t("store.settings.deferralSub")}
            checked={deferral}
            onChange={setDeferral}
          />
          <ValueRow
            label={t("store.settings.cutoffReminder")}
            value={t("store.settings.cutoffValue")}
          />
          <ValueRow
            label={t("store.settings.truckReminder")}
            value={t("store.settings.truckValue")}
          />
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
