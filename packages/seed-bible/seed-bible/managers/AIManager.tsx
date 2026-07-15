import { signal } from "@preact/signals";
import type { JSONSchema7 } from "json-schema";
import { z } from "zod";
import { PlaylistItem } from "./PlaylistManager";

export interface AIProviderTool {
  name: string;
  type: "function";
  description: string;
  parameters: JSONSchema7;
}

export interface AIProviderGenerateOptions {
  tools: AIProviderTool[];
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

/**
 * A manager that keeps track of AI providers which can provide AI-powered features.
 */
export function createAIManager() {
  const providers = signal<AIProvider[]>([]);
  const tools = signal<AIProviderTool[]>([]);

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

  const registerTool = (tool: AIProviderTool): (() => void) => {
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

  return {
    providers,
    tools,
    registerProvider,
    unregisterProvider,
    registerTool,
    unregisterTool,
  };
}
