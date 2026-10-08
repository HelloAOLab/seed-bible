import { registerExtension, type SeedBibleState } from "seed-bible";
import { i18n } from "seed-bible/i18n";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import { computed, effect, untracked } from "@preact/signals";
import {
  resolveMessageAuthors,
  type ChatProvider,
  type ChatProviderMessageOptions,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type {
  DiscoverContentResult,
  DiscoverProvider,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import { PlaylistLinkContent } from "seed-bible/components";
import { rankResultsForChapter, searchApologistContent } from "./search";
import {
  APOLOGIST_EXTENSION_ID,
  createApologistRequest,
  DEFAULT_APOLOGIST_DOMAIN,
} from "./apologistRequest";
import {
  getEffectiveSeedTranslationForAi,
  postApologistChatCompletion,
  resolveApologistBible,
  uiLocaleForApologist,
} from "./apologistBible";

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
const DISCOVER_PROVIDER_ID = "apologist-discover-provider";
const DEFAULT_APOLOGIST_MODEL = "openai/gpt/5-mini";

// Bounds the tool-call resolution loop below so a model that never emits
// final content (or keeps calling tools) can't hang generateResponse forever.
const MAX_COMPLETION_TURNS = 25;

export default function initApologistExtension() {
  registerExtension({
    id: "ext_Apologist",
    init: function* (context: SeedBibleState) {
      console.log("Apologist extension initialized with context:", context);

      const url = context.navigation.currentUrl.value;
      const urlName = url.searchParams.get("apologistName") ?? null;
      const apologistIconUrl =
        url.searchParams.get("apologistIconUrl") ?? undefined;
      const customApologistDomain =
        url.searchParams.get("apologistDomain") ?? null;
      const apologistDomain = customApologistDomain ?? DEFAULT_APOLOGIST_DOMAIN;
      const apologistApiKey = url.searchParams.get("apologistApiKey") ?? null;
      const apologistShareToken =
        url.searchParams.get("apologistShareToken") ?? null;
      const urlModel = url.searchParams.get("apologistModel") ?? null;
      const apologistConversationId: string | null =
        url.searchParams.get("apologistConversation") ?? null;
      const rawApologistTeamId = url.searchParams.get("apologistTeamID");
      const urlTeamId =
        rawApologistTeamId && /^\d+$/.test(rawApologistTeamId)
          ? Number(rawApologistTeamId)
          : null;
      if (rawApologistTeamId && urlTeamId === null) {
        console.error(
          `[Apologist] apologistTeamID must be an integer, got "${rawApologistTeamId}". Ignoring it.`
        );
      }

      // A value in the link wins over the one saved in settings. Saved values
      // load after sign-in and can change at any time, so they are read
      // through signals rather than once here.
      const readSavedText = (key: string): string | null => {
        const saved = context.extensionSettings.getValue(
          APOLOGIST_EXTENSION_ID,
          key
        );
        return typeof saved === "string" && saved.trim() ? saved.trim() : null;
      };
      const customName = computed(() => urlName ?? readSavedText("name"));
      const contentAuthor = computed(() => readSavedText("contentAuthor"));
      // Checked against the opposite of each default so that `undefined` (the
      // manifest isn't registered yet) keeps chat on and Discover off.
      const chatEnabled = computed(
        () =>
          context.extensionSettings.getValue(
            APOLOGIST_EXTENSION_ID,
            "chatEnabled"
          ) !== false
      );
      // A team ID in the link turns Discover on, since whoever shared it meant
      // the team's content to show, and signed-out viewers can't change
      // settings. Only the viewer's own saved choice beats it, not a default.
      const discoverEnabled = computed(() => {
        const ownValue =
          context.extensionSettings.valuesByExtensionId.value[
            APOLOGIST_EXTENSION_ID
          ]?.discoverEnabled;
        if (typeof ownValue === "boolean") {
          return ownValue;
        }
        return (
          urlTeamId !== null ||
          context.extensionSettings.getValue(
            APOLOGIST_EXTENSION_ID,
            "discoverEnabled"
          ) === true
        );
      });

      const apologistRequest = createApologistRequest(context, {
        domain: apologistDomain,
        apiKey: apologistApiKey,
      });

      if (customApologistDomain && !apologistApiKey) {
        console.error(
          "[Apologist] Using a custom domain requires an API key to be set."
        );
        return;
      }

      const createChatProvider = (name: string | null): ChatProvider => ({
        id: PROVIDER_ID,
        name: name ?? {
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
          const seedTranslation = getEffectiveSeedTranslationForAi(context);
          const bibleResolution = resolveApologistBible(seedTranslation);
          if (bibleResolution.usedFallback && seedTranslation) {
            console.warn(
              `[Apologist] Bible translation "${seedTranslation.id}" isn't supported; using "${bibleResolution.code}" instead.`
            );
          }

          const uiLanguage = uiLocaleForApologist(i18n.language);
          const readingInstructions =
            chatContext.instructions ??
            `Currently reading: ${context.app.selectedTab.value?.readingState.bookId.value} ${context.app.selectedTab.value?.readingState.chapterNumber.value}`;
          const languageAndBibleInstructions = [
            `User has their UI language set to ${uiLanguage}, however when speaking to the user you should prioritize replying in the language they are writing in if you can tell what it is, otherwise fall back to speaking to them in ${uiLanguage}.`,
            `When quoting scripture for the user, use their active Bible translation which is ${bibleResolution.code}.`,
          ].join(" ");

          const contextMessage: ChatMessage = {
            role: "developer",
            content: `${readingInstructions}\n\n${languageAndBibleInstructions}`,
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

          let bibleCode = bibleResolution.code;

          let turn = 0;
          for (; turn < MAX_COMPLETION_TURNS; turn++) {
            const { response, bible, retriedWithDefault } =
              await postApologistChatCompletion({
                send: (body) =>
                  apologistRequest("/api/v1/chat/completions", {
                    method: "POST",
                    body,
                  }),
                model:
                  urlModel ?? readSavedText("model") ?? DEFAULT_APOLOGIST_MODEL,
                stream: true,
                language: uiLanguage,
                bible: bibleCode,
                messages,
                tools,
              });

            if (retriedWithDefault) {
              console.warn(
                `[Apologist] Agent rejected bible "${bibleCode}"; retrying with "${bible}".`
              );
              bibleCode = bible;
            }

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
                const result = await tool.function(args, {
                  chatId: chatContext.chatId,
                  providerId: PROVIDER_ID,
                });

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

          // Only reached by using up every turn; the loop's normal endings
          // `break` with turns to spare. Throwing lets ChatsManager post its
          // standard error message instead of leaving the chat silent.
          if (turn === MAX_COMPLETION_TURNS) {
            throw new Error(
              `stopped after ${MAX_COMPLETION_TURNS} rounds of tool calls without an answer`
            );
          }
        },
      });

      // Registering under the same id swaps the provider in place, so a new
      // name shows in every open chat. Unregistering first would instead
      // remove the agent from those chats, which is only wanted when chat is
      // turned off.
      let unregisterChatProvider: (() => void) | null = null;
      const disposeChatEffect = effect(() => {
        const enabled = chatEnabled.value;
        const name = customName.value;
        untracked(() => {
          if (!enabled) {
            unregisterChatProvider?.();
            unregisterChatProvider = null;
            return;
          }
          unregisterChatProvider = context.chats.registerProvider(
            createChatProvider(name)
          );
        });
      });
      yield () => {
        disposeChatEffect();
        unregisterChatProvider?.();
      };

      // `reference` has to name the chapter being read: results whose
      // reference doesn't match it are dropped before display.
      const createDiscoverProvider = (
        teamId: number,
        name: string | null,
        author: string | null
      ): DiscoverProvider => {
        const providerName =
          name ??
          i18n.t("title", { ns: "ext_Apologist", defaultValue: "Apologist" });
        return {
          id: DISCOVER_PROVIDER_ID,
          title: providerName,
          description: "Content from your Apologist team.",
          discover: async ({ translationId, book, chapter }) => {
            const bookName =
              context.bibleData
                .getCachedTranslationBooks(translationId)
                ?.books.find((b) => b.id === book)?.name ?? book;

            const results = await searchApologistContent(apologistRequest, {
              query: `${bookName} ${chapter}`,
              teamId,
            });

            return rankResultsForChapter(results, bookName, chapter).map(
              (item): DiscoverContentResult => ({
                type: "content",
                title: item.title,
                description: item.description,
                reference: { book, chapter },
                // Results are grouped by author in the Discover pane.
                author: author ?? item.source ?? item.author ?? providerName,
                image: item.image,
                onClick: () => {
                  context.modals.openModal({
                    id: `apologist-content-${item.id}`,
                    title: item.title,
                    content: () => (
                      <PlaylistLinkContent url={item.url} title={item.title} />
                    ),
                  });
                },
              })
            );
          },
        };
      };

      // The provider is swapped whenever the team, name or content author
      // changes, which also re-runs the search for the open chapter. It's
      // removed while Discover is turned off or there's no team.
      const teamId = computed(() => {
        if (urlTeamId !== null) {
          return urlTeamId;
        }
        const saved = context.extensionSettings.getValue(
          APOLOGIST_EXTENSION_ID,
          "teamId"
        );
        return typeof saved === "number" && Number.isInteger(saved) && saved > 0
          ? saved
          : null;
      });
      let unregisterDiscoverProvider: (() => void) | null = null;
      const disposeDiscoverEffect = effect(() => {
        const id = discoverEnabled.value ? teamId.value : null;
        const name = customName.value;
        const author = contentAuthor.value;
        untracked(() => {
          unregisterDiscoverProvider?.();
          unregisterDiscoverProvider =
            id === null
              ? null
              : context.discover.registerDiscoverProvider(
                  createDiscoverProvider(id, name, author)
                );
        });
      });
      yield () => {
        disposeDiscoverEffect();
        unregisterDiscoverProvider?.();
      };

      if (apologistShareToken) {
        // init conversation
        const initConversation = async () => {
          try {
            console.log(
              "[Apologist] Getting conversation history for share token:",
              apologistShareToken
            );
            const response = await apologistRequest(
              `/api/v1/shares/${encodeURIComponent(apologistShareToken)}`
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
            const response = await apologistRequest(
              `/api/v1/chat/completions?conversation_id=${encodeURIComponent(apologistConversationId)}`
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
