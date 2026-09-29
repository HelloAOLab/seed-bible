import type { JSX, VNode } from "preact";
import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { TranslatableTitle } from "./BibleToolsManager";

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

/**
 * A kind of discovered content, named by whoever contributes it — for example
 * `"person_profile"`. Deliberately an open string: extensions bring their own
 * kinds, and core only learns about one when it is registered with
 * {@link DiscoverManager.registerContentType}.
 */
export type DiscoverContentType = string;

/**
 * How core should present one kind of discovered content: the filter chip and
 * section it gets, and whether it shows up in the "All" view.
 *
 * Results only get this treatment while their type is registered. A result
 * whose `contentType` nobody has registered is shown as ordinary content, so
 * an extension that forgets to register — or is uninstalled mid-session —
 * never makes content silently disappear.
 */
export interface DiscoverContentTypeDefinition {
  /** Matched against {@link DiscoverContentResult.contentType}. */
  id: DiscoverContentType;

  /** Label for the type's filter chip and section heading. */
  title: TranslatableTitle;

  /**
   * Keeps this type out of the compact panel's "All" view until the reader
   * picks its chip, and starts its section folded in the full Discover pane.
   * For large datasets that would otherwise bury the reader's own notes.
   */
  hiddenByDefault?: boolean;

  /**
   * `"standard"` (the default) lays results out like any other content:
   * image, title, description, then `content`. `"custom"` renders only each
   * result's `content`, for providers whose `content` is already the whole
   * card, title included.
   */
  layout?: "standard" | "custom";

  /** Chip and section order among registered types; lower comes first. */
  priority?: number;
}

/** Where a registered type sorts when it doesn't say. */
const DEFAULT_CONTENT_TYPE_PRIORITY = 500;

export interface DiscoverContentResult {
  type: "content";
  contentType?: DiscoverContentType;
  verses?: readonly number[];
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
  /**
   * Adds a provider, replacing any earlier one with the same `id`. Returns a
   * function that removes it again — `yield` it from an extension's `init` so
   * uninstalling the extension takes its results with it. The chapter on
   * screen is rediscovered either way, rather than waiting for the reader to
   * navigate.
   */
  registerDiscoverProvider: (provider: DiscoverProvider) => () => void;

  /** Every registered provider, in registration order. */
  providers: ReadonlySignal<readonly DiscoverProvider[]>;

  /**
   * Declares a kind of discovered content, replacing any earlier definition
   * with the same `id`. Returns a function that removes it again.
   */
  registerContentType: (
    definition: DiscoverContentTypeDefinition
  ) => () => void;

  /** Registered content types, sorted by `priority` then registration order. */
  contentTypes: ReadonlySignal<readonly DiscoverContentTypeDefinition[]>;

