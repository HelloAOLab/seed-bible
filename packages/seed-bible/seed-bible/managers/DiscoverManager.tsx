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
  content?: JSX.Element | VNode;
  /** The person or organization that created the content, e.g. "Bible Project". Results without one are grouped under a generic "Content" section. */
  author?: string;
  /** A preview image URL, shown above the item's title. */
  image?: string;
  /** Called when the item's card is clicked. */
  onClick?: () => void;
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
  /**
   * Bumped on every `registerDiscoverProvider` call. The provider list itself
   * is not reactive; consumers that should re-run when an extension registers
   * (including after the chapter has already loaded) subscribe by reading this.
   */
  providersVersion: ReadonlySignal<number>;
  discover: (
    context: DiscoverContext
  ) => AsyncIterable<DiscoverProviderResults>;
  /**
   * Providers that have already answered for this chapter, in registration
   * order. Does not start a lookup. An empty `results` array means that
   * provider answered and had nothing; a lookup still in flight is omitted.
   */
  cachedResults: (context: DiscoverContext) => DiscoverProviderResults[];
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

function discoverContextKey(context: DiscoverContext): string {
  return JSON.stringify([
    context.translationId,
    context.book,
    context.chapter,
    context.language,
  ]);
}

interface DiscoverCacheEntry {
  promise: Promise<DiscoverResult[]>;
  /** Set once `promise` resolves. Absent while the lookup is in flight. */
  results?: DiscoverResult[];
}

export function createDiscoverManager(): DiscoverManager {
  const providers: DiscoverProvider[] = [];
  const providersVersion = signal(0);
  const view = signal<DiscoverView>(null);
  const isDiscoverOpen = computed(() => !!view.value);
  const scrollToVerse = signal<DiscoverScrollTarget | null>(null);
  // One answer per provider per chapter. Later registrations and a return
  // visit reuse it; a failed lookup is dropped so the next visit can retry.
  const resultsByProvider = new Map<string, Map<string, DiscoverCacheEntry>>();

  function resolveActualView(isPlaying: boolean): DiscoverView {
    if (view.value === "play_playlist" && !isPlaying) {
      return "discover";
    }
    return view.value;
  }

  function loadProvider(
    provider: DiscoverProvider,
    context: DiscoverContext
  ): DiscoverCacheEntry {
    let byChapter = resultsByProvider.get(provider.id);
    if (!byChapter) {
      byChapter = new Map();
      resultsByProvider.set(provider.id, byChapter);
    }
    const key = discoverContextKey(context);
    const existing = byChapter.get(key);
    if (existing) {
      return existing;
    }

    const chapterCache = byChapter;
    const produced = provider.discover(context);
    const entry: DiscoverCacheEntry = {
      promise: Promise.resolve(produced),
    };
    // The callbacks run after this function stores `entry`, so they can tell
    // a later replacement of this provider from the lookup they belong to.
    entry.promise = entry.promise.then(
      (results) => {
        if (chapterCache.get(key) === entry) {
          entry.results = results;
        }
        return results;
      },
      (error: unknown) => {
        if (chapterCache.get(key) === entry) {
          chapterCache.delete(key);
        }
        throw error;
      }
    );
    chapterCache.set(key, entry);
    return entry;
  }

  function cachedResults(context: DiscoverContext): DiscoverProviderResults[] {
    const key = discoverContextKey(context);
    const ready: DiscoverProviderResults[] = [];
    for (const provider of providers) {
      const entry = resultsByProvider.get(provider.id)?.get(key);
      if (!entry || entry.results === undefined) {
        continue;
      }
      ready.push({ providerId: provider.id, results: entry.results });
    }
    return ready;
  }

  return {
    registerDiscoverProvider(provider: DiscoverProvider): void {
      const existingIndex = providers.findIndex((p) => p.id === provider.id);
      if (existingIndex >= 0) {
        providers[existingIndex] = provider;
        // The replacement can answer differently, including for chapters
        // this id has already been asked about.
        resultsByProvider.delete(provider.id);
      } else {
        providers.push(provider);
      }
      providersVersion.value += 1;
    },

    providersVersion,
    cachedResults,
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
        const promise = loadProvider(provider, context).promise;
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
