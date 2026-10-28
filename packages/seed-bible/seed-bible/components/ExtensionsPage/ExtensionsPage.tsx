import "./ExtensionsPage.css";
import { useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type { ExtensionListEntry } from "../../managers/ExtensionManager";
import { useI18n } from "../../i18n/I18nManager";
import { useRef } from "preact/hooks";
import { MaterialIcon } from "../icons";
import { SearchClearButton } from "../SearchClearButton/SearchClearButton";
import {
  ExtensionTile,
  SourceLabel,
  withSource,
} from "../ExtensionConsentModal/ExtensionConsentModal";
import {
  ExtensionInfoPage,
  useExtensionUploader,
} from "../SettingsPage/ExtensionInfoPage";
import { useExtensionCatalog } from "../SettingsPage/useExtensionCatalog";
import { UnusedSensitiveSettingsList } from "../ExtensionSettingsForm/SensitiveSettingsForm";

export const EXTENSIONS_PANE_ID = "extensions-pane";

type Filter = "all" | "installed" | "available" | "built-in" | "linked";
type Catalog = ReturnType<typeof useExtensionCatalog>;

/** Pane header title. A component so it can call `useI18n`. */
export function ExtensionsPaneTitle() {
  const { t } = useI18n();
  return <>{t("extensions", { defaultValue: "Extensions" })}</>;
}

/** Leads from one extension's page back to all of them. */
export function ExtensionsPaneBackButton(props: { state: SeedBibleState }) {
  const { t } = useI18n();
  if (props.state.extensionsPageEntryId.value === null) {
    return null;
  }
  return (
    <button
      type="button"
      className="sb-extensions-page-back"
      onClick={() => props.state.openExtensions()}
      aria-label={t("extensions-page-back")}
      title={t("extensions-page-back")}
    >
      <MaterialIcon className="rtl-mirror">arrow_back</MaterialIcon>
    </button>
  );
}

function ExtensionCard(props: {
  state: SeedBibleState;
  catalog: Catalog;
  entry: ExtensionListEntry;
}) {
  const { state, catalog, entry } = props;
  const { t } = useI18n();
  const extension = entry.extension;
  const url = extension && "url" in extension ? extension.url : null;
  const uploader = useExtensionUploader(state.extensions, entry.id, url);
  let sourceHost: string | null = null;
  try {
    sourceHost = url ? new URL(url).host : null;
  } catch {
    sourceHost = null;
  }
  const name = catalog.nameOf(entry.id);
  const description = catalog.descriptionOf(entry.id);
  const installState = catalog.installStateOf(entry);

  return (
    <li>
      <button
        type="button"
        className="sb-extensions-card"
        onClick={() => state.openExtensions(entry.id)}
      >
        <span className="sb-extensions-card-identity">
          <ExtensionTile
            request={{
              extensionId: entry.id,
              title: name,
              icon: extension?.meta.icon,
            }}
          />
          <span className="sb-extensions-card-titles">
            <span className="sb-extensions-card-name">{name}</span>
            <span className="sb-extensions-card-source">
              {sourceHost
                ? withSource(
                    (host) => t("extension-consent-from", { host }),
                    <SourceLabel
                      source={{ sourceHost, uploader }}
                      people={catalog.people}
                    />
                  )
                : catalog.isBuiltIn(entry)
                  ? t("extension-info-built-in")
                  : null}
            </span>
          </span>
        </span>
        {description && (
          <span className="sb-extensions-card-description">{description}</span>
        )}
        {(installState === "installed" || installState === "pending") && (
          <span
            className={`sb-extension-info-status sb-extension-info-status-${installState}`}
          >
            {installState === "installed" && (
              <span className="material-symbols-outlined" aria-hidden="true">
                check
              </span>
            )}
            {installState === "installed"
              ? t("extension-state-installed", { defaultValue: "Installed" })
              : t("extension-state-pending", { defaultValue: "Installing…" })}
          </span>
        )}
      </button>
    </li>
  );
}

/**
 * Every extension on one full-screen page, as cards that open each one's own
 * page: the desktop counterpart of Settings → Extensions.
 */
export function ExtensionsPage(props: { state: SeedBibleState }) {
  const { state } = props;
  const { extensionSettings } = state;
  const { t } = useI18n();
  const catalog = useExtensionCatalog(state);
  const searchQuery = useSignal("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filter = useSignal<Filter>("all");

  const openEntry = catalog.entries.find(
    (entry) => entry.id === state.extensionsPageEntryId.value
  );
  if (openEntry) {
    return (
      <div className="sb-extensions-page">
        <ExtensionInfoPage
          layout="wide"
          entry={openEntry}
          name={catalog.nameOf(openEntry.id)}
          description={catalog.descriptionOf(openEntry.id)}
          installState={catalog.installStateOf(openEntry)}
          extensions={state.extensions}
          people={catalog.people}
          onInstall={() => void catalog.install(openEntry.id)}
          onUninstall={() => catalog.uninstall(openEntry.id)}
          settings={catalog.renderSettings(openEntry)}
        />
      </div>
    );
  }

  const inFilter = (entry: ExtensionListEntry, key: Filter) => {
    switch (key) {
      case "all":
        return true;
      case "installed":
        return entry.installed;
      case "available":
        return !entry.installed;
      case "built-in":
        return catalog.isBuiltIn(entry);
      case "linked":
        return entry.extension !== null && "url" in entry.extension;
    }
  };
  const countOf = (key: Filter) =>
    catalog.entries.filter((entry) => inFilter(entry, key)).length;

  const query = searchQuery.value.trim();
  const shown = catalog.entries.filter(
    (entry) => inFilter(entry, filter.value) && catalog.matches(entry, query)
  );

  const filterButton = (key: Filter, label: string) => (
    <button
      key={key}
      type="button"
      className="sb-extensions-page-filter"
      aria-pressed={filter.value === key}
      onClick={() => (filter.value = key)}
    >
      <span>{label}</span>
      <span className="sb-extensions-page-filter-count">{countOf(key)}</span>
    </button>
  );

  const renderSection = (
    key: "installed" | "available",
    title: string,
    entries: ExtensionListEntry[],
    emptyMessage: string
  ) => {
    // Left out when it can't have anything in it, or nothing matches.
    if (
      (key === "installed" && filter.value === "available") ||
      (key === "available" && filter.value === "installed") ||
      ((query || filter.value !== "all") && entries.length === 0)
    ) {
      return null;
    }
    return (
      <section
        className="sb-extensions-page-section"
        aria-labelledby={`sb-extensions-page-${key}-title`}
      >
        <h2
          id={`sb-extensions-page-${key}-title`}
          className="sb-extensions-page-section-title"
        >
          {title}
        </h2>
        {entries.length === 0 ? (
          <p className="sb-extensions-page-empty">{emptyMessage}</p>
        ) : (
          <ul className="sb-extensions-page-grid">
            {entries.map((entry) => (
              <ExtensionCard
                key={entry.id}
                state={state}
                catalog={catalog}
                entry={entry}
              />
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="sb-extensions-page">
      <div className="sb-extensions-page-toolbar">
        <label className="sb-extensions-page-search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery.value}
            onInput={(event) => (searchQuery.value = event.currentTarget.value)}
            placeholder={t("extensions-search")}
            aria-label={t("extensions-search")}
          />
          {searchQuery.value ? (
            <SearchClearButton
              onClear={() => {
                searchQuery.value = "";
                searchInputRef.current?.focus();
              }}
            />
          ) : null}
        </label>
        <button
          type="button"
          className="sb-extensions-page-add-link"
          onClick={() =>
            catalog.openAddFromLink((extensionId) =>
              state.openExtensions(extensionId)
            )
          }
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            link
          </span>
          {t("extensions-page-add-link")}
        </button>
      </div>

      <div className="sb-extensions-page-columns">
        <nav
          className="sb-extensions-page-filters"
          aria-label={t("extensions-page-filters")}
        >
          {filterButton("all", t("extensions-page-filter-all"))}
          {filterButton(
            "installed",
            t("installed-extensions", { defaultValue: "Installed" })
          )}
          {filterButton(
            "available",
            t("available-extensions", { defaultValue: "Available" })
          )}
          <hr className="sb-extensions-page-filters-divider" />
          <span className="sb-extensions-page-filters-title">
            {t("extensions-page-made-by")}
          </span>
          {filterButton("built-in", t("extensions-page-filter-built-in"))}
          {filterButton("linked", t("extensions-page-filter-linked"))}
        </nav>

        <div className="sb-extensions-page-main">
          {catalog.activeCustomization && (
            <p className="sb-extensions-page-note">
              {t("extensions-for-active-customization-scoped", {
                defaultValue:
                  "Showing extensions for {{name}}. Changes you make here only apply while you're using it.",
                name: catalog.activeCustomization.name,
              })}
            </p>
          )}
          {catalog.entries.length === 0 ? (
            <p className="sb-extensions-page-empty">
              {t("no-extensions-available", {
                defaultValue: "No extensions available.",
              })}
            </p>
          ) : shown.length === 0 && (query || filter.value !== "all") ? (
            <p className="sb-extensions-page-empty" role="status">
              {query
                ? t("extensions-search-no-matches", { query })
                : t("extensions-page-filter-empty")}
            </p>
          ) : (
            <>
              {renderSection(
                "installed",
                t("installed-extensions", { defaultValue: "Installed" }),
                shown.filter((entry) => entry.installed),
                t("no-installed-extensions", {
                  defaultValue: "You haven't installed any extensions yet.",
                })
              )}
              {renderSection(
                "available",
                t("available-extensions", { defaultValue: "Available" }),
                shown.filter((entry) => !entry.installed),
                t("no-available-extensions", {
                  defaultValue:
                    "There are no more extensions available to install.",
                })
              )}
            </>
          )}
          <UnusedSensitiveSettingsList
            unused={extensionSettings.getUnusedSensitiveProxies()}
            getExtensionTitle={catalog.nameOf}
            onClear={(extensionId, proxyId) =>
              extensionSettings.clearSensitiveValues(extensionId, proxyId)
            }
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
