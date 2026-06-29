import { type SeedBibleState } from "seed-bible";

export interface BonfireOptions {
  /** The organization ID for the Bonfire API. */
  orgId: string;
  /** The AI ID for the Bonfire API. */
  aiId: string;
  /** The API key for the Bonfire API. */
  apiKey: string;
  /** The name of the Bonfire chat provider. */
  name: string;
  /** The URL of the icon for the Bonfire chat provider. */
  iconUrl?: string;
}

/**
 * Registers a new chat provider that integrates with the [Bonfire API](https://app.heybonfire.com/api-docs).
 * @param context The SeedBibleState context provided by the extension initialization. Used to register the chat provider.
 * @param options The options for configuring the Bonfire chat provider.
 */
export function* registerBonfireChatProvider(
  context: SeedBibleState,
  options: BonfireOptions
) {
  const { orgId, aiId, apiKey, name, iconUrl } = options;
  const headers = {
    "X-API-Key": apiKey,
  };

  // Map of chat IDs to bonfire session IDs
  const chatSessionMap = new Map<string, string>();

  // TODO: Add default logo for Bonfire
  yield context.chats.registerProvider({
    id: "bonfire-chat-provider",
    name: name ?? {
      key: "title",
      defaultValue: "Bonfire",
      ns: "ext_Bonfire",
    },
    iconUrl,

    // Currently Bonfire doesn't support shared chats because it uses sessions
    // and doesn't let us provide the entire chat context.
    supportsSharedChats: false,

    onJoinChat: async (chatContext) => {
      console.log("[Bonfire] Creating session for chat", chatContext.chatId);
      const response = await fetch(
        "https://api.heybonfire.com/api/v1/sessions",
        {
          method: "POST",
          body: JSON.stringify({
            org_id: orgId,
            ai_id: aiId,
          }),
          headers,
        }
      );
      const data = await response.json();
      console.log("[Bonfire] Session created", data);
      chatSessionMap.set(chatContext.chatId, data.session.session_id);
    },
    onLeaveChat: async (chatContext) => {
      console.log("[Bonfire] Deleting session for chat", chatContext.chatId);
      const sessionId = chatSessionMap.get(chatContext.chatId);
      if (sessionId) {
        const response = await fetch(
          `https://api.heybonfire.com/api/v1/sessions/end`,
          {
            method: "POST",
            body: JSON.stringify({
              org_id: orgId,
              ai_id: aiId,
              session_id: sessionId,
            }),
            headers,
          }
        );
        console.log("[Bonfire] Session deleted");
        chatSessionMap.delete(chatContext.chatId);
      }
    },
    generateResponse: async (chatContext) => {
      const sessionId = chatSessionMap.get(chatContext.chatId);

      if (!sessionId) {
        console.error(
          "[Bonfire] No Bonfire session found for chat",
          chatContext.chatId
        );
        return null;
      }

      const lastMessage = chatContext.messages[chatContext.messages.length - 1];

      if (!lastMessage) {
        console.error(
          "[Bonfire] No messages found in chat context",
          chatContext.chatId
        );
        return null;
      }
      console.log("[Bonfire] Generating response for message:", lastMessage);

      const readingState = context.app.selectedTab.value?.readingState;
      const response = await fetch(
        "https://api.heybonfire.com/api/v1/chat/completions",
        {
          method: "POST",
          body: JSON.stringify({
            stream: false,
            input: {
              content: lastMessage?.text,
            },
            custom_instructions: `You are chatting with a user who is reading the Bible. They are currently reading: ${readingState?.bookId} ${readingState?.chapterNumber}. Keep responses tweet-length. Your responses should be in the same language as the user's messages.`,
          }),
          headers,
        }
      );

      const data = await response.json();

      const message = data.choices[0].message;

      if (message) {
        return {
          type: "text",
          text: message.content,
        };
      }

      return null;
    },
  });
}
