import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type {
  ChatParticipant,
  ChatMessage,
  ChatSession,
} from "seed-bible.managers.ChatsManager";

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
        : (author.name ?? author.id)
    )
    .filter((name) => name && name.trim().length > 0);

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

function getAvatarInitials(label: string): string {
  const words = label
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0]!.slice(0, 2).toUpperCase();
  }

  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
}

function getMessageAvatar(
  chat: ChatSession,
  message: ChatMessage,
  t: (key: string, options?: Record<string, unknown>) => string
): {
  imageUrl: string | null;
  label: string;
  initials: string;
} {
  const authors = chat.getMessageAuthors(message);
  const primaryAuthor = authors[0] ?? null;

  if (!primaryAuthor) {
    const anonymous = t("anonymous", { defaultValue: "Anonymous" });
    return {
      imageUrl: null,
      label: anonymous,
      initials: getAvatarInitials(anonymous),
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
    initials: getAvatarInitials(label),
  };
}

function getParticipantDisplayLabel(
  participant: ChatParticipant,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  return participant.isSelf
    ? t("you", { defaultValue: "You" })
    : (participant.name ?? t("anonymous", { defaultValue: "Anonymous" }));
}

function getParticipantMentionLabel(participant: ChatParticipant): string {
  return participant.name?.trim() || participant.id;
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
        const mentionLabel =
          getParticipantMentionLabel(participant).toLowerCase();
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
    const messagesContainer = messagesRef.current;
    if (!messagesContainer) {
      return;
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    return () => {
      chat.setTypingStatus(false);
    };
  }, []);

  const selectMention = (participant: ChatParticipant) => {
    if (!mentionContext) {
      return;
    }

    const mentionText = `@${getParticipantMentionLabel(participant)} `;
    draft.value = replaceMentionText(
      draft.value,
      mentionContext.startIndex,
      cursorPosition.value,
      mentionText
    );
    chat.setTypingStatus(draft.value.trim().length > 0);

    queueMicrotask(() => {
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
              <article className="sb-chat-view-message" key={message.id}>
                <div className="sb-chat-view-message-avatar-shell">
                  {avatar.imageUrl ? (
                    <img
                      src={avatar.imageUrl}
                      alt={`${avatar.label} avatar`}
                      className="sb-chat-view-message-avatar"
                    />
                  ) : (
                    <span
                      className="sb-chat-view-message-avatar sb-chat-view-message-avatar-fallback"
                      aria-hidden="true"
                    >
                      {avatar.initials}
                    </span>
                  )}
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
                        @{getParticipantMentionLabel(participant)}
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
            disabled={isSubmitting.value}
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