  discover: (
    context: DiscoverContext
  ) => AsyncIterable<DiscoverProviderResults>;
  /**
   * Providers that have already answered for this chapter, in registration
   * order. Does not start a lookup. An empty `results` array means that
   * provider answered and had nothing; a lookup still in flight is omitted.
   */
  cachedResults: (context: DiscoverContext) => DiscoverProviderResults[];
  /**
   * UI locale cached answers were built in. A change drops every stored
   * answer: providers render card text in that locale when `discover()` runs,
   * and `DiscoverContext.language` is the Bible translation, not this.
   */
  setUiLanguage: (language: string) => void;
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

/** How many distinct chapters (including UI locale) stay cached per session. */
const MAX_CACHED_CHAPTERS = 50;

function discoverContextKey(
  context: DiscoverContext,
  uiLanguage: string
): string {
  return JSON.stringify([
    context.translationId,
    context.book,
    context.chapter,
    context.language,
    uiLanguage,
  ]);
}

interface DiscoverCacheEntry {
  promise: Promise<DiscoverResult[]>;
  /** Set once `promise` resolves. Absent while the lookup is in flight. */
  results?: DiscoverResult[];
}

/**
 * Replaces the entry with `item`'s id, or appends it, and returns an unregister
 * that only removes *that* entry. The identity check matters: when a
 * reinstalled extension replaces its provider, the old install's cleanup
 * running late must not take the new one down with it.
 */
function registerById<T extends { id: string }>(
  list: Signal<readonly T[]>,
  item: T
): () => void {
  const existingIndex = list.peek().findIndex((entry) => entry.id === item.id);
  if (existingIndex >= 0) {
    const next = [...list.peek()];
    next[existingIndex] = item;
    list.value = next;
  } else {
    list.value = [...list.peek(), item];
  }

  return () => {
    if (list.peek().includes(item)) {
      list.value = list.peek().filter((entry) => entry !== item);
    }
  };
}

export function createDiscoverManager(): DiscoverManager {
  const providers = signal<readonly DiscoverProvider[]>([]);
  const registeredContentTypes = signal<
    readonly DiscoverContentTypeDefinition[]
  >([]);
  const contentTypes = computed(() =>
    [...registeredContentTypes.value].sort(
      (a, b) =>
        (a.priority ?? DEFAULT_CONTENT_TYPE_PRIORITY) -
        (b.priority ?? DEFAULT_CONTENT_TYPE_PRIORITY)
    )
  );
  const view = signal<DiscoverView>(null);
  const isDiscoverOpen = computed(() => !!view.value);
  const scrollToVerse = signal<DiscoverScrollTarget | null>(null);
  // One answer per provider per chapter. Later registrations and a return
  // visit reuse it; a failed lookup is dropped so the next visit can retry.
  // `chapterOrder` is oldest first and caps how many chapter keys we keep,
  // because a result can hold a JSX tree for the whole session otherwise.
  const resultsByProvider = new Map<string, Map<string, DiscoverCacheEntry>>();
  const chapterOrder: string[] = [];
  let uiLanguage = "";

  function rememberChapter(key: string): void {
    const existing = chapterOrder.indexOf(key);
    if (existing >= 0) {
      chapterOrder.splice(existing, 1);
    }
    chapterOrder.push(key);
    while (chapterOrder.length > MAX_CACHED_CHAPTERS) {
      const evict = chapterOrder.shift();
      if (!evict) break;
      for (const byChapter of resultsByProvider.values()) {
        byChapter.delete(evict);
      }
    }
  }

  function setUiLanguage(language: string): void {
    if (language === uiLanguage) return;
    uiLanguage = language;
    resultsByProvider.clear();
    chapterOrder.length = 0;
  }

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
    const key = discoverContextKey(context, uiLanguage);
    const existing = byChapter.get(key);
    if (existing) {
      rememberChapter(key);
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
    rememberChapter(key);
    return entry;
  }

  function cachedResults(context: DiscoverContext): DiscoverProviderResults[] {
    const key = discoverContextKey(context, uiLanguage);
    const ready: DiscoverProviderResults[] = [];
    for (const provider of providers.value) {
      const entry = resultsByProvider.get(provider.id)?.get(key);
      if (!entry || entry.results === undefined) {
        continue;
      }
      ready.push({ providerId: provider.id, results: entry.results });
    }
    return ready;
  }

  return {
    registerDiscoverProvider(provider: DiscoverProvider): () => void {
      const previous = providers
        .peek()
        .find((entry) => entry.id === provider.id);
      // A replacement can answer differently for chapters this id already
      // answered. The same provider object registered again keeps its cache.
      if (previous && previous !== provider) {
        resultsByProvider.delete(provider.id);
      }
      const unregister = registerById(providers, provider);
      return () => {
        const removingCurrent = providers.peek().includes(provider);
        unregister();
        if (removingCurrent) {
          resultsByProvider.delete(provider.id);
        }
      };
    },
    providers,

    registerContentType(definition: DiscoverContentTypeDefinition) {
      return registerById(registeredContentTypes, definition);
    },
    contentTypes,

    cachedResults,
    setUiLanguage,
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

      for (const provider of providers.peek()) {
        // One provider's failure is its own. A rejection here used to reject
        // the whole race, so every provider that had not answered yet was
        // dropped and the rejection surfaced as unhandled.
        let promise: Promise<DiscoverResult[]>;
        try {
          promise = loadProvider(provider, context).promise;
        } catch (error) {
          console.error(
            `Discover provider "${provider.id}" failed for ${context.book} ${context.chapter}`,
            error
          );
          promise = Promise.resolve([]);
        }
        const tagged: Tagged = promise.then(
          (results) => ({
            promise,
            value: { providerId: provider.id, results },
          }),
          (error: unknown) => {
            console.error(
              `Discover provider "${provider.id}" failed for ${context.book} ${context.chapter}`,
              error
            );
            return {
              promise,
              value: { providerId: provider.id, results: [] },
            };
          }
        );
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
