import "./Tabs.css";
import { useSignal } from "@preact/signals";
import {
  DEFAULT_BOOKMARK_CATEGORY,
  type BookmarkVerse,
} from "../../managers/BookmarksManager";
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
import {
  isSessionHost,
  type BibleReadingSession,
  getConnectedUserVisualKey,
  getUserAnimalVisual,
} from "../../managers/SessionsManager";
import { safeLocalStorage } from "../../app/ssrEnv";
import { useI18n } from "../../i18n/I18nManager";
import { SidebarSearch } from "../../components/SidebarSearch/SidebarSearch";
import {
  handleGridKeyNav,
  handleHorizontalListKeyNav,
} from "../../app/keyboardNav";
import type { TodayScreenAPI } from "@packages/today-screen/infrastructure/di/bootstrap";
import {
  SessionUserAvatar,
  getUserDisplayName,
  getUserSessionRole,
  sessionRoleRank,
} from "../Avatar/Avatar";
import { useEffect, useRef } from "preact/hooks";
import { getExtensionExports } from "../../managers";

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
  createSharedSession: () => void;
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

  const idCopied = useSignal(false);
  const copySessionId = () => {
    try {
      navigator.clipboard.writeText(session.id);
      idCopied.value = true;
      setTimeout(() => {
        idCopied.value = false;
      }, 1200);
    } catch (error) {
      console.error("Failed to copy session ID.", error);
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

  const coHostUserIds = options.coHostUserIds ?? [];
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

  // Everyone connected except the immutable host, so the host can promote or
  // demote co-hosts inline.
  const participants = session.connectedUsers.value.filter(
    (user) =>
      options.hostUserId !== user.userId &&
      options.hostUserId !== user.connectionId
  );

  return (
    <div className="sb-session-settings">
      <div className="sb-session-settings-id">
        <span className="sb-session-settings-label">
          {t("session-id", { defaultValue: "Session ID" })}
        </span>
        <div className="sb-session-settings-id-row">
          <span className="sb-session-settings-id-value" title={session.id}>
            {session.id}
          </span>
          <button
            type="button"
            className="sb-session-settings-copy-id"
            onClick={copySessionId}
            aria-label={t("copy", { defaultValue: "Copy" })}
            title={
              idCopied.value
                ? t("copied", { defaultValue: "Copied" })
                : t("copy", { defaultValue: "Copy" })
            }
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {idCopied.value ? "check" : "content_copy"}
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
                defaultValue: "Everyone in the session can change the passage.",
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
              const isCoHost = coHostUserIds.includes(coHostKey);
              const visual = getUserAnimalVisual(coHostKey);
              const imageUrl = user.profile?.pictureUrl ?? null;
              return (
                <li key={user.connectionId} className="sb-session-participant">
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
                    {isCoHost && (
                      <span className="sb-session-participant-badge">
                        {t("co-host", { defaultValue: "Co-host" })}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    className={`sb-session-participant-action${isCoHost ? " sb-session-participant-action-active" : ""}`}
                    onClick={() => setCoHost(coHostKey, !isCoHost)}
                  >
                    {isCoHost
                      ? t("remove-co-host", { defaultValue: "Remove co-host" })
                      : t("make-co-host", { defaultValue: "Make co-host" })}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
    createSharedSession,
  } = props;
  const { sidebar, settings } = state;
  const isAwake = settings.settings.value.keepScreenAwake;
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
                createSharedSession();
              }}
            >
              <MaterialIcon
                className="sb-context-menu-item-icon"
                aria-hidden="true"
              >
                fiber_smart_record
              </MaterialIcon>
              <span>
                {t("new-shared-session", {
                  defaultValue: "New shared session",
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
  const isAccountView = sidebar.requestedSettingsView.value === "account";

  return (
    <div className="sb-sidebar-settings-view">
      <div className="sb-sidebar-tabs-header">
        <h3 className="sb-sidebar-tabs-title">{t("settings")}</h3>
        <button
          onClick={sidebar.closeSettings}
          className={`sb-sidebar-settings-close-button${
            isAccountView ? " sb-sidebar-settings-close-button-account" : ""
          }`}
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
 * Compact bookmark icon used by category headers and bookmark rows. Sized to
 * match the per-row text height so categories sit comfortably inside the tab
 * list without their own taller hit-targets.
 */
function BookmarkIconGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18 7V21L12 17L6 21V7C6 5.93913 6.42143 4.92172 7.17157 4.17157C7.92172 3.42143 8.93913 3 10 3H14C15.0609 3 16.0783 3.42143 16.8284 4.17157C17.5786 4.92172 18 5.93913 18 7Z"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
    </svg>
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
 * One row in the sidebar's tab list — also reused by the bookmarks section
 * so a bookmarked tab keeps its selection state, kebab menu, and shared-
 * session visuals when it's moved up into a folder. The per-row bookmark
 * icon only appears on the currently selected row: it's the affordance for
 * adding the current chapter to (or removing it from) "My Bookmarks", and
 * showing it on every row would clutter the list.
 */
function TabRow(props: TabRowProps) {
  const { state, tab, isSelected, closeLayoutMenu, panelsEnabled } = props;

  if (import.meta.env.SSR && tab.readingState.loading.value) {
    throw tab.readingState.chapterDataPromise;
  }

  const { app, bookmarks } = state;
  const { t } = useI18n();

  const currentBookId = tab.readingState.bookId.value;
  const currentBookName =
    tab.readingState.translationBooks.value?.books.find(
      (book) => book.id === currentBookId
    )?.name ??
    currentBookId ??
    "-";
  const currentChapter = tab.readingState.chapterNumber.value;
  const currentTranslation =
    tab.readingState.translationId.value ??
    tab.readingState.defaultTranslation.id;
  const title = currentBookName;
  const connectedUsers = tab.sharedSession?.connectedUsers.value ?? [];
  const isTabBookmarked = bookmarks.isLocationBookmarked(
    tab.readingState.translationId.value,
    tab.readingState.bookId.value,
    tab.readingState.chapterNumber.value
  );

  const handleBookmarkAction = () => {
    const translationId = tab.readingState.translationId.value;
    const bookId = tab.readingState.bookId.value;
    const chapterNumber = tab.readingState.chapterNumber.value;
    if (!translationId || !bookId || !chapterNumber) return;
    if (isTabBookmarked) {
      void bookmarks.removeBookmarkForLocation(
        translationId,
        bookId,
        chapterNumber
      );
      return;
    }
    openBookmarkCategoryModal(state, {
      translationId,
      bookId,
      chapterNumber,
    });
  };

  return (
    <div
      className={`sb-tab-row${isSelected ? " sb-tab-row-selected" : ""}`}
      dir={tab.readingState.translation.value?.textDirection ?? "auto"}
    >
      <button
        onClick={() => {
          closeContextMenus();
          closeLayoutMenu();
          app.selectTab(tab.id);
        }}
        className={`sb-tab-button`}
      >
        <div className="sb-tab-main-content">
          <span className="sb-tab-main-title">
            {`${title} - ${currentChapter}`}
          </span>
          <span className="sb-tab-main-sep" aria-hidden="true">
            •
          </span>
          <span className="sb-tab-main-translation">{currentTranslation}</span>
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
          className={`sb-tab-bookmark-button${
            isTabBookmarked ? " sb-tab-bookmark-button-active" : ""
          }`}
          aria-label={
            isTabBookmarked
              ? t("remove-bookmark", { defaultValue: "Remove bookmark" })
              : t("add-bookmark", { defaultValue: "Bookmark tab" })
          }
          title={
            isTabBookmarked
              ? t("remove-bookmark", { defaultValue: "Remove bookmark" })
              : t("add-bookmark", { defaultValue: "Bookmark tab" })
          }
          aria-pressed={isTabBookmarked}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            closeContextMenus();
            closeLayoutMenu();
            handleBookmarkAction();
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={isTabBookmarked ? "currentColor" : "none"}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M18 7V21L12 17L6 21V7C6 5.93913 6.42143 4.92172 7.17157 4.17157C7.92172 3.42143 8.93913 3 10 3H14C15.0609 3 16.0783 3.42143 16.8284 4.17157C17.5786 4.92172 18 5.93913 18 7Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
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
                if (tab.sharedSession) {
                  const url = getSessionUrl(tab.sharedSession);

                  navigator.share({
                    title: document.title,
                    url: url.href,
                  });
                }
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
              handleBookmarkAction();
            }}
          >
            <MaterialIcon
              className="sb-context-menu-item-icon"
              aria-hidden="true"
            >
              {isTabBookmarked ? "bookmark_remove" : "bookmark_add"}
            </MaterialIcon>
            <span>
              {isTabBookmarked
                ? t("remove-bookmark", { defaultValue: "Remove bookmark" })
                : t("add-bookmark", { defaultValue: "Bookmark tab" })}
            </span>
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
 * Location targeted by the "Add to bookmark category" modal. Either a whole
 * chapter (no `verse`) or a verse / verse range pinned within a chapter.
 */
export interface BookmarkLocation {
  translationId: string;
  bookId: string;
  chapterNumber: number;
  verse?: BookmarkVerse;
}

function getSessionUrl(session: BibleReadingSession) {
  const url = new URL(window.location.href);
  const pattern = url.searchParams.get("pattern");
  url.search = "";
  url.searchParams.set("sessionId", session.id);
  if (pattern) {
    url.searchParams.set("pattern", pattern);
  }
  return url;
}

/**
 * Modal body shown when the user triggers "Bookmark" from a tab menu, the
 * sidebar tab row, or the verse toolbar. Lets the user pick which folder the
 * new bookmark lands in. Folder creation only happens here — there is no
 * inline "+ New folder" button in the sidebar list anymore.
 */
function BookmarkCategoryPickerContent(props: {
  state: SeedBibleState;
  location: BookmarkLocation;
  onClose: () => void;
}) {
  const { state, location, onClose } = props;
  const { bookmarks } = state;
  const { t } = useI18n();
  const categories = bookmarks.categories.value;

  const selectedCategory = useSignal<string>(DEFAULT_BOOKMARK_CATEGORY);
  const isAddingNew = useSignal<boolean>(false);
  const newCategoryName = useSignal<string>("");

  const trimmedNew = newCategoryName.value.trim();
  const newCategoryCollides =
    trimmedNew.length > 0 &&
    categories.some((category) => category.name === trimmedNew);
  const canSave = isAddingNew.value
    ? trimmedNew.length > 0 && !newCategoryCollides
    : selectedCategory.value.length > 0;

  const handleSave = async () => {
    let category = selectedCategory.value;
    if (isAddingNew.value) {
      if (!trimmedNew || newCategoryCollides) return;
      await bookmarks.createCategory(trimmedNew);
      category = trimmedNew;
    }
    await bookmarks.addBookmark(
      location.translationId,
      location.bookId,
      location.chapterNumber,
      {
        category,
        ...(location.verse !== undefined ? { verse: location.verse } : {}),
      }
    );
    onClose();
  };

  return (
    <div className="sb-bookmark-picker">
      <div className="sb-bookmark-picker-categories" role="radiogroup">
        {categories.map((category) => {
          const isSelected =
            !isAddingNew.value && selectedCategory.value === category.name;
          return (
            <button
              key={category.name}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`sb-bookmark-picker-category${
                isSelected ? " sb-bookmark-picker-category-selected" : ""
              }`}
              onClick={() => {
                isAddingNew.value = false;
                selectedCategory.value = category.name;
              }}
            >
              <span className="sb-bookmark-picker-category-name">
                {category.name}
              </span>
              <span
                className={`sb-bookmark-picker-radio${
                  isSelected ? " sb-bookmark-picker-radio-checked" : ""
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>

      <div className="sb-bookmark-picker-divider" role="separator" />

      {isAddingNew.value ? (
        <div className="sb-bookmark-picker-new-row">
          <input
            autoFocus
            className="sb-bookmark-picker-new-input"
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
                void handleSave();
              } else if (event.key === "Escape") {
                event.preventDefault();
                isAddingNew.value = false;
                newCategoryName.value = "";
              }
            }}
          />
          {newCategoryCollides && (
            <div className="sb-bookmark-picker-new-error">
              {t("folder-name-taken", {
                defaultValue: "A folder with that name already exists.",
              })}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="sb-bookmark-picker-add-new"
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

      <div className="sb-bookmark-picker-actions">
        <button
          type="button"
          className="sb-bookmark-picker-cancel"
          onClick={onClose}
        >
          {t("cancel", { defaultValue: "Cancel" })}
        </button>
        <button
          type="button"
          className="sb-bookmark-picker-save"
          disabled={!canSave}
          onClick={() => {
            void handleSave();
          }}
        >
          {t("save", { defaultValue: "Save" })}
        </button>
      </div>
    </div>
  );
}

/**
 * Opens the bookmark category picker modal for the given location. Exported
 * so the verse toolbar (in BibleReaderToolbar) can open it for verse-scoped
 * bookmarks with the same UX as the sidebar tab-row bookmark button.
 */
export function openBookmarkCategoryModal(
  state: SeedBibleState,
  location: BookmarkLocation
) {
  const verseKey =
    location.verse === undefined
      ? "chapter"
      : Array.isArray(location.verse)
        ? `${location.verse[0]}-${location.verse[1]}`
        : String(location.verse);
  const modalId = `bookmark-category-${location.translationId}-${location.bookId}-${location.chapterNumber}-${verseKey}`;
  state.modals.openModal({
    id: modalId,
    title: {
      key: "add-to-bookmark-category",
      defaultValue: "Add to bookmark category",
    },
    content: () => (
      <BookmarkCategoryPickerContent
        state={state}
        location={location}
        onClose={() => state.modals.closeModal(modalId)}
      />
    ),
  });
}

interface BookmarksSectionProps {
  state: SeedBibleState;
  closeLayoutMenu: () => void;
}

/**
 * The pinned "bookmarks" view shown above the regular tab list when the
 * bookmark toggle in the sidebar header is on. Renders each category as a
 * collapsible folder containing the user's saved Bible locations. Below it,
 * the normal tab list still renders unchanged — bookmarks and tabs coexist.
 *
 * Bookmarks are pure links. Clicking one selects the open tab pointing at
 * the same location (and scrolls to the saved verse, if any); if no tab is
 * open at that location, a fresh tab is created and navigated there. The
 * bookmark itself is never rendered as a tab — that keeps the bookmarks
 * section a clean list of references rather than a duplicated tab list.
 */
function BookmarksSection(props: BookmarksSectionProps) {
  const { state, closeLayoutMenu } = props;
  const { app, bookmarks, tabs: tabsManager, bibleData } = state;
  const { t } = useI18n();

  const categories = bookmarks.categories.value;
  const allBookmarks = bookmarks.bookmarks.value;
  const expanded = bookmarks.expandedCategories.value;
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

  const openBookmark = (
    translationId: string,
    bookId: string,
    chapterNumber: number,
    verse?: number | [number, number]
  ) => {
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
    // Pass the bookmark location as the new tab's initial reading state so
    // `loadInitialData()` lands directly on it. Calling `addTab()` and then
    // `selectTranslationAndChapter()` would race the default GEN 1 load and
    // sometimes lose, leaving the user on Genesis 1 instead of the bookmark.
    const newTab = tabsManager.addTab(undefined, {
      initialTranslationId: translationId,
      initialBookId: bookId,
      initialChapterNumber: chapterNumber,
    });
    if (scrollVerse !== undefined) {
      // Queue the scroll-to-verse against the freshly created tab so when
      // initial chapter data lands the reader scrolls to the bookmarked verse.
      newTab.readingState.scrollToVerse.value = scrollVerse;
    }
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
    void bookmarks.renameCategory(oldName, next);
  };

  return (
    <div className="sb-bookmarks-section">
      {categories.map((category) => {
        const items = allBookmarks.filter((b) => b.category === category.name);
        const isExpanded = expanded.has(category.name);
        const isRenaming = renamingCategory.value === category.name;

        return (
          <div key={category.name} className="sb-bookmark-category">
            <div
              className={`sb-bookmark-category-header${
                isExpanded ? " sb-bookmark-category-header-expanded" : ""
              }`}
            >
              <button
                type="button"
                className="sb-bookmark-category-toggle"
                onClick={() => {
                  if (isRenaming) return;
                  bookmarks.toggleCategoryExpanded(category.name);
                }}
                aria-expanded={isExpanded}
                aria-label={category.name}
              >
                <span className="sb-bookmark-category-icon" aria-hidden="true">
                  <BookmarkIconGlyph />
                </span>
                {isRenaming ? (
                  <input
                    className="sb-bookmark-category-rename-input"
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
                  <span className="sb-bookmark-category-name">
                    {category.name}
                  </span>
                )}
                <span
                  className={`sb-bookmark-category-chevron${
                    isExpanded ? " sb-bookmark-category-chevron-open" : ""
                  }`}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined">expand_more</span>
                </span>
              </button>

              <ContextMenuWithButton
                anchorClassName="sb-bookmark-category-menu-anchor"
                buttonClassName="sb-bookmark-category-menu-button"
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
                {category.name !== DEFAULT_BOOKMARK_CATEGORY && (
                  <ContextMenuItem
                    className="sb-tab-menu-item"
                    onClick={() => {
                      void bookmarks.deleteCategory(category.name);
                    }}
                  >
                    {t("delete", { defaultValue: "Delete" })}
                  </ContextMenuItem>
                )}
              </ContextMenuWithButton>
            </div>

            {isExpanded && (
              <div className="sb-bookmark-category-items">
                {items.length === 0 ? (
                  <div className="sb-bookmark-category-empty">
                    {t("bookmark-folder-empty", {
                      defaultValue: "No bookmarks here yet.",
                    })}
                  </div>
                ) : (
                  items.map((bookmark) => {
                    // Bookmarks are pure links — they always render as a
                    // compact entry, never as the tab itself. Clicking one
                    // selects an open tab on the same chapter (and scrolls to
                    // the saved verse if any), or creates a new tab at the
                    // saved location when none is open.
                    ensureTranslationBooks(bookmark.translationId);
                    const bookName =
                      lookupBookName(bookmark.translationId, bookmark.bookId) ??
                      bookmark.bookId;
                    const verseSuffix = formatVerseRef(bookmark.verse);
                    return (
                      <div
                        key={bookmark.id}
                        className={`sb-bookmark-item${
                          bookmark.verse !== undefined
                            ? " sb-bookmark-item-verse"
                            : ""
                        }`}
                        dir="auto"
                      >
                        <button
                          type="button"
                          className="sb-bookmark-item-button"
                          onClick={() => {
                            openBookmark(
                              bookmark.translationId,
                              bookmark.bookId,
                              bookmark.chapterNumber,
                              bookmark.verse
                            );
                          }}
                        >
                          <span className="sb-tab-main-title">
                            {`${bookName} ${bookmark.chapterNumber}${verseSuffix}`}
                          </span>
                          <span className="sb-tab-main-sep" aria-hidden="true">
                            •
                          </span>
                          <span className="sb-tab-main-translation">
                            {bookmark.translationId}
                          </span>
                        </button>
                        <ContextMenuWithButton
                          anchorClassName="sb-tab-menu-anchor"
                          buttonClassName="sb-tab-menu-button"
                          menuClassName="sb-tab-menu"
                          iconClassName="sb-tab-more-icon"
                          aria-label={t("bookmark-options", {
                            defaultValue: "Bookmark options",
                          })}
                          title={t("bookmark-options", {
                            defaultValue: "Bookmark options",
                          })}
                        >
                          <ContextMenuItem
                            className="sb-tab-menu-item"
                            onClick={() => {
                              void bookmarks.removeBookmark(bookmark.id);
                            }}
                          >
                            {t("remove-bookmark", {
                              defaultValue: "Remove bookmark",
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
  const { app, tabs: tabsManager, bookmarks } = state;
  // Slot-only tabs back an "open in new panel" clone and are intentionally
  // hidden from the tab strip.
  const tabs = tabsManager.tabs.value.filter((tab) => !tab.slotOnly);
  const selectedTabId = tabsManager.selectedTabId.value;
  const panelsEnabled = app.panelsEnabled.value;
  const isBookmarkFilterActive = bookmarks.isFilterActive.value;
  const { t } = useI18n();

  if (effectivelyCollapsed) {
    return (
      <div className="sb-sidebar-collapsed-tab-list">
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedTabId;
          const bookId = tab.readingState.bookId.value ?? "-";
          const bookName =
            tab.readingState.chapterData.value?.book.name ?? bookId;
          const chapter = tab.readingState.chapterNumber.value;

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
                  ? t("collapsed-tab-shared_x", {
                      book: bookName,
                      chapter,
                      count: sessionUsers.length,
                      defaultValue:
                        "{{book}} {{chapter}} — shared session, {{count}} present",
                    })
                  : `${bookName} ${chapter}`
              }
              title={`${bookName} ${chapter}`}
            >
              {session && (
                <span className="sb-collapsed-tab-tag">
                  {t("shared", { defaultValue: "Shared" })}
                </span>
              )}
              <span className="sb-collapsed-tab-book">{bookId}</span>
              <span className="sb-collapsed-tab-chapter">{chapter}</span>
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

  // On mobile, the Bookmarks bottom-tab opens this drawer with the bookmark
  // filter active. Rather than show the tabs list + search, present a focused
  // full-screen Bookmarks view: a dedicated header (close / title / new
  // folder) over the existing collapsible BookmarksSection.
  if (app.isMobile.value && isBookmarkFilterActive) {
    const createNewCategory = () => {
      const base = t("new-bookmark-folder", { defaultValue: "New folder" });
      const existing = new Set(bookmarks.categories.value.map((c) => c.name));
      let name = base;
      let n = 2;
      while (existing.has(name)) {
        name = `${base} ${n++}`;
      }
      void bookmarks.createCategory(name);
    };

    return (
      <div className="sb-bookmarks-mobile-screen">
        <div className="sb-bookmarks-mobile-header">
          <button
            type="button"
            className="sb-bookmarks-mobile-header-button sb-bookmarks-mobile-header-close"
            onClick={() => {
              // Opened from the bottom toolbar → Close (X) dismisses the whole
              // drawer. Opened from the Tabs header → Back arrow turns the
              // filter off, returning to the Tabs list it came from.
              if (bookmarks.openedFromToolbar.value) {
                // Reset the view (filter + source flag) so the next time the
                // tabs drawer opens it starts on the Tabs list, not a stale
                // bookmarks screen.
                bookmarks.closeView();
                state.sidebar.closeSidebar();
              } else if (bookmarks.isFilterActive.value) {
                bookmarks.toggleFilter();
              }
            }}
            aria-label={
              bookmarks.openedFromToolbar.value
                ? t("close", { defaultValue: "Close" })
                : t("back", { defaultValue: "Back" })
            }
            title={
              bookmarks.openedFromToolbar.value
                ? t("close", { defaultValue: "Close" })
                : t("back", { defaultValue: "Back" })
            }
          >
            <span className="material-symbols-outlined">
              {bookmarks.openedFromToolbar.value ? "close" : "arrow_back"}
            </span>
          </button>
          <h2 className="sb-bookmarks-mobile-title">
            {t("bookmarks", { defaultValue: "Bookmarks" })}
          </h2>
          <button
            type="button"
            className="sb-bookmarks-mobile-header-button sb-bookmarks-mobile-header-add"
            onClick={createNewCategory}
            aria-label={t("new-bookmark-folder", {
              defaultValue: "New folder",
            })}
            title={t("new-bookmark-folder", { defaultValue: "New folder" })}
          >
            <span className="material-symbols-outlined">create_new_folder</span>
          </button>
        </div>
        <div className="sb-bookmarks-mobile-body">
          <BookmarksSection state={state} closeLayoutMenu={closeLayoutMenu} />
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
                  const today =
                    getExtensionExports<TodayScreenAPI>("today-screen");
                  if (today) {
                    today.open();
                  } else {
                    app.toast(
                      t("today-coming-soon", {
                        defaultValue: "Today screen is coming soon",
                      })
                    );
                  }
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
                className={`sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-bookmarks-button${
                  isBookmarkFilterActive
                    ? " sb-sidebar-tabs-header-bookmarks-button-active"
                    : ""
                }`}
                aria-label={t("bookmarks", { defaultValue: "Bookmarks" })}
                aria-pressed={isBookmarkFilterActive}
                title={
                  isBookmarkFilterActive
                    ? t("hide-bookmarks", { defaultValue: "Hide bookmarks" })
                    : t("show-bookmarks", { defaultValue: "Show bookmarks" })
                }
                onClick={() => {
                  bookmarks.toggleFilter();
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill={isBookmarkFilterActive ? "currentColor" : "none"}
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M18 7V21L12 17L6 21V7C6 5.93913 6.42143 4.92172 7.17157 4.17157C7.92172 3.42143 8.93913 3 10 3H14C15.0609 3 16.0783 3.42143 16.8284 4.17157C17.5786 4.92172 18 5.93913 18 7Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
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
              className={`sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-bookmarks-button${
                isBookmarkFilterActive
                  ? " sb-sidebar-tabs-header-bookmarks-button-active"
                  : ""
              }`}
              aria-label={t("bookmarks", { defaultValue: "Bookmarks" })}
              aria-pressed={isBookmarkFilterActive}
              title={
                isBookmarkFilterActive
                  ? t("hide-bookmarks", { defaultValue: "Hide bookmarks" })
                  : t("show-bookmarks", { defaultValue: "Show bookmarks" })
              }
              onClick={() => {
                // Opened from the Tabs header: backing out of the bookmarks
                // view should return here, so it gets a Back arrow (not an X).
                bookmarks.openedFromToolbar.value = false;
                bookmarks.toggleFilter();
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={isBookmarkFilterActive ? "currentColor" : "none"}
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M18 7V21L12 17L6 21V7C6 5.93913 6.42143 4.92172 7.17157 4.17157C7.92172 3.42143 8.93913 3 10 3H14C15.0609 3 16.0783 3.42143 16.8284 4.17157C17.5786 4.92172 18 5.93913 18 7Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              className="sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-new-session-button"
              aria-label={t("new-shared-session", {
                defaultValue: "New shared session",
              })}
              title={t("new-shared-session", {
                defaultValue: "New shared session",
              })}
              onClick={() => {
                void state.app.createSharedSession();
              }}
            >
              <MaterialIcon aria-hidden="true">fiber_smart_record</MaterialIcon>
            </button>
          </>
        )}
      </div>

      <SidebarSearch state={state} closeLayoutMenu={closeLayoutMenu} />

      <div className="sb-sidebar-tab-list">
        {isBookmarkFilterActive && (
          <>
            <BookmarksSection state={state} closeLayoutMenu={closeLayoutMenu} />
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
 * Just the avatar visual — the image (when the user has a profile picture)
 * or the deterministic animal icon + color (otherwise). Reused by the
 * sidebar bottom-right avatar button and by the mobile bottom-bar "You"
 * tab so the two surfaces always show the same identity.
 */
export function SelfAvatarVisual(props: { state: SeedBibleState }) {
  const { state } = props;
  const { login } = state;
  const profile = login.profile.value;
  // Share identity with connected-user rendering so the avatar shows the
  // same icon/color as the user's row inside a shared session.
  const visualKey = getConnectedUserVisualKey({
    userId: state.login.userId.value,
    connectionId: state.os.connectionId,
  });
  const visual = getUserAnimalVisual(visualKey);
  const imageUrl = profile?.pictureUrl ?? null;

  if (imageUrl) {
    return (
      <span
        className="sb-tab-user-icon sb-tab-user-icon-has-image"
        style={{
          borderColor: visual.color,
          backgroundImage: `url(${imageUrl})`,
        }}
      />
    );
  }

  return (
    <span
      className="sb-tab-user-icon sb-tab-user-icon-animal"
      style={{
        borderColor: visual.color,
        backgroundColor: visual.color,
      }}
    >
      <span className="material-symbols-outlined">{visual.defaultIcon}</span>
    </span>
  );
}

/** Display name for the current user — used as the avatar tooltip / aria-label. */
export function getSelfDisplayName(state: SeedBibleState): string {
  const userId = state.login.userId.value;
  const profile = state.login.profile.value;
  return profile?.name ?? (userId ? userId.slice(0, 8) : "Guest");
}

/**
 * Button at the bottom-right of the sidebar showing the current user's own
 * animal icon + color. Opens account settings when clicked (matches the
 * bottom-of-sidebar avatar slot in develop).
 */
function SelfAvatarButton(props: { state: SeedBibleState }) {
  const { state } = props;
  const { sidebar } = state;
  const displayName = getSelfDisplayName(state);

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
            createSharedSession={async () => {
              const session = await state.app.createSharedSession();
              const url = getSessionUrl(session);

              navigator.clipboard.writeText(url.href);
              state.app.toast(
                t("link-to-join-shared-session-copied", {
                  defaultValue:
                    "A link to join the shared session was copied to your clipboard",
                })
              );
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
