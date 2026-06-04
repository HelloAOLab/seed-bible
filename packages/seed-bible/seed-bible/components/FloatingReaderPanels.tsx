import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import {
  ChatView,
  getParticipantAvatar,
  getParticipantDisplayLabel,
} from "./ChatView";
import {
  closeContextMenus,
  ContextMenuItem,
  ContextMenuWithButton,
} from "seed-bible.components.ContextMenu";
import {
  DEFAULT_TRANSLATION_ID,
  DEFAULT_TRANSLATION_LANGUAGE,
} from "seed-bible.managers.BibleReadingManager";
import type {
  ChatMessage,
  ChatProvider,
  ChatSession,
} from "seed-bible.managers.ChatsManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";
import { translateTitle } from "./Utils";
import { Avatar } from "./Avatar";

interface SearchResult {
  id: string;
  translationId: string;
  translationLabel: string;
  bookId: string;
  bookLabel: string;
  chapterNumber: number;
  verseNumber: number | null;
  reference: string;
  text: string;
}

function getLatestChatMessage(chat: ChatSession): ChatMessage | null {
  return chat.messages.value.at(-1) ?? null;
}

function getChatTitle(
  chat: ChatSession,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const participants = chat.participants.value;

  const onlySelf = participants.every((p) => p.isSelf);

  if (onlySelf && "isShared" in chat && chat.isShared) {
    return t("session-chat-just-you", {
      defaultValue: "Session Chat (Just You)",
    });
  }

  const preferred = participants.filter((participant) => !participant.isSelf);
  const pool = preferred.length > 0 ? preferred : participants;

  const names = pool
    .map((participant) => getParticipantDisplayLabel(participant, t))
    .filter((name) => name.length > 0);

  if (names.length === 0) {
    if ("isShared" in chat && chat.isShared) {
      return t("session-chat-just-you", {
        defaultValue: "Session Chat (Just You)",
      });
    }

    return t("chat", { defaultValue: "Chat" });
  }

  return names.slice(0, 3).join(", ");
}

function getChatMessageText(message: ChatMessage): string {
  switch (message.type) {
    case "text":
      return message.text;
    default:
      return "";
  }
}

function getChatPreview(
  chat: ChatSession,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const latestMessage = getLatestChatMessage(chat);
  if (!latestMessage) {
    return t("no-chat-messages", { defaultValue: "No messages yet" });
  }

  const author = chat.getMessageAuthors(latestMessage)[0] ?? null;
  const authorLabel = author
    ? getParticipantDisplayLabel(author, t)
    : t("anonymous", { defaultValue: "Anonymous" });
  const text = getChatMessageText(latestMessage).trim();
  if (!text) {
    return authorLabel;
  }
  return `${authorLabel}: ${text}`;
}

function ChatListRelativeDateTime({ timeMs }: { timeMs: number }) {
  const { language } = useI18n();
  const refreshTick = useSignal(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshTick.value += 1;
    }, 30_000);

    return () => {
      window.clearInterval(id);
    };
  }, []);

  void refreshTick.value;
  const date = DateTime.fromMillis(timeMs).setLocale(language);
  return <span>{date.toRelative()}</span>;
}

function getOrCreateSearchTargetTab(state: SeedBibleState): ReaderTab {
  const selectedTab = state.app.selectedTab.value;
  if (selectedTab) {
    state.app.selectTab(selectedTab.id);
    return selectedTab;
  }
  const tab = state.tabs.addTab();
  state.panes.setSelectedPaneTab(tab.id);
  return tab;
}

const { useEffect, useRef } = os.appHooks;

interface FloatingReaderPanelsProps {
  state: SeedBibleState;
}

/**
 * Floating panels anchored above the reader toolbar. Replaces the
 * sidebar-mounted search and introduces a placeholder Chat surface. Only
 * one of the two can be open at a time — opening one closes the other
 * (handled by SidebarManager).
 */
