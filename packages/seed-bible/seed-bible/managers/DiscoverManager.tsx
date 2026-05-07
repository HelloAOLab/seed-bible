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

export interface DiscoverProviderResults {
  providerId: string;
  results: DiscoverResult[];
}

export interface DiscoverManager {
  registerDiscoverProvider: (provider: DiscoverProvider) => void;
  discover: (
    context: DiscoverContext
  ) => AsyncIterable<DiscoverProviderResults>;
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

    async *discover(
      context: DiscoverContext
    ): AsyncIterable<DiscoverProviderResults> {
      // Each promise carries a reference to itself so we can remove it from
      // the set after it wins the race, without needing index bookkeeping.
      type Tagged = Promise<{
        promise: Tagged;
        value: DiscoverProviderResults;
      }>;

      const remaining = new Set<Tagged>();

      for (const provider of providers) {
        const tagged: Tagged = (async () => {
          const results = await provider.discover(context);
          return {
            promise: tagged,
            value: { providerId: provider.id, results },
          };
        })();
        remaining.add(tagged);
      }

      while (remaining.size > 0) {
        const { promise, value } = await Promise.race(remaining);
        remaining.delete(promise);
        yield value;
      }
    },
  };
}
