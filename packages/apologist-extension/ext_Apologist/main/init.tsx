/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";

registerExtension({
  id: "ext_Apologist",
  init: function* (context: SeedBibleState) {
    console.log("Apologist extension initialized with context:", context);

    const apiKey = thisBot.tags.secrets.apologistApiKey;

    yield context.chats.registerProvider({
      id: "apologist-chat-provider",
      name: "Apologist",
      generateResponse: async (context) => {
        const lastMessage = context.messages[context.messages.length - 1];
        console.log("Generating response for message:", lastMessage);

        const response = await web.post(
          "https://ao.discipleship.bot/api/v1/chat/completions",
          {
            model: "openai/gpt/5-mini",
            stream: false,
            messages: context.messages.map((m) => ({
              role: m.authors.some((a) => a === context.participant.id)
                ? "user"
                : "assistant",
              content: m.text,
            })),
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
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
