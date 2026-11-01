import "./Tabs.inline.css";
import "./Tabs.css";
import { useSignal } from "@preact/signals";
import {
  DEFAULT_SAVE_CATEGORY,
  saveBelongsToCategory,
  type SaveVerse,
} from "../../managers/SavesManager";
import type { ReaderTab } from "../../managers/TabsManager";
import {
  TAB_SLOT_LAYOUT_OPTIONS,
  type TabSlotLayoutId,
} from "../../managers/TabsLayoutManager";
import {
  closeContextMenus,
  ContextMenuItem,
  ContextMenuWithButton,
} from "../../components/ContextMenu/ContextMenu";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  MaterialIcon,
  SettingsIcon,
  StarIcon,
  TodayIcon,
} from "../../components/icons";
import { SettingsPage } from "../../components/SettingsPage/SettingsPage";
import { getShareUrl, openShareModal } from "../../managers/BibleToolsManager";
import {
  isSessionHost,
  type BibleReadingSession,
  getConnectedUserVisualKey,
  getUserAnimalVisual,
} from "../../managers/SessionsManager";
import { safeLocalStorage } from "../../app/ssrEnv";
import { useI18n } from "../../i18n/I18nManager";
import { SidebarSearch } from "../../components/SidebarSearch/SidebarSearch";
import { handleGridKeyNav } from "../../app/keyboardNav";
import {
  Avatar,
  SessionUserAvatar,
  getUserDisplayName,
  getUserSessionRole,
  sortUsersBySessionRole,
} from "../Avatar/Avatar";
import {
  SessionParticipantsSheet,
  openSessionParticipantsModal,
} from "../SessionParticipants/SessionParticipants";
import { formatList } from "../../app/utils";
import {
  isLocalSessionHost,
  openSessionSettingsModal,
  openShareSessionModal,
} from "../SessionSettings/SessionSettings";
import { useEffect, useRef } from "preact/hooks";
import { chatHasOtherPeople } from "../../managers/ChatsManager";
import { displayNameOf, trimmedOrNull } from "../../managers/Utils";
import { useAppConfig } from "../../app/appConfig";
import { openReaderLocation } from "./openReaderLocation";
import {
  BookmarkGlyph,
  BookmarkStackIcon,
  BookmarksPanel,
  bookmarkButtonLabel,
} from "../Bookmarks/Bookmarks";

interface SidebarProps {
  state: SeedBibleState;
}

interface TabsProps {
  state: SeedBibleState;
  closeLayoutMenu: () => void;
  effectivelyCollapsed: boolean;
}

interface TabsHeaderProps {
  state: SeedBibleState;
  effectivelyCollapsed: boolean;
  panelsEnabled: boolean;
  paneLayout: TabSlotLayoutId | "single";
  isLayoutMenuOpen: boolean;
  toggleLayoutMenu: () => void;
  closeLayoutMenu: () => void;
  setLayout: (layout: TabSlotLayoutId) => void;
}

interface SettingsProps {
  state: SeedBibleState;
}

