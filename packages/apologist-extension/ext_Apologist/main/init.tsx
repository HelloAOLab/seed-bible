import { registerExtension, type SeedBibleState } from "seed-bible";
import { i18n } from "seed-bible/i18n";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import { resolveMessageAuthors } from "@packages/seed-bible/seed-bible/managers/ChatsManager";

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

const chatCompletionToolCallSchema = z.object({
  id: z.string(),
  function: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
});

const chatCompletionMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().nullable().optional(),
  tool_calls: z.array(chatCompletionToolCallSchema).optional(),
});

const chatCompletionResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: chatCompletionMessageSchema.optional(),
      stop_reason: z.string().optional(),
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

type ChatMessage =
  | {
      role: "user" | "assistant" | "developer";
      content?: string | null;
      tool_calls?: {
        id: string;
        function?: { name: string; arguments: string };
      }[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      name: string;
      content: string;
    };

const PROVIDER_ID = "apologist-chat-provider";

// Bounds the tool-call resolution loop below so a model that never emits
// final content (or keeps calling tools) can't hang generateResponse forever.
const MAX_COMPLETION_TURNS = 25;

export default function initApologistExtension() {
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
          console.log("Chat context:", chatContext);

          const instructions =
            chatContext.instructions ??
            `Currently reading: ${context.app.selectedTab.value?.readingState.bookId} ${context.app.selectedTab.value?.readingState.chapterNumber}`;

          const contextMessage: ChatMessage = {
            role: "developer",
            content: instructions,
          };

          const tools = chatContext.tools?.map((t) => ({
            type: t.type,
            name: t.name,
            description: t.description,
            parameters: t.parameters,
            strict: true,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
              strict: true,
            },
          }));

          const messages: ChatMessage[] = [contextMessage];

          for (const m of chatContext.messages) {
            const authors = resolveMessageAuthors(chatContext.participants, m);
            if (authors.some((a) => a.isSelf)) {
              messages.push({
                role: "user",
                content: m.text,
              });
            } else if (
              authors.some((a) => a.isAI && a.providerId === PROVIDER_ID)
            ) {
              messages.push({
                role: "assistant",
                content: m.text,
              });
            } else {
              messages.push({
                role: "user",
                content: m.text,
              });
            }
          }

          for (let turn = 0; turn < MAX_COMPLETION_TURNS; turn++) {
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
                  messages: messages,
                  tools,
                }),
                headers: apologistApiKey
                  ? {
                      Authorization: `Bearer ${apologistApiKey}`,
                    }
                  : {},
              }
            );

            const responseData = chatCompletionResponseSchema.parse(
              await response.json()
            );

            const choice = responseData.choices[0];
            if (!choice) {
              throw new Error(
                "No choices returned from chat completions response."
              );
            }
            const message = choice.message;

            if (message) {
              messages.push(message);

              if (message.tool_calls) {
                // Resolve tool calls
                for (const call of message.tool_calls) {
                  const fn = call.function;
                  if (fn) {
                    const tool = chatContext.tools?.find(
                      (t) => t.name === fn.name
                    );
                    if (!tool) {
                      throw new Error(`Tool not found: ${fn.name}`);
                    }

                    const args = JSON.parse(fn.arguments);
                    const result = await tool.function(args);

                    messages.push({
                      role: "tool",
                      tool_call_id: call.id,
                      name: fn.name,
                      content: JSON.stringify(result),
                    });
                  }
                }
              }

              if (message.content && !message.tool_calls?.length) {
                return {
                  type: "text",
                  text: message.content,
                };
              }
            }

            if (choice.stop_reason === "stop") {
              break;
            }
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
            console.error(
              "[Apologist] Failed to initialize conversation:",
              err
            );

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
            console.error(
              "[Apologist] Failed to initialize conversation:",
              err
            );

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
}
