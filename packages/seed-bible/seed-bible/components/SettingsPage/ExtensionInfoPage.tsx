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
  splitSourcedExtensionId,
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
import {
  ExtensionReviewBadges,
  ExtensionReviewControls,
  ExtensionReviewNotice,
  useExtensionReview,
} from "../ExtensionReview/ExtensionReview";
import type { ExtensionReviewsManager } from "../../managers/ExtensionReviewsManager";

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
  /** Which extensions are verified and reviewed. */
  reviews?: ExtensionReviewsManager;
  /**
   * "narrow" stacks everything for the sidebar; "wide" lays it out across a
   * full-screen page, with the tabs down the side.
   */
  layout?: "narrow" | "wide";
  /** The page's breadcrumbs, which lead back to the list. */
  breadcrumbs?: ComponentChildren;
  onInstall: () => void;
  onUninstall: () => void;
  /** The extension's settings form, or null when it has nothing to set. */
  settings: ComponentChildren | null;
}

/** Who uploaded the extension at `url`, once that's known. */
export function useExtensionUploader(
  extensions: Pick<ExtensionManager, "describeUploader" | "sandboxPermissions">,
  extensionId: string,
  url: string | null
): SandboxUploader | undefined {
  const fetched = useSignal<SandboxUploader | undefined>(undefined);
  const summary = extensions.sandboxPermissions.value[extensionId];
  // A running extension's summary already names its uploader; one that
  // isn't running is looked up here.
  useEffect(() => {
    fetched.value = undefined;
    if (!url || summary) {
      return;
    }
    let current = true;
    void extensions.describeUploader(url).then((found) => {
      if (current) {
        fetched.value = found;
      }
    });
    return () => {
      current = false;
    };
  }, [url, Boolean(summary)]);
  return summary?.uploader ?? fetched.value;
}

const TAB_ICONS: Record<InfoTab, string> = {
  about: "info",
  permissions: "shield",
  settings: "settings",
};

/**
 * Everything about one extension in one place: what it is and can do, and,
 * once it's installed, its permissions, its settings and uninstalling it.
 */
