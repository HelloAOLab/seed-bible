import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type {
  ChatParticipant,
  ChatMessage,
  ChatSession,
} from "seed-bible.managers.ChatsManager";
import {
  getUserAnimalVisual,
  type ConnectionSessionUserVisual,
} from "../managers/SessionsManager";
import { Avatar } from "./Avatar";
import { translateTitle } from "./Utils";

const { useEffect, useRef } = os.appHooks;

interface ChatViewProps {
  chat: ChatSession;
}

function getMessageText(message: ChatMessage): string {
  switch (message.type) {
    case "text":
      return message.text;
    default:
      return "";
  }
}

function getAuthorLabel(
  chat: ChatSession,
  message: ChatMessage,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const authors = chat
    .getMessageAuthors(message)
    .map((author) =>
      author.isSelf
        ? t("you", { defaultValue: "You" })
        : author.name
          ? translateTitle(t, author.name)
          : author.id.slice(0, 6)
    )
    .filter((name) => name && translateTitle(t, name).trim().length > 0);

  if (authors.length === 0) {
    return t("anonymous", { defaultValue: "Anonymous" });
  }

  return authors.join(", ");
}

function RelativeDateTime({ timeMs }: { timeMs: number }) {
  const { language } = useI18n();
  const refreshTick = useSignal(0);

  useEffect(() => {
    const timerId = setInterval(() => {
      refreshTick.value += 1;
    }, 15_000);

    return () => {
      clearInterval(timerId);
    };
  }, []);

  void refreshTick.value;
  const date = DateTime.fromMillis(timeMs).setLocale(language);

  return <span className="relative-date-time">{date.toRelative()}</span>;
}

function getMessageAvatar(
  chat: ChatSession,
  message: ChatMessage,
  t: (key: string, options?: Record<string, unknown>) => string
): {
  imageUrl: string | null;
  label: string;
  visual: ConnectionSessionUserVisual;
  isSelf: boolean;
} {
  const authors = chat.getMessageAuthors(message);
  const primaryAuthor = authors[0] ?? null;

  if (!primaryAuthor) {
    const anonymous = t("anonymous", { defaultValue: "Anonymous" });
    return {
      imageUrl: null,
      label: anonymous,
      visual: getUserAnimalVisual(message.id),
      isSelf: false,
    };
  }

  const label = getParticipantDisplayLabel(primaryAuthor, t);
  const imageUrl =
    !primaryAuthor.isAI && typeof primaryAuthor.profile?.pictureUrl === "string"
      ? primaryAuthor.profile.pictureUrl
      : null;

  return {
    imageUrl,
    label,
    visual: primaryAuthor.isAI
      ? getUserAnimalVisual(primaryAuthor.providerId)
      : primaryAuthor.visual,
    isSelf: primaryAuthor.isSelf,
  };
}

function getParticipantDisplayLabel(
  participant: ChatParticipant,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const name = participant.name ? translateTitle(t, participant.name) : null;

  return participant.isSelf
    ? t("you", { defaultValue: "You" })
    : (name ?? t("anonymous", { defaultValue: "Anonymous" }));
}

function getParticipantMentionLabel(
  participant: ChatParticipant,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const name = participant.name ? translateTitle(t, participant.name) : null;
  return name?.trim() || participant.id.slice(0, 6);
}

function getTypingIndicatorLabel(
  participants: ChatParticipant[],
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const names = participants
    .map((participant) => getParticipantDisplayLabel(participant, t))
    .filter((name) => name.trim().length > 0);

  if (names.length === 0) {
    return t("someone-is-typing", { defaultValue: "Someone is typing..." });
  }

  if (names.length === 2) {
    return t("x-and-x-are-typing", {
      defaultValue: "{{first}} and {{second}} are typing...",
      first: names[0],
      second: names[1],
    });
  } else if (names.length === 1) {
    return t("x-is-typing", {
      defaultValue: "{{name}} is typing...",
      name: names[0],
    });
  }

  const remainingCount = names.length - 1;
  return t("x-is-typing-and-more", {
    defaultValue: "{{name}} and {{count}} others are typing...",
    name: names[0],
    count: remainingCount,
  });
}

function getMentionContext(
  text: string,
  cursorPosition: number
): { startIndex: number; query: string } | null {
  const beforeCursor = text.slice(0, cursorPosition);
  const atIndex = beforeCursor.lastIndexOf("@");
  if (atIndex < 0) {
    return null;
  }

  if (atIndex > 0 && /[\w]/.test(beforeCursor[atIndex - 1]!)) {
    return null;
  }

  const query = beforeCursor.slice(atIndex + 1);
  if (/[\s@.,!?;:)}\]]/.test(query)) {
    return null;
  }

  return {
    startIndex: atIndex,
    query,
  };
}

