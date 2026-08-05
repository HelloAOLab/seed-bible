import type { JSX, VNode } from "preact";
import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";

export type DiscoverView =
  | null
  | "discover"
  | "create_playlist"
  | "play_playlist"
  | "create_annotation";

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

/** A verse to scroll the Discover pane's annotations list to once it's open. */
export interface DiscoverScrollTarget {
  bookId: string;
  chapterNumber: number;
  verseNumber: number;
}

export interface DiscoverManager {
  registerDiscoverProvider: (provider: DiscoverProvider) => void;
  discover: (
    context: DiscoverContext
  ) => AsyncIterable<DiscoverProviderResults>;
  /** Which sub-view of the discover pane is shown, or null when closed. */
  view: Signal<DiscoverView>;
  /** True whenever `view` is non-null, i.e. the discover pane is open. */
  isDiscoverOpen: ReadonlySignal<boolean>;
  /**
   * Collapses "play_playlist" back to "discover" when nothing is actually
   * playing. Takes a plain boolean (rather than owning a playback signal
   * itself) because DiscoverManager is constructed before PlaylistManager's
   * playback state exists.
   */
  resolveActualView: (isPlaying: boolean) => DiscoverView;
  /**
   * Set when an annotated verse number is clicked on desktop; consumed once
   * by the annotations section to scroll to that verse's group, then cleared.
   */
  scrollToVerse: Signal<DiscoverScrollTarget | null>;
}

export function createDiscoverManager(): DiscoverManager {
  const providers: DiscoverProvider[] = [];
  const view = signal<DiscoverView>(null);
  const isDiscoverOpen = computed(() => !!view.value);
  const scrollToVerse = signal<DiscoverScrollTarget | null>(null);

  function resolveActualView(isPlaying: boolean): DiscoverView {
    if (view.value === "play_playlist" && !isPlaying) {
      return "discover";
    }
    return view.value;
  }

  return {
    registerDiscoverProvider(provider: DiscoverProvider): void {
      const existingIndex = providers.findIndex((p) => p.id === provider.id);
      if (existingIndex >= 0) {
        providers[existingIndex] = provider;
      } else {
        providers.push(provider);
      }
    },

    view,
    isDiscoverOpen,
    resolveActualView,
    scrollToVerse,

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
