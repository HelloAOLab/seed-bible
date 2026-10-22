import "./ExtensionInfoPage.css";
import type { ComponentChildren } from "preact";
import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type {
  ExtensionListEntry,
  ExtensionManager,
} from "../../managers/ExtensionManager";
import {
  parseSandboxManifest,
  type SandboxUploader,
} from "../../managers/ExtensionPermissions";
import {
  ExtensionTile,
  PermissionCards,
  SourceLabel,
  withSource,
  type ConsentPeople,
} from "../ExtensionConsentModal/ExtensionConsentModal";
import {
  ExtensionPermissionsPanel,
  type PermissionsApi,
} from "../ExtensionConsentModal/ExtensionPermissionsPanel";

export type ExtensionInstallState =
  | "none"
  | "pending"
  | "downloaded"
  | "installed";

type InfoTab = "about" | "permissions" | "settings";

export interface ExtensionInfoPageProps {
  entry: ExtensionListEntry;
  /** Already translated (and branded) for display. */
  name: string;
  description: string;
  installState: ExtensionInstallState;
  extensions: PermissionsApi & Pick<ExtensionManager, "describeUploader">;
  people?: ConsentPeople;
  /** The page's breadcrumbs, which lead back to the list. */
  breadcrumbs: ComponentChildren;
  onInstall: () => void;
  onUninstall: () => void;
  /** The extension's settings form, or null when it has nothing to set. */
  settings: ComponentChildren | null;
}

/**
 * Everything about one extension in one place: what it is and can do, and,
 * once it's installed, its permissions, its settings and uninstalling it.
 */
