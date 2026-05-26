import { createBibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import {
  createBibleDataManager,
  type BibleDataManager,
} from "seed-bible.managers.BibleDataManager";
import { createBibleToolsManager } from "seed-bible.managers.BibleToolsManager";
import type { ToolsManager } from "seed-bible.managers.BibleToolsManager";
import { createConfig } from "seed-bible.managers.ConfigManager";
import type { ConfigManager } from "seed-bible.managers.ConfigManager";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import { createPanes } from "seed-bible.managers.PanesManager";
import type { Pane, PanesManager } from "seed-bible.managers.PanesManager";
import { createLoginManager } from "seed-bible.managers.LoginManager";
import type { LoginManager } from "seed-bible.managers.LoginManager";
import { createSidebar } from "seed-bible.managers.SidebarManager";
import { createTabs } from "seed-bible.managers.TabsManager";
import type { ReaderTab, TabsManager } from "seed-bible.managers.TabsManager";
import {
  generateThemeCssVariables,
  createTheme,
  generateThemeCssClasses,
} from "seed-bible.managers.ThemeManager";
import type { ThemeManager } from "seed-bible.managers.ThemeManager";
import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import {
  createReadingHistoryManager,
  type ReadingHistoryManager,
} from "seed-bible.managers.ReadingHistoryManager";
import {
  createExtensionManager,
  setupExtensionContext,
  type ExtensionManager,
} from "seed-bible.managers.ExtensionManager";
import {
  createHighlightsManager,
  type HighlightsManager,
} from "seed-bible.managers.HighlightsManager";
import {
  createBookmarksManager,
  type BookmarksManager,
} from "seed-bible.managers.BookmarksManager";
import {
  createSessionsManager,
  type BibleReadingSession,
  type SessionsManager,
} from "seed-bible.managers.SessionsManager";
import {
  createAnnotationsManager,
  type AnnotationsManager,
} from "seed-bible.managers.AnnotationsManager";
import {
  createModalManager,
  type ModalManager,
} from "seed-bible.managers.ModalManager";
import {
  createSettings,
  type SettingsManager,
} from "seed-bible.managers.SettingsManager";
import {
  createInvitationsManager,
  type InvitationsManager,
} from "seed-bible.managers.InvitationsManager";
import { createSearchManager } from "seed-bible.managers.SearchManager";

type SidebarManager = ReturnType<typeof createSidebar>;
type SearchManager = ReturnType<typeof createSearchManager>;

/**
 * Derived app-level state and high-level actions used by UI components.
 *
 * These values are mostly computed from lower-level managers and represent
 * the currently active reading context and pane selection.
 */
export interface AppState {
  /** True when multi-pane layouts are enabled by config. */
  panelsEnabled: ReadonlySignal<boolean>;
  /** Currently selected reading tab, or null when no tab is available. */
  selectedTab: ReadonlySignal<ReaderTab | null>;
  /** Effective pane list shown by the UI (single pane fallback when panels are disabled). */
  effectivePanes: ReadonlySignal<Pane[]>;
  /** Current window inner width in pixels. Updated on resize. */
  viewportWidth: ReadonlySignal<number>;
  /** True when viewport width is at or below the mobile breakpoint (768px). */
  isMobile: ReadonlySignal<boolean>;

  /**
   * Snapshot of the current chapter selection for analytics and integrations.
   * Null when there is no active tab/chapter.
   */
  currentReadingState: ReadonlySignal<{
    tab: ReaderTab;

    translationId: string | null;
    bookId: string | null;
    chapterNumber: number | null;
  } | null>;

  /** Selects a tab and synchronizes pane focus. */
  selectTab: (tabId: string) => void;
  /** Creates a new tab and selects it. */
  addTab: () => void;
  /** Opens an existing tab in a new attached pane. */
  openInNewPane: (tabId: string) => void;
  /** Opens an existing tab in a detached pane. */
  openInDetachedPane: (tabId: string) => void;
  /** Selects a pane and updates related UI state. */
  selectPane: (paneId: string) => void;
  /** Creates a shared reading session and opens it in a new tab. */
  createSharedSession: () => Promise<BibleReadingSession>;
  /** Joins an existing shared session and opens it in a new tab. */
  joinSharedSession: (id: string) => Promise<BibleReadingSession>;
}

/**
 * Root state container for Seed Bible.
 *
 * This object aggregates all domain managers plus app-level computed state so
 * components can consume one consistent source of truth.
 */
export interface SeedBibleState {
  /** Bible API and translation/chapter data orchestration. */
  bibleData: BibleDataManager;
  /** Persisted app configuration (layout, font size, etc.). */
  config: ConfigManager;
  /** Theme manager plus derived CSS variables/classes for rendering. */
  theme: ThemeManager & {
    themeCssVariables: ReadonlySignal<string>;
    themeCssClasses: ReadonlySignal<string>;
  };
  /** Sidebar/settings visibility manager. */
  sidebar: SidebarManager;
  /** Reader tab lifecycle manager. */
  tabs: TabsManager;
  /** Pane layout and detached pane manager. */
  panes: PanesManager;
  /** Bible selector state for book/chapter picking. */
  selector: BibleSelectorState;
  /** Dynamic tool registry used by reader panes/toolbars. */
  tools: ToolsManager;
  /** Authentication and user profile manager. */
  login: LoginManager;
  /** Reading history persistence and sync manager. */
  readingHistory: ReadingHistoryManager;
  /** Verse highlight manager. */
  highlights: HighlightsManager;
  /** Per-tab/location bookmarks manager. */
  bookmarks: BookmarksManager;
  /** Annotation manager for notes/metadata. */
  annotations: AnnotationsManager;
  /** Shared reading sessions manager. */
  sessions: SessionsManager;
  /** Modal manager for app-wide dialog state and rendering. */
  modals: ModalManager;
  /** App-level settings: book orientation, UI text size, selection UI, etc. */
  settings: SettingsManager;
  /** Incoming session invitations and invite-sending. */
  invitations: InvitationsManager;
  /** Search manager for Typesense-backed queries. */
  search: SearchManager;
  /** Aggregated computed app state and top-level UI actions. */
  app: AppState;
  /** Extension loading and runtime manager. */
  extensions: ExtensionManager;
}

/**
 * Creates and wires the full Seed Bible application state graph.
 *
 * Manager dependencies are initialized in order, then composed into derived
 * signals/actions that power the UI. The resulting state is also passed to
 * extension context setup.
 */
export function createSeedBibleState(): SeedBibleState {
  const api = new FreeUseBibleAPI();
  const data = createBibleDataManager(api);
  const login = createLoginManager();
  const highlights = createHighlightsManager(login);
  const bookmarks = createBookmarksManager(login);
  const config = createConfig(login);
  const themeManager = createTheme(login);
  const sidebar = createSidebar();
  const tabs = createTabs(data, highlights);
  const panes = createPanes(tabs, tabs.selectedTabId);
  const settings = createSettings(login);
  const selector = createBibleSelectorState(data, tabs, panes, settings);
  const tools = createBibleToolsManager();
  const readingHistory = createReadingHistoryManager(login);
  const annotations = createAnnotationsManager(login);
  const sessions = createSessionsManager(data, login, highlights);
  const extensions = createExtensionManager();
  const modals = createModalManager();
  const search = createSearchManager();

  const { currentTheme } = themeManager;
  const theme = computed(() => currentTheme.value);
  const themeCssVariables = computed(() =>
    generateThemeCssVariables(theme.value)
  );
  const themeCssClasses = computed(() => generateThemeCssClasses(theme.value));

  // Theme is the source of truth for text colors. When the user switches
  // theme presets, drop any per-section color override from the text editor
  // so verse / book title / heading pick up the new theme's colors.
  let prevPresetId = themeManager.selectedThemeId.peek();
  effect(() => {
    const id = themeManager.selectedThemeId.value;
    if (id === prevPresetId) return;
    prevPresetId = id;
    settings.resetTextColors();
  });
  const panelsEnabled = computed(() => !config.config.value.disablePanels);
  const selectedTab = computed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );

  const viewportWidth = signal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const isMobile = computed(() => viewportWidth.value <= 768);

  effect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handleResize = () => {
      viewportWidth.value = window.innerWidth;
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  });

  const buildSingleSelectedPane = (): Pane[] =>
    selectedTab.value
      ? [
          {
            id: "single-pane",
            tab: selectedTab.value,
            component: null,
            gridPortal: null,
            mapPortal: null,
            detached: false,
            detachedAnchor: "floating" as const,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
          },
        ]
      : [];

  const effectivePanes = computed(() => {
    if (!panelsEnabled.value) {
      return buildSingleSelectedPane();
    }
    if (isMobile.value) {
      // On mobile we only show a single pane at a time. Prefer the pane that
      // hosts the currently selected tab; fall back to the manager's selected
      // pane, then the first pane.
      const allPanes = panes.panes.value;
      const tab = selectedTab.value;
      const selectedPaneId = panes.selectedPaneId.value;
      const matching =
        (tab ? allPanes.find((p) => p.tab?.id === tab.id) : null) ??
        allPanes.find((p) => p.id === selectedPaneId) ??
        allPanes[0] ??
        null;
      return matching ? [matching] : buildSingleSelectedPane();
    }
    return panes.panes.value;
  });
  const currentReadingState = computed(() => {
    const selectedTabValue = selectedTab.value;

    if (!selectedTabValue) {
      return null;
    }

    return {
      tab: selectedTabValue,

      translationId: selectedTabValue.readingState.translationId.value,
      bookId: selectedTabValue.readingState.bookId.value,
      chapterNumber: selectedTabValue.readingState.chapterNumber.value,
    };
  });

  effect(() => {
    if (selectedTab.value) {
      const matchingPane =
        panes.panes.value.find((p) => p.tab?.id === selectedTab.value?.id) ??
        null;
      if (matchingPane) {
        panes.selectPane(matchingPane.id);
      }
    }
  });

  effect(() => {
    if (!selectedTab.value) {
      return;
    }

    const chapter = selectedTab.value.readingState.chapterData.value;
    if (!chapter) {
      return;
    }

    const RTLE_CHAR = "\u202B";
    configBot.tags.pageTitle = `${chapter.translation.textDirection === "rtl" ? RTLE_CHAR : ""}${chapter.book.name} ${chapter.chapter.number} - ${chapter.translation.name} | Seed Bible`;

    const readingHistoryTimeoutId = setInterval(() => {
      readingHistory.saveReadingHistory(
        chapter.book.id,
        chapter.chapter.number
      );
    }, 5000);

    const posthogTimeoutId = setTimeout(() => {
      if (typeof posthog === "undefined" || !posthog) {
        return;
      }
      posthog?.capture("user_chapter_read", {
        translationId: chapter.translation.id,
        bookId: chapter.book.id,
        chapter: String(chapter.chapter.number),
      });
    }, 30_000);

    return () => {
      clearInterval(readingHistoryTimeoutId);
      clearTimeout(posthogTimeoutId);
    };
  });

  const closeSidebarAndSettings = () => {
    sidebar.closeSettings();
    sidebar.closeSidebar();
  };

  const handleSelectTab = (tabId: string) => {
    closeSidebarAndSettings();
    tabs.selectTab(tabId);
    panes.setSelectedPaneTab(tabId);
  };

  const handleAddTab = () => {
    closeSidebarAndSettings();
    const targetPane =
      panes.panes.value.find(
        (pane) => pane.id === panes.selectedPaneId.value
      ) ??
      panes.panes.value.find((pane) => !pane.detached) ??
      panes.panes.value[0] ??
      null;

    if (!targetPane) {
      // No panes — fall back to plain tab creation.
      const tab = tabs.addTab();
      panes.setSelectedPaneTab(tab.id);
      return;
    }

    void selector.setOpen(true, targetPane, { forNewTab: true });
  };

  const handleOpenInNewPane = (tabId: string) => {
    closeSidebarAndSettings();
    panes.openPane({
      type: "attached",
      tabId,
    });
    tabs.selectTab(tabId);
  };

  const handleOpenInDetachedPane = (tabId: string) => {
    closeSidebarAndSettings();
    panes.openPane({
      type: "detached",
      tabId,
    });
    tabs.selectTab(tabId);
  };

  const handleSelectPane = (paneId: string) => {
    closeSidebarAndSettings();
    panes.selectPane(paneId);

    const selectedPane =
      panes.panes.value.find((pane) => pane.id === paneId) ?? null;
    if (selectedPane?.tab) {
      tabs.selectTab(selectedPane.tab.id);
      return;
    }

    if (
      selectedPane?.component !== null ||
      selectedPane?.gridPortal !== null ||
      selectedPane?.mapPortal !== null
    ) {
      return;
    }

    selector.setOpen(true, selectedPane);
  };

  // Wraps a session so that when it's disposed (via tabs.removeTab), its
  // entry is removed from the global shared-sessions registry too. The
  // registry is opened by every client, so other users see the session
  // disappear automatically.
  //
  // Additionally: if THIS client is the host (by user id or connection id),
  // mark `endedAt` in the session's shared options before tearing down.
  // Participants watch for `endedAt` and auto-close their tab (see the
  // effect below), which is the behavior the host expects when they end
  // or close a shared tab.
  const wrapSessionLifecycle = (
    session: BibleReadingSession
  ): BibleReadingSession => {
    const originalDispose = session.dispose.bind(session);
    session.dispose = () => {
      const hostUserId = session.options.value.hostUserId;
      const localId = login.userId.value;
      const localConnectionId =
        typeof configBot !== "undefined" && configBot?.id
          ? String(configBot.id)
          : null;
      // Trust `locallyHostedSessionIds` over the identity comparison —
      // after a login/logout the current login.userId / configBot.id no
      // longer match the original `hostUserId`, but we're still the host
      // of sessions we created in this run.
      const isHost =
        locallyHostedSessionIds.has(session.id) ||
        (hostUserId !== null &&
          (hostUserId === localId || hostUserId === localConnectionId));

      if (isHost && session.options.value.endedAt === null) {
        try {
          session.updateOptions({ endedAt: Date.now() });
        } catch {
          // Best-effort — don't block teardown if the CRDT write fails.
        }
      }

      locallyHostedSessionIds.delete(session.id);
      void invitations.unpublishSession(session.id);
      originalDispose();
    };
    return session;
  };

  // Sessions THIS client created locally. The host-disconnect auto-close
  // below skips these — when the local user logs in/out the OS may
  // re-establish the underlying connection with a new connectionId/userId,
  // which would make the original `hostUserId` look "disconnected" even
  // though the host (us) is still right here. The host's own tab only
  // closes through explicit teardown (close button / "End Session"),
  // never through the disconnect heuristic.
  const locallyHostedSessionIds = new Set<string>();

  // Auto-close participant tabs when the host goes away. Two signals:
  //  (a) `options.endedAt` was written by the host (clean "End Session"
  //      action — works when the CRDT flushes before the host disconnects).
  //  (b) The host was previously in `connectedUsers` but has since left —
  //      catches the host-browser-close case even if the `endedAt` write
  //      never made it across the wire.
  //
  // We remember per-session that the host was at least once connected, so
  // joiners don't immediately close their own tab on connect before they
  // even see the host. We also debounce the disconnect-close path — a
  // host who logs in mid-session will briefly look disconnected (their
  // OS connection re-establishes with a new identity), and we want their
  // updated `hostUserId` to land via the CRDT before we close the tab.
  const sessionsWhereHostWasSeen = new Set<string>();
  const HOST_DISCONNECT_GRACE_MS = 8000;
  const pendingHostDisconnectTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  const clearPendingHostDisconnect = (sessionId: string) => {
    const timer = pendingHostDisconnectTimers.get(sessionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      pendingHostDisconnectTimers.delete(sessionId);
    }
  };
  effect(() => {
    for (const tab of tabs.tabs.value) {
      const session = tab.sharedSession;
      if (!session) continue;

      if (session.options.value.endedAt !== null) {
        sessionsWhereHostWasSeen.delete(session.id);
        clearPendingHostDisconnect(session.id);
        tabs.removeTab(tab.id);
        continue;
      }

      // Never auto-close a session this client created — the host is the
      // local user, and any apparent host disconnect is an identity flip
      // (login/logout), not a real departure.
      if (locallyHostedSessionIds.has(session.id)) continue;

      const hostId = session.options.value.hostUserId;
      if (!hostId) continue;

      const users = session.connectedUsers.value;
      const hostIsConnected = users.some(
        (user) => user.userId === hostId || user.connectionId === hostId
      );

      if (hostIsConnected) {
        sessionsWhereHostWasSeen.add(session.id);
        // Host came back (e.g. reconnected after their login flow) — cancel
        // any pending close so the tab survives the round-trip.
        clearPendingHostDisconnect(session.id);
      } else if (
        sessionsWhereHostWasSeen.has(session.id) &&
        !pendingHostDisconnectTimers.has(session.id)
      ) {
        // Host appears to have left, but it may be a transient reconnect
        // (host logging in/out) — wait briefly to give the CRDT time to
        // deliver a new `hostUserId` or for the host's connection to
        // re-appear before tearing down.
        const tabId = tab.id;
        const sessionId = session.id;
        const timer = setTimeout(() => {
          pendingHostDisconnectTimers.delete(sessionId);
          sessionsWhereHostWasSeen.delete(sessionId);
          tabs.removeTab(tabId);
        }, HOST_DISCONNECT_GRACE_MS);
        pendingHostDisconnectTimers.set(sessionId, timer);
      }
    }
  });

  // When the local user's identity changes (login/logout) and they host
  // sessions, push the new identity into each session's `hostUserId` via
  // the CRDT. Without this update, joiners' host-detection would still be
  // looking for the host's previous (anonymous) connection id and would
  // never re-acquire them as host on the new connection.
  effect(() => {
    const newLoginUserId = login.userId.value;
    const localConnectionId =
      typeof configBot !== "undefined" && configBot?.id
        ? String(configBot.id)
        : null;
    const desiredHostId = newLoginUserId ?? localConnectionId;
    if (!desiredHostId) return;
    for (const tab of tabs.tabs.value) {
      const session = tab.sharedSession;
      if (!session) continue;
      if (!locallyHostedSessionIds.has(session.id)) continue;
      if (session.options.value.hostUserId === desiredHostId) continue;
      try {
        session.updateOptions({ hostUserId: desiredHostId });
      } catch {
        // Best-effort — joiners will fall back to their grace-period
        // timeout if the update can't be delivered.
      }
    }
  });

  const handleCreateSharedSession = async () => {
    closeSidebarAndSettings();
    const session = await sessions.createSession();
    locallyHostedSessionIds.add(session.id);
    wrapSessionLifecycle(session);
    // Auto-publish: the moment a shared tab is created, other logged-in
    // users see it in their sidebar and can click to join — no manual
    // invite/notification step.
    void invitations.publishSession(session);
    const tab = tabs.addTab(session);
    panes.setSelectedPaneTab(tab.id);
    return session;
  };

  const handleJoinSharedSession = async (id: string) => {
    closeSidebarAndSettings();
    const session = await sessions.joinSession(id);
    wrapSessionLifecycle(session);
    const tab = tabs.addTab(session);
    panes.setSelectedPaneTab(tab.id);
    return session;
  };

  const invitations = createInvitationsManager(login, async (sessionId) => {
    await handleJoinSharedSession(sessionId);
  });

  const setupInitialSession = async () => {
    const initialSessionId = configBot.tags.sessionId;
    if (!initialSessionId) {
      return;
    }

    await handleJoinSharedSession(initialSessionId);
  };

  void setupInitialSession();

  const state: SeedBibleState = {
    bibleData: data,
    config,
    theme: {
      ...themeManager,
      themeCssVariables,
      themeCssClasses,
    },
    sidebar,
    tabs,
    panes,
    selector,
    tools,
    login,
    readingHistory,
    highlights,
    bookmarks,
    annotations,
    sessions,
    modals,
    settings,
    invitations,
    search,
    extensions,
    app: {
      createSharedSession: handleCreateSharedSession,
      joinSharedSession: handleJoinSharedSession,
      panelsEnabled,
      selectedTab,
      effectivePanes,
      viewportWidth,
      isMobile,
      currentReadingState,
      selectTab: handleSelectTab,
      addTab: handleAddTab,
      openInNewPane: handleOpenInNewPane,
      openInDetachedPane: handleOpenInDetachedPane,
      selectPane: handleSelectPane,
    },
  };

  setupExtensionContext(state);

  return state;
}
