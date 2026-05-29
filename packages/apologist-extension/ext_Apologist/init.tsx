/* eslint-disable seed-bible-i18n/i18n-untranslated-content */
import { registerExtension, type SeedBibleState } from "seed-bible.app.api";

registerExtension({
  id: "ext_Apologist",
  init: function* (context: SeedBibleState) {
    console.log("Apologist extension initialized with context:", context);

    yield context.chats.registerProvider({
      id: "apologist-chat-provider",
      name: "Apologist",
      generateResponse: async (context) => {
        const lastMessage = context.messages[context.messages.length - 1];
        console.log("Generating response for message:", lastMessage);

        if (lastMessage) {
          return {
            type: "text",
            text: "You said: " + lastMessage.text,
          };
        }

        return {
          type: "text",
          text: "Hello! This is a response from the Apologist extension.",
        };
      },
    });

    return {};
  },
});