function replaceMentionText(
  text: string,
  startIndex: number,
  endIndex: number,
  mentionText: string
): string {
  return `${text.slice(0, startIndex)}${mentionText}${text.slice(endIndex)}`;
}

export function ChatView(props: ChatViewProps) {
  const { chat } = props;
  const { t } = useI18n();
  const messages = chat.messages.value;
  const draft = useSignal("");
  const cursorPosition = useSignal(0);
  const isSubmitting = useSignal(false);
  const submitError = useSignal<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isFirstRenderRef = useRef(true);
  const wasAtBottomRef = useRef(true);

  const activeParticipants = chat.participants.value.filter(
    (participant) => participant.isActive
  );
  const typingParticipants = chat.typingParticipants.value.filter(
    (p) => !p.isSelf
  );

  const mentionContext = getMentionContext(draft.value, cursorPosition.value);
  const mentionQuery = mentionContext?.query.toLowerCase() ?? "";
  const mentionSuggestions = mentionContext
    ? activeParticipants.filter((participant) => {
        if (!mentionQuery) {
          return true;
        }

        const displayLabel = getParticipantDisplayLabel(
          participant,
          t
        ).toLowerCase();
        const mentionLabel = getParticipantMentionLabel(
          participant,
          t
        ).toLowerCase();
        return (
          displayLabel.includes(mentionQuery) ||
          mentionLabel.includes(mentionQuery) ||
          participant.id.toLowerCase().includes(mentionQuery)
        );
      })
    : [];
  const isMentionPickerOpen = mentionContext !== null;
  const mentionActiveIndex = useSignal(0);

  useEffect(() => {
    mentionActiveIndex.value = 0;
  }, [mentionQuery, mentionSuggestions.length]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      const lastReadId = chat.lastMessageRead.value;
      const lastReadIndex = lastReadId
        ? messages.findIndex((m) => m.id === lastReadId)
        : -1;
      const firstUnread = messages[lastReadIndex + 1] ?? null;
      if (firstUnread) {
        const el = container.querySelector(
          `[data-message-id="${firstUnread.id}"]`
        );
        if (el) {
          el.scrollIntoView({ block: "center" });
          wasAtBottomRef.current = false;
          return;
        }
      }
    }

    if (!chat.lastMessageRead.value) {
      container.scrollTop = container.scrollHeight;
    } else if (wasAtBottomRef.current) {
      // Scroll to the most recent message
      const lastMessageId = messages.at(-1)?.id;
      if (lastMessageId) {
        const el = container.querySelector(
          `[data-message-id="${lastMessageId}"]`
        );
        if (el) {
          el.scrollIntoView({ block: "nearest" });
          return;
        }
      }
      container.scrollTop = container.scrollHeight;
    }
  }, [messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      chat.setTypingStatus(false);
    };
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container || messages.length === 0) return;

    const lastMessageId = messages.at(-1)?.id ?? null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const messageId = (entry.target as HTMLElement).dataset.messageId;
          if (!messageId) continue;
          if (messageId === lastMessageId) {
            wasAtBottomRef.current = entry.isIntersecting;
            if (entry.isIntersecting) {
              chat.markAsRead();
            }
          } else if (entry.isIntersecting) {
            chat.markAsRead(messageId);
          }
        }
      },
      { root: container, threshold: 0 }
    );

    container
      .querySelectorAll("[data-message-id]")
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages.length]);

  const selectMention = (participant: ChatParticipant) => {
    if (!mentionContext) {
      return;
    }

    const mentionText = `@${getParticipantMentionLabel(participant, t)} `;
    draft.value = replaceMentionText(
      draft.value,
      mentionContext.startIndex,
      cursorPosition.value,
      mentionText
    );
    chat.setTypingStatus(draft.value.trim().length > 0);

    window.queueMicrotask(() => {
      const input = inputRef.current;
      if (!input) {
        return;
      }
      const nextCursor = mentionContext.startIndex + mentionText.length;
      input.focus();
      input.setSelectionRange(nextCursor, nextCursor);
      cursorPosition.value = nextCursor;
    });
  };

  const handleInputPositionUpdate = (event: Event) => {
    const target = event.currentTarget as HTMLInputElement;
    cursorPosition.value = target.selectionStart ?? target.value.length;
  };

  const handleMentionKeyDown = (event: KeyboardEvent) => {
    if (!isMentionPickerOpen) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      mentionActiveIndex.value =
        (mentionActiveIndex.value + 1) % mentionSuggestions.length;
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      mentionActiveIndex.value =
        (mentionActiveIndex.value - 1 + mentionSuggestions.length) %
        mentionSuggestions.length;
      return;
    }

    if (event.key === "Enter") {
      const suggestion = mentionSuggestions[mentionActiveIndex.value];
      if (suggestion) {
        event.preventDefault();
        selectMention(suggestion);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cursorPosition.value = 0;
    }
  };

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const text = draft.value.trim();
    if (!text || isSubmitting.value) {
      return;
    }

    isSubmitting.value = true;
    submitError.value = null;
    chat.setTypingStatus(false);

    try {
      await chat.sendMessage({
        type: "text",
        text,
      });
      draft.value = "";
      chat.setTypingStatus(false);
      inputRef.current?.focus();
    } catch (error) {
      submitError.value =
        error instanceof Error
          ? error.message
          : t("unable-to-send-message", {
              defaultValue: "Unable to send message.",
            });
    } finally {
      isSubmitting.value = false;
    }
  };

  const canSubmit = draft.value.trim().length > 0 && !isSubmitting.value;

  return (
    <div className="sb-chat-view">
      <div
        className="sb-chat-view-messages"
        ref={messagesRef}
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="sb-chat-view-empty">
            <p className="sb-chat-view-empty-title">
              {t("no-chat-messages", { defaultValue: "No messages yet" })}
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const avatar = getMessageAvatar(chat, message, t);
            return (
              <article
                className="sb-chat-view-message"
                key={message.id}
                data-message-id={message.id}
              >
                <div className="sb-chat-view-message-avatar-shell">
                  <Avatar
                    imageUrl={avatar.imageUrl}
                    visual={avatar.visual}
                    title={avatar.label}
                    isSelf={avatar.isSelf}
                  />
                </div>
                <div className="sb-chat-view-message-content">
                  <header className="sb-chat-view-message-header">
                    <span className="sb-chat-view-message-author">
                      {getAuthorLabel(chat, message, t)}
                    </span>
                    <span className="sb-chat-view-message-timestamp">
                      <RelativeDateTime timeMs={message.timeMs} />
                    </span>
                  </header>
                  <p className="sb-chat-view-message-body">
                    {getMessageText(message)}
                  </p>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="sb-chat-view-compose-shell">
        {typingParticipants.length > 0 && (
          <div
            className="sb-chat-view-typing-indicator"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span className="sb-chat-view-typing-dots" aria-hidden="true">
              <span className="sb-chat-view-typing-dot" />
              <span className="sb-chat-view-typing-dot" />
              <span className="sb-chat-view-typing-dot" />
            </span>
            <span className="sb-chat-view-typing-text">
              {getTypingIndicatorLabel(typingParticipants, t)}
            </span>
          </div>
        )}

        {isMentionPickerOpen && (
          <div
            className="sb-chat-view-mention-picker"
            role="listbox"
            aria-label={t("active-participants", {
              defaultValue: "Active participants",
            })}
          >
            <p className="sb-chat-view-mention-picker-title">
              {t("active-participants", {
                defaultValue: "Active participants",
              })}
            </p>
            {mentionSuggestions.length === 0 ? (
              <div className="sb-chat-view-mention-picker-empty">
                {t("no-active-participants-match", {
                  defaultValue: "No active participants match",
                })}
              </div>
            ) : (
              <div className="sb-chat-view-mention-picker-list">
                {mentionSuggestions.map((participant, index) => {
                  const isSelected = index === mentionActiveIndex.value;
                  return (
                    <button
                      key={participant.id}
                      type="button"
                      className={`sb-chat-view-mention-picker-item${
                        isSelected ? " is-selected" : ""
                      }`}
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => {
                        selectMention(participant);
                      }}
                    >
                      <span className="sb-chat-view-mention-picker-name">
                        {getParticipantDisplayLabel(participant, t)}
                      </span>
                      <span className="sb-chat-view-mention-picker-meta">
                        @{getParticipantMentionLabel(participant, t)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <form className="sb-chat-view-compose" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="sb-chat-view-input"
            placeholder={t("type-a-message", {
              defaultValue: "Type a message...",
            })}
            value={draft.value}
            onInput={(event) => {
              const input = event.currentTarget as HTMLInputElement;
              draft.value = input.value;
              cursorPosition.value = input.selectionStart ?? input.value.length;
              chat.setTypingStatus(input.value.trim().length > 0);
            }}
            onKeyDown={handleMentionKeyDown}
            onClick={handleInputPositionUpdate}
            onKeyUp={handleInputPositionUpdate}
            onSelect={handleInputPositionUpdate}
            onFocus={handleInputPositionUpdate}
            onBlur={() => {
              chat.setTypingStatus(false);
            }}
            aria-autocomplete="list"
            aria-expanded={isMentionPickerOpen}
            aria-haspopup="listbox"
          />
          <button
            type="submit"
            className="sb-chat-view-send"
            disabled={!canSubmit}
            aria-label={t("send-message", { defaultValue: "Send message" })}
            title={t("send-message", { defaultValue: "Send message" })}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              send
            </span>
          </button>
        </form>
      </div>

      {submitError.value && (
        <p className="sb-chat-view-error" role="alert">
          {submitError.value}
        </p>
      )}
    </div>
  );
}