function renderLayoutPreview(layoutId: TabSlotLayoutId) {
  const slotCount =
    TAB_SLOT_LAYOUT_OPTIONS.find((layout) => layout.id === layoutId)
      ?.slotCount ?? 1;

  return (
    <div className="sb-pane-layout-preview" data-layout={layoutId}>
      {Array.from({ length: slotCount }, (_, index) => (
        <div
          key={`${layoutId}-${index + 1}`}
          className={`sb-pane-layout-preview-cell sb-pane-layout-preview-cell-${index + 1}`}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}

/**
 * localStorage flag: once the host ticks "Don't show this again" in the
 * close-confirmation dialog, subsequent host-closes skip the dialog and end
 * the session directly.
 */
const SESSION_CLOSE_CONFIRM_DISMISSED_KEY =
  "sb-session-close-confirm-dismissed";

function isSessionCloseConfirmDismissed(): boolean {
  return (
    safeLocalStorage.getItem(SESSION_CLOSE_CONFIRM_DISMISSED_KEY) === "true"
  );
}

/**
 * Confirmation shown when a host closes a session that still has other
 * participants. The host can either end the session for everyone or appoint
 * a co-host to keep it running after they leave. "Don't show this again"
 * persists so future closes skip straight to ending.
 */
function SessionCloseConfirmModalContent(props: {
  state: SeedBibleState;
  session: BibleReadingSession;
  tabId: string;
  onClose: () => void;
}) {
  const { state, session, tabId, onClose } = props;
  const { t } = useI18n();
  const showCoHostPicker = useSignal(false);
  const dontShowAgain = useSignal(false);

  const persistDontShow = () => {
    if (dontShowAgain.value) {
      safeLocalStorage.setItem(SESSION_CLOSE_CONFIRM_DISMISSED_KEY, "true");
    }
  };

  const endForEveryone = () => {
    persistDontShow();
    try {
      session.updateOptions({ endedAt: Date.now() });
    } catch {
      // Best-effort — teardown below still ends the session locally.
    }
    state.tabs.removeTab(tabId);
    onClose();
  };

  const appointCoHost = (coHostKey: string) => {
    persistDontShow();
    const existing = session.options.value.coHostUserIds ?? [];
    if (!existing.includes(coHostKey)) {
      session.updateOptions({ coHostUserIds: [...existing, coHostKey] });
    }
    // Leave without setting `endedAt`; the new co-host keeps the session
    // alive (see wrapSessionLifecycle's last-host rule).
    state.tabs.removeTab(tabId);
    onClose();
  };

  const options = session.options.value;
  const candidates = session.connectedUsers.value.filter(
    (user) =>
      !user.isSelf &&
      !isSessionHost(options, user.userId) &&
      !isSessionHost(options, user.connectionId)
  );

  return (
    <div className="sb-session-close-confirm">
      <p className="sb-session-close-confirm-message">
        {t("session-close-confirm-message", {
          defaultValue: "Closing this will end the session for everyone.",
        })}
      </p>

      {showCoHostPicker.value ? (
        <div className="sb-session-cohost-picker">
          <div className="sb-session-cohost-instructions">
            {t("appoint-co-host-instructions", {
              defaultValue: "Choose someone to keep the session running:",
            })}
          </div>
          {candidates.map((user) => {
            const coHostKey = getConnectedUserVisualKey(user);
            return (
              <button
                key={user.connectionId}
                type="button"
                className="sb-session-cohost-option"
                onClick={() => appointCoHost(coHostKey)}
              >
                {getUserDisplayName(user)}
              </button>
            );
          })}
        </div>
      ) : (
        <>
          {candidates.length > 0 && (
            <label className="sb-session-close-confirm-dontshow">
              <input
                type="checkbox"
                checked={dontShowAgain.value}
                onChange={(event: Event) => {
                  dontShowAgain.value = (
                    event.currentTarget as HTMLInputElement
                  ).checked;
                }}
              />
              <span>
                {t("dont-show-again", {
                  defaultValue: "Don't show this again",
                })}
              </span>
            </label>
          )}
          <div className="sb-session-close-confirm-actions">
            {candidates.length > 0 && (
              <button
                type="button"
                className="sb-session-settings-cancel"
                onClick={() => {
                  showCoHostPicker.value = true;
                }}
              >
                {t("appoint-co-host", { defaultValue: "Appoint a co-host" })}
              </button>
            )}
            <button
              type="button"
              className="sb-session-settings-end"
              onClick={endForEveryone}
            >
              {t("end-session-for-everyone", { defaultValue: "End session" })}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Opens the same share sheet the reader uses, for whichever tab is currently
 * selected. Starting a live session stays an option inside the sheet instead
 * of happening the moment this control is tapped.
 */
function openShareSheetForCurrentTab(state: SeedBibleState) {
  const tab = state.app.selectedTab.value;
  if (!tab) return;
  openShareModal(
    {
      modals: state.modals,
      app: state.app,
      toast: state.app.toast,
      sharedSession: tab.sharedSession,
      embedThemes: state.theme.themes,
      customizationLocator: state.customizations.activeCustomizationLocator,
    },
    getShareUrl(tab.readingState)
  );
}

/**
 * Entry point for closing a tab. A host closing a session that still has
 * other participants gets the end/hand-off confirmation; everyone else (and
 * hosts who dismissed the dialog) closes directly, which ends the session
 * for everyone when the last host leaves.
 */
function requestCloseTab(state: SeedBibleState, tab: ReaderTab) {
  const session = tab.sharedSession;
  if (session && isLocalSessionHost(state, session)) {
    const hasOtherParticipants = session.connectedUsers.value.some(
      (user) => !user.isSelf
    );
    if (hasOtherParticipants && !isSessionCloseConfirmDismissed()) {
      const modalId = `session-close-confirm-${session.id}`;
      state.modals.openModal({
        id: modalId,
        title: {
          key: "session-close-confirm-title",
          defaultValue: "End session?",
        },
        content: () => (
          <SessionCloseConfirmModalContent
            state={state}
            session={session}
            tabId={tab.id}
            onClose={() => state.modals.closeModal(modalId)}
          />
        ),
      });
      return;
    }
  }
  state.tabs.removeTab(tab.id);
}

export function TabsHeader(props: TabsHeaderProps) {
  const {
    state,
    effectivelyCollapsed,
    panelsEnabled,
    paneLayout,
    isLayoutMenuOpen,
    toggleLayoutMenu,
    closeLayoutMenu,
    setLayout,
  } = props;
  const { branding } = useAppConfig();
  const { sidebar, settings, customizations } = state;
  const isAwake = settings.settings.value.keepScreenAwake;
  const activeLogoUrl = customizations.activeCustomization.value?.logoUrl;
  const { t } = useI18n();
  const layoutAnchorRef = useRef<HTMLDivElement | null>(null);

  // Close the pane-layout menu when clicking anywhere outside its anchor.
  useEffect(() => {
    if (!isLayoutMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const anchor = layoutAnchorRef.current;
      if (anchor && !anchor.contains(event.target as Node)) {
        closeLayoutMenu();
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isLayoutMenuOpen, closeLayoutMenu]);

  return (
    <div className="sb-sidebar-top-row">
      <div className="sb-sidebar-top-start">
        <button
          onClick={sidebar.toggleSidebarCollapsed}
          className="sb-sidebar-collapse-button"
          aria-label={
            effectivelyCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={effectivelyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined">
            {effectivelyCollapsed ? "menu" : "menu_open"}
          </span>
        </button>

        {activeLogoUrl ? (
          <span
            className="sb-sidebar-logo sb-tab-user-icon sb-tab-user-icon-has-image"
            style={{ backgroundImage: `url(${activeLogoUrl})` }}
            aria-hidden="true"
          />
        ) : (
          branding?.logo &&
          branding?.websiteUrl && (
            <a
              href={branding.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={branding.appName || "Brand logo"}
            >
              <img
                src={branding.logo}
                alt={branding.appName || ""}
                className="sb-sidebar-branding-logo"
              />
            </a>
          )
        )}
      </div>

      <div className="sb-sidebar-top-actions">
        {panelsEnabled && !effectivelyCollapsed && (
          <div className="sb-pane-layout-anchor" ref={layoutAnchorRef}>
            <button
              onClick={toggleLayoutMenu}
              className="sb-sidebar-top-icon-button"
              aria-label={t("select-pane-layout", {
                defaultValue: "Select pane layout",
              })}
              title={t("pane-layout", { defaultValue: "Pane layout" })}
            >
              <span className="material-symbols-outlined">dashboard</span>
            </button>

            {isLayoutMenuOpen && (
              <div className="sb-pane-layout-menu">
                <div className="sb-pane-layout-menu-title">
                  {t("panels", { defaultValue: "Panels" })}
                </div>
                <div
                  className="sb-pane-layout-options"
                  role="radiogroup"
                  onKeyDown={(event) => {
                    handleGridKeyNav(event, event.currentTarget);
                  }}
                >
                  {TAB_SLOT_LAYOUT_OPTIONS.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => setLayout(layout.id)}
                      className={`sb-pane-layout-option${
                        paneLayout === layout.id
                          ? " sb-pane-layout-option-selected"
                          : ""
                      }`}
                      aria-label={layout.label}
                      title={layout.label}
                    >
                      {renderLayoutPreview(layout.id)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!effectivelyCollapsed && (
          <ContextMenuWithButton
            onClick={() => {
              closeContextMenus();
            }}
            buttonClassName="sb-sidebar-top-icon-button"
            aria-label={t("more", { defaultValue: "More" })}
            title={t("more", { defaultValue: "More" })}
          >
            <ContextMenuItem
              onClick={() => {
                openShareSheetForCurrentTab(state);
              }}
            >
              <MaterialIcon
                className="sb-context-menu-item-icon"
                aria-hidden="true"
              >
                share
              </MaterialIcon>
              <span>
                {t("share", {
                  defaultValue: "Share",
                })}
              </span>
            </ContextMenuItem>
            <ContextMenuItem
              className="sb-context-menu-item"
              onClick={() => {
                window.open(
                  "https://docs.google.com/forms/d/e/1FAIpQLSejiuVM8xguEHKZ2Kv5DX-jE98zYwxFiPwpYrFSmvVgMejZzQ/viewform",
                  "_blank"
                );
              }}
            >
              <MaterialIcon
                className="sb-context-menu-item-icon"
                aria-hidden="true"
              >
                bug_report
              </MaterialIcon>
              <span>{t("report-a-bug", { defaultValue: "Report a bug" })}</span>
            </ContextMenuItem>
            <ContextMenuItem
              className="sb-context-menu-toggle-item"
              role="menuitemcheckbox"
              aria-checked={isAwake}
              onClick={(event: Event) => {
                event.preventDefault();
                settings.setKeepScreenAwake(!isAwake);
              }}
            >
              <span className="sb-context-menu-toggle-label">
                <MaterialIcon
                  className="sb-context-menu-item-icon"
                  aria-hidden="true"
                >
                  light_mode
                </MaterialIcon>
                <span>
                  {t("keep-screen-awake", {
                    defaultValue: "Keep screen awake",
                  })}
                </span>
              </span>
              <span
                className={`sb-pill-toggle${isAwake ? " is-on" : ""}`}
                aria-hidden="true"
              />
            </ContextMenuItem>
            {/* <ContextMenuItem
              onClick={() => {
                sidebar.openSettings();
              }}
            >
              {t("go-to-all-settings", {
                defaultValue: "Go to all settings",
              })}
            </ContextMenuItem> */}
          </ContextMenuWithButton>
        )}
      </div>

      <button
        onClick={sidebar.closeSidebar}
        className="sb-sidebar-close-button"
        aria-label={t("close-sidebar", { defaultValue: "Close sidebar" })}
        title={t("close-sidebar", { defaultValue: "Close sidebar" })}
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
}

export function Settings(props: SettingsProps) {
  const { state } = props;
  const { sidebar } = state;
  const { t } = useI18n();

  return (
    <div className="sb-sidebar-settings-view">
      <div className="sb-sidebar-tabs-header">
        <h3 className="sb-sidebar-tabs-title">{t("settings")}</h3>
        <button
          onClick={sidebar.closeSettings}
          className="sb-sidebar-settings-close-button"
          aria-label={t("close-settings", { defaultValue: "Close Settings" })}
          title={t("close-settings", { defaultValue: "Close Settings" })}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="sb-sidebar-settings-content">
        <SettingsPage state={state} />
      </div>
    </div>
  );
}

/**
 * The saves glyph: an outlined star, filled once the location is already
 * filed. Both states are one path with a different `fill`, so the two line up
 * exactly rather than shifting between glyphs.
 */
export function SaveStarIcon(props: {
  isSaved: boolean;
  size?: number;
  className?: string;
}) {
  const size = props.size ?? 22;
  return (
    <StarIcon
      width={size}
      height={size}
      fill={props.isSaved ? "currentColor" : "none"}
      stroke-width="1.5"
      className={props.className}
      aria-hidden="true"
    />
  );
}

/**
 * Label for a chapter-save button. Says which of the two things pressing it
 * does, which also carries the star's fill state to a screen reader.
 */
export function saveChapterLabel(
  t: ReturnType<typeof useI18n>["t"],
  isSaved: boolean
): string {
  return isSaved
    ? t("edit-save", { defaultValue: "Edit save" })
    : t("save-chapter", { defaultValue: "Save chapter" });
}

/**
 * Opens the folder picker for a location — a whole chapter, or a verse range
 * within one — in edit mode when that exact location is already filed.
 *
 * The mode matters: `addSave` ignores a location it already holds, so opening
 * in add mode on a saved location lets the user change folders and then
 * silently discards it. Editing the existing save is the only thing a second
 * press can usefully do, since a location is either filed or it isn't.
 *
 * Every save entry point goes through here — the reader's quick action, the
 * tab row and its kebab, and the verse toolbar — so none of them can drift
 * back onto the add-only path independently.
 */
export function openSaveModalForLocation(
  state: SeedBibleState,
  location: SaveLocation
): void {
  const existing = state.saves.getSaveForLocation(
    location.translationId,
    location.bookId,
    location.chapterNumber,
    location.verse
  );
  openSaveCategoryModal(
    state,
    location,
    existing ? { mode: "edit", saveId: existing.id } : undefined
  );
}

interface TabRowProps {
  // Allow JSX `key` to pass through without TS extra-property errors when
  // mapping a list of tabs. Preact strips it before the component sees props.
  key?: string;
  state: SeedBibleState;
  tab: ReaderTab;
  isSelected: boolean;
  closeLayoutMenu: () => void;
  panelsEnabled: boolean;
}

/**
 * One row in the sidebar's tab list — also reused by the saves section so a
 * saved tab keeps its selection state, kebab menu, and shared-session visuals
 * when it's moved up into a folder. The per-row save icon only appears on the
 * currently selected row: it's the affordance for filing the current chapter
 * away, and showing it on every row would clutter the list.
 */
/**
 * Whether `tab` is the one whose narration is playing. Only one tab is heard
 * at a time; marking it lets the reader find narration they left playing in
 * another tab.
 */
function isTabPlayingAudio(state: SeedBibleState, tab: ReaderTab): boolean {
  return (
    state.audioPlayback.controllerFor(tab.readingState)?.isPlaying.value ??
    false
  );
}

function TabRow(props: TabRowProps) {
  const { state, tab, isSelected, closeLayoutMenu, panelsEnabled } = props;

  // Suspend on the *initial* load only, and only until it settles one way or
  // the other. Keying this off `loading` would re-suspend on every later
  // navigation, and a first load that fails would never resume at all.
  if (
    import.meta.env.SSR &&
    !tab.readingState.initialChapterLoadSettled.value
  ) {
    throw tab.readingState.chapterDataPromise;
  }

  const { app, saves, bookmarks } = state;
  const { t, language } = useI18n();

  // One small ribbon in the color of the most recently moved bookmark here;
  // several colors at this size would be unreadable.
  const bookmarksHere = bookmarks.getBookmarksForLocation(
    tab.readingState.translationId.value,
    tab.readingState.bookId.value,
    tab.readingState.chapterNumber.value
  );
  const frontBookmark = bookmarksHere[0];

  const shortSubTitle = tab.readingState.shortSubTitle.value;
  const title = tab.readingState.title.value;
  const isPlayingAudio = isTabPlayingAudio(state, tab);
  const sharedSession = tab.sharedSession;
  const connectedUsers = sharedSession?.connectedUsers.value ?? [];
  // Fills the star, and decides whether pressing it files or edits.
  const isChapterSaved = saves.isLocationSaved(
    tab.readingState.translationId.value,
    tab.readingState.bookId.value,
    tab.readingState.chapterNumber.value
  );
  // Never a toggle: pressing a filled star edits the existing save's folders
  // rather than removing it. Removing is done from the saves panel.
  const handleSaveAction = () => {
    const translationId = tab.readingState.translationId.value;
    const bookId = tab.readingState.bookId.value;
    const chapterNumber = tab.readingState.chapterNumber.value;
    if (!translationId || !bookId || !chapterNumber) return;
    openSaveModalForLocation(state, { translationId, bookId, chapterNumber });
  };

  const selectThisTab = () => {
    closeContextMenus();
    closeLayoutMenu();
    app.selectTab(tab.id);
  };

  const isParticipantsSheetOpen = useSignal(false);
  const sessionOptions = sharedSession?.options.value;
  const participants = sessionOptions
    ? sortUsersBySessionRole(sessionOptions, connectedUsers).map((user) => {
        const role = getUserSessionRole(sessionOptions, user);
        const roleLabel =
          role === "host"
            ? t("host", { defaultValue: "Host" })
            : role === "co-host"
              ? t("co-host", { defaultValue: "Co-host" })
              : undefined;
        return { user, role, roleLabel };
      })
    : [];
  // The avatars button is named "Participants in <tab>", which hides its
  // contents from screen readers, so who's there is given as its description.
  const participantsDescriptionId = `sb-tab-participants-${tab.id}`;
  const participantsDescription = formatList(
    participants.map(({ user, roleLabel }) =>
      roleLabel
        ? t("participant-with-role", {
            defaultValue: "{{name}} ({{role}})",
            name: getUserDisplayName(user),
            role: roleLabel,
          })
        : getUserDisplayName(user)
    ),
    language
  );

  return (
    <div className={`sb-tab-row${isSelected ? " sb-tab-row-selected" : ""}`}>
      <div className="sb-tab-row-body">
        <button onClick={selectThisTab} className={`sb-tab-button`}>
          {/* Only the label takes the translation's direction — the row itself
            stays in the UI direction, or an English translation would pin the
            whole card to LTR inside an otherwise RTL sidebar. */}
          <div
            className="sb-tab-main-content"
            dir={tab.readingState.translation.value?.textDirection ?? "auto"}
          >
            <span className="sb-tab-main-title">{title}</span>
            <span className="sb-tab-main-sep" aria-hidden="true">
              •
            </span>
            <span className="sb-tab-main-translation">{shortSubTitle}</span>
            {frontBookmark && (
              <span
                className="sb-tab-bookmark-marker"
                role="img"
                aria-label={bookmarkButtonLabel(t, bookmarksHere)}
                title={bookmarkButtonLabel(t, bookmarksHere)}
              >
                <BookmarkGlyph colorId={frontBookmark.colorId} size={12} />
              </span>
            )}
            {isPlayingAudio && (
              <MaterialIcon
                className="sb-tab-audio-icon"
                role="img"
                aria-label={t("tab-playing-audio", {
                  defaultValue: "Playing audio",
                })}
              >
                volume_up
              </MaterialIcon>
            )}
          </div>
        </button>

        {/* A sibling of the tab button, not inside it: a button can't nest
            another button. Clicking the avatars opens the participants modal
            (a bottom sheet on mobile); clicking the rest of this strip only
            selects the tab, like the tab button above it. */}
        {sharedSession && participants.length > 0 && (
          <div className="sb-tab-users-section" onClick={selectThisTab}>
            <button
              type="button"
              className="sb-tab-users-list"
              aria-label={t("tab-participants", {
                defaultValue: "Participants in {{tab}}",
                tab: title,
              })}
              aria-describedby={participantsDescriptionId}
              title={t("participants", { defaultValue: "Participants" })}
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                selectThisTab();
                if (app.isMobile.value) {
                  isParticipantsSheetOpen.value = true;
                } else {
                  openSessionParticipantsModal(state, sharedSession);
                }
              }}
            >
              {participants.map(({ user, role, roleLabel }) => (
                <SessionUserAvatar
                  key={user.connectionId}
                  user={user}
                  role={role}
                  roleLabel={roleLabel}
                />
              ))}
            </button>
            <span id={participantsDescriptionId} hidden>
              {participantsDescription}
            </span>
          </div>
        )}
        {sharedSession && isParticipantsSheetOpen.value && (
          <SessionParticipantsSheet
            state={state}
            session={sharedSession}
            onClose={() => {
              isParticipantsSheetOpen.value = false;
            }}
          />
        )}
      </div>

      {isSelected && !tab.sharedSession && (
        <button
          type="button"
          className={`sb-tab-save-button${
            isChapterSaved ? " sb-tab-save-button-saved" : ""
          }`}
          aria-label={saveChapterLabel(t, isChapterSaved)}
          title={saveChapterLabel(t, isChapterSaved)}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            closeContextMenus();
            closeLayoutMenu();
            handleSaveAction();
          }}
        >
          <SaveStarIcon isSaved={isChapterSaved} size={18} />
        </button>
      )}

      <ContextMenuWithButton
        onClick={() => {
          closeLayoutMenu();
        }}
        anchorClassName="sb-tab-menu-anchor"
        buttonClassName="sb-tab-menu-button"
        menuClassName="sb-tab-menu"
        iconClassName="sb-tab-more-icon"
        aria-label={t("open-tab-menu", { defaultValue: "Open tab menu" })}
        title={t("tab-options", { defaultValue: "Tab options" })}
      >
        {tab.sharedSession && (
          <>
            {(() => {
              const isHost = isLocalSessionHost(state, tab.sharedSession);
              if (!isHost) return null;
              return (
                <ContextMenuItem
                  className="sb-tab-menu-item"
                  onClick={() => {
                    const session = tab.sharedSession;
                    if (!session) return;
                    openSessionSettingsModal(state, session);
                  }}
                >
                  <MaterialIcon
                    className="sb-context-menu-item-icon"
                    aria-hidden="true"
                  >
                    settings
                  </MaterialIcon>
                  <span>
                    {t("session-settings", {
                      defaultValue: "Session settings",
                    })}
                  </span>
                </ContextMenuItem>
              );
            })()}
            <ContextMenuItem
              className="sb-tab-menu-item"
              title={t("share-session", {
                defaultValue: `Share session`,
              })}
              onClick={() => {
                const session = tab.sharedSession;
                if (!session) return;
                openShareSessionModal(state, session);
              }}
            >
              <MaterialIcon
                className="sb-context-menu-item-icon"
                aria-hidden="true"
              >
                ios_share
              </MaterialIcon>
              <span>
                {t("share-session", {
                  defaultValue: `Share session`,
                })}
              </span>
            </ContextMenuItem>
            {tab.sharedChat && (
              <ContextMenuItem
                className="sb-tab-menu-item"
                title={t("open-chat", {
                  defaultValue: `Open chat`,
                })}
                onClick={() => {
                  if (tab.sharedChat) {
                    state.app.openChat(tab.sharedChat);
                  }
                }}
              >
                <MaterialIcon
                  className="sb-context-menu-item-icon"
                  aria-hidden="true"
                >
                  chat_bubble_outline
                </MaterialIcon>
                <span>
                  {t("open-chat", {
                    defaultValue: `Open chat`,
                  })}
                </span>
              </ContextMenuItem>
            )}
          </>
        )}
        {!tab.sharedSession && (
          <ContextMenuItem
            className="sb-tab-menu-item"
            onClick={() => {
              handleSaveAction();
            }}
          >
            <SaveStarIcon
              isSaved={isChapterSaved}
              size={20}
              className="sb-context-menu-item-icon"
            />
            <span>{saveChapterLabel(t, isChapterSaved)}</span>
          </ContextMenuItem>
        )}

        {panelsEnabled && (
          <ContextMenuItem
            onClick={() => {
              app.openInNewSlot(tab.id);
            }}
            className="sb-tab-menu-item"
          >
            <MaterialIcon
              className="sb-context-menu-item-icon"
              aria-hidden="true"
            >
              splitscreen_right
            </MaterialIcon>
            <span>
              {t("open-in-new-panel", { defaultValue: "Open in new panel" })}
            </span>
          </ContextMenuItem>
        )}
        <ContextMenuItem
          className="sb-tab-menu-item"
          onClick={() => {
            requestCloseTab(state, tab);
          }}
        >
          <MaterialIcon
            className="sb-context-menu-item-icon"
            aria-hidden="true"
          >
            close
          </MaterialIcon>
          <span>{t("close", { defaultValue: "Close" })}</span>
        </ContextMenuItem>
      </ContextMenuWithButton>
    </div>
  );
}

/**
 * Location targeted by the save folder picker modal. Either a whole chapter
 * (no `verse`) or a verse / verse range pinned within a chapter.
 */
export interface SaveLocation {
  translationId: string;
  bookId: string;
  chapterNumber: number;
  verse?: SaveVerse;
}

/**
 * Modal body shown when the user triggers "Save" from a tab menu, the sidebar
 * tab row, the reader's quick actions, the verse toolbar, or "Edit save" from
 * a save's kebab menu. Lets the user pick any number of folders the save
 * belongs to (checkboxes). Folder creation only happens here — there is no
 * inline "+ New folder" button in the sidebar list anymore.
 *
 * "Add to new" only stages a folder name in local state (checked in the list).
 * New folders are persisted when the user hits Save — abandoning the modal
 * creates nothing. In edit mode (`saveId` set) existing membership is
 * pre-checked.
 */
function SaveCategoryPickerContent(props: {
  state: SeedBibleState;
  location: SaveLocation;
  onClose: () => void;
  mode?: "add" | "edit";
  saveId?: string;
}) {
  const { state, location, onClose, mode = "add", saveId } = props;
  const { saves } = state;
  const { t } = useI18n();
  const isEdit = mode === "edit";
  const categories = saves.categories.value;

  const existingSave =
    isEdit && saveId
      ? saves.saves.value.find((save) => save.id === saveId)
      : undefined;
  const initialSelection = existingSave
    ? existingSave.categories
    : categories.some((category) => category.name === DEFAULT_SAVE_CATEGORY)
      ? [DEFAULT_SAVE_CATEGORY]
      : categories[0]?.name
        ? [categories[0].name]
        : [];

  const selectedCategories = useSignal<string[]>(initialSelection);
  const isAddingNew = useSignal<boolean>(categories.length === 0);
  const newCategoryName = useSignal<string>("");
  const isSaving = useSignal<boolean>(false);
  /** Folder names staged via "Add to new" — not yet written to storage. */
  const pendingNewCategories = useSignal<string[]>([]);

  const trimmedNew = newCategoryName.value.trim();
  const newCategoryCollides =
    trimmedNew.length > 0 &&
    (categories.some((category) => category.name === trimmedNew) ||
      pendingNewCategories.value.includes(trimmedNew));
  const canStageNew =
    isAddingNew.value &&
    trimmedNew.length > 0 &&
    !newCategoryCollides &&
    !isSaving.value;
  const canSave = selectedCategories.value.length > 0 && !isSaving.value;

  const displayCategories = (() => {
    const names = new Set(categories.map((category) => category.name));
    const extras = pendingNewCategories.value.filter(
      (name) => !names.has(name)
    );
    if (extras.length === 0) return categories;
    return [...categories, ...extras.map((name) => ({ name }))];
  })();

  const toggleCategory = (name: string) => {
    if (isSaving.value) return;
    const current = selectedCategories.value;
    if (current.includes(name)) {
      selectedCategories.value = current.filter(
        (categoryName) => categoryName !== name
      );
    } else {
      selectedCategories.value = [...current, name];
    }
  };

  /**
   * Stages a new folder name in the multi-select list without persisting.
   * Persistence happens only inside handleSave so cancelling the modal leaves
   * no orphan folders.
   */
  const handleStageNewCategory = () => {
    if (!canStageNew) return;
    if (!pendingNewCategories.value.includes(trimmedNew)) {
      pendingNewCategories.value = [...pendingNewCategories.value, trimmedNew];
    }
    if (!selectedCategories.value.includes(trimmedNew)) {
      selectedCategories.value = [...selectedCategories.value, trimmedNew];
    }
    isAddingNew.value = false;
    newCategoryName.value = "";
  };

  const handleSave = async () => {
    if (!canSave) return;

    const nextSelection = [...selectedCategories.value];
    if (nextSelection.length === 0) return;

    isSaving.value = true;
    try {
      // New staged folder names are created as part of addSave /
      // setSaveCategories (ensureCategory) — nothing is written if the user
      // closes the modal without saving.
      if (isEdit) {
        if (!saveId) return;
        await saves.setSaveCategories(saveId, nextSelection);
      } else {
        await saves.addSave(
          location.translationId,
          location.bookId,
          location.chapterNumber,
          {
            categories: nextSelection,
            ...(location.verse !== undefined ? { verse: location.verse } : {}),
          }
        );
      }
      onClose();
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * Drops the save from every folder at once. Unchecking them all can't do
   * this — `setSaveCategories` treats an empty list as a no-op, since a save
   * with no folder has nowhere to live.
   */
  const handleRemove = async () => {
    if (!isEdit || !saveId || isSaving.value) return;

    isSaving.value = true;
    try {
      await saves.removeSave(saveId);
      onClose();
    } finally {
      isSaving.value = false;
    }
  };

  return (
    <div className="sb-save-picker">
      <div className="sb-save-picker-categories" role="group">
        {displayCategories.map((category) => {
          const isSelected = selectedCategories.value.includes(category.name);
          return (
            <button
              key={category.name}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              disabled={isSaving.value}
              className={`sb-save-picker-category${
                isSelected ? " sb-save-picker-category-selected" : ""
              }`}
              onClick={() => {
                toggleCategory(category.name);
              }}
            >
              <span className="sb-save-picker-category-name">
                {category.name}
              </span>
              <span
                className={`sb-save-picker-checkbox${
                  isSelected ? " sb-save-picker-checkbox-checked" : ""
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      {!isSaving.value && (
        <>
          <div className="sb-save-picker-divider" role="separator" />

          {isAddingNew.value ? (
            <div className="sb-save-picker-new-row">
              <input
                autoFocus
                className="sb-save-picker-new-input"
                placeholder={t("new-folder-placeholder", {
                  defaultValue: "New folder name",
                })}
                value={newCategoryName.value}
                onInput={(event: Event) => {
                  const target = event.target as HTMLInputElement;
                  newCategoryName.value = target.value;
                }}
                onKeyDown={(event: KeyboardEvent) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleStageNewCategory();
                  } else if (event.key === "Escape") {
                    event.preventDefault();
                    if (
                      categories.length === 0 &&
                      pendingNewCategories.value.length === 0
                    ) {
                      onClose();
                      return;
                    }
                    isAddingNew.value = false;
                    newCategoryName.value = "";
                  }
                }}
              />
              {newCategoryCollides && (
                <div className="sb-save-picker-new-error">
                  {t("folder-name-taken", {
                    defaultValue: "A folder with that name already exists.",
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="sb-save-picker-add-new"
              onClick={() => {
                isAddingNew.value = true;
                newCategoryName.value = "";
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              <span>{t("add-to-new", { defaultValue: "Add to new" })}</span>
            </button>
          )}
        </>
      )}

      <div className="sb-save-picker-actions">
        {isEdit && saveId && (
          <button
            type="button"
            className="sb-save-picker-remove"
            disabled={isSaving.value}
            onClick={() => {
              void handleRemove();
            }}
          >
            {t("remove-save-from-all-folders", {
              defaultValue: "Remove from all folders",
            })}
          </button>
        )}
        {isAddingNew.value && (
          <button
            type="button"
            className="sb-save-picker-stage-folder"
            disabled={!canStageNew}
            onClick={() => {
              handleStageNewCategory();
            }}
          >
            {t("create-folder", { defaultValue: "Create folder" })}
          </button>
        )}
        <button
          type="button"
          className="sb-save-picker-save"
          disabled={!canSave}
          onClick={() => {
            void handleSave();
          }}
        >
          {isSaving.value
            ? t("saving", { defaultValue: "Saving…" })
            : t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Opens the save category picker modal for the given location.
 *
 * Module-private on purpose: callers that only know a *location* must go
 * through `openSaveModalForLocation`, which picks add or edit mode for them.
 * Reaching straight for this with the default add mode is the bug that made
 * folder edits on an already-saved chapter silently vanish. Only the saves
 * panel calls it directly, and only because it already holds the save id.
 *
 * Pass `mode: "edit"` with `saveId` to change which folders an existing save
 * belongs to (any number of categories).
 */
function openSaveCategoryModal(
  state: SeedBibleState,
  location: SaveLocation,
  options?: {
    mode?: "add" | "edit";
    saveId?: string;
  }
) {
  const mode = options?.mode ?? "add";
  const verseKey =
    location.verse === undefined
      ? "chapter"
      : Array.isArray(location.verse)
        ? `${location.verse[0]}-${location.verse[1]}`
        : String(location.verse);
  const modalId =
    mode === "edit" && options?.saveId
      ? `save-edit-${options.saveId}`
      : `save-category-${location.translationId}-${location.bookId}-${location.chapterNumber}-${verseKey}`;
  state.modals.openModal({
    id: modalId,
    title:
      mode === "edit"
        ? {
            key: "edit-save",
            defaultValue: "Edit save",
          }
        : {
            key: "add-save-modal",
            defaultValue: "Add save",
          },
    content: () => (
      <SaveCategoryPickerContent
        state={state}
        location={location}
        mode={mode}
        saveId={options?.saveId}
        onClose={() => state.modals.closeModal(modalId)}
      />
    ),
  });
}

interface SavesSectionProps {
  state: SeedBibleState;
  closeLayoutMenu: () => void;
}

/**
 * The pinned "saves" view shown above the regular tab list when the saves
 * toggle in the sidebar header is on. Renders each category as a collapsible
 * folder containing the user's filed Bible locations. Below it, the normal tab
 * list still renders unchanged — saves and tabs coexist.
 *
 * Saves are pure links. Clicking one selects the open tab pointing at the same
 * location (and scrolls to the saved verse, if any); if no tab is open at that
 * location, a fresh tab is created and navigated there. The save itself is
 * never rendered as a tab — that keeps the saves section a clean list of
 * references rather than a duplicated tab list.
 */
function SavesSection(props: SavesSectionProps) {
  const { state, closeLayoutMenu } = props;
  const { saves, bibleData } = state;
  const { t } = useI18n();

  const categories = saves.categories.value;
  const allSaves = saves.saves.value;
  const expanded = saves.expandedCategories.value;
  // Subscribe to the translation books cache so book-name lookups re-render
  // when a previously unloaded translation finishes loading.
  const translationBooksMap = bibleData.translationBooks.value;

  const renamingCategory = useSignal<string | null>(null);
  const renameValue = useSignal<string>("");

  const lookupBookName = (
    translationId: string,
    bookId: string
  ): string | null => {
    const books = translationBooksMap.get(translationId)?.books;
    return books?.find((b) => b.id === bookId)?.name ?? null;
  };

  const ensureTranslationBooks = (translationId: string) => {
    if (translationBooksMap.has(translationId)) return;
    // Fire and forget — the cache update will trigger re-render and replace
    // the bookId fallback with the friendly book name.
    void bibleData.getTranslationBooks(translationId).catch(() => {
      // Network failures here just mean we keep showing the bookId; no need
      // to bubble it up to the user from the sidebar.
    });
  };

  const openSave = (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verse?: number | [number, number]
  ) => {
    openReaderLocation(
      state,
      { translationId, bookId, chapterNumber, verse },
      () => {
        closeContextMenus();
        closeLayoutMenu();
      }
    );
  };

  const formatVerseRef = (
    verse: number | [number, number] | undefined
  ): string => {
    if (verse === undefined) return "";
    if (typeof verse === "number") return `:${verse}`;
    return verse[0] === verse[1] ? `:${verse[0]}` : `:${verse[0]}-${verse[1]}`;
  };

  const commitRename = (oldName: string) => {
    const next = renameValue.value.trim();
    renamingCategory.value = null;
    renameValue.value = "";
    if (!next || next === oldName) return;
    void saves.renameCategory(oldName, next);
  };

  return (
    <div className="sb-saves-section">
      {categories.map((category) => {
        const items = allSaves.filter((b) =>
          saveBelongsToCategory(b, category.name)
        );
        const isExpanded = expanded.has(category.name);
        const isRenaming = renamingCategory.value === category.name;

        return (
          <div key={category.name} className="sb-save-category">
            <div
              className={`sb-save-category-header${
                isExpanded ? " sb-save-category-header-expanded" : ""
              }`}
            >
              <button
                type="button"
                className="sb-save-category-toggle"
                onClick={() => {
                  if (isRenaming) return;
                  saves.toggleCategoryExpanded(category.name);
                }}
                aria-expanded={isExpanded}
                aria-label={category.name}
              >
                <span className="sb-save-category-icon" aria-hidden="true">
                  {/*
                    Sized to the row's text height so category headers don't get
                    a taller hit-target than the tabs around them.
                  */}
                  <SaveStarIcon isSaved size={16} />
                </span>
                {isRenaming ? (
                  <input
                    className="sb-save-category-rename-input"
                    autoFocus
                    value={renameValue.value}
                    onInput={(event: Event) => {
                      const target = event.target as HTMLInputElement;
                      renameValue.value = target.value;
                    }}
                    onKeyDown={(event: KeyboardEvent) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitRename(category.name);
                      } else if (event.key === "Escape") {
                        event.preventDefault();
                        renamingCategory.value = null;
                        renameValue.value = "";
                      }
                    }}
                    onBlur={() => commitRename(category.name)}
                    onClick={(event: MouseEvent) => event.stopPropagation()}
                  />
                ) : (
                  <span className="sb-save-category-name">{category.name}</span>
                )}
                <span
                  className={`sb-save-category-chevron${
                    isExpanded ? " sb-save-category-chevron-open" : ""
                  }`}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">expand_more</span>
                </span>
              </button>

              <ContextMenuWithButton
                anchorClassName="sb-save-category-menu-anchor"
                buttonClassName="sb-save-category-menu-button"
                menuClassName="sb-tab-menu"
                iconClassName="sb-tab-more-icon"
                aria-label={t("category-options", {
                  defaultValue: "Folder options",
                })}
                title={t("category-options", {
                  defaultValue: "Folder options",
                })}
              >
                <ContextMenuItem
                  className="sb-tab-menu-item"
                  onClick={() => {
                    renamingCategory.value = category.name;
                    renameValue.value = category.name;
                    closeContextMenus();
                  }}
                >
                  {t("rename", { defaultValue: "Rename" })}
                </ContextMenuItem>
                {category.name !== DEFAULT_SAVE_CATEGORY && (
                  <ContextMenuItem
                    className="sb-tab-menu-item"
                    onClick={() => {
                      void saves.deleteCategory(category.name);
                    }}
                  >
                    {t("delete", { defaultValue: "Delete" })}
                  </ContextMenuItem>
                )}
              </ContextMenuWithButton>
            </div>

            {isExpanded && (
              <div className="sb-save-category-items">
                {items.length === 0 ? (
                  <div className="sb-save-category-empty">
                    {t("save-folder-empty", {
                      defaultValue: "No saves here yet.",
                    })}
                  </div>
                ) : (
                  items.map((save) => {
                    // Saves are pure links — they always render as a
                    // compact entry, never as the tab itself. Clicking one
                    // selects an open tab on the same chapter (and scrolls to
                    // the saved verse if any), or creates a new tab at the
                    // saved location when none is open.
                    ensureTranslationBooks(save.translationId);
                    const bookName =
                      lookupBookName(save.translationId, save.bookId) ??
                      save.bookId;
                    const verseSuffix = formatVerseRef(save.verse);
                    return (
                      <div
                        key={save.id}
                        className={`sb-save-item${
                          save.verse !== undefined ? " sb-save-item-verse" : ""
                        }`}
                        dir="auto"
                      >
                        <button
                          type="button"
                          className="sb-save-item-button"
                          onClick={() => {
                            openSave(
                              save.translationId,
                              save.bookId,
                              save.chapterNumber,
                              save.verse
                            );
                          }}
                        >
                          <span className="sb-tab-main-title">
                            {`${bookName} ${save.chapterNumber}${verseSuffix}`}
                          </span>
                          <span className="sb-tab-main-sep" aria-hidden="true">
                            •
                          </span>
                          <span className="sb-tab-main-translation">
                            {save.translationId}
                          </span>
                        </button>
                        <ContextMenuWithButton
                          anchorClassName="sb-tab-menu-anchor"
                          buttonClassName="sb-tab-menu-button"
                          menuClassName="sb-tab-menu"
                          iconClassName="sb-tab-more-icon"
                          aria-label={t("save-options", {
                            defaultValue: "Save options",
                          })}
                          title={t("save-options", {
                            defaultValue: "Save options",
                          })}
                        >
                          <ContextMenuItem
                            className="sb-tab-menu-item"
                            onClick={() => {
                              openSaveCategoryModal(
                                state,
                                {
                                  translationId: save.translationId,
                                  bookId: save.bookId,
                                  chapterNumber: save.chapterNumber,
                                  ...(save.verse !== undefined
                                    ? { verse: save.verse }
                                    : {}),
                                },
                                {
                                  mode: "edit",
                                  saveId: save.id,
                                }
                              );
                            }}
                          >
                            {t("edit-save", {
                              defaultValue: "Edit save",
                            })}
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="sb-tab-menu-item"
                            onClick={() => {
                              void saves.removeSaveFromCategory(
                                save.id,
                                category.name
                              );
                            }}
                          >
                            {t("remove-save", {
                              defaultValue: "Remove save",
                            })}
                          </ContextMenuItem>
                        </ContextMenuWithButton>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Tabs(props: TabsProps) {
  const { state, closeLayoutMenu, effectivelyCollapsed } = props;
  const { app, tabs: tabsManager, saves, bookmarks } = state;
  // Slot-only tabs back an "open in new panel" clone and are intentionally
  // hidden from the tab strip.
  const tabs = tabsManager.tabs.value.filter((tab) => !tab.slotOnly);
  const selectedTabId = tabsManager.selectedTabId.value;
  const panelsEnabled = app.panelsEnabled.value;
  const isSavesFilterActive = saves.isFilterActive.value;
  const isBookmarksPanelOpen = bookmarks.isPanelOpen.value;
  const { t } = useI18n();

  const bookmarksToggleLabel = isBookmarksPanelOpen
    ? t("hide-bookmarks", { defaultValue: "Hide bookmarks" })
    : t("show-bookmarks", { defaultValue: "Show bookmarks" });
  // The toggle draws the same stack as the reader's button, but for all of
  // the user's bookmarks: most recently moved in front, at most three shown.
  const allBookmarks = bookmarks.bookmarks.value;

  if (effectivelyCollapsed) {
    return (
      <div className="sb-sidebar-collapsed-tab-list">
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedTabId;
          const shortTitle = tab.readingState.shortTitle.value;
          const fullTitle = tab.readingState.title.value || shortTitle;
          const session = tab.sharedSession;
          const sessionUsers = session?.connectedUsers.value ?? [];
          const isPlayingAudio = isTabPlayingAudio(state, tab);
          const label =
            session && sessionUsers.length > 0
              ? t("collapsed-tab-shared-label", {
                  title: fullTitle,
                  count: sessionUsers.length,
                  defaultValue: "{{title}} — shared session, {{count}} present",
                })
              : fullTitle;

          return (
            <button
              key={tab.id}
              onClick={() => {
                closeContextMenus();
                closeLayoutMenu();
                app.selectTab(tab.id);
              }}
              className={`sb-collapsed-tab-tile${
                isSelected ? " sb-collapsed-tab-tile-selected" : ""
              }`}
              aria-label={
                isPlayingAudio
                  ? t("collapsed-tab-playing-label", {
                      label,
                      defaultValue: "{{label}} — playing audio",
                    })
                  : label
              }
              title={fullTitle}
            >
              <span className="sb-collapsed-tab-title">{shortTitle}</span>
              {isPlayingAudio && (
                <MaterialIcon
                  className="sb-collapsed-tab-audio-icon"
                  aria-hidden="true"
                >
                  volume_up
                </MaterialIcon>
              )}
              {session &&
                sessionUsers.length > 0 &&
                (() => {
                  const options = session.options.value;
                  const sorted = sortUsersBySessionRole(options, sessionUsers);
                  const shown = sorted.slice(0, 3);
                  const extra = sorted.length - shown.length;
                  return (
                    <span
                      className="sb-collapsed-tab-presence"
                      aria-hidden="true"
                    >
                      {shown.map((user) => {
                        const role = getUserSessionRole(options, user);
                        return (
                          <span
                            key={user.connectionId}
                            className={`sb-collapsed-tab-presence-dot${role ? ` sb-collapsed-tab-presence-dot-${role === "co-host" ? "cohost" : "host"}` : ""}`}
                            style={{ backgroundColor: user.visual.color }}
                          />
                        );
                      })}
                      {extra > 0 && (
                        <span className="sb-collapsed-tab-presence-more">
                          +{extra}
                        </span>
                      )}
                    </span>
                  );
                })()}
            </button>
          );
        })}
        <button
          onClick={() => {
            app.addTab();
          }}
          className="sb-tab-add-button sb-collapsed-tab-add-button"
          aria-label={t("create-new-tab", { defaultValue: "Create new tab" })}
          title={t("new-tab", { defaultValue: "New tab" })}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>
    );
  }

  // Mobile counterpart of the saves screen below, for the bookmarks panel.
  if (app.isMobile.value && isBookmarksPanelOpen) {
    const closeLabel = bookmarks.openedFromToolbar.value
      ? t("close", { defaultValue: "Close" })
      : t("back", { defaultValue: "Back" });
    return (
      <div className="sb-saves-mobile-screen sb-bookmarks-mobile-screen">
        <div className="sb-saves-mobile-header">
          <button
            type="button"
            className="sb-saves-mobile-header-button sb-saves-mobile-header-close"
            onClick={() => {
              // From the More menu, Close dismisses the drawer; from the Tabs
              // header, Back returns to the Tabs list.
              if (bookmarks.openedFromToolbar.value) {
                bookmarks.closePanel();
                state.sidebar.closeSidebar();
              } else {
                bookmarks.closePanel();
              }
            }}
            aria-label={closeLabel}
            title={closeLabel}
          >
            <span className="material-symbols-outlined">
              {bookmarks.openedFromToolbar.value ? "close" : "arrow_back"}
            </span>
          </button>
          <h2 className="sb-saves-mobile-title">
            {t("bookmarks", { defaultValue: "Bookmarks" })}
          </h2>
        </div>
        <div className="sb-saves-mobile-body">
          <BookmarksPanel state={state} closeLayoutMenu={closeLayoutMenu} />
        </div>
      </div>
    );
  }

  // On mobile, the Saves bottom-tab opens this drawer with the saves
  // filter active. Rather than show the tabs list + search, present a focused
  // full-screen Saves view: a dedicated header (close / title / new
  // folder) over the existing collapsible SavesSection.
  if (app.isMobile.value && isSavesFilterActive) {
    const createNewCategory = () => {
      const base = t("new-save-folder", { defaultValue: "New folder" });
      const existing = new Set(saves.categories.value.map((c) => c.name));
      let name = base;
      let n = 2;
      while (existing.has(name)) {
        name = `${base} ${n++}`;
      }
      void saves.createCategory(name);
    };

    return (
      <div className="sb-saves-mobile-screen">
        <div className="sb-saves-mobile-header">
          <button
            type="button"
            className="sb-saves-mobile-header-button sb-saves-mobile-header-close"
            onClick={() => {
              // Opened from the bottom toolbar → Close (X) dismisses the whole
              // drawer. Opened from the Tabs header → Back arrow turns the
              // filter off, returning to the Tabs list it came from.
              if (saves.openedFromToolbar.value) {
                // Reset the view (filter + source flag) so the next time the
                // tabs drawer opens it starts on the Tabs list, not a stale
                // saves screen.
                saves.closeView();
                state.sidebar.closeSidebar();
              } else if (saves.isFilterActive.value) {
                saves.toggleFilter();
              }
            }}
            aria-label={
              saves.openedFromToolbar.value
                ? t("close", { defaultValue: "Close" })
                : t("back", { defaultValue: "Back" })
            }
            title={
              saves.openedFromToolbar.value
                ? t("close", { defaultValue: "Close" })
                : t("back", { defaultValue: "Back" })
            }
          >
            <span className="material-symbols-outlined">
              {saves.openedFromToolbar.value ? "close" : "arrow_back"}
            </span>
          </button>
          <h2 className="sb-saves-mobile-title">
            {t("saves", { defaultValue: "Saves" })}
          </h2>
          <button
            type="button"
            className="sb-saves-mobile-header-button sb-saves-mobile-header-add"
            onClick={createNewCategory}
            aria-label={t("new-save-folder", {
              defaultValue: "New folder",
            })}
            title={t("new-save-folder", { defaultValue: "New folder" })}
          >
            <span className="material-symbols-outlined">create_new_folder</span>
          </button>
        </div>
        <div className="sb-saves-mobile-body">
          <SavesSection state={state} closeLayoutMenu={closeLayoutMenu} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sb-sidebar-tabs-header">
        {!app.isMobile.value && (
          <>
            <h3 className="sb-sidebar-tabs-title">
              {t("tabs", { defaultValue: "Tabs" })}
            </h3>
            <div className="sb-sidebar-tabs-header-actions">
              <button
                type="button"
                className="sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-tasks-button"
                aria-label={t("tasks", { defaultValue: "Tasks" })}
                title={t("tasks", { defaultValue: "Tasks" })}
                onClick={() => {
                  state.today.open();
                }}
              >
                <TodayIcon />
              </button>

              <button
                type="button"
                className={`sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-bookmarks-button${
                  isBookmarksPanelOpen
                    ? " sb-sidebar-tabs-header-bookmarks-button-active"
                    : ""
                }`}
                aria-label={t("bookmarks", { defaultValue: "Bookmarks" })}
                aria-pressed={isBookmarksPanelOpen}
                title={bookmarksToggleLabel}
                onClick={() => {
                  bookmarks.openedFromToolbar.value = false;
                  bookmarks.togglePanel();
                }}
              >
                <BookmarkStackIcon
                  bookmarks={allBookmarks}
                  size={24}
                  color={isBookmarksPanelOpen ? "currentColor" : undefined}
                />
              </button>
              <button
                type="button"
                className={`sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-saves-button${
                  isSavesFilterActive
                    ? " sb-sidebar-tabs-header-saves-button-active"
                    : ""
                }`}
                aria-label={t("saves", { defaultValue: "Saves" })}
                aria-pressed={isSavesFilterActive}
                title={
                  isSavesFilterActive
                    ? t("hide-saves", { defaultValue: "Hide saves" })
                    : t("show-saves", { defaultValue: "Show saves" })
                }
                onClick={() => {
                  saves.toggleFilter();
                }}
              >
                <SaveStarIcon isSaved={isSavesFilterActive} size={24} />
              </button>
              <button
                type="button"
                className="sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-close-button"
                onClick={state.sidebar.closeSidebar}
                aria-label={t("close", { defaultValue: "Close" })}
                title={t("close", { defaultValue: "Close" })}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
              <button
                onClick={() => {
                  app.addTab();
                }}
                className="sb-tab-add-button"
                aria-label={t("create-new-tab", {
                  defaultValue: "Create new tab",
                })}
                title={t("new-tab", { defaultValue: "New tab" })}
              >
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </>
        )}
        {app.isMobile.value && (
          <>
            <button
              type="button"
              className="sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-close-button"
              onClick={() => {
                state.sidebar.closeSidebar();
                if (!state.sidebar.tabsOpenedFromToolbar.value) {
                  state.selector.setOpen(true);
                }
              }}
              aria-label={
                state.sidebar.tabsOpenedFromToolbar.value
                  ? t("close", { defaultValue: "Close" })
                  : t("back", { defaultValue: "Back" })
              }
              title={
                state.sidebar.tabsOpenedFromToolbar.value
                  ? t("close", { defaultValue: "Close" })
                  : t("back", { defaultValue: "Back" })
              }
            >
              <span className="material-symbols-outlined">
                {state.sidebar.tabsOpenedFromToolbar.value
                  ? "close"
                  : "arrow_back"}
              </span>
            </button>
            <h3 className="sb-sidebar-tabs-title">
              {t("tabs", { defaultValue: "Tabs" })}
            </h3>
            <button
              type="button"
              className="sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-bookmarks-button"
              aria-label={t("bookmarks", { defaultValue: "Bookmarks" })}
              aria-pressed={isBookmarksPanelOpen}
              title={bookmarksToggleLabel}
              onClick={() => {
                // Opened from the Tabs header, so it gets a Back arrow.
                bookmarks.openedFromToolbar.value = false;
                bookmarks.togglePanel();
              }}
            >
              <BookmarkStackIcon bookmarks={allBookmarks} size={24} />
            </button>
            <button
              type="button"
              className={`sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-saves-button${
                isSavesFilterActive
                  ? " sb-sidebar-tabs-header-saves-button-active"
                  : ""
              }`}
              aria-label={t("saves", { defaultValue: "Saves" })}
              aria-pressed={isSavesFilterActive}
              title={
                isSavesFilterActive
                  ? t("hide-saves", { defaultValue: "Hide saves" })
                  : t("show-saves", { defaultValue: "Show saves" })
              }
              onClick={() => {
                // Opened from the Tabs header: backing out of the saves
                // view should return here, so it gets a Back arrow (not an X).
                saves.openedFromToolbar.value = false;
                saves.toggleFilter();
              }}
            >
              <SaveStarIcon isSaved={isSavesFilterActive} size={24} />
            </button>
            <button
              type="button"
              className="sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-share-button"
              aria-label={t("share", {
                defaultValue: "Share",
              })}
              title={t("share", {
                defaultValue: "Share",
              })}
              onClick={() => {
                openShareSheetForCurrentTab(state);
              }}
            >
              <MaterialIcon aria-hidden="true">share</MaterialIcon>
            </button>
          </>
        )}
      </div>

      <SidebarSearch state={state} closeLayoutMenu={closeLayoutMenu} />

      <div className="sb-sidebar-tab-list">
        {isBookmarksPanelOpen && (
          <>
            <BookmarksPanel state={state} closeLayoutMenu={closeLayoutMenu} />
            <div className="sb-sidebar-tabs-divider" role="separator" />
          </>
        )}
        {isSavesFilterActive && (
          <>
            <SavesSection state={state} closeLayoutMenu={closeLayoutMenu} />
            <div className="sb-sidebar-tabs-divider" role="separator" />
          </>
        )}
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedTabId;
          return (
            <TabRow
              key={tab.id}
              state={state}
              tab={tab}
              isSelected={isSelected}
              closeLayoutMenu={closeLayoutMenu}
              panelsEnabled={panelsEnabled}
            />
          );
        })}
      </div>

      <button
        onClick={() => {
          app.addTab();
        }}
        className="sb-tab-mobile-add-inline sb-tab-row"
        aria-label={t("create-new-tab", { defaultValue: "Create new tab" })}
      >
        <span className="sb-tab-mobile-add-inline-label">
          {t("add-new-tab", { defaultValue: "Add new tab" })}
        </span>
        <span className="sb-tab-mobile-add-inline-icon" aria-hidden="true">
          <span className="material-symbols-outlined">add</span>
        </span>
      </button>
    </>
  );
}

/**
 * Fixed-position toast list at the top-left of the viewport showing live
 * shared sessions from other users that the current client isn't already
 * in. Ported from develop's top-left notification pattern — no separate
 * notifications box; the toasts ARE the notifications.
 */
export function SharedSessionsToasts(props: { state: SeedBibleState }) {
  const { state } = props;
  const { invitations, tabs: tabsManager } = state;
  const { t } = useI18n();

  const openSharedSessionIds = new Set(
    tabsManager.tabs.value
      .map((tab) => tab.sharedSession?.id)
      .filter(Boolean) as string[]
  );
  const entries = invitations.availableSessions.value.filter(
    (entry) => !openSharedSessionIds.has(entry.sessionId)
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="sb-shared-toasts"
      role="region"
      aria-label={t("shared-sessions", { defaultValue: "Shared sessions" })}
    >
      {entries.map((entry) => {
        const hostName = displayNameOf(
          { userId: entry.hostUserId, name: entry.hostProfile?.name },
          t
        );
        // Pure-hash visual keyed by hostUserId — same key every client uses
        // for this host, so everyone sees the same icon+color combo.
        const visual = getUserAnimalVisual(entry.hostUserId);
        const hostImage = entry.hostProfile?.pictureUrl ?? null;

        return (
          <div key={entry.sessionId} className="sb-shared-toast">
            <button
              className="sb-shared-toast-button"
              onClick={() => {
                closeContextMenus();
                void invitations.joinAvailableSession(entry);
              }}
            >
              {hostImage ? (
                <span
                  className="sb-tab-user-icon sb-tab-user-icon-has-image"
                  style={{
                    borderColor: visual.color,
                    backgroundImage: `url(${hostImage})`,
                  }}
                />
              ) : (
                <span
                  className="sb-tab-user-icon sb-tab-user-icon-animal"
                  style={{
                    borderColor: visual.color,
                    backgroundColor: visual.color,
                  }}
                >
                  <span className="material-symbols-outlined">
                    {visual.defaultIcon}
                  </span>
                </span>
              )}
              <div className="sb-shared-toast-main">
                <span className="sb-shared-toast-host">{hostName}</span>
                <span className="sb-shared-toast-label">
                  {t("shared-session-click-to-join", {
                    defaultValue: "is sharing — click to join",
                  })}
                </span>
              </div>
            </button>
            <button
              className="sb-shared-toast-dismiss"
              aria-label={t("dismiss", { defaultValue: "Dismiss" })}
              title={t("dismiss", { defaultValue: "Dismiss" })}
              onClick={(event: Event) => {
                event.stopPropagation();
                invitations.dismissAvailableSession(entry);
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Just the avatar visual — the image (when the user has a profile picture),
 * a generic account icon (when they don't, and nobody else is around), or
 * the deterministic animal icon + color (when they don't, and other people
 * are present). Reused by the sidebar bottom-right avatar button and by the
 * mobile header account button so the two surfaces always show the same
 * identity.
 */
export function SelfAvatarVisual(props: { state: SeedBibleState }) {
  const { state } = props;
  const { login } = state;
  const { t } = useI18n();
  const profile = login.profile.value;
  // Share identity with connected-user rendering so the avatar shows the
  // same icon/color as the user's row inside a shared session.
  const visualKey = getConnectedUserVisualKey({
    userId: state.login.userId.value,
    connectionId: state.os.connectionId,
  });
  const visual = getUserAnimalVisual(visualKey);
  const imageUrl = profile?.pictureUrl ?? null;

  return (
    <Avatar
      imageUrl={imageUrl}
      visual={visual}
      title={getSelfDisplayName(state, t)}
      genericFallback={!isInMultiUserIdentityContext(state)}
    />
  );
}

/**
 * True when the current user is in a context where other people can see
 * them — a shared reading session, or a chat that includes another person
 * (including someone who is currently inactive). That's when the
 * animal+color fallback is needed to tell people apart.
 */
function isInMultiUserIdentityContext(state: SeedBibleState): boolean {
  const tabs = state.tabs?.tabs?.value;
  if (tabs?.some((tab) => tab.sharedSession != null)) {
    return true;
  }
  const chats = state.chats?.chats?.value;
  return chats?.some((chat) => chatHasOtherPeople(chat)) ?? false;
}

/** Display name for the current user — used as the avatar tooltip / aria-label. */
export function getSelfDisplayName(
  state: SeedBibleState,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const userId = state.login.userId.value;
  const profile = state.login.profile.value;
  return (
    trimmedOrNull(profile?.name) ??
    (userId
      ? userId.slice(0, 8)
      : t("anonymous", { defaultValue: "Anonymous" }))
  );
}

/**
 * Button at the bottom-right of the sidebar showing the current user's
 * avatar. Opens the Profile screen — the desktop entry point for it (#1554).
 * Account settings now hangs off Profile rather than being reached directly.
 */
function SelfAvatarButton(props: { state: SeedBibleState }) {
  const { state } = props;
  const { t } = useI18n();
  const displayName = getSelfDisplayName(state, t);
  const label = t("open-profile", { defaultValue: "Open profile" });

  return (
    <button
      className="sb-sidebar-self-avatar"
      onClick={() => {
        state.openProfile();
      }}
      aria-label={`${label} (${displayName})`}
      title={displayName}
    >
      <SelfAvatarVisual state={state} />
    </button>
  );
}

export function Sidebar(props: SidebarProps) {
  const { state } = props;
  const { app, tabsLayout, sidebar } = state;
  const paneLayout = app.panelsEnabled.value
    ? tabsLayout.layout.value
    : "single";
  const panelsEnabled = app.panelsEnabled.value;
  const isSettingsOpen = sidebar.isSettingsOpen.value;
  const isCollapsed = sidebar.isSidebarCollapsed.value;
  const isMobileOpen = sidebar.isMobileOpen.value;
  const effectivelyCollapsed = isCollapsed && !isMobileOpen && !isSettingsOpen;
  const isLayoutMenuOpen = useSignal(false);

  // In the compact-desktop band an expanded sidebar floats over the reader as
  // an overlay (see Tabs.css). When it does, we render a scrim behind it so
  // that (a) input to the reader below is blocked while the overlay is up and
  // (b) clicking anywhere outside the sidebar collapses it back to the rail.
  const isOverlay = app.isCompactDesktop.value && !effectivelyCollapsed;

  // The guided tour opens the pane-layout menu while its step is active so the
  // layout options are visible behind the coachmark.
  const tourWantsLayoutMenu =
    state.tutorial.running.value &&
    state.tutorial.currentStep.value?.id === "pane-layout";

  const closeLayoutMenu = () => {
    isLayoutMenuOpen.value = false;
  };

  const { t } = useI18n();

  return (
    <>
      {isOverlay && (
        <div
          className="sb-sidebar-scrim"
          onClick={sidebar.collapseSidebarOverlay}
          aria-hidden="true"
        />
      )}
      <aside
        className={`sb-tabs-sidebar${effectivelyCollapsed ? " sb-tabs-sidebar-collapsed" : ""}${isMobileOpen ? " sb-tabs-sidebar-mobile-open" : ""}`}
      >
        {!isSettingsOpen && (
          <TabsHeader
            state={state}
            effectivelyCollapsed={effectivelyCollapsed}
            panelsEnabled={panelsEnabled}
            paneLayout={paneLayout}
            isLayoutMenuOpen={isLayoutMenuOpen.value || tourWantsLayoutMenu}
            toggleLayoutMenu={() => {
              closeContextMenus();
              const willOpen = !isLayoutMenuOpen.value;
              isLayoutMenuOpen.value = willOpen;
              // Teach the panel layout the first time the user opens it.
              if (willOpen) {
                state.tutorial.startContextual("pane-layout");
              }
            }}
            closeLayoutMenu={closeLayoutMenu}
            setLayout={(layout) => {
              tabsLayout.setLayout(layout);
              closeLayoutMenu();
            }}
          />
        )}

        {isSettingsOpen ? (
          <Settings state={state} />
        ) : (
          <Tabs
            state={state}
            closeLayoutMenu={closeLayoutMenu}
            effectivelyCollapsed={effectivelyCollapsed}
          />
        )}

        <div
          className={`sb-sidebar-bottom-actions${
            effectivelyCollapsed ? " sb-sidebar-bottom-actions-collapsed" : ""
          }`}
        >
          <button
            onClick={sidebar.toggleSettings}
            data-tutorial="settings"
            className={`sb-sidebar-icon-button${
              isSettingsOpen ? " sb-sidebar-icon-button-selected" : ""
            }`}
            aria-label={t("open-settings", {
              defaultValue: "Open settings",
            })}
            title={t("settings", { defaultValue: "Settings" })}
          >
            <SettingsIcon />
          </button>
          <SelfAvatarButton state={state} />
        </div>
      </aside>
    </>
  );
}
