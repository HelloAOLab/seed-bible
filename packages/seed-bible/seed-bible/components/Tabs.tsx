import { useSignal } from "@preact/signals";
import {
  DEFAULT_BOOKMARK_CATEGORY,
  type BookmarkVerse,
} from "seed-bible.managers.BookmarksManager";
import { DEFAULT_TRANSLATION_ID } from "seed-bible.managers.BibleReadingManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";
import {
  PANE_LAYOUT_OPTIONS,
  type PaneLayoutId,
} from "seed-bible.managers.PanesManager";
import {
  closeContextMenus,
  ContextMenuItem,
  ContextMenuWithButton,
} from "seed-bible.components.ContextMenu";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { SettingsIcon } from "seed-bible.components.icons";
import { SettingsPage } from "seed-bible.components.SettingsPage";
import type { UserProfile } from "seed-bible.managers.LoginManager";
import type { ConnectedSessionUser } from "seed-bible.managers.SessionsManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { SidebarSearch } from "seed-bible.components.SidebarSearch";
import {
  handleGridKeyNav,
  handleHorizontalListKeyNav,
} from "seed-bible.components.KeyboardNav";

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
  paneLayout: PaneLayoutId | "single";
  isLayoutMenuOpen: boolean;
  toggleLayoutMenu: () => void;
  setLayout: (layout: PaneLayoutId) => void;
  createSharedSession: () => void;
  openJoinSessionModal: () => void;
}

/**
 * Deterministic animal-icon + color assignment for a user.
 *
 * One function, one rule: a given user key always maps to the same
 * `(icon, color)` pair — everywhere on every client. No list context, no
 * walk-forward. Used for:
 *   - The sidebar self-avatar (bottom-right)
 *   - The connected-users list inside a shared tab
 *   - The "Shared with you" toasts
 *
 * We lift the palette to 10 icons × 12 colors = 120 combos. Collision
 * probability for N users visible at the same time is `1 - Π(1 - i/120)`
 * for i ∈ [0..N-1] — ~4% for 3 users, ~8% for 5 users. In exchange we get
 * full cross-client and cross-surface consistency: the color you see on
 * the sidebar is the same color the tab shows is the same color every
 * other participant sees for you.
 */
const USER_ANIMAL_ICONS = [
  "forest", // tree
  "park", // log
  "eco", // leaf
  "pets", // cat/dog
  "cruelty_free", // bunny-style
  "local_cafe", // coffee
  "local_florist", // flower
  "grass", // grass
  "potted_plant", // plant
  "nature", // mountain/tree
] as const;

const USER_PRESENCE_COLORS = [
  "#34D399", // emerald
  "#60A5FA", // blue
  "#F472B6", // pink
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#F87171", // red
  "#10B981", // green
  "#F59E0B", // orange
  "#06B6D4", // cyan
  "#EC4899", // rose
  "#8B5CF6", // purple
  "#14B8A6", // teal
] as const;

function hashUserKey(key: string): number {
  let h = 5381;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) + h) ^ key.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Pure-hash user visual. Same input → same output, forever. The icon and
 * color are derived independently from the hash so small changes to the
 * key (e.g. user id suffix) distribute across the whole palette.
 */
function getUserAnimalVisual(key: string): { icon: string; color: string } {
  const normalized = key && key.length > 0 ? key : "anonymous";
  const hash = hashUserKey(normalized);
  const iconIndex = hash % USER_ANIMAL_ICONS.length;
  const colorIndex =
    Math.floor(hash / USER_ANIMAL_ICONS.length) % USER_PRESENCE_COLORS.length;
  return {
    icon: USER_ANIMAL_ICONS[iconIndex]!,
    color: USER_PRESENCE_COLORS[colorIndex]!,
  };
}

/**
 * Returns the current client's identity key. For a user visible inside a
 * session, use whatever the `ConnectedSessionUser` entry exposes (userId
 * if logged in, otherwise connectionId). For the sidebar self-avatar we
 * derive the SAME thing from `login.userId` with a fallback to
 * `configBot.id` — so the two call sites always agree on the key and
 * therefore on the visual.
 */
function getSelfVisualKey(state: SeedBibleState): string {
  const userId = state.login.userId.value;
  if (userId) return userId;
  try {
    if (typeof configBot !== "undefined" && configBot?.id) {
      return String(configBot.id);
    }
  } catch {
    /* ignore */
  }
  return "me";
}

