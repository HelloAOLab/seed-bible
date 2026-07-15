import { computed, signal } from "@preact/signals";
import { z, type ZodSchema } from "zod";
import type { ZodStandardJSONSchemaPayload } from "zod/v4/core";
import type { PlaylistItemData } from "./PlaylistManager";

export interface AIProviderFunctionTool {
  name: string;
  type: "function";
  description: string;
  parameters: ZodStandardJSONSchemaPayload<unknown>;

  /**d
   * The function that should be called by the AI provider if the AI model chooses to call this tool.
   * @param args The arguments to provide to the function.
   * @returns A promise that resolves with the result of the function call.
   */
  function: (args: unknown) => Promise<unknown>;
}

export interface AIProviderGenerateOptions {
  tools: AIProviderFunctionTool[];

  /**
   * The cancel token that can be used to abort the playlist generation request.
   */
  cancelToken: AbortSignal;
}

/**
 * The shape the AI is asked to produce for a single playlist item. Kept
 * distinct from {@link PlaylistItem}: it uses nullable (not optional) fields
 * so the JSON schema handed to the provider is fully specified, and carries
 * all three item variants side-by-side so a single tool definition covers
 * every type. {@link convertToPlaylistItem} maps it back to a real
 * {@link PlaylistItemData}.
 */
export const AIPlaylistItemSchema = z.object({
  type: z.enum(["bible-verse", "link", "html"]),
  bibleVerse: z
    .object({
      ref: z.object({
        bookId: z.string(),
        chapter: z.number().positive(),
        endChapter: z.number().positive().nullable(),
        verse: z.number().positive().nullable(),
        endVerse: z.number().positive().nullable(),
      }),
    })
    .nullable(),
  link: z
    .object({
      title: z.string().nullable(),
      url: z.string(),
    })
    .nullable(),
  html: z
    .object({
      title: z.string().nullable(),
      html: z.string(),
    })
    .nullable(),
});

export const GeneratedPlaylistSchema = z.object({
  items: z.array(AIPlaylistItemSchema),
  title: z.string().nullable(),
  description: z.string().nullable(),
});

export type GeneratedPlaylistItem = z.infer<typeof AIPlaylistItemSchema>;
export type GeneratedPlaylist = z.infer<typeof GeneratedPlaylistSchema>;

export function convertToPlaylistItem(
  item: GeneratedPlaylistItem
): PlaylistItemData {
  switch (item.type) {
    case "bible-verse":
      return {
        type: item.type,
        ref: {
          bookId: item.bibleVerse!.ref.bookId,
          chapter: item.bibleVerse!.ref.chapter,
          endChapter: item.bibleVerse!.ref.endChapter ?? undefined,
          verse: item.bibleVerse!.ref.verse ?? undefined,
          endVerse: item.bibleVerse!.ref.endVerse ?? undefined,
        },
      };
    case "link":
      return {
        type: item.type,
        title: item.link!.title ?? undefined,
        url: item.link!.url,
      };
    case "html":
      return {
        type: item.type,
        title: item.html!.title ?? undefined,
        html: item.html!.html,
      };
  }
}

export function convertToAiPlaylistItem(
  item: PlaylistItemData
): GeneratedPlaylistItem {
  switch (item.type) {
    case "bible-verse":
      return {
        type: item.type,
        bibleVerse: {
          ref: {
            bookId: item.ref.bookId,
            chapter: item.ref.chapter,
            endChapter: item.ref.endChapter ?? null,
            verse: item.ref.verse ?? null,
            endVerse: item.ref.endVerse ?? null,
          },
        },
        link: null,
        html: null,
      };
    case "link":
      return {
        type: item.type,
        bibleVerse: null,
        link: {
          title: item.title ?? null,
          url: item.url,
        },
        html: null,
      };
    case "html":
      return {
        type: item.type,
        bibleVerse: null,
        link: null,
        html: {
          title: item.title ?? null,
          html: item.html,
        },
      };
  }
}

export interface AIProvider {
  /**
   * The unique ID for the AI provider.
   */
  id: string;

  /**
   * Requests that the given AI provider generate a playlist based on the input and options.
   * @param playlist The playlist that is being updated.
   * @param prompt The user-provided prompt.
   * @param options The options that should be used.
   * @returns A promise that resolves when the playlist has been generated.
   */
  updatePlaylist?: (
    playlist: GeneratedPlaylist,
    prompt: string,
    options: AIProviderGenerateOptions
  ) => AsyncGenerator<string, void, void>;
}

export function generateFunctionTool<T>(options: {
  name: string;
  description: string;
  parameters: ZodSchema<T>;
  function: (args: T) => Promise<unknown>;
}): { tool: AIProviderFunctionTool; schema: ZodSchema<T> } {
  const tool: AIProviderFunctionTool = {
    name: options.name,
    type: "function",
    description: options.description,
    parameters: options.parameters.toJSONSchema(),
    function: (args: unknown) => {
      const result = options.parameters.safeParse(args);
      if (!result.success) {
        return Promise.reject(result.error);
      }
      return options.function(result.data);
    },
  };
  return {
    tool,
    schema: options.parameters,
  };
}

/**
 * A manager that keeps track of AI providers which can provide AI-powered features.
 */
export function createAIManager() {
  const providers = signal<AIProvider[]>([]);
  const tools = signal<AIProviderFunctionTool[]>([]);

  const registerProvider = (provider: AIProvider): (() => void) => {
    const index = providers.value.findIndex((p) => p.id === provider.id);
    if (index === -1) {
      providers.value = [...providers.peek(), provider];
    }

    return () => {
      unregisterProvider(provider.id);
    };
  };

  const unregisterProvider = (providerId: string) => {
    providers.value = providers.peek().filter((p) => p.id !== providerId);
  };

  const getProviderById = (providerId: string): AIProvider | undefined => {
    return providers.value.find((p) => p.id === providerId);
  };

  const registerTool = (tool: AIProviderFunctionTool): (() => void) => {
    const index = tools.value.findIndex((t) => t.name === tool.name);
    if (index === -1) {
      tools.value = [...tools.peek(), tool];
    }

    return () => {
      unregisterTool(tool.name);
    };
  };

  const unregisterTool = (toolName: string) => {
    tools.value = tools.peek().filter((t) => t.name !== toolName);
  };

  const generatePlaylistProviders = computed(() =>
    providers.value.filter((p) => p.updatePlaylist)
  );

  return {
    providers,
    generatePlaylistProviders,
    tools,
    registerProvider,
    unregisterProvider,
    getProviderById,
    registerTool,
    unregisterTool,
  };
}

export type AIManager = ReturnType<typeof createAIManager>;
