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

  function resolveActualView(isPlaying: boolean): DiscoverView {
    if (view.value === "play_playlist" && !isPlaying) {
      return "discover";
    }
    return view.value;
  }

  return {
    registerDiscoverProvider(provider: DiscoverProvider): () => void {
      return registerById(providers, provider);
    },
    providers,

    registerContentType(definition: DiscoverContentTypeDefinition) {
      return registerById(registeredContentTypes, definition);
    },
    contentTypes,

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
