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
import { MaterialIcon, SettingsIcon } from "../../components/icons";
import { SettingsPage } from "../../components/SettingsPage/SettingsPage";
import { ShareModal } from "../ShareModal/shareModal";
import { getShareUrl, openShareModal } from "../../managers/BibleToolsManager";
import {
  isSessionHost,
  type BibleReadingSession,
  getConnectedUserVisualKey,
  getUserAnimalVisual,
  getSessionUrl,
} from "../../managers/SessionsManager";
import { safeLocalStorage } from "../../app/ssrEnv";
import { useI18n } from "../../i18n/I18nManager";
import { SidebarSearch } from "../../components/SidebarSearch/SidebarSearch";
import {
  handleGridKeyNav,
  handleHorizontalListKeyNav,
} from "../../app/keyboardNav";
import {
  Avatar,
  SessionUserAvatar,
  getUserDisplayName,
  getUserSessionRole,
  sessionRoleRank,
} from "../Avatar/Avatar";
import { useEffect, useRef } from "preact/hooks";
import { chatHasOtherPeople } from "../../managers/ChatsManager";
import { trimmedOrNull } from "../../managers/Utils";

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

const HIGHLIGHT_DURATION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "∞", value: null },
  { label: "8s", value: 8 },
  { label: "16s", value: 16 },
  { label: "20s", value: 20 },
];

/**
 * Modal content: host-side controls for a shared session. Ported from
 * develop's "Scripture Navigation" panel.
 *
 * - "Only Host can navigate" toggles `allowedNavigators` between `null`
 *   (everyone) and `[hostUserId]` (host only).
 * - "Only Host can highlight" toggles `allowedDecorators` the same way.
 * - Highlight duration picker writes `highlightDurationSeconds`.
 * - "End Session" removes the tab (which disposes the session and removes
 *   its registry entry automatically via `wrapSessionLifecycle`).
 *
 * Non-host participants see the current settings but can't change them.
 */
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
 * True when the local client is the host or a co-host of the given session.
 */
export function isLocalSessionHost(
  state: SeedBibleState,
  session: BibleReadingSession
): boolean {
  const options = session.options.value;
  return (
    isSessionHost(options, state.login.userId.value) ||
    isSessionHost(
      options,
      getConnectedUserVisualKey({
        userId: state.login.userId.value,
        connectionId: state.os.connectionId,
      })
    )
  );
}

