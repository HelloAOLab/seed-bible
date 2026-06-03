/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";

registerExtension({
  id: "ext_Apologist",
  init: function* (context: SeedBibleState) {
    console.log("Apologist extension initialized with context:", context);

    yield context.chats.registerProvider({
      id: "apologist-chat-provider",
      name: {
        key: "title",
        defaultValue: "Apologist",
        ns: "ext_Apologist",
      },
      supportsSharedChats: true,
      generateResponse: async (chatContext) => {
        const lastMessage =
          chatContext.messages[chatContext.messages.length - 1];
        console.log("Generating response for message:", lastMessage);

        const contextMessage = {
          role: "user",
          content: `Currently reading: ${context.app.selectedTab.value?.readingState.bookId} ${context.app.selectedTab.value?.readingState.chapterNumber}`,
        };

        const response = await window.fetch(
          "https://apologist.ao.bot/api/v1/chat/completions",
          {
            body: JSON.stringify({
              model: "openai/gpt/5-mini",
              stream: false,
              messages: [
                contextMessage,
                ...chatContext.messages.map((m) => ({
                  role: m.authors.some((a) => a === chatContext.participant.id)
                    ? "user"
                    : "assistant",
                  content: m.text,
                })),
              ],
            }),
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to generate response: ${response.statusText}`
          );
        }

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

    return {};
  },
});
