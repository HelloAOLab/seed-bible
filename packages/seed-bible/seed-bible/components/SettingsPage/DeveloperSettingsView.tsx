/* eslint-disable seed-bible-i18n/i18n-untranslated-content -- developer tools are for the team, not for translators */
import { Button } from "../Button/Button";
import { SettingRow } from "../SettingRow/SettingRow";
import { Switch } from "../Switch/Switch";
import { useI18n } from "../../i18n/I18nManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  DEV_TOOLS,
  enabledDevTools,
  hideDevTools,
  setDevToolEnabled,
} from "../../app/devTools/devTools";
import { SettingsBreadcrumbs, SettingsHero } from "./SettingsPage";

/** Settings → Developer: a switch for each developer tool this build offers. */
export function DeveloperSettingsView(props: { state: SeedBibleState }) {
  const { state } = props;
  const { t } = useI18n();
  const backToMain = () => {
    state.sidebar.requestedSettingsView.value = "main";
  };

  return (
    <div className="sb-settings-page">
      <SettingsBreadcrumbs
        onBack={backToMain}
        trail={[
          t("page-settings", { defaultValue: "Page settings" }),
          "Developer",
        ]}
      />
      <SettingsHero
        icon="code"
        title="Developer"
        description="Tools for working on Seed Bible. Switches are saved in this browser only."
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
        {/* Dev builds are always unlocked, so there's nothing to hide there. */}
        {!import.meta.env.DEV && (
          <Button
            onClick={() => {
              hideDevTools();
              backToMain();
            }}
          >
            Hide developer settings
          </Button>
        )}
      </section>
    </div>
  );
}
