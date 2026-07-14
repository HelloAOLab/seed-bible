import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { TranslationBookChapter } from "../managers/FreeUseBibleAPI";
import type {
  BibleReadingState,
  DiscoverResultWithBookData,
  DiscoverTypedProviderResults,
} from "../managers/BibleReadingManager";

/**
 * Where a navigation hook can send the reader, or how it takes control.
 *
 * - `default` — fall through to the normal next/previous-chapter behavior.
 * - `prevent` — block navigation; reading state does nothing and does not update the URL.
 * - `navigate` — go to a specific chapter chosen by the extension.
 * - `handled` — the extension took over; reading state won't change any data, but will update the URL.
 */
export type ReadingNavigationOutcome =
  | { type: "default" }
  | { type: "prevent" }
  | { type: "navigate"; chapter: TranslationBookChapter }
  | { type: "handled" };

export interface ReadingNavigationHookContext<TData = unknown> {
  /** The reading state this hook is operating on. */
  readingState: BibleReadingState;
  /** The chapter currently being viewed when navigation was requested. */
  currentChapter: TranslationBookChapter;
  /** Reactive, session-synced custom data for this extension. */
  data: Signal<TData>;
}

export type ReadingNavigationHook<TData = unknown> = (
  ctx: ReadingNavigationHookContext<TData>
) => ReadingNavigationOutcome | Promise<ReadingNavigationOutcome>;

/**
 * Transforms the discovered content shown for the current chapter.
 *
 * Runs inside a `computed`, so it must be synchronous and free of side effects.
 * To contribute content loaded asynchronously, keep your own `signal` (populated
 * by an `effect` reacting to `readingState.chapterData`) and read it here — the
 * computed will re-run when that signal changes. Return `[]` to suppress all
 * discovered content.
 */
export type DiscoveredContentHook<TData = unknown> = (ctx: {
  readingState: BibleReadingState;
  data: Signal<TData>;
  results: DiscoverTypedProviderResults<DiscoverResultWithBookData>[];
}) => DiscoverTypedProviderResults<DiscoverResultWithBookData>[];

export type GetUrlQueryParamsHook<TData = unknown> = (ctx: {
  readingState: BibleReadingState;
  data: Signal<TData>;
  queryParams: Record<string, string | null>;
}) => Record<string, string | null>;

export type TransformLabelHook<TData = unknown> = (ctx: {
  readingState: BibleReadingState;
  data: Signal<TData>;
  /** The label produced so far (default, or a higher-priority extension's output). */
  label: string;
}) => string;

/**
 * The per-reading-state instance an extension returns from `activate()`.
 * Every hook is optional; an extension only implements what it needs.
 */
export interface ReadingExtensionInstance<TData = unknown> {
  /** Intercepts forward navigation (`loadNextChapter`). */
  navigateNext?: ReadingNavigationHook<TData>;
  /** Intercepts backward navigation (`loadPreviousChapter`). */
  navigatePrevious?: ReadingNavigationHook<TData>;
  /** Adds to, filters, or replaces the discovered content for the chapter. */
  transformDiscoveredContent?: DiscoveredContentHook<TData>;

  /**
   * Gets the URL query parameters for the current reading state.
   * @param currentUrl The current URL.
   * @returns An object representing the query parameters.
   */
  transformQueryParams?: GetUrlQueryParamsHook<TData>;

  /** Overrides the reading state's display title. Runs in priority order. */
  transformTitle?: TransformLabelHook<TData>;

  /** Overrides the reading state's compact short title. Runs in priority order. */
  transformShortTitle?: TransformLabelHook<TData>;

  /** Overrides the reading state's subtitle. Runs in priority order. */
  transformSubTitle?: TransformLabelHook<TData>;

  /** Called when the extension is disabled or the reading state is disposed. */
  dispose?: () => void;
}

/**
 * Context handed to `activate()` when an extension is enabled for a reading
 * state. Extensions reach broader app capabilities (panes, toast, etc.) through
 * the `SeedBibleState` closure they had in their `init()`.
 */
export interface ReadingExtensionContext<TData = unknown> {
  /** The reading state this activation is bound to. */
  readingState: BibleReadingState;
  /**
   * Reactive custom data for this extension, seeded from the `data` argument to
   * `enableExtension(id, data)`. When the reading state is part of a shared
   * session, writes to this signal sync to every participant.
   */
  data: Signal<TData>;
  /** True while this reading state is part of a shared/multiplayer session. */
  isShared: ReadonlySignal<boolean>;
}

/**
 * A registered reading extension. Registering makes it available to be enabled
 * on individual reading states; it is never enabled by default.
 */
export interface ReadingExtensionDefinition<TData = unknown> {
  id: string;
  /**
   * Order applied when several extensions are enabled on the same reading state.
   * Higher runs first (matches tool priority). Defaults to 0.
   */
  priority?: number;
  /**
   * Called when the extension is enabled for a reading state ("enabled"
   * notification). Returns the hook instance that drives behavior for that
   * state.
   */
  activate: (
    ctx: ReadingExtensionContext<TData>
  ) => ReadingExtensionInstance<TData>;
}

/**
 * A reading extension that has been enabled on a specific reading state.
 * Surfaced by `readingState.enabledExtensions` so other systems (for example
 * session sync) can observe the active set and their data.
 */
export interface ReadingExtensionRuntime<TData = unknown> {
  id: string;
  definition: ReadingExtensionDefinition<TData>;
  instance: ReadingExtensionInstance<TData>;
  /** Reactive, session-synced custom data for this activation. */
  data: Signal<TData>;
}

export interface BibleReadingExtensionManager {
  /**
   * Registers a reading extension, making it available to enable on reading
   * states. Registering with an existing id replaces the previous definition.
   * Returns a function that unregisters the extension.
   */
  registerReadingExtension: (
    definition: ReadingExtensionDefinition
  ) => () => void;
  /** Looks up a registered extension definition by id. */
  getReadingExtension: (id: string) => ReadingExtensionDefinition | undefined;
  /** All registered extension definitions (for settings/discovery UIs). */
  registeredExtensions: ReadonlySignal<ReadingExtensionDefinition[]>;
}

export function createBibleReadingExtensionManager(): BibleReadingExtensionManager {
  const registeredExtensions = signal<ReadingExtensionDefinition[]>([]);

  const registerReadingExtension = (
    definition: ReadingExtensionDefinition
  ): (() => void) => {
    if (typeof definition.id !== "string" || definition.id.length === 0) {
      throw new Error("A reading extension must have a non-empty string id.");
    }
    if (typeof definition.activate !== "function") {
      throw new Error(
        `Reading extension "${definition.id}" must provide an activate() function.`
      );
    }

    const existingIndex = registeredExtensions.value.findIndex(
      (entry) => entry.id === definition.id
    );
    if (existingIndex >= 0) {
      registeredExtensions.value = registeredExtensions.value.map(
        (entry, index) => (index === existingIndex ? definition : entry)
      );
    } else {
      registeredExtensions.value = [...registeredExtensions.value, definition];
    }

    return () => {
      registeredExtensions.value = registeredExtensions.value.filter(
        (entry) => entry !== definition
      );
    };
  };

  const getReadingExtension = (
    id: string
  ): ReadingExtensionDefinition | undefined => {
    return registeredExtensions.value.find((entry) => entry.id === id);
  };

  return {
    registerReadingExtension,
    getReadingExtension,
    registeredExtensions: computed(() => registeredExtensions.value),
  };
}
