import { registerExtension, type SeedBibleState } from "seed-bible";
import { i18n } from "seed-bible/i18n";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import {
  resolveMessageAuthors,
  type ChatProviderMessageOptions,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";

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

const chatCompletionChunkToolCallDeltaSchema = z.object({
  index: z.number(),
  id: z.string().optional(),
  function: z
    .object({
      name: z.string().optional(),
      arguments: z.string().optional(),
    })
    .optional(),
});

const chatCompletionChunkSchema = z.object({
  choices: z.array(
    z.object({
      delta: z
        .object({
          content: z.string().nullable().optional(),
          tool_calls: z
            .array(chatCompletionChunkToolCallDeltaSchema)
            .optional(),
        })
        .optional(),
      // Tolerate both the standard OpenAI field name and the `stop_reason`
      // name the (now removed) non-streaming schema in this file used.
      finish_reason: z.string().nullable().optional(),
      stop_reason: z.string().nullable().optional(),
    })
  ),
});

interface StreamedChoice {
  delta: {
    content?: string | null;
    tool_calls?: z.infer<typeof chatCompletionChunkToolCallDeltaSchema>[];
  };
  finishReason: string | null;
}

/**
 * Reads an OpenAI-style SSE response body and yields the JSON payload of
 * each `data: ...` line, stopping at the terminal `data: [DONE]` line.
 */
async function* parseSseJsonStream(
  response: Response
): AsyncGenerator<unknown> {
  if (!response.body) {
    throw new Error("Chat completions response has no readable body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        const line = buffer.trim();
        if (line.startsWith("data:")) {
          const payload = line.slice("data:".length).trim();
          if (payload && payload !== "[DONE]") {
            yield JSON.parse(payload);
          }
        }
        return;
      }

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice("data:".length).trim();
        if (payload === "[DONE]") {
          return;
        }

        yield JSON.parse(payload);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Wraps {@link parseSseJsonStream}, validating each chunk and yielding its
 * first choice with a single normalized `finishReason` field.
 */
async function* streamChoices(
  response: Response
): AsyncGenerator<StreamedChoice> {
  for await (const payload of parseSseJsonStream(response)) {
    const chunk = chatCompletionChunkSchema.parse(payload);
    const choice = chunk.choices[0];
    if (!choice) {
      continue;
    }

    yield {
      delta: choice.delta ?? {},
      finishReason: choice.finish_reason ?? choice.stop_reason ?? null,
    };
  }
}

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
      const apologistDomain = customApologistDomain ?? "apologist.seedbible.io";
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
        supportsToolCalling: true,
        generateResponse: async function* (
          chatContext
        ): AsyncGenerator<ChatProviderMessageOptions> {
          const instructions =
            chatContext.instructions ??
            `Currently reading: ${context.app.selectedTab.value?.readingState.bookId} ${context.app.selectedTab.value?.readingState.chapterNumber}`;

          const contextMessage: ChatMessage = {
            role: "developer",
            content: instructions,
          };

          const tools = chatContext.tools?.map((t) => ({
            type: t.type,
            function: {
              name: t.name,
              description: t.description,
              parameters: t.parameters,
              strict: true,
            },
          }));

          const messages: ChatMessage[] = [contextMessage];

          for (const m of chatContext.messages) {
            if (m.type !== "text") {
              continue;
            }
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
                  stream: true,
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

            if (!response.ok) {
              const body = await response.text().catch(() => "");
              throw new Error(
                `Chat completions request failed (${response.status})${
                  body ? `: ${body}` : ""
                }`
              );
            }

            const stream = streamChoices(response);

            // Skip leading deltas that carry no content, no tool_calls, and
            // no finish reason (e.g. the initial `{ role: "assistant" }`-only
            // delta) so we can tell whether this turn is a tool-call turn or
            // a content turn.
            let next = await stream.next();
            while (
              !next.done &&
              !next.value.delta.content &&
              !next.value.delta.tool_calls?.length &&
              !next.value.finishReason
            ) {
              next = await stream.next();
            }

            if (next.done) {
              break;
            }

            const first = next.value;
            let finishReason: string | null = null;

            if (first.delta.tool_calls?.length) {
              const pendingToolCalls = new Map<
                number,
                { id: string; name: string; args: string }
              >();

              const applyToolCallDeltas = (
                deltas: StreamedChoice["delta"]["tool_calls"]
              ) => {
                for (const delta of deltas ?? []) {
                  const existing = pendingToolCalls.get(delta.index) ?? {
                    id: "",
                    name: "",
                    args: "",
                  };
                  if (delta.id) {
                    existing.id = delta.id;
                  }
                  if (delta.function?.name) {
                    existing.name += delta.function.name;
                  }
                  if (delta.function?.arguments) {
                    existing.args += delta.function.arguments;
                  }
                  pendingToolCalls.set(delta.index, existing);
                }
              };

              let current: StreamedChoice | null = first;
              while (current) {
                applyToolCallDeltas(current.delta.tool_calls);
                if (current.finishReason) {
                  finishReason = current.finishReason;
                  break;
                }
                const n = await stream.next();
                current = n.done ? null : n.value;
              }

              const toolCalls = Array.from(pendingToolCalls.values())
                .filter((tc) => tc.name)
                .map((tc) => ({
                  id: tc.id,
                  function: { name: tc.name, arguments: tc.args },
                }));

              messages.push({ role: "assistant", tool_calls: toolCalls });

              // Resolve tool calls
              for (const call of toolCalls) {
                const fn = call.function;
                const tool = chatContext.tools?.find((t) => t.name === fn.name);
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

                yield {
                  type: "tool_call",
                  name: fn.name,
                };
              }

              if (finishReason === "stop") {
                break;
              }
              continue;
            }

            if (!first.delta.content) {
              if (first.finishReason === "stop") {
                break;
              }
              continue;
            }

            let assembledContent = "";
            async function* textDeltas() {
              let current: StreamedChoice | null = first;
              while (current) {
                if (current.delta.content) {
                  assembledContent += current.delta.content;
                  yield current.delta.content;
                }
                if (current.finishReason) {
                  finishReason = current.finishReason;
                  break;
                }
                const n = await stream.next();
                current = n.done ? null : n.value;
              }
            }

            yield {
              type: "text",
              text: textDeltas(),
            };
            messages.push({ role: "assistant", content: assembledContent });
            return;
          }
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
