import "./ExtensionConsentModal.css";
import { useSignal } from "@preact/signals";
import { useI18n } from "../../i18n/I18nManager";
import type { ExtensionManager } from "../../managers/ExtensionManager";
import type { SandboxPermission } from "../../extensions/protocol";
import { PermissionCards, type ConsentLine } from "./ExtensionConsentModal";

export type PermissionsApi = Pick<
  ExtensionManager,
  "sandboxPermissions" | "setOptionalPermission"
>;

/**
 * What a running sandboxed extension may do: what it needs, locked, and a
 * switch for each optional permission, saved (and the extension restarted)
 * as soon as it's flipped.
 */
export function ExtensionPermissionsPanel({
  extensions,
  extensionId,
  name,
}: {
  extensions: PermissionsApi;
  extensionId: string;
  name: string;
}) {
  const { t } = useI18n();
  const saving = useSignal(false);
  const outcome = useSignal<"saved" | "failed" | null>(null);
  const summary = extensions.sandboxPermissions.value[extensionId];
  if (!summary) {
    return (
      <p className="sb-extension-consent-text">
        {t("extension-permissions-not-running")}
      </p>
    );
  }

  const toggle = async (permission: SandboxPermission, enabled: boolean) => {
    saving.value = true;
    try {
      outcome.value = (await extensions.setOptionalPermission(
        extensionId,
        permission,
        enabled
      ))
        ? "saved"
        : "failed";
    } catch (err) {
      console.error(`Could not change ${extensionId}'s permissions:`, err);
      outcome.value = "failed";
    } finally {
      saving.value = false;
    }
  };

  const control = (line: ConsentLine) => {
    if (!line.permission || summary.required.includes(line.permission)) {
      return (
        <span className="sb-extension-permissions-needed">
          <span className="material-symbols-outlined" aria-hidden="true">
            lock
          </span>
          {t("extension-permissions-needed")}
        </span>
      );
    }
    const permission = line.permission;
    const on = summary.granted.includes(permission);
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={line.label}
        className="sb-extension-permissions-switch"
        disabled={saving.value}
        onClick={() => void toggle(permission, !on)}
      >
        <span className="sb-extension-permissions-knob" />
      </button>
    );
  };

  const hasNeeded = summary.required.length > 0 || summary.network.length > 0;
  const hasAny = hasNeeded || summary.optional.length > 0;

  return (
    <div className="sb-extension-consent sb-extension-permissions">
      <p
        className={`sb-extension-consent-notice sb-extension-permissions-status-${outcome.value ?? "idle"}`}
        role="status"
      >
        <span
          className="material-symbols-outlined sb-extension-consent-notice-icon"
          aria-hidden="true"
        >
          {outcome.value === "saved"
            ? "check_circle"
            : outcome.value === "failed"
              ? "error"
              : "restart_alt"}
        </span>
        {outcome.value === "saved"
          ? t("extension-permissions-saved", { name })
          : outcome.value === "failed"
            ? t("extension-permissions-failed")
            : t("extension-permissions-restart-note", { name })}
      </p>
      {hasAny ? (
        <PermissionCards
          permissions={[...summary.required, ...summary.optional]}
          network={summary.network}
          control={control}
        />
      ) : (
        <p className="sb-extension-consent-text">
          {t("extension-consent-nothing")}
        </p>
      )}
      {hasNeeded && (
        <p className="sb-extension-consent-note">
          {t("extension-permissions-needed-note", { name })}
        </p>
      )}
    </div>
  );
}
