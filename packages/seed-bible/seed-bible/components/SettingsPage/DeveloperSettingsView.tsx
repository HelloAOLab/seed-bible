/* eslint-disable seed-bible-i18n/i18n-untranslated-content -- dev builds only, not for translators */
import { SettingRow } from "../SettingRow/SettingRow";
import { Switch } from "../Switch/Switch";
import { useI18n } from "../../i18n/I18nManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  DEV_TOOLS,
  enabledDevTools,
  setDevToolEnabled,
} from "../../app/devTools/devTools";
import { SettingsBreadcrumbs, SettingsHero } from "./SettingsPage";

/** Settings → Developer: a switch for each dev tool. Dev builds only. */
export function DeveloperSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { t } = useI18n();

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={() => {
          state.sidebar.requestedSettingsView.value = "main";
        }}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          "Developer",
        ]}
      />
      <SettingsHero
        icon="code"
        title="Developer"
        description="Tools for working on Seed Bible. Only in development builds."
      />
      <section className="sb-settings-section">
        {DEV_TOOLS.map((tool) => (
          <SettingRow
            key={tool.id}
            label={tool.label}
            description={tool.description}
          >
            <Switch
              checked={enabledDevTools.value.has(tool.id)}
              onToggled={(checked) => setDevToolEnabled(tool.id, checked)}
            />
          </SettingRow>
        ))}
      </section>
    </div>
  );
}
