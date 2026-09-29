import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { NavigationManager } from "./NavigationManager";
import { userProfileSchema } from "./LoginManager";
import { parseSharedPagePath, type SharedPageKind } from "./SharedPagePath";

/**
 * The record a shared content page (`/{lang}/playlist/...`,
 * `/{lang}/reading-plan/...`) shows, with its author's display name (null
 * when they have none, or their profile couldn't be read).
 */
export interface SharedPage<T> {
  locator: string;
  item: T;
  authorName: string | null;
}

/**
 * A completed shared-page load, embedded by SSR so the client can skip
 * re-fetching it. `item` is null when the load found nothing. It crossed a
 * server/client boundary as JSON, so it is re-validated before use.
 */
export interface SharedPageSeed<T> {
  locator: string;
  item: T | null;
  authorName: string | null;
}

export interface SharedPageLoader<T> {
  /** The record the current page shows, once it has loaded. */
  page: ReadonlySignal<SharedPage<T> | null>;
  /** True when the current page's record was looked up and doesn't exist. */
  notFound: ReadonlySignal<boolean>;
  /**
   * Settles once the initial page's record has loaded (or during SSR, once a
   * timeout gives up on it). SSR waits on this so the page's title, meta and
   * modal describe the record. Resolved immediately when the page didn't
   * start on this kind of shared page.
   */
  initialLoadPromise: Promise<void>;
  /**
   * The initial page's completed load, for `entry-ssr.tsx` to embed. Null
   * when the page isn't this kind of shared page or the load hadn't finished
   * (the SSR timeout fired first) — seeding "not found" for a load that
   * merely timed out would hide a record that exists.
   */
  getSeed: () => SharedPageSeed<T> | null;
}

interface Schema<T> {
  safeParse(
    data: unknown
  ): { success: true; data: T } | { success: false; error: unknown };
}

const SSR_SHARED_PAGE_TIMEOUT_MS = 5000;

/** Splits a `{recordName}.{address}` locator on its last dot. */
function parseLocator(
  locator: string
): { recordName: string; address: string } | null {
  const lastDot = locator.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === locator.length - 1) {
    return null;
  }
  return {
    recordName: locator.slice(0, lastDot),
    address: locator.slice(lastDot + 1),
  };
}

/**
 * Loads the record behind a shared content page of one `kind` whenever the
 * URL is on one, plus its author's name.
 */
export function createSharedPageLoader<T>(options: {
  os: CasualOSManager;
  navigation: Pick<NavigationManager, "currentUrl" | "initialUrl" | "basePath">;
  kind: SharedPageKind;
  schema: Schema<T>;
  authorUserId: (item: T) => string;
  initialSeed?: SharedPageSeed<T>;
}): SharedPageLoader<T> {
  const { os, navigation, kind, schema, authorUserId, initialSeed } = options;

  const locatorFor = (url: URL): string | null => {
    const parsed = parseSharedPagePath(url.pathname, navigation.basePath);
    return parsed?.kind === kind ? parsed.locator : null;
  };

  const pageLocator = computed(() => locatorFor(navigation.currentUrl.value));

  /**
   * The latest load that actually completed, found or not. A load that
   * errored for any other reason than "not found" leaves this untouched, so
   * it is never mistaken for a missing record.
   */
  const result = signal<SharedPageSeed<T> | null>(null);

  const page = computed<SharedPage<T> | null>(() => {
    const locator = pageLocator.value;
    const current = result.value;
    if (!locator || current?.locator !== locator || !current.item) {
      return null;
    }
    return { locator, item: current.item, authorName: current.authorName };
  });

  const notFound = computed<boolean>(() => {
    const locator = pageLocator.value;
    const current = result.value;
    return !!locator && current?.locator === locator && !current.item;
  });

  const loadAuthorName = async (userId: string): Promise<string | null> => {
    try {
      const profile = await os.getData(userId, "profile");
      if (!profile.success) {
        return null;
      }
      const parsed = userProfileSchema.safeParse(profile.data);
      return parsed.success ? parsed.data.name.trim() || null : null;
    } catch (err) {
      console.warn("Failed to load shared page author profile:", err);
      return null;
    }
  };

  /** Resolves to null when the load failed for a reason other than "not found". */
  const fetchPage = async (
    locator: string
  ): Promise<SharedPageSeed<T> | null> => {
    const missing = { locator, item: null, authorName: null };
    const parsed = parseLocator(locator);
    if (!parsed) {
      return missing;
    }
    try {
      const record = await os.getData(parsed.recordName, parsed.address);
      if (!record.success) {
        if (record.errorCode === "data_not_found") {
          return missing;
        }
        console.error(`Failed to load ${kind} page:`, record.errorCode);
        return null;
      }
      const itemResult = schema.safeParse(record.data);
      if (!itemResult.success) {
        console.warn(`Invalid ${kind} record for locator:`, locator);
        return missing;
      }
      const item = itemResult.data;
      return {
        locator,
        item,
        authorName: await loadAuthorName(authorUserId(item)),
      };
    } catch (err) {
      console.error(`Failed to load ${kind} page:`, err);
      return null;
    }
  };

  const validateSeed = (seed: SharedPageSeed<T>): SharedPageSeed<T> | null => {
    if (seed.item === null) {
      return { locator: seed.locator, item: null, authorName: null };
    }
    const parsed = schema.safeParse(seed.item);
    if (!parsed.success) {
      return null;
    }
    return {
      locator: seed.locator,
      item: parsed.data,
      authorName: typeof seed.authorName === "string" ? seed.authorName : null,
    };
  };

  /** The locator most recently requested, so a URL effect re-run doesn't re-fetch it. */
  let requestedLocator: string | null = null;

  const request = (locator: string): Promise<void> => {
    requestedLocator = locator;
    return fetchPage(locator).then((loaded) => {
      if (loaded && requestedLocator === locator) {
        result.value = loaded;
      }
    });
  };

  const initialLocator = locatorFor(navigation.initialUrl);
  /** Whether the initial load actually finished (unlike the promise, never forced by the SSR timeout). */
  let initialLoadCompleted = false;
  let resolveInitialLoad: () => void = () => {};
  const initialLoadPromise = new Promise<void>((resolve) => {
    resolveInitialLoad = resolve;
  });

  if (initialLocator) {
    const seed =
      initialSeed?.locator === initialLocator
        ? validateSeed(initialSeed)
        : null;
    if (seed) {
      requestedLocator = initialLocator;
      result.value = seed;
      initialLoadCompleted = true;
      resolveInitialLoad();
    } else {
      void request(initialLocator).then(() => {
        initialLoadCompleted = true;
        resolveInitialLoad();
      });
      // Backstop so an `os.getData()` that never answers can't hold an SSR
      // request open; the client never waits on this promise.
      if (import.meta.env.SSR) {
        const timer = setTimeout(() => {
          console.warn(
            `Timed out waiting for ${kind} page load:`,
            initialLocator
          );
          resolveInitialLoad();
        }, SSR_SHARED_PAGE_TIMEOUT_MS);
        void initialLoadPromise.then(() => clearTimeout(timer));
      }
    }
  } else {
    resolveInitialLoad();
  }

  // Later in-app navigations onto a shared page load it the same way.
  effect(() => {
    const locator = pageLocator.value;
    if (locator && locator !== requestedLocator) {
      void request(locator);
    }
  });

  const getSeed = (): SharedPageSeed<T> | null => {
    if (!initialLocator || !initialLoadCompleted) {
      return null;
    }
    const current = result.peek();
    return current?.locator === initialLocator ? current : null;
  };

  return { page, notFound, initialLoadPromise, getSeed };
}
