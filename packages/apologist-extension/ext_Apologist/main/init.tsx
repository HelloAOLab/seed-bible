/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";
import { i18n } from "seed-bible.i18n.I18nManager";

registerExtension({
  id: "ext_Apologist",
  init: function* (context: SeedBibleState) {
    console.log("Apologist extension initialized with context:", context);

    // TODO: Add logo for apologist
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

        const response = await web.post(
          "https://apologist.ao.bot/api/v1/chat/completions",
          {
            model: "openai/gpt/5-mini",
            stream: false,
            metadata: {
              bible: "bsb",
              language: i18n.language,
            },
            messages: [
              contextMessage,
              ...chatContext.messages.map((m) => ({
                role: m.authors.some((a) => a === chatContext.participant.id)
                  ? "user"
                  : "assistant",
                content: m.text,
              })),
            ],
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
