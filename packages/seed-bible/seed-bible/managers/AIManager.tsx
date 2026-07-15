import { computed, signal } from "@preact/signals";
import { z, type ZodSchema } from "zod";
import {
  PlaylistItem,
  type Playlist,
  type PlaylistManager,
} from "./PlaylistManager";
import type { ZodStandardJSONSchemaPayload } from "zod/v4/core";

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

export const GeneratedPlaylistSchema = z.object({
  items: z.array(PlaylistItem),
  title: z.string().nullable(),
  description: z.string().nullable(),
});

export type GeneratedPlaylist = z.infer<typeof GeneratedPlaylistSchema>;

export interface AIProvider {
  /**
   * The unique ID for the AI provider.
   */
  id: string;

  /**
   * Requests that the given AI provider generate a playlist based on the input and options.
   * @param prompt The user-provided prompt.
   * @param options The options that should be used.
   * @returns A promise that resolves when the playlist has been generated.
   */
  generatePlaylist?: (
    prompt: string,
    options: AIProviderGenerateOptions
  ) => AsyncGenerator<string, void, void>;
}

export interface AIManagerOptions {
  playlist: PlaylistManager;
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

const AIPlaylistItemSchema = z.object({
  item: z.object({
    type: z.enum(["bible-verse", "link", "html"]),
    bibleVerse: z
      .object({
        ref: z.object({
          bookId: z.string(),
          chapter: z.number().positive(),
          endChapter: z.number().positive().nullable(),
          verse: z.number().positive(),
          endVerse: z.number().positive().nullable(),
        }),
      })
      .nullable(),
    link: z.object({
      title: z.string().nullable(),
      url: z.string(),
    }),
    html: z.object({
      title: z.string().nullable(),
      html: z.string(),
    }),
  }),
});

function convertToPlaylistItem(
  item: z.infer<typeof AIPlaylistItemSchema>["item"]
) {
  switch (item.type) {
    case "bible-verse":
      return {
        type: item.type,
        ref: {
          bookId: item.bibleVerse!.ref.bookId,
          chapter: item.bibleVerse!.ref.chapter,
          endChapter: item.bibleVerse!.ref.endChapter ?? undefined,
          verse: item.bibleVerse!.ref.verse,
          endVerse: item.bibleVerse!.ref.endVerse ?? undefined,
        },
      };
    case "link":
      return {
        type: item.type,
        title: item.link.title ?? undefined,
        url: item.link.url,
      };
    case "html":
      return {
        type: item.type,
        title: item.html.title ?? undefined,
        html: item.html.html,
      };
  }
}

/**
 * A manager that keeps track of AI providers which can provide AI-powered features.
 */
export function createAIManager(options: AIManagerOptions) {
  const { playlist } = options;
  const providers = signal<AIProvider[]>([]);
  const tools = signal<AIProviderFunctionTool[]>([]);

  const getEditPlaylistTools = (editingPlaylist: Playlist) => {
    const addPlaylistItemTool = generateFunctionTool({
      name: "addPlaylistItem",
      description: "Adds an item to the playlist.",
      parameters: AIPlaylistItemSchema,
      function: async (args) => {
        // Implement the function logic here
        playlist.addEditingPlaylistItem(convertToPlaylistItem(args.item));

        return "success";
      },
    });

    const updatePlaylistItemTool = generateFunctionTool({
      name: "updatePlaylistItem",
      description: "Updates an item in the playlist.",
      parameters: AIPlaylistItemSchema.extend({
        index: z.number(),
      }),
      function: async (args) => {
        // Implement the function logic here
        playlist.updateEditingPlaylistItem(
          args.index,
          convertToPlaylistItem(args.item)
        );

        return "success";
      },
    });

    const deletePlaylistItemTool = generateFunctionTool({
      name: "deletePlaylistItem",
      description: "Deletes an item from the playlist.",
      parameters: z.object({
        index: z.number(),
      }),
      function: async (args) => {
        // Implement the function logic here
        playlist.removeEditingPlaylistItem(args.index);

        return "success";
      },
    });

    const updatePlaylistTool = generateFunctionTool({
      name: "updatePlaylistMetadata",
      description: "Updates the playlist metadata (title, description)",
      parameters: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      function: async (args) => {
        playlist.editingPlaylist.value = {
          ...editingPlaylist,
          title: args.title,
          description: args.description ?? editingPlaylist.description ?? null,
        };

        return "success";
      },
    });

    return [
      updatePlaylistTool.tool,
      addPlaylistItemTool.tool,
      updatePlaylistItemTool.tool,
      deletePlaylistItemTool.tool,
    ];
  };

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
    providers.value.filter((p) => p.generatePlaylist)
  );

  /**
   * Attempts to generate a new playlist from the given prompt using one of the available AI providers.
   * @param prompt
   */
  const generatePlaylist = async function* (
    providerId: string,
    prompt: string
  ): AsyncGenerator<string, void, void> {
    const provider = getProviderById(providerId);
    if (!provider) {
      throw new Error(`Provider with ID ${providerId} not found.`);
    }

    if (!provider.generatePlaylist) {
      throw new Error(
        `Provider with ID ${providerId} does not support playlist generation.`
      );
    }

    const cancelController = new AbortController();
    const newPlaylist = await playlist.createNewPlaylist();

    if (!newPlaylist || !newPlaylist.value) {
      return;
    }

    const myPlaylist = newPlaylist.value;

    yield* provider.generatePlaylist(prompt, {
      tools: [...tools.value, ...getEditPlaylistTools(myPlaylist)],
      cancelToken: cancelController.signal,
    });
  };

  return {
    providers,
    generatePlaylistProviders,
    tools,
    registerProvider,
    unregisterProvider,
    registerTool,
    unregisterTool,
    generatePlaylist,
  };
}

export type AIManager = ReturnType<typeof createAIManager>;