function SessionSettingsModalContent(props: {
  state: SeedBibleState;
  session: BibleReadingSession;
  onEndSession: () => void;
  onClose: () => void;
}) {
  const { state, session, onEndSession, onClose } = props;
  const { t } = useI18n();
  const options = session.options.value;
  const hostId = options.hostUserId;
  const isHost = isLocalSessionHost(state, session);

  const onlyHostNavigate =
    Array.isArray(options.allowedNavigators) &&
    options.allowedNavigators.length > 0;
  const onlyHostHighlight =
    Array.isArray(options.allowedDecorators) &&
    options.allowedDecorators.length > 0;
  const shareTranslation = options.shareTranslation;
  const sessionUrl = getSessionUrl(session);

  const urlCopied = useSignal(false);
  const copySessionUrl = () => {
    try {
      navigator.clipboard.writeText(sessionUrl.href);
      urlCopied.value = true;
      setTimeout(() => {
        urlCopied.value = false;
      }, 1200);
    } catch (error) {
      console.error("Failed to copy session URL.", error);
    }
  };

  const setNavigatorsOnlyHost = (onlyHost: boolean) => {
    if (!isHost || !hostId) return;
    session.updateOptions({
      allowedNavigators: onlyHost ? [hostId] : null,
    });
  };

  const setDecoratorsOnlyHost = (onlyHost: boolean) => {
    if (!isHost || !hostId) return;
    session.updateOptions({
      allowedDecorators: onlyHost ? [hostId] : null,
    });
  };

  const setHighlightDuration = (seconds: number | null) => {
    if (!isHost) return;
    session.updateOptions({ highlightDurationSeconds: seconds });
  };

  const setShareTranslation = (share: boolean) => {
    if (!isHost) return;
    session.updateOptions({ shareTranslation: share });
  };

  const setCoHost = (coHostKey: string, makeCoHost: boolean) => {
    if (!isHost) return;
    const existing = options.coHostUserIds ?? [];
    const next = makeCoHost
      ? existing.includes(coHostKey)
        ? existing
        : [...existing, coHostKey]
      : existing.filter((id) => id !== coHostKey);
    session.updateOptions({ coHostUserIds: next });
  };

  // Everyone connected, host first, then co-hosts, then peers (Array.sort is
  // stable so peers keep their existing order within a rank — matches the
  // sidebar tab row and the mobile sheet). The host is listed like any other
  // user, with a "Host" badge, but can't be promoted, so their row shows no
  // co-host action.
  const participants = [...session.connectedUsers.value].sort(
    (a, b) =>
      sessionRoleRank(getUserSessionRole(options, a)) -
      sessionRoleRank(getUserSessionRole(options, b))
  );

  return (
    <div className="sb-session-settings">
      <div className="sb-session-settings-scroll">
        <div className="sb-session-settings-url">
          <span className="sb-session-settings-label">
            {t("session-url", { defaultValue: "Session URL" })}
          </span>
          <div className="sb-session-settings-url-row">
            <span
              className="sb-session-settings-url-value"
              title={sessionUrl.href}
            >
              {sessionUrl.href}
            </span>
            <button
              type="button"
              className="sb-session-settings-copy-url"
              onClick={copySessionUrl}
              aria-label={t("copy", { defaultValue: "Copy" })}
              title={
                urlCopied.value
                  ? t("copied", { defaultValue: "Copied" })
                  : t("copy", { defaultValue: "Copy" })
              }
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {urlCopied.value ? "check" : "content_copy"}
              </span>
            </button>
          </div>
        </div>

        {!isHost && (
          <p className="sb-session-settings-note">
            {t("session-settings-host-only_note", {
              defaultValue: "Only the session host can change these settings.",
            })}
          </p>
        )}

        <div className="sb-session-settings-section">
          <div className="sb-session-settings-section-title">
            {t("session-settings-section-navigation", {
              defaultValue: "Navigation",
            })}
          </div>

          <div className="sb-session-settings-row">
            <label
              className="sb-session-settings-label"
              htmlFor="sb-session-only-host-navigate"
            >
              {t("session-settings-host-only_navigate", {
                defaultValue: "Only host can navigate",
              })}
            </label>
            <input
              id="sb-session-only-host-navigate"
              type="checkbox"
              checked={onlyHostNavigate}
              disabled={!isHost}
              onChange={(event: Event) => {
                setNavigatorsOnlyHost(
                  (event.currentTarget as HTMLInputElement).checked
                );
              }}
            />
          </div>
          <p className="sb-session-settings-description">
            {onlyHostNavigate
              ? t("session-settings-navigate-desc_host", {
                  defaultValue:
                    "Only the host can change the passage for everyone.",
                })
              : t("session-settings-navigate-desc_all", {
                  defaultValue:
                    "Everyone in the session can change the passage.",
                })}
          </p>

          <div className="sb-session-settings-row">
            <label
              className="sb-session-settings-label"
              htmlFor="sb-session-only-host-highlight"
            >
              {t("session-settings-host-only_highlight", {
                defaultValue: "Only host can highlight",
              })}
            </label>
            <input
              id="sb-session-only-host-highlight"
              type="checkbox"
              checked={onlyHostHighlight}
              disabled={!isHost}
              onChange={(event: Event) => {
                setDecoratorsOnlyHost(
                  (event.currentTarget as HTMLInputElement).checked
                );
              }}
            />
          </div>
          <p className="sb-session-settings-description">
            {onlyHostHighlight
              ? t("session-settings-highlight-desc_host", {
                  defaultValue: "Only the host can highlight for everyone.",
                })
              : t("session-settings-highlight-desc_all", {
                  defaultValue: "Everyone in the session can highlight.",
                })}
          </p>

          <div className="sb-session-settings-duration">
            <div className="sb-session-settings-duration-title">
              {t("session-settings-highlight-duration", {
                defaultValue: "Highlight for",
              })}
            </div>
            <div
              className="sb-session-settings-duration-options"
              role="radiogroup"
              onKeyDown={(event) => {
                handleHorizontalListKeyNav(event, event.currentTarget);
              }}
            >
              {HIGHLIGHT_DURATION_OPTIONS.map((option) => {
                const selected =
                  options.highlightDurationSeconds === option.value;
                return (
                  <button
                    key={option.label}
                    type="button"
                    className={`sb-session-settings-duration-option${selected ? " sb-session-settings-duration-option-selected" : ""}`}
                    disabled={!isHost}
                    onClick={() => setHighlightDuration(option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sb-session-settings-section">
          <div className="sb-session-settings-section-title">
            {t("session-settings-section-sharing", { defaultValue: "Sharing" })}
          </div>

          <div className="sb-session-settings-row">
            <label
              className="sb-session-settings-label"
              htmlFor="sb-session-share-translation"
            >
              {t("session-settings-share-translation", {
                defaultValue: "Share translation",
              })}
            </label>
            <input
              id="sb-session-share-translation"
              type="checkbox"
              checked={shareTranslation}
              disabled={!isHost}
              onChange={(event: Event) => {
                setShareTranslation(
                  (event.currentTarget as HTMLInputElement).checked
                );
              }}
            />
          </div>
          <p className="sb-session-settings-description">
            {shareTranslation
              ? t("session-settings-share-translation-desc_shared", {
                  defaultValue:
                    "Everyone reads the same translation. Changing it updates it for everyone.",
                })
              : t("session-settings-share-translation-desc_unique", {
                  defaultValue:
                    "Each person keeps their own translation. Changing yours won't affect others.",
                })}
          </p>
        </div>

        {isHost && participants.length > 0 && (
          <div className="sb-session-settings-section">
            <div className="sb-session-settings-section-title">
              {t("session-settings-section-participants", {
                defaultValue: "Participants",
              })}
            </div>
            <ul className="sb-session-participants">
              {participants.map((user) => {
                const coHostKey = getConnectedUserVisualKey(user);
                const role = getUserSessionRole(options, user);
                const isHostUser = role === "host";
                const isCoHost = role === "co-host";
                const visual = getUserAnimalVisual(coHostKey);
                const imageUrl = user.profile?.pictureUrl ?? null;
                return (
                  <li
                    key={user.connectionId}
                    className="sb-session-participant"
                  >
                    <span
                      className={`sb-session-participant-avatar${imageUrl ? " sb-session-participant-avatar-has-image" : ""}`}
                      style={
                        imageUrl
                          ? {
                              borderColor: visual.color,
                              backgroundImage: `url(${imageUrl})`,
                            }
                          : { backgroundColor: visual.color }
                      }
                      aria-hidden="true"
                    >
                      {!imageUrl && (
                        <MaterialIcon>{visual.defaultIcon}</MaterialIcon>
                      )}
                    </span>
                    <span
                      className="sb-session-participant-name"
                      title={getUserDisplayName(user)}
                    >
                      {getUserDisplayName(user)}
                      {isHostUser && (
                        <span className="sb-session-participant-badge">
                          {t("host", { defaultValue: "Host" })}
                        </span>
                      )}
                      {isCoHost && (
                        <span className="sb-session-participant-badge">
                          {t("co-host", { defaultValue: "Co-host" })}
                        </span>
                      )}
                    </span>
                    {!isHostUser && (
                      <button
                        type="button"
                        className={`sb-session-participant-action${isCoHost ? " sb-session-participant-action-active" : ""}`}
                        onClick={() => setCoHost(coHostKey, !isCoHost)}
                      >
                        {isCoHost
                          ? t("remove-co-host", {
                              defaultValue: "Remove co-host",
                            })
                          : t("make-co-host", { defaultValue: "Make co-host" })}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="sb-session-settings-actions">
        <button
          type="button"
          className="sb-session-settings-end"
          onClick={() => {
            onEndSession();
            onClose();
          }}
        >
          {t("end-session", { defaultValue: "End Session" })}
        </button>
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("close", { defaultValue: "Close" })}
        </button>
      </div>
    </div>
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
 * Opens the session settings modal for a shared session. Shared by the tab
 * kebab and the mobile reader participants sheet so both open the exact same
 * dialog. Ending the session from the modal removes whichever tab is backed by
 * this session.
 */
export function openSessionSettingsModal(
  state: SeedBibleState,
  session: BibleReadingSession
) {
  const modalId = `session-settings-${session.id}`;
  state.modals.openModal({
    id: modalId,
    title: {
      key: "session-settings",
      defaultValue: "Session settings",
    },
    content: () => (
      <SessionSettingsModalContent
        state={state}
        session={session}
        onEndSession={() => {
          const tab = state.tabs.tabs.value.find(
            (t) => t.sharedSession === session
          );
          if (tab) state.tabs.removeTab(tab.id);
        }}
        onClose={() => {
          state.modals.closeModal(modalId);
        }}
      />
    ),
  });
}

export function openShareSessionModal(
  state: SeedBibleState,
  session: BibleReadingSession
) {
  const shareUrl = getSessionUrl(session);
  const modalId = `share-session-${session.id}`;
  state.modals.openModal({
    id: modalId,
    title: { key: "share-sheet-title", defaultValue: "Share" },
    content: () => (
      <ShareModal
        app={state.app}
        session={session}
        hideShareLink
        onClose={() => state.modals.closeModal(modalId)}
        onShareVia={() => {
          void navigator.share?.({
            title: document.title,
            url: shareUrl.href,
          });
          state.modals.closeModal(modalId);
        }}
      />
    ),
  });
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

        {activeLogoUrl && (
          <span
            className="sb-sidebar-logo sb-tab-user-icon sb-tab-user-icon-has-image"
            style={{ backgroundImage: `url(${activeLogoUrl})` }}
            aria-hidden="true"
          />
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

  const { app } = state;
  const { t } = useI18n();

  const shortSubTitle = tab.readingState.shortSubTitle.value;
  const title = tab.readingState.title.value;
  const connectedUsers = tab.sharedSession?.connectedUsers.value ?? [];
  // Saves accumulate rather than toggle, so this always opens the folder
  // picker — a second press files another copy of the chapter, it does not
  // undo the first.
  const handleSaveAction = () => {
    const translationId = tab.readingState.translationId.value;
    const bookId = tab.readingState.bookId.value;
    const chapterNumber = tab.readingState.chapterNumber.value;
    if (!translationId || !bookId || !chapterNumber) return;
    openSaveCategoryModal(state, {
      translationId,
      bookId,
      chapterNumber,
    });
  };

  return (
    <div className={`sb-tab-row${isSelected ? " sb-tab-row-selected" : ""}`}>
      <button
        onClick={() => {
          closeContextMenus();
          closeLayoutMenu();
          app.selectTab(tab.id);
        }}
        className={`sb-tab-button`}
      >
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
        </div>

        {tab.sharedSession && connectedUsers.length > 0 && (
          <div className="sb-tab-users-section">
            <div className="sb-tab-users-list">
              {(() => {
                const sessionOptions = tab.sharedSession.options.value;
                // Host first, then co-hosts, then everyone else — Array.sort
                // is stable so peers keep their existing order within a rank.
                const sortedUsers = [...connectedUsers].sort(
                  (a, b) =>
                    sessionRoleRank(getUserSessionRole(sessionOptions, a)) -
                    sessionRoleRank(getUserSessionRole(sessionOptions, b))
                );
                return sortedUsers.map((user) => {
                  const role = getUserSessionRole(sessionOptions, user);
                  const roleLabel =
                    role === "host"
                      ? t("host", { defaultValue: "Host" })
                      : role === "co-host"
                        ? t("co-host", { defaultValue: "Co-host" })
                        : undefined;
                  return (
                    <SessionUserAvatar
                      key={user.connectionId}
                      user={user}
                      role={role}
                      roleLabel={roleLabel}
                    />
                  );
                });
              })()}
            </div>
          </div>
        )}
      </button>

      {isSelected && !tab.sharedSession && (
        <button
          type="button"
          className="sb-tab-save-button"
          aria-label={t("save-chapter", { defaultValue: "Save chapter" })}
          title={t("save-chapter", { defaultValue: "Save chapter" })}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            closeContextMenus();
            closeLayoutMenu();
            handleSaveAction();
          }}
        >
          <MaterialIcon aria-hidden="true">stacks</MaterialIcon>
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
            <MaterialIcon
              className="sb-context-menu-item-icon"
              aria-hidden="true"
            >
              stacks
            </MaterialIcon>
            <span>{t("save-chapter", { defaultValue: "Save chapter" })}</span>
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
 * Opens the save category picker modal for the given location. Exported so the
 * verse toolbar (in BibleReaderToolbar) and the reader's quick-actions save
 * button (in BibleReader) can open it with the same UX as the sidebar.
 *
 * Pass `mode: "edit"` with `saveId` to change which folders an existing save
 * belongs to (any number of categories).
 */
export function openSaveCategoryModal(
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
  const { app, saves, tabs: tabsManager, bibleData } = state;
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
    // Everything below changes some piece of state that mirrors to the URL:
    // the reading position of the tab the save opens, and — on mobile —
    // the dismissal of the sidebar it was tapped in. Batched, they cost one
    // history entry for the save; unbatched, the position write lands on
    // the entry that opened the sidebar and the dismissal adds a second entry
    // for the same destination, which leaves the back button looking dead.
    state.navigation.batchWrites(() => {
      closeContextMenus();
      closeLayoutMenu();
      const scrollVerse = Array.isArray(verse) ? verse[0] : verse;
      const existing = tabsManager.tabs.value.find(
        (tab) =>
          tab.readingState.translationId.value === translationId &&
          tab.readingState.bookId.value === bookId &&
          tab.readingState.chapterNumber.value === chapterNumber
      );
      if (existing) {
        app.selectTab(existing.id);
        if (scrollVerse !== undefined) {
          void existing.readingState.selectTranslationAndChapter(
            translationId,
            bookId,
            chapterNumber,
            { scrollToVerse: scrollVerse }
          );
        }
        return;
      }
      // Pass the save's location as the new tab's initial reading state so
      // `loadInitialData()` lands directly on it. Calling `addTab()` and then
      // `selectTranslationAndChapter()` would race the default GEN 1 load and
      // sometimes lose, leaving the user on Genesis 1 instead of the save.
      const newTab = tabsManager.addTab(undefined, {
        initialTranslationId: translationId,
        initialBookId: bookId,
        initialChapterNumber: chapterNumber,
      });
      if (scrollVerse !== undefined) {
        // Queue the scroll-to-verse against the freshly created tab so when
        // initial chapter data lands the reader scrolls to the saved verse.
        newTab.readingState.scrollToVerse.value = scrollVerse;
      }
      // `addTab()` only marks the tab selected inside TabsManager — it doesn't
      // place it in a layout slot or dismiss the sidebar. Without this the mobile
      // saves screen stays on top of the reader, and the save's location
      // is written over the history entry that opened the sidebar instead of
      // getting an entry of its own.
      app.selectTab(newTab.id);
    });
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
                  <MaterialIcon>stacks</MaterialIcon>
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
  const { app, tabs: tabsManager, saves } = state;
  // Slot-only tabs back an "open in new panel" clone and are intentionally
  // hidden from the tab strip.
  const tabs = tabsManager.tabs.value.filter((tab) => !tab.slotOnly);
  const selectedTabId = tabsManager.selectedTabId.value;
  const panelsEnabled = app.panelsEnabled.value;
  const isSavesFilterActive = saves.isFilterActive.value;
  const { t } = useI18n();

  if (effectivelyCollapsed) {
    return (
      <div className="sb-sidebar-collapsed-tab-list">
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedTabId;
          const shortTitle = tab.readingState.shortTitle.value;
          const session = tab.sharedSession;
          const sessionUsers = session?.connectedUsers.value ?? [];

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
              }${session ? " sb-collapsed-tab-tile-shared" : ""}`}
              aria-label={
                session && sessionUsers.length > 0
                  ? t("collapsed-tab-shared-label", {
                      title: shortTitle,
                      count: sessionUsers.length,
                      defaultValue:
                        "{{title}} — shared session, {{count}} present",
                    })
                  : shortTitle
              }
              title={shortTitle}
            >
              {session && (
                <span className="sb-collapsed-tab-tag">
                  {t("shared", { defaultValue: "Shared" })}
                </span>
              )}
              <span className="sb-collapsed-tab-title">{shortTitle}</span>
              {session &&
                sessionUsers.length > 0 &&
                (() => {
                  const options = session.options.value;
                  const sorted = [...sessionUsers].sort(
                    (a, b) =>
                      sessionRoleRank(getUserSessionRole(options, a)) -
                      sessionRoleRank(getUserSessionRole(options, b))
                  );
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
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M11.5 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V5C4 4.46957 4.21071 3.96086 4.58579 3.58579C4.96086 3.21071 5.46957 3 6 3H18C18.5304 3 19.0391 3.21071 19.4142 3.58579C19.7893 3.96086 20 4.46957 20 5V13"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M9 18H11"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M15 19L17 21L21 17"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
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
                <MaterialIcon
                  aria-hidden="true"
                  style={{
                    fontVariationSettings: isSavesFilterActive
                      ? '"FILL" 1'
                      : '"FILL" 0',
                  }}
                >
                  stacks
                </MaterialIcon>
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
              <MaterialIcon
                aria-hidden="true"
                style={{
                  fontVariationSettings: isSavesFilterActive
                    ? '"FILL" 1'
                    : '"FILL" 0',
                }}
              >
                stacks
              </MaterialIcon>
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
        const hostName =
          entry.hostProfile?.name ?? `User ${entry.hostUserId.slice(0, 8)}`;
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
 * avatar. Opens account settings when clicked (matches the bottom-of-sidebar
 * avatar slot in develop).
 */
function SelfAvatarButton(props: { state: SeedBibleState }) {
  const { state } = props;
  const { sidebar } = state;
  const { t } = useI18n();
  const displayName = getSelfDisplayName(state, t);

  return (
    <button
      className="sb-sidebar-self-avatar"
      onClick={() => {
        sidebar.openSettingsToView("account");
      }}
      aria-label={`Open account settings (${displayName})`}
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
  //
  // Neither is wanted while the Customization Center is open: previewing a
  // customization means clicking around and selecting verses in the reader
  // with the editor still open, so the scrim itself is skipped there rather
  // than just no-op'ing its onClick — a still-present scrim would keep
  // blocking those clicks from ever reaching the reader.
  const isOverlay =
    app.isCompactDesktop.value &&
    !effectivelyCollapsed &&
    !sidebar.isCustomizationViewOpen.value;

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
            aria-label={t("open-settings", { defaultValue: "Open settings" })}
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
