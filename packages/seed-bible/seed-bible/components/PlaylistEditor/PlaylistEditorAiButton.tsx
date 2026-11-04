import "../DiscoverPane/DiscoverPane.css";
import { v4 as uuid } from "uuid";
import { useI18n } from "../../i18n/I18nManager";
import type { ChatsManager } from "../../managers/ChatsManager";
import { translateTitle } from "../../app/utils";
import { MaterialIcon } from "../icons";
import {
  ContextMenuItem,
  ContextMenuWithButton,
} from "../ContextMenu/ContextMenu";

/**
 * "Edit playlist with AI": opens the chat panel on a local chat with an AI
 * that can call tools, seeded with a prompt asking what to change. The
 * playlist manager offers the playlist-editing tools to every chat while a
 * playlist is being edited, so the AI's replies can change the draft. With
 * several such AIs, a menu picks which one; with none, nothing shows.
 */
export function PlaylistEditorAiButton(props: {
  chats: ChatsManager;
  openChatPanel: () => void;
}) {
  const { chats, openChatPanel } = props;
  const { t } = useI18n();
  const providers = chats.providers.value.filter((p) => p.supportsToolCalling);
  const startAiChat = (providerId: string) => {
    let chat = chats.chats.value.find(
      (c) =>
        c.participants.value.every((p) => !p.isRemote) &&
        c.participants.value.some((p) => p.isAI && p.providerId === providerId)
    );
    if (!chat) {
      chat = chats.createLocalSession({
        messages: [
          {
            id: uuid(),
            authors: [providerId],
            timeMs: Date.now(),
            targets: [],
            type: "text",
            text: t("ai-playlist-chat-prompt", {
              defaultValue: "What do you want to add/change?",
            }),
          },
        ],
        providerIds: [],
      });
    }
    chat.addParticipant(providerId);
    chats.selectChat(chat.id);
    openChatPanel();
  };
  const label = t("ai", { defaultValue: "AI" });
  const ariaLabel = t("ai-edit-playlist", {
    defaultValue: "Edit playlist with AI",
  });

  if (providers.length > 1) {
    return (
      <ContextMenuWithButton
        buttonClassName="sb-discover-title-ai"
        aria-label={ariaLabel}
        title={label}
        icon={<MaterialIcon>auto_awesome</MaterialIcon>}
      >
        {providers.map((provider) => (
          <ContextMenuItem
            key={provider.id}
            onClick={() => startAiChat(provider.id)}
          >
            {translateTitle(t, provider.name)}
          </ContextMenuItem>
        ))}
      </ContextMenuWithButton>
    );
  }
  const single = providers[0];
  if (!single) {
    return null;
  }
  return (
    <button
      type="button"
      className="sb-discover-title-ai"
      aria-label={ariaLabel}
      title={label}
      onClick={() => startAiChat(single.id)}
    >
      <MaterialIcon>auto_awesome</MaterialIcon>
    </button>
  );
}
