"use client";

import { useRouter } from "next/navigation";
import { Button, Headline, Lead } from "@/components/ui";
import {
  DarkModeRow,
  LanguageRow,
  SegRow,
  SettingsSection,
  TextSizeRow,
  ToggleRow,
  ValueRow,
} from "@/components/Settings";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { useDensity, usePref } from "@/lib/prefs";

export default function DispatcherSettingsPage() {
  const { t } = useT();
  const { user } = useAuth();
  const router = useRouter();
  const [density, setDensity] = useDensity();
  const [skipped, setSkipped] = usePref<boolean>("wp_disp_skipped", true);
  const [conflicts, setConflicts] = usePref<boolean>("wp_disp_conflicts", true);
  const [depots, setDepots] = usePref<string>("wp_disp_depots", "both");
  return (
    <div className="rise">
      <Lead>
        {t("disp.settings.sub", { who: user?.name?.split(" ")[0] ?? "" })}
      </Lead>
      <Headline className="mt-1">{t("settings.title")}</Headline>
      <div className="mt-6 grid gap-x-8 gap-y-6 lg:grid-cols-2 lg:items-start">
        <div>
          <SettingsSection title={t("settings.display")}>
            <DarkModeRow sub={t("disp.settings.darkSub")} />
            <LanguageRow inline />
            <TextSizeRow />
            <SegRow
              label={t("settings.density")}
              value={density}
              onChange={setDensity}
              options={[
                { value: "comfortable", label: t("settings.comfortable") },
                { value: "compact", label: t("settings.compact") },
              ]}
            />
          </SettingsSection>
        </div>
        <div>
          <SettingsSection title={t("disp.settings.alerts")}>
            <ValueRow
              label={t("disp.settings.lateRisk")}
              sub={t("disp.settings.lateRiskSub")}
              value={t("disp.settings.lateRiskValue")}
            />
            <ToggleRow
              label={t("disp.settings.skipped")}
              sub={t("disp.settings.skippedSub")}
              checked={skipped}
              onChange={setSkipped}
            />
            <ValueRow
              label={t("disp.settings.planReady")}
              sub={t("disp.settings.planReadySub")}
              value="17:30"
            />
            <ToggleRow
              label={t("disp.settings.syncConflicts")}
              sub={t("disp.settings.syncConflictsSub")}
              checked={conflicts}
              onChange={setConflicts}
            />
          </SettingsSection>
          <SettingsSection title={t("disp.settings.liveBoard")}>
            <SegRow
              label={t("disp.settings.depotsShown")}
              value={depots}
              onChange={setDepots}
              options={[
                { value: "both", label: t("disp.settings.both") },
                { value: "peliyagoda", label: "Peliyagoda" },
                { value: "kandy", label: "Kandy" },
              ]}
            />
          </SettingsSection>
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <Button
          size="lg"
          className="w-full lg:w-[284px]"
          onClick={() => router.push("/dispatcher/orders")}
        >
          {t("common.done")}
        </Button>
      </div>
    </div>
  );
}
