import { type SeedBibleState } from "seed-bible";
import { z } from "zod";

const bonfireSessionStartResponseSchema = z.object({
  session: z.object({
    session_id: z.string(),
  }),
});

const bonfireMessageDeltaEventSchema = z.object({
  delta: z.string(),
});

/**
 * Reads a Bonfire `session/chat` SSE stream — lines of `event: <name>`
 * followed by `data: <json>` — and yields each event's name and parsed
 * payload.
 */
async function* parseBonfireEventStream(
  response: Response
): AsyncGenerator<{ event: string; data: unknown }> {
  if (!response.body) {
    throw new Error("Bonfire chat response has no readable body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventName: string | null = null;

  const consumeLine = (
    line: string
  ): { event: string; data: unknown } | null => {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      return null;
    }
    if (line.startsWith("data:") && eventName) {
      const payload = line.slice("data:".length).trim();
      const event = eventName;
      eventName = null;
      return payload ? { event, data: JSON.parse(payload) } : null;
    }
    return null;
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        const parsed = consumeLine(buffer.trim());
        if (parsed) {
          yield parsed;
        }
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line) {
          continue;
        }

        const parsed = consumeLine(line);
        if (parsed) {
          yield parsed;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Turns a Bonfire `session/chat` SSE response into a stream of text deltas
 * for {@link StreamingTextChatMessageOptions}. The narration
 * (`agent.run.*`), `sources`, `usage`, `quota`, and `message.done` events are
 * ignored since nothing here consumes them yet.
 */
async function* streamBonfireMessageDeltas(
  response: Response
): AsyncGenerator<string> {
  if (!response.ok) {
    throw new Error(
      `Bonfire chat request failed with status ${response.status}`
    );
  }

  for await (const { event, data } of parseBonfireEventStream(response)) {
    if (event !== "message.delta") {
      continue;
    }
    yield bonfireMessageDeltaEventSchema.parse(data).delta;
  }
}

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
            custom_instructions: `You are chatting with a user who is reading the Bible. They are currently reading: ${readingState?.bookId} ${readingState?.chapterNumber}`,
          }),
          headers,
        }
      );

      return {
        type: "text",
        text: streamBonfireMessageDeltas(response),
      };
    },
  });
}
