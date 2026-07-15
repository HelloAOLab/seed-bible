import { computed, signal } from "@preact/signals";
import { type ZodSchema } from "zod";
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
    providers.value.filter((p) => p.generatePlaylist)
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
