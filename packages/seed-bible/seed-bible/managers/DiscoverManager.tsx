import type { JSX, VNode } from "preact";

export interface DiscoverContext {
  translationId: string;
  book: string;
  chapter: number;
  language: string;
}

export interface DiscoverReference {
  book: string;
  chapter: number;
  endChapter?: number;
  verse?: number;
  endVerse?: number;
}

export interface DiscoverResult {
  title: string;
  description: string;
  reference: DiscoverReference;
  content: JSX.Element | VNode;
}

export interface DiscoverProvider {
  id: string;
  title: string;
  description: string;
  discover: (
    context: DiscoverContext
  ) => Promise<DiscoverResult[]> | DiscoverResult[];
}

export interface DiscoverResults {
  [providerId: string]: DiscoverResult[];
}

export interface DiscoverManager {
  registerDiscoverProvider: (provider: DiscoverProvider) => void;
  discover: (context: DiscoverContext) => Promise<DiscoverResults>;
}

export function createDiscoverManager(): DiscoverManager {
  const providers: DiscoverProvider[] = [];

  return {
    registerDiscoverProvider(provider: DiscoverProvider): void {
      const existingIndex = providers.findIndex((p) => p.id === provider.id);
      if (existingIndex >= 0) {
        providers[existingIndex] = provider;
      } else {
        providers.push(provider);
      }
    },

    async discover(context: DiscoverContext): Promise<DiscoverResults> {
      const entries = await Promise.all(
        providers.map(async (provider) => {
          const results = await provider.discover(context);
          return [provider.id, results] as const;
        })
      );

      return Object.fromEntries(entries);
    },
  };
}