/**
 * Given a `ConnectedSessionUser`, returns the SAME key that the sidebar
 * self-avatar would use for this same person on their own client. This
 * guarantees visual consistency between "how I see myself in the sidebar"
 * and "how others see me in the connected users row".
 */
function getConnectedUserVisualKey(user: {
  userId?: string | null;
  connectionId?: string | null;
}): string {
  return user.userId ?? user.connectionId ?? "anonymous";
}

interface SettingsProps {
  state: SeedBibleState;
}

function getUserDisplayName(user: ConnectedSessionUser): string {
  return (
    user.profile?.name ??
    `User ${(user.userId ?? user.connectionId).slice(0, 8)}`
  );
}

function getUserImageUrl(profile: UserProfile | null): string | null {
  return profile?.pictureUrl ?? null;
}

function renderLayoutPreview(layoutId: PaneLayoutId) {
  const slotCount =
    PANE_LAYOUT_OPTIONS.find((layout) => layout.id === layoutId)?.slotCount ??
    1;

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
function SessionSettingsModalContent(props: {
  state: SeedBibleState;
  session: import("../managers/SessionsManager").BibleReadingSession;
  onEndSession: () => void;
  onClose: () => void;
}) {
  const { state, session, onEndSession, onClose } = props;
  const options = session.options.value;
  const hostId = options.hostUserId;
  const currentIdentity = getSelfVisualKey(state);
  const isHost =
    hostId !== null &&
    (state.login.userId.value === hostId || currentIdentity === hostId);

  const onlyHostNavigate =
    Array.isArray(options.allowedNavigators) &&
    options.allowedNavigators.length > 0;
  const onlyHostHighlight =
    Array.isArray(options.allowedDecorators) &&
    options.allowedDecorators.length > 0;

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

  const { t } = useI18n();

  return (
    <div className="sb-session-settings">
      {!isHost && (
        <p className="sb-session-settings-note">
          {t("session-settings-host-only_note", {
            defaultValue: "Only the session host can change these settings.",
          })}
        </p>
      )}

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

      <div className="sb-session-settings-row">
        <span className="sb-session-settings-label">
          {t("session-id_x", {
            sessionId: session.id,
            defaultValue: "Session ID: {{sessionId}}",
          })}
        </span>
      </div>

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
            const selected = options.highlightDurationSeconds === option.value;
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

      <div className="sb-session-settings-actions">
        <button
          type="button"
          className="sb-session-settings-cancel"
          onClick={onClose}
        >
          {t("close", { defaultValue: "Close" })}
        </button>
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
      </div>
    </div>
  );
}

export function TabsHeader(props: TabsHeaderProps) {
  const {
    state,
    effectivelyCollapsed,
    panelsEnabled,
    paneLayout,
    isLayoutMenuOpen,
    toggleLayoutMenu,
    setLayout,
    createSharedSession,
    openJoinSessionModal,
  } = props;
  const { sidebar } = state;
  const { t } = useI18n();

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
          <div className="sb-pane-layout-anchor">
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
                  {PANE_LAYOUT_OPTIONS.map((layout) => (
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
            aria-label={t("session-options", {
              defaultValue: "Session options",
            })}
            title={t("session-options", { defaultValue: "Session options" })}
          >
            <ContextMenuItem
              onClick={() => {
                createSharedSession();
              }}
            >
              {t("new-shared-session", { defaultValue: "New shared session" })}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                openJoinSessionModal();
              }}
            >
              {t("join-shared-session", {
                defaultValue: "Join shared session",
              })}
            </ContextMenuItem>
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
  const { app, bookmarks } = state;
  const { t } = useI18n();
  const bookmarksEnabled = bookmarks.enabled.value;

  const currentBookId = tab.readingState.bookId.value;
  const currentBookName =
    tab.readingState.translationBooks.value?.books.find(
      (book) => book.id === currentBookId
    )?.name ??
    currentBookId ??
    "-";
  const currentChapter = tab.readingState.chapterNumber.value;
  const currentTranslation =
    tab.readingState.translationId.value ?? DEFAULT_TRANSLATION_ID;
  const title = tab.sharedSession
    ? t("shared-tab_title", {
        book: currentBookName,
        defaultValue: "Shared",
      })
    : currentBookName;
  const connectedUsers = tab.sharedSession?.connectedUsers.value ?? [];
  const isTabBookmarked = bookmarksEnabled
    ? bookmarks.isLocationBookmarked(
        tab.readingState.translationId.value,
        tab.readingState.bookId.value,
        tab.readingState.chapterNumber.value
      )
    : false;

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
              {connectedUsers.map((user) => {
                const effectiveProfile = user.isSelf
                  ? state.login.profile.value
                  : user.profile;
                const imageUrl = getUserImageUrl(effectiveProfile);
                const displayName = user.isSelf
                  ? getSelfDisplayName(state)
                  : getUserDisplayName(user);
                const visualKey = user.isSelf
                  ? getSelfVisualKey(state)
                  : getConnectedUserVisualKey(user);
                const visual = getUserAnimalVisual(visualKey);

                if (imageUrl) {
                  return (
                    <span
                      key={user.connectionId}
                      className={`sb-tab-user-icon sb-tab-user-icon-has-image${user.isSelf ? " sb-tab-user-icon-self" : ""}`}
                      title={displayName}
                      style={{
                        borderColor: visual.color,
                        backgroundImage: `url(${imageUrl})`,
                      }}
                    />
                  );
                }

                return (
                  <span
                    key={user.connectionId}
                    className={`sb-tab-user-icon sb-tab-user-icon-animal${user.isSelf ? " sb-tab-user-icon-self" : ""}`}
                    title={displayName}
                    style={{
                      borderColor: visual.color,
                      backgroundColor: visual.color,
                    }}
                  >
                    <span className="material-symbols-outlined">
                      {visual.icon}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </button>

      {bookmarksEnabled && isSelected && !tab.sharedSession && (
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
            <ContextMenuItem
              className="sb-tab-menu-item"
              title={t("share-session", {
                defaultValue: `Share session`,
              })}
              onClick={() => {
                if (tab.sharedSession) {
                  const url = new URL(configBot.tags.url);
                  const pattern = url.searchParams.get("pattern");
                  url.search = "";
                  url.searchParams.set("sessionId", tab.sharedSession.id);
                  if (pattern) {
                    url.searchParams.set("pattern", pattern);
                  }

                  os.share({
                    title: configBot.tags.title,
                    url: url.href,
                  });
                }
              }}
            >
              {t("share-session", {
                defaultValue: `Share session`,
              })}
            </ContextMenuItem>
            {(() => {
              const hostId = tab.sharedSession.options.value.hostUserId;
              const selfIdentity = getSelfVisualKey(state);
              const isHost =
                hostId !== null &&
                (state.login.userId.value === hostId ||
                  selfIdentity === hostId);
              if (!isHost) return null;
              return (
                <ContextMenuItem
                  className="sb-tab-menu-item"
                  onClick={() => {
                    const session = tab.sharedSession;
                    if (!session) return;
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
                            state.tabs.removeTab(tab.id);
                          }}
                          onClose={() => {
                            state.modals.closeModal(modalId);
                          }}
                        />
                      ),
                    });
                  }}
                >
                  {t("session-settings", { defaultValue: "Session settings" })}
                </ContextMenuItem>
              );
            })()}
          </>
        )}
        {!tab.sharedSession && (
          <ContextMenuItem
            className="sb-tab-menu-item"
            onClick={() => {
              handleBookmarkAction();
            }}
          >
            {isTabBookmarked
              ? t("remove-bookmark", { defaultValue: "Remove bookmark" })
              : t("add-bookmark", { defaultValue: "Bookmark tab" })}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          className="sb-tab-menu-item"
          onClick={() => {
            state.tabs.removeTab(tab.id);
          }}
        >
          {t("close", { defaultValue: "Close" })}
        </ContextMenuItem>
        {panelsEnabled && (
          <>
            <ContextMenuItem
              onClick={() => {
                app.openInNewPane(tab.id);
              }}
              className="sb-tab-menu-item"
            >
              {t("open-in-new-panel", { defaultValue: "Open in new panel" })}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => {
                app.openInDetachedPane(tab.id);
              }}
              className="sb-tab-menu-item"
            >
              {t("open-in-detached-panel", {
                defaultValue: "Open in detached panel",
              })}
            </ContextMenuItem>
          </>
        )}
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

  if (!bookmarks.enabled.value) {
    return null;
  }

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
  const tabs = tabsManager.tabs.value;
  const selectedTabId = tabsManager.selectedTabId.value;
  const panelsEnabled = app.panelsEnabled.value;
  const bookmarksEnabled = bookmarks.enabled.value;
  const isBookmarkFilterActive =
    bookmarksEnabled && bookmarks.isFilterActive.value;
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
              aria-label={`${bookName} ${chapter}`}
              title={`${bookName} ${chapter}`}
            >
              <span className="sb-collapsed-tab-book">{bookId}</span>
              <span className="sb-collapsed-tab-chapter">{chapter}</span>
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

  return (
    <>
      <div className="sb-sidebar-tabs-header">
        <h3 className="sb-sidebar-tabs-title">
          {t("tabs", { defaultValue: "Tabs" })}
        </h3>
        <div className="sb-sidebar-tabs-header-actions">
          <button
            type="button"
            className="sb-sidebar-tabs-header-icon-button sb-sidebar-tabs-header-tasks-button"
            aria-label={t("tasks", { defaultValue: "Tasks" })}
            title={t("tasks", { defaultValue: "Tasks" })}
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

          {bookmarksEnabled && (
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
          )}
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
            aria-label={t("create-new-tab", { defaultValue: "Create new tab" })}
            title={t("new-tab", { defaultValue: "New tab" })}
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>
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
        className="sb-tab-mobile-add-inline"
        aria-label={t("create-new-tab", { defaultValue: "Create new tab" })}
      >
        <span className="sb-tab-mobile-add-inline-icon" aria-hidden="true">
          <span className="material-symbols-outlined">add</span>
        </span>
        <span className="sb-tab-mobile-add-inline-label">
          {t("add-new-tab", { defaultValue: "Add new tab" })}
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
                    {visual.icon}
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
  const visualKey = getSelfVisualKey(state);
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
      <span className="material-symbols-outlined">{visual.icon}</span>
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
  const { app, panes, sidebar } = state;
  const paneLayout = app.panelsEnabled.value ? panes.layout.value : "single";
  const panelsEnabled = app.panelsEnabled.value;
  const isSettingsOpen = sidebar.isSettingsOpen.value;
  const isCollapsed = sidebar.isSidebarCollapsed.value;
  const isMobileOpen = sidebar.isMobileOpen.value;
  const effectivelyCollapsed = isCollapsed && !isMobileOpen && !isSettingsOpen;
  const isLayoutMenuOpen = useSignal(false);
  const joinSessionId = useSignal("");

  const openJoinSessionModal = () => {
    closeContextMenus();
    isLayoutMenuOpen.value = false;
    state.modals.openModal({
      id: "join-shared-session",
      title: {
        key: "join-shared-session",
        defaultValue: "Join Shared Session",
      },
      content: ({ t }) => (
        <>
          <label>
            <span>{t("session-id", { defaultValue: "Session ID" })}</span>
            <input
              value={joinSessionId.value}
              onInput={(event) => {
                joinSessionId.value = (
                  event.currentTarget as HTMLInputElement
                ).value;
              }}
              placeholder={t("enter-shared-session-id", {
                defaultValue: "Enter shared session ID",
              })}
            />
          </label>
          <div>
            <button
              onClick={() => {
                state.modals.closeModal("join-shared-session");
              }}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              onClick={() => {
                void handleJoinSharedSession();
              }}
              disabled={!joinSessionId.value.trim()}
            >
              {t("join-session", { defaultValue: "Join Session" })}
            </button>
          </div>
        </>
      ),
    });
  };

  const closeJoinSessionModal = () => {
    state.modals.closeModal("join-shared-session");
    joinSessionId.value = "";
  };

  const handleJoinSharedSession = async () => {
    const sessionId = joinSessionId.value.trim();
    if (!sessionId) {
      return;
    }

    await state.app.joinSharedSession(sessionId);
    closeJoinSessionModal();
  };

  const closeLayoutMenu = () => {
    isLayoutMenuOpen.value = false;
  };

  const { t } = useI18n();

  return (
    <aside
      className={`sb-tabs-sidebar${effectivelyCollapsed ? " sb-tabs-sidebar-collapsed" : ""}${isMobileOpen ? " sb-tabs-sidebar-mobile-open" : ""}`}
    >
      {!isSettingsOpen && (
        <TabsHeader
          state={state}
          effectivelyCollapsed={effectivelyCollapsed}
          panelsEnabled={panelsEnabled}
          paneLayout={paneLayout}
          isLayoutMenuOpen={isLayoutMenuOpen.value}
          toggleLayoutMenu={() => {
            closeContextMenus();
            isLayoutMenuOpen.value = !isLayoutMenuOpen.value;
          }}
          setLayout={(layout) => {
            panes.setLayout(layout);
            closeLayoutMenu();
          }}
          createSharedSession={() => {
            void state.app.createSharedSession();
          }}
          openJoinSessionModal={openJoinSessionModal}
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
  );
}
