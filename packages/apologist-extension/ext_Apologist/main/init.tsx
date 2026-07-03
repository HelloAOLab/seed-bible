import { registerExtension, type SeedBibleState } from "seed-bible";
import { i18n } from "seed-bible/i18n";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";

const completionsSchema = z.object({
  data: z.array(
    z.object({
      prompt: z.string(),
      response: z.string(),
      prompted_at: z.string(),
      response_completed_at: z.string(),
      language: z.string().optional(),
    })
  ),
});

const shareSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      parts: z.array(
        z.object({
          type: z.enum(["text"]),
          text: z.string(),
        })
      ),
    })
  ),
});

const PROVIDER_ID = "apologist-chat-provider";

registerExtension({
  id: "ext_Apologist",
  init: function* (context: SeedBibleState) {
    console.log("Apologist extension initialized with context:", context);

    const url = context.navigation.currentUrl.value;
    const apologistName = url.searchParams.get("apologistName") ?? null;
    const apologistIconUrl =
      url.searchParams.get("apologistIconUrl") ?? undefined;
    const customApologistDomain =
      url.searchParams.get("apologistDomain") ?? null;
    const apologistDomain = customApologistDomain ?? "apologist.ao.bot";
    const apologistApiKey = url.searchParams.get("apologistApiKey") ?? null;
    const apologistShareToken =
      url.searchParams.get("apologistShareToken") ?? null;
    const apologistModel =
      url.searchParams.get("apologistModel") ?? "openai/gpt/5-mini";
    const apologistConversationId: string | null =
      url.searchParams.get("apologistConversation") ?? null;

    if (customApologistDomain && !apologistApiKey) {
      console.error(
        "[Apologist] Using a custom domain requires an API key to be set."
      );
      return;
    }

    // TODO: Add logo for apologist
    yield context.chats.registerProvider({
      id: PROVIDER_ID,
      name: apologistName ?? {
        key: "title",
        defaultValue: "Apologist",
        ns: "ext_Apologist",
      },
      iconUrl: apologistIconUrl,
      supportsSharedChats: true,
      generateResponse: async (chatContext) => {
        const lastMessage =
          chatContext.messages[chatContext.messages.length - 1];
        console.log("Generating response for message:", lastMessage);

        const contextMessage = {
          role: "user",
          content: `Currently reading: ${context.app.selectedTab.value?.readingState.bookId} ${context.app.selectedTab.value?.readingState.chapterNumber}`,
        };

        const response = await fetch(
          `https://${apologistDomain}/api/v1/chat/completions`,
          {
            method: "POST",
            body: JSON.stringify({
              model: apologistModel,
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
            }),
            headers: apologistApiKey
              ? {
                  Authorization: `Bearer ${apologistApiKey}`,
                }
              : {},
          }
        );

        const responseData = await response.json();
        const message = responseData.choices[0].message;

        if (message) {
          return {
            type: "text",
            text: message.content,
          };
        }

        return null;
      },
    });

    if (apologistShareToken) {
      // init conversation
      const initConversation = async () => {
        try {
          console.log(
            "[Apologist] Getting conversation history for share token:",
            apologistShareToken
          );
          const response = await fetch(
            `https://${apologistDomain}/api/v1/shares/${encodeURIComponent(apologistShareToken)}`
          );

          const responseData = await response.json();

          console.log("Share response:", responseData);
          const shareData = shareSchema.parse(responseData);

          // TODO: Support detecting langauge from share data.
          // const lastLanguage =
          //   shareData.messages[shareData.messages.length - 1]?.language;
          // if (lastLanguage) {
          //   console.log(
          //     `[Apologist] Setting language to ${lastLanguage} based on conversation history.`
          //   );
          //   i18n.changeLanguage(lastLanguage);
          // }

          // build conversation
          const messages = [];
          for (const message of shareData.messages) {
            const content = message.parts
              .map((part) => {
                if (part.type === "text") {
                  return part.text;
                }
                return "";
              })
              .join("");

            messages.push({
              role: message.role,
              content,
              // TODO: Load actual timestamp from messages when available
              timeMs: Date.now(),
              // DateTime.fromSQL(completion.response_completed_at, {
              //   zone: "utc",
              // }).toMillis(),
            });
          }

          const session = context.chats.createLocalSession({
            messages: messages.map((m) => ({
              type: "text",
              id: uuid(),
              text: m.content,
              authors: [
                m.role === "user"
                  ? (context.login.userId.value ?? "local-user")
                  : PROVIDER_ID,
              ],
              targets: [],
              timeMs: m.timeMs,
            })),
            providerIds: [PROVIDER_ID],
          });

          session.markAsRead();
          context.sidebar.openChatPanel();
          context.chats.selectChat(session.id);

          console.log("[Apologist] Conversation history:", messages);
        } catch (err) {
          console.error("[Apologist] Failed to initialize conversation:", err);

          // TODO: Consider whether to initialize chat if conversation history fails to load
          // const session = context.chats.createLocalSession();
          // context.sidebar.openChatPanel();
          // context.chats.selectChat(session.id);
        }
      };

      initConversation();
    } else if (apologistConversationId) {
      // init conversation
      const initConversation = async () => {
        try {
          console.log(
            "[Apologist] Getting conversation history for conversation ID:",
            apologistConversationId
          );
          const response = await fetch(
            `https://${apologistDomain}/api/v1/chat/completions?conversation_id=${encodeURIComponent(apologistConversationId)}`,
            {
              headers: apologistApiKey
                ? {
                    Authorization: `Bearer ${apologistApiKey}`,
                  }
                : {},
            }
          );

          const responseData = await response.json();
          const completions = completionsSchema.parse(responseData);

          const lastLanguage =
            completions.data[completions.data.length - 1]?.language;
          if (lastLanguage) {
            console.log(
              `[Apologist] Setting language to ${lastLanguage} based on conversation history.`
            );
            i18n.changeLanguage(lastLanguage);
          }

          // build conversation
          const messages = [];
          for (const completion of completions.data) {
            messages.push({
              role: "user",
              content: completion.prompt,
              timeMs: DateTime.fromSQL(completion.prompted_at, {
                zone: "utc",
              }).toMillis(),
            });
            messages.push({
              role: "assistant",
              content: completion.response,
              timeMs: DateTime.fromSQL(completion.response_completed_at, {
                zone: "utc",
              }).toMillis(),
            });
          }

          const session = context.chats.createLocalSession({
            messages: messages.map((m) => ({
              type: "text",
              id: uuid(),
              text: m.content,
              authors: [
                m.role === "user"
                  ? (context.login.userId.value ?? "local-user")
                  : PROVIDER_ID,
              ],
              targets: [],
              timeMs: m.timeMs,
            })),
            providerIds: [PROVIDER_ID],
          });

          session.markAsRead();
          context.sidebar.openChatPanel();
          context.chats.selectChat(session.id);

          console.log("[Apologist] Conversation history:", messages);
        } catch (err) {
          console.error("[Apologist] Failed to initialize conversation:", err);

          // TODO: Consider whether to initialize chat if conversation history fails to load
          // const session = context.chats.createLocalSession();
          // context.sidebar.openChatPanel();
          // context.chats.selectChat(session.id);
        }
      };

      initConversation();
    }

    return {};
  },
});