export function ExtensionInfoPage(props: ExtensionInfoPageProps) {
  const { entry, name, installState, extensions } = props;
  const wide = props.layout === "wide";
  const { t } = useI18n();
  const tab = useSignal<InfoTab>("about");
  const pageRef = useRef<HTMLDivElement>(null);
  // Opened from partway down the list, the page would start scrolled.
  useEffect(() => {
    pageRef.current?.scrollIntoView?.({ block: "start" });
  }, [entry.id]);

  const extension = entry.extension;
  const url = extension && "url" in extension ? extension.url : null;
  const summary = extensions.sandboxPermissions.value[entry.id];
  const uploader = useExtensionUploader(extensions, entry.id, url);
  const review = useExtensionReview(props.reviews, entry.id);
  const installed =
    installState === "installed" || installState === "downloaded";

  let sourceHost: string | null = null;
  try {
    sourceHost = url ? new URL(url).host : null;
  } catch {
    sourceHost = null;
  }
  // A third-party extension's id starts with where it's hosted, which is
  // shown on its own row; the id it declares is shown beside it.
  const sourced = splitSourcedExtensionId(entry.id);
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
    <section
      className={`sb-extension-info-section${wide ? " sb-extension-info-card" : ""}`}
    >
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
        {(sourced || sourceHost) && (
          <>
            <dt>{t("extension-info-hosted-at")}</dt>
            <dd>{sourced?.source ?? sourceHost}</dd>
          </>
        )}
        <dt>{t("extension-info-id")}</dt>
        <dd className="sb-extension-info-id">
          {sourced?.declaredId ?? entry.id}
        </dd>
      </dl>
    </section>
  );

  const description = props.description && (
    <p className="sb-extension-info-description">{props.description}</p>
  );

  const unreviewed = url && <ExtensionReviewNotice review={review} />;

  const reviewControls = props.reviews && (
    <ExtensionReviewControls
      reviews={props.reviews}
      extensionId={entry.id}
      review={review}
    />
  );

  const installButton = !installed && (
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
  );

  const uninstallButton = installed && (
    <button
      type="button"
      className="sb-extension-info-uninstall"
      onClick={props.onUninstall}
    >
      {wide
        ? t("uninstall", { defaultValue: "Uninstall" })
        : t("extension-info-uninstall", { name })}
    </button>
  );

  const whatItCanDo = !installed && manifest?.ok && (
    <section className="sb-extension-info-section">
      <h2 className="sb-extension-info-heading">
        {t("extension-info-what-it-can-do")}
      </h2>
      <div className="sb-extension-info-abilities">
        {manifest.manifest.permissions.length +
          manifest.manifest.network.length >
          0 && (
          <div className="sb-extension-info-ability-group">
            <h3 className="sb-extension-consent-section-title">
              {t("extension-consent-now")}
            </h3>
            <PermissionCards
              permissions={manifest.manifest.permissions}
              network={manifest.manifest.network}
            />
          </div>
        )}
        {manifest.manifest.optionalPermissions.length > 0 && (
          <div className="sb-extension-info-ability-group">
            <h3 className="sb-extension-consent-section-title">
              {t("extension-consent-later")}
            </h3>
            <PermissionCards
              permissions={manifest.manifest.optionalPermissions}
              network={[]}
            />
          </div>
        )}
      </div>
      {manifest.manifest.permissions.length +
        manifest.manifest.network.length +
        manifest.manifest.optionalPermissions.length ===
        0 && (
        <p className="sb-extension-consent-text">
          {t("extension-consent-nothing")}
        </p>
      )}
    </section>
  );

  const about = wide ? (
    <div className="sb-extension-info-about">
      <div className="sb-extension-info-about-main">
        {description}
        {unreviewed}
      </div>
      {details}
      {reviewControls}
    </div>
  ) : (
    <div className="sb-extension-info-panel">
      {description}
      {installButton}
      {unreviewed}
      {whatItCanDo}
      {details}
      {reviewControls}
      {uninstallButton}
    </div>
  );

  const identity = (
    <>
      <span className="sb-extension-info-tile">
        <ExtensionTile
          request={{
            extensionId: entry.id,
            title: name,
            icon: extension?.meta.icon,
          }}
        />
      </span>
      <div className="sb-extension-info-identity">
        <div className="sb-extension-info-title-row">
          <h1 className="sb-extension-info-title">{name}</h1>
          {statusLabel && (
            <span
              className={`sb-extension-info-status sb-extension-info-status-${installState}`}
            >
              {installState === "installed" && (
                <span className="material-symbols-outlined" aria-hidden="true">
                  check
                </span>
              )}
              {statusLabel}
            </span>
          )}
          <ExtensionReviewBadges review={review} />
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
                  source={{ sourceHost, uploader }}
                  people={props.people}
                />
              )
            : t("extension-info-built-in")}
        </p>
        {wide && !installed && description}
      </div>
    </>
  );

  const tabList = tabs.length > 1 && (
    <div
      className="sb-extension-info-tabs"
      role="tablist"
      aria-label={name}
      aria-orientation={wide ? "vertical" : undefined}
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
          {wide && (
            <span className="material-symbols-outlined" aria-hidden="true">
              {TAB_ICONS[key]}
            </span>
          )}
          {tabLabel(key)}
        </button>
      ))}
    </div>
  );

  const tabPanel = (
    <div
      id="sb-extension-info-tabpanel"
      className="sb-extension-info-tabpanel"
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
        <div className="sb-extension-info-panel sb-extension-info-settings">
          {props.settings}
        </div>
      )}
    </div>
  );

  if (wide) {
    return (
      <div className="sb-extension-info sb-extension-info-wide" ref={pageRef}>
        {props.breadcrumbs}
        <section
          className={`sb-extension-info-hero${installed ? "" : " sb-extension-info-hero-card"}`}
        >
          {identity}
          {installed ? (
            uninstallButton
          ) : (
            <div className="sb-extension-info-hero-actions">
              {unreviewed}
              {installButton}
              <span className="sb-extension-info-install-note">
                {t("extension-info-install-note")}
              </span>
            </div>
          )}
        </section>
        {installed ? (
          <div className="sb-extension-info-body">
            {tabList}
            {tabPanel}
          </div>
        ) : (
          <div className="sb-extension-info-body">
            <div className="sb-extension-info-body-main">{whatItCanDo}</div>
            <aside className="sb-extension-info-aside">
              {details}
              {reviewControls}
            </aside>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sb-settings-page sb-extension-info" ref={pageRef}>
      {props.breadcrumbs}
      <header className="sb-extension-info-header">{identity}</header>
      {tabList}
      {tabPanel}
    </div>
  );
}
