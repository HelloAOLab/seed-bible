/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";

registerExtension({
  id: "ext_Bonfire",
  init: function* (context: SeedBibleState) {
    console.log("Bonfire extension initialized with context:", context);

    const orgId = configBot.tags.bonfireOrgId;
    const aiId = configBot.tags.bonfireAiId;
    const apiKey = configBot.tags.bonfireApiKey;

    if (!orgId || !aiId || !apiKey) {
      console.error(
        "Bonfire extension requires bonfireOrgId, bonfireAiId, and bonfireApiKey to be set in configBot tags"
      );
      return;
    }

    const headers = {
      "X-API-Key": apiKey,
    };

    // Map of chat IDs to bonfire session IDs
    const chatSessionMap = new Map<string, string>();

    // TODO: Add default logo for Bonfire
    yield context.chats.registerProvider({
      id: "bonfire-chat-provider",
      name: configBot.tags.bonfireName ?? {
        key: "title",
        defaultValue: "Bonfire",
        ns: "ext_Bonfire",
      },
      iconUrl: configBot.tags.bonfireIconUrl ?? null,
      supportsSharedChats: true,
      onJoinChat: async (chatContext) => {
        console.log("[Bonfire] Creating session for chat", chatContext.chatId);
        const response = await web.post(
          "https://api.heybonfire.com/api/v1/sessions",
          {
            org_id: orgId,
            ai_id: aiId,
          },
          {
            headers,
          }
        );
        console.log("[Bonfire] Session created", response.data);
        chatSessionMap.set(
          chatContext.chatId,
          response.data.session.session_id
        );
      },
      onLeaveChat: async (chatContext) => {
        console.log("[Bonfire] Deleting session for chat", chatContext.chatId);
        const sessionId = chatSessionMap.get(chatContext.chatId);
        if (sessionId) {
          await web.post(
            `https://api.heybonfire.com/api/v1/sessions/end`,
            {
              org_id: orgId,
              ai_id: aiId,
              session_id: sessionId,
            },
            {
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

        const lastMessage =
          chatContext.messages[chatContext.messages.length - 1];

        if (!lastMessage) {
          console.error(
            "[Bonfire] No messages found in chat context",
            chatContext.chatId
          );
          return null;
        }
        console.log("[Bonfire] Generating response for message:", lastMessage);

        const readingState = context.app.selectedTab.value?.readingState;
        const response = await web.post(
          "https://api.heybonfire.com/api/v1/chat/completions",
          {
            stream: false,
            input: {
              content: lastMessage?.text,
            },
            custom_instructions: `You are chatting with a user who is reading the Bible. They are currently reading: ${readingState?.bookId} ${readingState?.chapterNumber}. Keep responses tweet-length. Your responses should be in the same language as the user's messages.`,
          },
          {
            headers,
          }
        );

        const message = response.data.choices[0].message;

        if (message) {
          return {
            type: "text",
            text: message.content,
          };
        }

        return null;
      },
    });

    return {};
  },
});
