import { registerExtension, type SeedBibleState } from "seed-bible";
import { i18n } from "seed-bible/i18n";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { DateTime } from "luxon";
import { computed, effect, untracked } from "@preact/signals";
import type {
  ChatProvider,
  ChatProviderMessageOptions,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import {
  runChatCompletionToolLoop,
  toChatCompletionMessages,
  toChatCompletionTools,
} from "@packages/seed-bible/seed-bible/managers/ChatCompletions";
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
const DISCOVER_PROVIDER_ID = "apologist-discover-provider";
const DEFAULT_APOLOGIST_MODEL = "openai/gpt/5-mini";

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

          let bibleCode = bibleResolution.code;
          const tools = toChatCompletionTools(chatContext.tools);

          yield* runChatCompletionToolLoop({
            messages: [
              {
                role: "developer",
                content: `${readingInstructions}\n\n${languageAndBibleInstructions}`,
              },
              ...toChatCompletionMessages(chatContext, PROVIDER_ID),
            ],
            tools: chatContext.tools,
            toolCallContext: {
              chatId: chatContext.chatId,
              providerId: PROVIDER_ID,
            },
            requestCompletion: async (messages) => {
              const { response, bible, retriedWithDefault } =
                await postApologistChatCompletion({
                  send: (body) =>
                    apologistRequest("/api/v1/chat/completions", {
                      method: "POST",
                      body,
                    }),
                  model:
                    urlModel ??
                    readSavedText("model") ??
                    DEFAULT_APOLOGIST_MODEL,
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
              return response;
            },
          });
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
