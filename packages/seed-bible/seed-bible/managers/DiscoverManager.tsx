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

export type DiscoverResult =
  | DiscoverContentResult
  | DiscoverCrossReferenceResult
  | DiscoverStudyNoteResult;

export interface DiscoverContentResult {
  type: "content";
  title: string;
  description: string;
  reference: DiscoverReference;
  content: JSX.Element | VNode;
}

export interface DiscoverCrossReferenceResult {
  type: "cross-reference";
  reference: DiscoverReference;
  crossReference: DiscoverReference;
}

export interface DiscoverStudyNoteResult {
  type: "study-note";
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
  registerDiscoverProvider: (provider: DiscoverProvider) => () => void;
  discover: (
    context: DiscoverContext
  ) => AsyncIterable<DiscoverProviderResults>;
}

export function createDiscoverManager(): DiscoverManager {
  const providers: DiscoverProvider[] = [];

  return {
    registerDiscoverProvider(provider: DiscoverProvider): () => void {
      const existingIndex = providers.findIndex((p) => p.id === provider.id);
      if (existingIndex >= 0) {
        providers[existingIndex] = provider;
      } else {
        providers.push(provider);
      }

      return () => {
        const index = providers.findIndex((p) => p.id === provider.id);
        if (index >= 0) {
          providers.splice(index, 1);
        }
      };
    },

    async *discover(
      context: DiscoverContext
    ): AsyncIterable<DiscoverProviderResults> {
      // Each promise carries a reference to itself so we can remove it from
      // the set after it wins the race, without needing index bookkeeping.
      type Tagged = Promise<{
        promise: Promise<DiscoverResult[]>;
        value: DiscoverProviderResults;
      }>;

      const remaining = new Map<Promise<DiscoverResult[]>, Tagged>();

      for (const provider of providers) {
        const promise = Promise.resolve(provider.discover(context));
        const tagged: Tagged = (async () => {
          const results = await promise;
          return {
            promise: promise,
            value: { providerId: provider.id, results },
          };
        })();
        remaining.set(promise, tagged);
      }

      while (remaining.size > 0) {
        const { promise, value } = await Promise.race(remaining.values());
        remaining.delete(promise);
        yield value;
      }
    },
  };
}