export function FloatingReaderPanels(props: FloatingReaderPanelsProps) {
  const { state } = props;
  return (
    <>
      <FloatingSearchPanel state={state} />
      <FloatingChatPanel state={state} />
    </>
  );
}

function FloatingSearchPanel(props: FloatingReaderPanelsProps) {
  const { state } = props;
  const { sidebar } = state;
  const { t } = useI18n();
  const isOpen = sidebar.isSearchPanelOpen.value;

  const searchQuery = useSignal("");
  const searchResults = useSignal<SearchResult[]>([]);
  const searchLoading = useSignal(false);
  const searchError = useSignal<string | null>(null);
  const highlightedResultIndex = useSignal(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const latestRequestRef = useRef(0);
  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    latestRequestRef.current++;
    searchQuery.value = "";
    searchResults.value = [];
    searchLoading.value = false;
    searchError.value = null;
    highlightedResultIndex.value = -1;
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".sb-floating-search-panel")) return;
      if (target.closest(".sb-reader-toolbar")) return;
      sidebar.closeSearchPanel();
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (highlightedResultIndex.value < 0) return;
    resultRefs.current[highlightedResultIndex.value]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedResultIndex.value]);

  const runSearch = (nextQuery: string) => {
    searchQuery.value = nextQuery;

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    const query = nextQuery.trim();
    const activeTranslationId =
      state.app.currentReadingState.value?.translationId ??
      DEFAULT_TRANSLATION_ID;
    const activeLanguage =
      state.app.currentReadingState.value?.tab.readingState.translation.value
        ?.language ?? DEFAULT_TRANSLATION_LANGUAGE;
    const requestId = ++latestRequestRef.current;

    if (!query) {
      searchResults.value = [];
      searchLoading.value = false;
      searchError.value = null;
      highlightedResultIndex.value = -1;
      return;
    }

    searchLoading.value = true;
    searchError.value = null;
    highlightedResultIndex.value = -1;

    debounceTimeoutRef.current = window.setTimeout(() => {
      state.search
        .searchVerses(activeLanguage, activeTranslationId, query)
        .then((response) => {
          if (latestRequestRef.current !== requestId) return;
          searchResults.value = (response.hits ?? []).map((hit) => ({
            id: hit.document.id,
            translationId: hit.document.translation,
            translationLabel: hit.document.translation,
            bookId: hit.document.book,
            bookLabel: hit.document.book,
            chapterNumber: hit.document.chapter,
            verseNumber: hit.document.verse,
            reference: hit.document.reference,
            text: hit.document.text,
          }));
          highlightedResultIndex.value = -1;
          searchLoading.value = false;
        })
        .catch((error: unknown) => {
          if (latestRequestRef.current !== requestId) return;
          searchResults.value = [];
          searchLoading.value = false;
          highlightedResultIndex.value = -1;
          searchError.value =
            error instanceof Error ? error.message : "Unable to search verses.";
        });
    }, 180);
  };

  const navigateTabToResult = async (
    targetTab: ReaderTab,
    result: SearchResult
  ) => {
    await targetTab.readingState.selectTranslationAndChapter(
      result.translationId,
      result.bookId,
      result.chapterNumber,
      {
        scrollToVerse: result.verseNumber ?? undefined,
      }
    );
    if (result.verseNumber) {
      targetTab.readingState.decorateVerses(
        result.bookId,
        result.chapterNumber,
        result.verseNumber,
        {
          className: "sb-verse-decoration-search-result",
          removeAfterMs: 3000,
        }
      );
    }
  };

  const openSearchResult = async (result: SearchResult) => {
    closeContextMenus();
    sidebar.closeSearchPanel();

    const targetTab = getOrCreateSearchTargetTab(state);
    await navigateTabToResult(targetTab, result);
  };

  const openSearchResultInNewTab = async (result: SearchResult) => {
    closeContextMenus();
    sidebar.closeSearchPanel();

    const targetTab = state.tabs.addTab(undefined, {
      initialTranslationId: result.translationId,
      initialBookId: result.bookId,
      initialChapterNumber: result.chapterNumber,
    });
    state.panes.setSelectedPaneTab(targetTab.id);
    await navigateTabToResult(targetTab, result);
  };

  const moveHighlightedResult = (direction: 1 | -1) => {
    if (searchResults.value.length === 0) return;
    const nextIndex = highlightedResultIndex.value + direction;
    if (nextIndex < 0) {
      highlightedResultIndex.value = searchResults.value.length - 1;
      return;
    }
    if (nextIndex >= searchResults.value.length) {
      highlightedResultIndex.value = 0;
      return;
    }
    highlightedResultIndex.value = nextIndex;
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlightedResult(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlightedResult(-1);
      return;
    }
    if (event.key === "Enter") {
      const highlighted =
        searchResults.value[highlightedResultIndex.value] ?? null;
      if (!highlighted) return;
      event.preventDefault();
      void openSearchResult(highlighted);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      sidebar.closeSearchPanel();
    }
  };

  if (!isOpen) return null;

  const hasQuery = searchQuery.value.trim().length > 0;
  const showResultsArea =
    hasQuery &&
    (searchLoading.value ||
      searchError.value !== null ||
      searchResults.value.length > 0 ||
      (!searchLoading.value && searchResults.value.length === 0));

  return (
    <div
      className={`sb-floating-search-panel${
        showResultsArea ? " sb-floating-search-panel-expanded" : ""
      }`}
      role="dialog"
      aria-label={t("search", { defaultValue: "Search" })}
    >
      {showResultsArea && (
        <div className="sb-floating-search-results" role="listbox">
          {searchLoading.value && (
            <div className="sb-floating-search-status">
              {t("searching", { defaultValue: "Searching..." })}
            </div>
          )}

          {!searchLoading.value && searchError.value && (
            <div className="sb-floating-search-status sb-floating-search-status-error">
              {searchError.value}
            </div>
          )}

          {!searchLoading.value &&
            !searchError.value &&
            searchResults.value.length === 0 && (
              <div className="sb-floating-search-status">
                {t("no-search-results", {
                  defaultValue: "No matching verses.",
                })}
              </div>
            )}

          {!searchLoading.value &&
            !searchError.value &&
            searchResults.value.length > 0 && (
              <div className="sb-floating-search-results-list">
                {searchResults.value.map((result, index) => (
                  <button
                    key={result.id}
                    ref={(element) => {
                      resultRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => {
                      void openSearchResult(result);
                    }}
                    onMouseEnter={() => {
                      highlightedResultIndex.value = index;
                    }}
                    className={`sb-floating-search-result${
                      highlightedResultIndex.value === index
                        ? " sb-floating-search-result-highlighted"
                        : ""
                    }`}
                    role="option"
                    aria-selected={highlightedResultIndex.value === index}
                  >
                    <header className="sb-floating-search-result-header">
                      <span className="sb-floating-search-result-ref">
                        {result.reference}
                      </span>
                      <span
                        className="sb-floating-search-result-sep"
                        aria-hidden="true"
                      >
                        •
                      </span>
                      <span className="sb-floating-search-result-translation">
                        {result.translationLabel}
                      </span>
                      <span
                        className="sb-floating-search-result-action"
                        role="button"
                        tabIndex={0}
                        aria-label={t("add-verse", {
                          defaultValue: "Add verse",
                        })}
                        title={t("add", { defaultValue: "Add" })}
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation();
                          void openSearchResultInNewTab(result);
                        }}
                        onKeyDown={(event: KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            void openSearchResultInNewTab(result);
                          }
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          aria-hidden="true"
                        >
                          open_in_new
                        </span>
                      </span>
                    </header>
                    <p className="sb-floating-search-result-text">
                      {result.text ||
                        t("open-chapter", { defaultValue: "Open chapter" })}
                    </p>
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      <div className="sb-floating-search-input-wrap">
        <span
          className="material-symbols-outlined sb-floating-search-icon"
          aria-hidden="true"
        >
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          className="sb-floating-search-input"
          placeholder={t("search-verses", { defaultValue: "Search verses" })}
          value={searchQuery.value}
          onInput={(event) => {
            runSearch((event.currentTarget as HTMLInputElement).value);
          }}
          onKeyDown={(event) => {
            handleInputKeyDown(event);
          }}
        />
        {hasQuery && (
          <button
            type="button"
            className="sb-floating-search-clear"
            onClick={() => {
              runSearch("");
              inputRef.current?.focus();
            }}
            aria-label={t("clear-search", { defaultValue: "Clear search" })}
            title={t("clear-search", { defaultValue: "Clear search" })}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>
    </div>
  );
}

function FloatingChatPanel(props: FloatingReaderPanelsProps) {
  const { state } = props;
  const { sidebar } = state;
  const { t } = useI18n();
  const isOpen = sidebar.isChatPanelOpen.value;
  const selectedChat = state.chats.selectedChat.value;
  const chats = state.chats.chats.value;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".sb-floating-chat-panel")) return;
      if (target.closest(".sb-reader-toolbar")) return;
      sidebar.closeChatPanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        sidebar.closeChatPanel();
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="sb-floating-chat-panel"
      role="dialog"
      aria-label={t("chat", { defaultValue: "Chat" })}
    >
      <header className="sb-floating-chat-header">
        {selectedChat ? (
          <button
            type="button"
            className="sb-floating-chat-header-back"
            onClick={() => {
              state.chats.selectChat(null);
            }}
            aria-label={t("back", { defaultValue: "Back" })}
            title={t("back", { defaultValue: "Back" })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </button>
        ) : null}

        {selectedChat && <ChatListAvatarCluster chat={selectedChat} />}
        <p className="sb-floating-chat-header-title">
          {selectedChat
            ? getChatTitle(selectedChat, t)
            : t("chat", { defaultValue: "Chat" })}
        </p>

        {selectedChat ? (
          <ContextMenuWithButton
            anchorClassName="sb-floating-chat-header-members-anchor"
            buttonClassName="sb-floating-chat-header-members-button"
            menuClassName="sb-floating-chat-members-menu"
            icon="groups"
            aria-label={t("active-participants", {
              defaultValue: "Active participants",
            })}
            title={t("active-participants", {
              defaultValue: "Active participants",
            })}
            onClick={() => {
              closeContextMenus();
            }}
          >
            {selectedChat.participants.value.map((participant) => {
              const label = getParticipantDisplayLabel(participant, t);
              const avatar = getParticipantAvatar(participant, t);
              return (
                <ContextMenuItem
                  key={participant.id}
                  className="sb-floating-chat-members-item"
                  onClick={(event) => {
                    event.preventDefault();
                  }}
                >
                  <Avatar
                    imageUrl={avatar.imageUrl}
                    visual={avatar.visual}
                    title={avatar.label}
                    isSelf={avatar.isSelf}
                  />
                  <span className="sb-floating-chat-members-name">{label}</span>
                </ContextMenuItem>
              );
            })}
          </ContextMenuWithButton>
        ) : null}
      </header>

      {selectedChat ? (
        <ChatView chat={selectedChat} />
      ) : (
        <ChatList chats={chats} state={state} />
      )}
    </div>
  );
}

function NoChatsAvailable() {
  const { t } = useI18n();
  return (
    <div className="sb-floating-chat-empty">
      <span
        className="material-symbols-outlined sb-floating-chat-empty-icon"
        aria-hidden="true"
      >
        chat_bubble_outline
      </span>
      <p className="sb-floating-chat-empty-title">
        {t("you-have-no-chats", {
          defaultValue:
            "You have no chats. Create one using the + button below.",
        })}
      </p>
    </div>
  );
}

function NoProvidersAvailable() {
  const { t } = useI18n();
  return (
    <div className="sb-floating-chat-empty">
      <span
        className="material-symbols-outlined sb-floating-chat-empty-icon"
        aria-hidden="true"
      >
        chat_bubble_outline
      </span>
      <p className="sb-floating-chat-empty-title">
        {t("no-chat-providers", {
          defaultValue:
            "No chat providers are available. Connect an AI or messaging provider to start chatting.",
        })}
      </p>
    </div>
  );
}

function createLocalChatFromProvider(
  state: SeedBibleState,
  provider: ChatProvider
) {
  closeContextMenus();
  const chat = state.chats.createLocalSession();
  chat.addParticipant(provider.id);
  state.chats.selectChat(chat.id);
}

function ChatListAvatarCluster({ chat }: { chat: ChatSession }) {
  const { t } = useI18n();
  const participants = chat.participants.value;
  const nonSelf = participants.filter((p) => !p.isSelf);
  const pool = nonSelf.length > 0 ? nonSelf : participants;
  const toShow = pool.slice(0, 3);
  const count = Math.max(toShow.length, 1);

  return (
    <div
      className={`sb-chat-list-avatar-cluster sb-chat-list-avatar-cluster-${count}`}
      aria-hidden="true"
    >
      {toShow.map((participant) => {
        const av = getParticipantAvatar(participant, t);
        return (
          <Avatar
            key={participant.id}
            imageUrl={av.imageUrl}
            visual={av.visual}
            title={av.label}
            isSelf={av.isSelf}
          />
        );
      })}
    </div>
  );
}

function ChatList({
  chats,
  state,
}: {
  chats: ChatSession[];
  state: SeedBibleState;
}) {
  const { t } = useI18n();
  const providers = state.chats.providers.value;

  return (
    <div className="sb-floating-chat-list-shell">
      {chats.length === 0 && providers.length === 0 ? (
        <NoProvidersAvailable />
      ) : chats.length === 0 ? (
        <NoChatsAvailable />
      ) : (
        <div className="sb-floating-chat-list" role="listbox">
          {chats.map((chat) => {
            const latestMessage = getLatestChatMessage(chat);
            const unreadCount = chat.unreadMessages.value.length;
            return (
              <button
                key={chat.id}
                type="button"
                className="sb-floating-chat-list-item"
                onClick={() => {
                  state.chats.selectChat(chat.id);
                }}
                role="option"
                aria-selected="false"
                title={getChatTitle(chat, t)}
              >
                <ChatListAvatarCluster chat={chat} />
                <div className="sb-floating-chat-list-item-content">
                  <div className="sb-floating-chat-list-item-header">
                    <span className="sb-floating-chat-list-item-title">
                      {getChatTitle(chat, t)}
                    </span>
                    <div className="sb-floating-chat-list-item-meta">
                      {latestMessage ? (
                        <span className="sb-floating-chat-list-item-time">
                          <ChatListRelativeDateTime
                            timeMs={latestMessage.timeMs}
                          />
                        </span>
                      ) : null}

                      {unreadCount > 0 ? (
                        <span className="sb-floating-chat-list-item-unread">
                          {unreadCount > 99 ? "99+" : `${unreadCount}`}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className="sb-floating-chat-list-item-preview">
                    {getChatPreview(chat, t)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {providers.length > 0 ? (
        <ContextMenuWithButton
          anchorClassName="sb-floating-chat-list-create-anchor"
          buttonClassName="sb-floating-chat-list-create-button"
          menuClassName="sb-floating-chat-list-create-menu"
          icon="add"
          aria-label={t("add", { defaultValue: "Add" })}
          title={t("add", { defaultValue: "Add" })}
        >
          {providers.map((provider) => (
            <ContextMenuItem
              key={provider.id}
              className="sb-floating-chat-list-create-item"
              onClick={() => {
                createLocalChatFromProvider(state, provider);
              }}
            >
              {translateTitle(t, provider.name)}
            </ContextMenuItem>
          ))}
        </ContextMenuWithButton>
      ) : null}
    </div>
  );
}