export function ExtensionInfoPage(props: ExtensionInfoPageProps) {
  const { entry, name, installState, extensions } = props;
  const { t } = useI18n();
  const tab = useSignal<InfoTab>("about");
  const pageRef = useRef<HTMLDivElement>(null);
  // Opened from partway down the list, the page would start scrolled.
  useEffect(() => {
    pageRef.current?.scrollIntoView?.({ block: "start" });
  }, [entry.id]);
  const fetchedUploader = useSignal<SandboxUploader | undefined>(undefined);

  const extension = entry.extension;
  const url = extension && "url" in extension ? extension.url : null;
  const summary = extensions.sandboxPermissions.value[entry.id];
  const installed =
    installState === "installed" || installState === "downloaded";

  // A running extension's summary already names its uploader; one that
  // isn't running is looked up here.
  useEffect(() => {
    fetchedUploader.value = undefined;
    if (!url || summary) {
      return;
    }
    let current = true;
    void extensions.describeUploader(url).then((found) => {
      if (current) {
        fetchedUploader.value = found;
      }
    });
    return () => {
      current = false;
    };
  }, [url, Boolean(summary)]);

  let sourceHost: string | null = null;
  try {
    sourceHost = url ? new URL(url).host : null;
  } catch {
    sourceHost = null;
  }
  const version = summary?.version ?? extension?.meta.version ?? null;
  const manifest =
    url && extension ? parseSandboxManifest(extension.meta) : null;

  const tabs: InfoTab[] = installed
    ? [
        "about",
        ...(summary ? (["permissions"] as const) : []),
        ...(props.settings ? (["settings"] as const) : []),
      ]
    : ["about"];
  const shownTab = tabs.includes(tab.value) ? tab.value : "about";

  const tabLabel = (key: InfoTab) =>
    key === "about"
      ? t("extension-info-tab-about")
      : key === "permissions"
        ? t("extension-info-tab-permissions")
        : t("extension-info-tab-settings");

  const statusLabel =
    installState === "installed"
      ? t("extension-state-installed", { defaultValue: "Installed" })
      : installState === "downloaded"
        ? t("extension-state-downloaded", { defaultValue: "Downloaded" })
        : installState === "pending"
          ? t("extension-state-pending", { defaultValue: "Installing…" })
          : null;

  const details = (
    <section className="sb-extension-info-section">
      <h2 className="sb-extension-info-heading">
        {t("extension-info-details")}
      </h2>
      <dl className="sb-extension-info-details">
        {version && (
          <>
            <dt>{t("extension-info-version")}</dt>
            <dd>{version}</dd>
          </>
        )}
        {sourceHost && (
          <>
            <dt>{t("extension-info-hosted-at")}</dt>
            <dd>{sourceHost}</dd>
          </>
        )}
        <dt>{t("extension-info-id")}</dt>
        <dd className="sb-extension-info-id">{entry.id}</dd>
      </dl>
    </section>
  );

  const unreviewed = url && (
    <p className="sb-extension-consent-notice">
      <span
        className="material-symbols-outlined sb-extension-consent-notice-icon"
        aria-hidden="true"
      >
        info
      </span>
      {t("extension-consent-unreviewed")}
    </p>
  );

  const about = (
    <div className="sb-extension-info-panel">
      {props.description && (
        <p className="sb-extension-info-description">{props.description}</p>
      )}
      {!installed && (
        <button
          type="button"
          className="sb-extension-info-install"
          disabled={installState === "pending"}
          onClick={props.onInstall}
        >
          {installState === "pending"
            ? t("extension-state-pending", { defaultValue: "Installing…" })
            : t("install", { defaultValue: "Install" })}
        </button>
      )}
      {unreviewed}
      {!installed && manifest?.ok && (
        <section className="sb-extension-info-section">
          <h2 className="sb-extension-info-heading">
            {t("extension-info-what-it-can-do")}
          </h2>
          {manifest.manifest.permissions.length +
            manifest.manifest.network.length >
            0 && (
            <>
              <h3 className="sb-extension-consent-section-title">
                {t("extension-consent-now")}
              </h3>
              <PermissionCards
                permissions={manifest.manifest.permissions}
                network={manifest.manifest.network}
              />
            </>
          )}
          {manifest.manifest.optionalPermissions.length > 0 && (
            <>
              <h3 className="sb-extension-consent-section-title">
                {t("extension-consent-later")}
              </h3>
              <PermissionCards
                permissions={manifest.manifest.optionalPermissions}
                network={[]}
              />
            </>
          )}
          {manifest.manifest.permissions.length +
            manifest.manifest.network.length +
            manifest.manifest.optionalPermissions.length ===
            0 && (
            <p className="sb-extension-consent-text">
              {t("extension-consent-nothing")}
            </p>
          )}
        </section>
      )}
      {details}
      {installed && (
        <button
          type="button"
          className="sb-extension-info-uninstall"
          onClick={props.onUninstall}
        >
          {t("extension-info-uninstall", { name })}
        </button>
      )}
    </div>
  );

  return (
    <div className="sb-settings-page sb-extension-info" ref={pageRef}>
      {props.breadcrumbs}
      <header className="sb-extension-info-header">
        <span className="sb-extension-info-tile">
          <ExtensionTile request={{ extensionId: entry.id, title: name }} />
        </span>
        <div className="sb-extension-info-identity">
          <div className="sb-extension-info-title-row">
            <h1 className="sb-extension-info-title">{name}</h1>
            {statusLabel && (
              <span
                className={`sb-extension-info-status sb-extension-info-status-${installState}`}
              >
                {installState === "installed" && (
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    check
                  </span>
                )}
                {statusLabel}
              </span>
            )}
          </div>
          <p className="sb-extension-consent-source">
            {sourceHost
              ? withSource(
                  (host) =>
                    version
                      ? t("extension-consent-source-version", {
                          version,
                          host,
                        })
                      : t("extension-consent-from", { host }),
                  <SourceLabel
                    source={{
                      sourceHost,
                      uploader: summary?.uploader ?? fetchedUploader.value,
                    }}
                    people={props.people}
                  />
                )
              : t("extension-info-built-in")}
          </p>
        </div>
      </header>

      {tabs.length > 1 && (
        <div
          className="sb-extension-info-tabs"
          role="tablist"
          aria-label={name}
          style={{ "--sb-extension-info-tab-count": tabs.length }}
        >
          {tabs.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`sb-extension-info-tab-${key}`}
              aria-selected={shownTab === key}
              aria-controls="sb-extension-info-tabpanel"
              className="sb-extension-info-tab"
              onClick={() => (tab.value = key)}
            >
              {tabLabel(key)}
            </button>
          ))}
        </div>
      )}

      <div
        id="sb-extension-info-tabpanel"
        role={tabs.length > 1 ? "tabpanel" : undefined}
        aria-labelledby={
          tabs.length > 1 ? `sb-extension-info-tab-${shownTab}` : undefined
        }
      >
        {shownTab === "about" && about}
        {shownTab === "permissions" && (
          <ExtensionPermissionsPanel
            extensions={extensions}
            extensionId={entry.id}
            name={name}
          />
        )}
        {shownTab === "settings" && (
          <div className="sb-extension-info-panel">{props.settings}</div>
        )}
      </div>
    </div>
  );
}
