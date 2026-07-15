import { computed, signal } from "@preact/signals";
import { z, type ZodSchema } from "zod";
import { PlaylistItem, type PlaylistManager } from "./PlaylistManager";
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
  ) => Promise<void>;
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

// const AddPlaylistItemToolParameters = z.object({

// });

/**
 * A manager that keeps track of AI providers which can provide AI-powered features.
 */
export function createAIManager(options: AIManagerOptions) {
  const { playlist } = options;
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
    providers.value.filter((p) => p.generatePlaylist)
  );

  /**
   * Attempts to generate a new playlist from the given prompt using one of the available AI providers.
   * @param prompt
   */
  const generatePlaylist = async (providerId: string, prompt: string) => {
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

    // const cancel = newPlaylist.subscribe((v) => {
    //   if (v?.id !== myPlaylist.id) {
    //     cancel();
    //   }
    // });

    const addPlaylistItemTool = generateFunctionTool({
      name: "addPlaylistItem",
      description: "Adds an item to the playlist.",
      parameters: z.object({
        item: PlaylistItem,
      }),
      function: async (args) => {
        if (cancelController.signal.aborted) {
          return;
        }

        if (playlist.editingPlaylist.value?.id !== myPlaylist.id) {
          cancelController.abort();
          return;
        }

        // Implement the function logic here
        playlist.addEditingPlaylistItem(args.item);
      },
    });

    const updatePlaylistItemTool = generateFunctionTool({
      name: "updatePlaylistItem",
      description: "Updates an item in the playlist.",
      parameters: z.object({
        item: PlaylistItem,
        index: z.number(),
      }),
      function: async (args) => {
        if (cancelController.signal.aborted) {
          return;
        }

        if (playlist.editingPlaylist.value?.id !== myPlaylist.id) {
          cancelController.abort();
          return;
        }

        // Implement the function logic here
        playlist.updateEditingPlaylistItem(args.index, args.item);
      },
    });

    const deletePlaylistItemTool = generateFunctionTool({
      name: "deletePlaylistItem",
      description: "Deletes an item from the playlist.",
      parameters: z.object({
        item: PlaylistItem,
        index: z.number(),
      }),
      function: async (args) => {
        if (cancelController.signal.aborted) {
          return;
        }

        if (playlist.editingPlaylist.value?.id !== myPlaylist.id) {
          cancelController.abort();
          return;
        }

        // Implement the function logic here
        playlist.removeEditingPlaylistItem(args.index);
      },
    });

    const updatePlaylistTool = generateFunctionTool({
      name: "updatePlaylistMetadata",
      description: "Updates the playlist metadata (title, description)",
      parameters: z.object({
        title: z.string(),
        description: z.string().nullable().optional(),
      }),
      function: async (args) => {
        if (cancelController.signal.aborted) {
          return;
        }

        if (playlist.editingPlaylist.value?.id !== myPlaylist.id) {
          cancelController.abort();
          return;
        }

        playlist.editingPlaylist.value = {
          ...playlist.editingPlaylist.value,
          title: args.title,
          description:
            args.description ?? playlist.editingPlaylist.value?.description,
        };
      },
    });

    provider.generatePlaylist(prompt, {
      tools: [
        ...tools.value,
        updatePlaylistTool.tool,
        addPlaylistItemTool.tool,
        updatePlaylistItemTool.tool,
        deletePlaylistItemTool.tool,
      ],
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
