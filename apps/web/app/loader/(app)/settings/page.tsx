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

export default function LoaderSettingsPage() {
  const { t } = useT();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [planAlert, setPlanAlert] = usePref<boolean>(
    "wp_loader_plan_alert",
    true,
  );
  const [flagReplies, setFlagReplies] = usePref<boolean>(
    "wp_loader_flag_replies",
    true,
  );
  const signOut = () => {
    logout();
    router.replace("/loader");
  };
  return (
    <SettingsLayout
      lead={t("loader.settings.sub", {
        who: user?.name ?? "",
        depot: user?.depot ?? "",
        dock: user?.dock ?? "",
      })}
      onDone={() => router.push("/loader/departures")}
      onSignOut={signOut}
    >
      <div>
        <SettingsSection title={t("settings.display")}>
          <DarkModeRow sub={t("loader.settings.darkSub")} />
          <LanguageRow />
          <TextSizeRow />
        </SettingsSection>
        <SettingsSection title={t("loader.settings.alerts")}>
          <ToggleRow
            label={t("loader.settings.planAlert")}
            sub={t("loader.settings.planAlertSub")}
            checked={planAlert}
            onChange={setPlanAlert}
          />
          <ToggleRow
            label={t("loader.settings.flagReplies")}
            sub={t("loader.settings.flagRepliesSub")}
            checked={flagReplies}
            onChange={setFlagReplies}
          />
        </SettingsSection>
        <SettingsSection title={t("loader.settings.tablet")}>
          <ValueRow
            label={t("loader.settings.idle")}
            value={t("loader.settings.idleValue")}
          />
          <ValueRow
            label={t("loader.settings.switchPerson")}
            onClick={signOut}
          />
        </SettingsSection>
      </div>
    </SettingsLayout>
  );
}
