import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type {
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

function getAuthorLabel(chat: ChatSession, message: ChatMessage): string {
  const authors = chat
    .getMessageAuthors(message)
    .map((author) => author.name ?? author.id)
    .filter((name) => name && name.trim().length > 0);

  if (authors.length === 0) {
    return "Anonymous";
  }

  return authors.join(", ");
}

export function ChatView(props: ChatViewProps) {
  const { chat } = props;
  const { t } = useI18n();
  const messages = chat.messages.value;
  const draft = useSignal("");
  const isSubmitting = useSignal(false);
  const submitError = useSignal<string | null>(null);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const messagesContainer = messagesRef.current;
    if (!messagesContainer) {
      return;
    }
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }, [messages.length]);

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const text = draft.value.trim();
    if (!text || isSubmitting.value) {
      return;
    }

    isSubmitting.value = true;
    submitError.value = null;

    try {
      await chat.sendMessage({
        type: "text",
        text,
      });
      draft.value = "";
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
          messages.map((message) => (
            <article className="sb-chat-view-message" key={message.id}>
              <header className="sb-chat-view-message-header">
                <span className="sb-chat-view-message-author">
                  {getAuthorLabel(chat, message)}
                </span>
              </header>
              <p className="sb-chat-view-message-body">
                {getMessageText(message)}
              </p>
            </article>
          ))
        )}
      </div>

      <form className="sb-chat-view-compose" onSubmit={handleSubmit}>
        <input
          type="text"
          className="sb-chat-view-input"
          placeholder={t("type-a-message", {
            defaultValue: "Type a message...",
          })}
          value={draft.value}
          onInput={(event) => {
            draft.value = (event.currentTarget as HTMLInputElement).value;
          }}
          disabled={isSubmitting.value}
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

      {submitError.value && (
        <p className="sb-chat-view-error" role="alert">
          {submitError.value}
        </p>
      )}
    </div>
  );
}
