import { type SeedBibleState } from "seed-bible";
import { z } from "zod";

const bonfireSessionStartResponseSchema = z.object({
  session: z.object({
    session_id: z.string(),
  }),
});

const bonfireChatResponseSchema = z.object({
  session_id: z.string(),
  message: z.object({
    id: z.string(),
    role: z.string(),
    content: z.string(),
  }),
  sources: z.array(z.unknown()).optional(),
  usage: z
    .object({
      input_tokens: z.number(),
      output_tokens: z.number(),
      cost_usd: z.number(),
    })
    .optional(),
  quota: z
    .object({
      org_limit: z.number(),
      org_used: z.number(),
      org_remaining: z.number(),
      org_used_pct: z.number(),
      request_interaction_cost: z.number(),
    })
    .optional(),
});

export interface BonfireOptions {
  /** The organization ID for the Bonfire API. */
  orgId: string;
  /** The AI ID for the Bonfire API. */
  aiId: string;
  /** The API key for the Bonfire API. */
  // apiKey: string;
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
  const { orgId, aiId, name, iconUrl } = options;
  const headers = {
    "Content-Type": "application/json",
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
        "https://bonfire.seedbible.io/api/v1/session/start",
        {
          method: "POST",
          body: JSON.stringify({
            org_id: orgId,
            ai_id: aiId,
            metadata: { client: "seed-bible" },
          }),
          headers,
        }
      );
      const data = bonfireSessionStartResponseSchema.parse(
        await response.json()
      );
      console.log("[Bonfire] Session created", data);
      chatSessionMap.set(chatContext.chatId, data.session.session_id);
    },
    onLeaveChat: async (chatContext) => {
      console.log("[Bonfire] Deleting session for chat", chatContext.chatId);
      const sessionId = chatSessionMap.get(chatContext.chatId);
      if (sessionId) {
        await fetch(`https://bonfire.seedbible.io/api/v1/session/end`, {
          method: "POST",
          body: JSON.stringify({
            org_id: orgId,
            ai_id: aiId,
            session_id: sessionId,
          }),
          headers: {
            ...headers,
            "Idempotency-Key": crypto.randomUUID(),
          },
        });
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
        "https://bonfire.seedbible.io/api/v1/session/chat",
        {
          method: "POST",
          body: JSON.stringify({
            org_id: orgId,
            ai_id: aiId,
            session_id: sessionId,
            stream: true,
            input: {
              content: lastMessage?.type === "text" ? lastMessage?.text : "",
            },
            custom_instructions: `You are chatting with a user who is reading the Bible. They are currently reading: ${readingState?.bookId} ${readingState?.chapterNumber}. Keep responses tweet-length. Your responses should be in the same language as the user's messages.`,
          }),
          headers,
        }
      );

      const data = bonfireChatResponseSchema.parse(await response.json());

      const message = data.message;

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
