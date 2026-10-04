"use client";

import { useRouter } from "next/navigation";
import { Button, Headline, Lead } from "@/components/ui";
import {
  DarkModeRow,
  LanguageRow,
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
    <div className="rise mx-auto max-w-[620px]">
      <Lead mono>
        {t("loader.settings.sub", {
          who: user?.name ?? "",
          depot: user?.depot ?? "",
          dock: user?.dock ?? "",
        })}
      </Lead>
      <Headline className="mt-1">{t("settings.title")}</Headline>
      <div className="mt-6">
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
      <Button
        size="xl"
        variant="secondary"
        block
        className="mt-8"
        onClick={signOut}
      >
        {t("common.signOut")}
      </Button>
    </div>
  );
}
