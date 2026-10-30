import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import { v4 as uuid } from "uuid";
import { PlaylistLinkContent } from "../components/PlaylistLinkContent/PlaylistLinkContent";
import type { CustomizationsManager } from "./CustomizationsManager";
import type {
  DiscoverContentResult,
  DiscoverManager,
  DiscoverProvider,
} from "./DiscoverManager";
import type { TranslationBook } from "./FreeUseBibleAPI";
import type { LoginManager } from "./LoginManager";
import type { ModalManager } from "./ModalManager";
import type { CasualOSManager } from "./OsManager";
import type { ChatProvider, ChatsManager } from "./ChatsManager";
import type { ContentClassificationResult } from "./customContent/classify";
import {
  affectedChapterKeys,
  publishedChapterKeys,
} from "./customContent/chapterIndex";
import {
  ACTIVE_IMPORT_STATUSES,
  MAX_IMPORT_ITEMS,
  type ImportItemInput,
  type ImportProgress,
  type SiteCandidate,
  type SiteImport,
  type StartSiteImportRequest,
} from "./customContent/importApi";
import type { ContentImportService } from "./customContent/importClient";
import type { ImportEntry } from "./customContent/importEntries";
import { normalizeContentUrl } from "./customContent/normalizeUrl";
import {
  ContentLibraryError,
  assertStored,
  loadLibraryItems,
  publishChapters,
  readChapterIndex,
  readLibraryManifest,
  type ContentRecordStore,
} from "./customContent/publish";
import {
  CONTENT_CHAPTER_INDEX_ADDRESS,
  CONTENT_CHAPTER_MARKER,
  CONTENT_IMPORT_STATUS_ADDRESS,
  CONTENT_ITEM_MARKER,
  CONTENT_LIBRARY_MARKER,
  CONTENT_MANIFEST_ADDRESS,
  MAX_CONTENT_DESCRIPTION_LENGTH,
  MAX_CONTENT_TITLE_LENGTH,
  contentChapterAddress,
  contentChapterKey,
  contentChapterRecordSchema,
  contentItemAddress,
  contentItemSchema,
  type ContentCategory,
  type ContentChapterEntry,
  type ContentChapterIndex,
  type ContentItem,
  type ContentLibraryManifest,
  type ContentSiteSource,
  type ContentReference,
} from "./customContent/schema";

export { ContentLibraryError };

/** What the editor submits for a new or edited item. */
export interface ContentItemInput {
  /** Absent for a new item. */
  id?: string;
  url: string;
  title: string;
  description: string;
  image?: string;
  author?: string;
  categoryIds: string[];
  references: ContentReference[];
}

export type ContentLibraryStatus =
  | "closed"
  | "loading"
  | "ready"
  | "missing"
  | "error";

/** What an import was handed, and what it left out before sending anything. */
export interface ImportSummary {
  /** Links sent to the import service. */
  queued: number;
  /** Links already in the library, skipped. */
  alreadyInLibrary: number;
  /** Category names that matched none of the library's categories. */
  unknownCategories: string[];
  /** Passages that didn't parse; their links are imported without them. */
  unrecognizedPassages: string[];
}

export interface CustomContentManager {
  /** The record of the library open in the editor, or null. */
  recordName: ReadonlySignal<string | null>;
  status: ReadonlySignal<ContentLibraryStatus>;
  manifest: ReadonlySignal<ContentLibraryManifest | null>;
  /** Published item counts per chapter, for the open library. */
  chapterIndex: ReadonlySignal<ContentChapterIndex | null>;
  /** Every item in the open library, newest first. */
  items: ReadonlySignal<readonly ContentItem[]>;
  /** True while a write to the open library is in flight. */
  isSaving: ReadonlySignal<boolean>;

  /** Whether an import service is configured, so links can be imported in bulk. */
  canImport: boolean;
  /** The open library's latest import, while the editor watches it. */
  importProgress: ReadonlySignal<ImportProgress | null>;

  /** Loads a library into the editor, and picks up an import still running for it. */
  openLibrary: (recordName: string) => Promise<void>;
  closeLibrary: () => void;
  /**
   * Creates a library for the Customization open in the editor: a new record
   * owned by the signed-in user, its manifest, and the Customization's
   * pointer to it. Throws a {@link ContentLibraryError} when CasualOS refuses.
   */
  createLibrary: () => Promise<void>;
  /** Erases everything in the open library and unlinks it from the Customization being edited. */
  deleteLibrary: () => Promise<void>;

  addCategory: (name: string) => Promise<ContentCategory>;
  renameCategory: (id: string, name: string) => Promise<void>;
  /** Removes the category from the library and from every item that used it. */
  removeCategory: (id: string) => Promise<void>;
  setDefaultAuthor: (author: string) => Promise<void>;

  /**
   * Saves an item. A published item's chapters are rebuilt straight away;
   * `publish: true` publishes it, `false` takes it out of Discover.
   */
  saveItem: (
    input: ContentItemInput,
    options?: { publish?: boolean }
  ) => Promise<ContentItem>;
  setItemPublished: (id: string, published: boolean) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  /** Rewrites every chapter record from the items, to repair a publish that stopped partway. */
  rebuildIndex: () => Promise<void>;

  /**
   * Hands links to the import service, which fills in each one's details in
   * the background and adds it for review. Links already in the library are
   * skipped. Category names and passages (from a CSV) are matched here.
   */
  importEntries: (
    entries: readonly ImportEntry[],
    options?: { books?: TranslationBook[] }
  ) => Promise<ImportSummary>;
  cancelImport: () => Promise<void>;
  /** Continues an import that paused because the session it started with ended. */
  resumeImport: () => Promise<void>;

  /**
   * The open library's website import while it looks pages up in Common
   * Crawl or waits for the owner to pick some. Null otherwise.
   */
  siteImport: ReadonlySignal<SiteImport | null>;
  /** The pages that lookup found, without the ones already in the library. */
  siteCandidates: ReadonlySignal<{
    pages: readonly SiteCandidate[];
    alreadyInLibrary: number;
  }>;
  /** Looks a website up in Common Crawl, to pick which of its pages to import. */
  startSiteImport: (request: {
    site: string;
    include?: string[];
    exclude?: string[];
  }) => Promise<void>;
  /** Looks a website imported before up again, in crawls newer than the last look. */
  checkSiteForNewPages: (sourceId: string) => Promise<void>;
  /** Imports the chosen pages, and remembers the site for "Check for new pages". */
  pickSitePages: (itemIds: readonly string[]) => Promise<void>;

  /** Chat providers that can suggest categories and passages (they implement `classifyContent`). */
  classifierProviders: ReadonlySignal<readonly ChatProvider[]>;
  /** The open library's chosen provider, while it's registered. */
  classifier: ReadonlySignal<ChatProvider | null>;
  /** Imported items still to be read for the passages they name; that happens by itself while the editor is open. */
  classifyQueue: ReadonlySignal<number>;
  /** Items waiting for review that the AI hasn't been asked about. */
  aiCandidates: ReadonlySignal<number>;
  /** The latest AI suggestion run the owner started, while the editor shows it. */
  aiRun: ReadonlySignal<AiSuggestionRun | null>;
  /** Picks the agent the owner can ask for suggestions, or none. */
  setClassifier: (providerId: string | null) => Promise<void>;
  setAutoPublish: (autoPublish: boolean) => Promise<void>;
  /**
   * Asks the chosen agent for categories and passages: for the given items,
   * or by default every item waiting for review it hasn't been asked about.
   * Only the owner starts this; nothing asks the AI by itself. Throws a
   * `ContentLibraryError` ("no_classifier") without a chosen agent.
   */
  suggestWithAi: (ids?: readonly string[]) => Promise<void>;
  /** Stops a run after the items already being asked about. */
  stopSuggesting: () => void;
  /** Asks the AI about one item, replacing its earlier suggestions. */
  classifyItem: (id: string) => Promise<void>;
}

/** Progress of an AI suggestion run. */
export interface AiSuggestionRun {
  total: number;
  done: number;
  failed: number;
  running: boolean;
  /** Stop was pressed; the items already being asked about are finishing. */
  stopping?: boolean;
}

const RECORD_NAME_PREFIX = "seedbible-content-";
const DEFAULT_IMPORT_POLL_MS = 3000;

/**
 * Suggesting passages and categories only happens while an owner edits a
 * library, so that code loads then rather than with every reader's app.
 */
const loadEditingHelpers = () => import("./customContent/classify");
/** Websites a library remembers for "Check for new pages", most recently imported first. */
const MAX_SITE_SOURCES = 20;

/** Discover content types are per library, so two libraries' categories never collide. */
export function customContentTypeId(
  recordName: string,
  categoryId: string
): string {
  return `custom-content:${recordName}:${categoryId}`;
}

/** Where items with no category, or a deleted one, are listed. */
export const UNCATEGORIZED_ID = "other";

/** The SDK's data calls, in the shape the shared publishing code expects. */
function storeFor(os: CasualOSManager): ContentRecordStore {
  const result = (value: {
    success: boolean;
    errorCode?: unknown;
    errorMessage?: unknown;
    data?: unknown;
  }) =>
    value.success
      ? { success: true as const, data: value.data }
      : {
          success: false as const,
          errorCode: String(value.errorCode ?? "server_error"),
          errorMessage:
            typeof value.errorMessage === "string"
              ? value.errorMessage
              : undefined,
        };
  return {
    getData: async (record, address) =>
      result(await os.getData(record, address)),
    recordData: async (record, address, data, marker) =>
      result(await os.recordData(record, address, data, { marker })),
    eraseData: async (record, address) =>
      result(await os.eraseData(record, address)),
    listByMarker: async (record, marker) =>
      (await os.listAllDataByMarker(record, marker)).items,
  };
}

export function createCustomContentManager(deps: {
  os: CasualOSManager;
  login: Pick<LoginManager, "userId">;
  customizations: Pick<
    CustomizationsManager,
    | "activeCustomization"
    | "activeCustomizationLocator"
    | "editingCustomization"
    | "setEditingContentRecordName"
  >;
  discover: Pick<
    DiscoverManager,
    "registerDiscoverProvider" | "registerContentType"
  >;
  modals: Pick<ModalManager, "openModal">;
  /** Chat providers registered by extensions; ones with `classifyContent` can suggest categories and passages. */
  chats: Pick<ChatsManager, "providers">;
  /** The import worker. Without one, bulk import is off and publishing happens in the browser. */
  importService?: ContentImportService | null;
  importPollMs?: number;
}): CustomContentManager {
  const { os, login, customizations, discover, modals, chats } = deps;
  const importService = deps.importService ?? null;
  const importPollMs = deps.importPollMs ?? DEFAULT_IMPORT_POLL_MS;
  const store = storeFor(os);

  const recordName = signal<string | null>(null);
  const status = signal<ContentLibraryStatus>("closed");
  const manifest = signal<ContentLibraryManifest | null>(null);
  const chapterIndex = signal<ContentChapterIndex | null>(null);
  const items = signal<readonly ContentItem[]>([]);
  const importProgress = signal<ImportProgress | null>(null);
  const siteImport = signal<SiteImport | null>(null);
  const pendingWrites = signal(0);
  const isSaving = computed(() => pendingWrites.value > 0);
  // Bumped after the owner publishes, so their own Discover picks it up.
  const publishedVersion = signal(0);

  // Writes run one at a time: a chapter rebuild reads `items`, so two
  // overlapping saves could otherwise each write a chapter missing the
  // other's change.
  let writeChain: Promise<unknown> = Promise.resolve();
  const queueWrite = <T,>(run: () => Promise<T>): Promise<T> => {
    pendingWrites.value++;
    const next = writeChain.then(run, run).finally(() => {
      pendingWrites.value--;
    });
    writeChain = next.catch(() => undefined);
    return next;
  };

  const requireSessionKey = (): string => {
    const key = os.sessionKey.value;
    if (!key) {
      throw new ContentLibraryError(
        "not_logged_in",
        "Sign in to change a content library."
      );
    }
    return key;
  };

  /**
   * The open library as it is when a write starts. Writes work from this
   * snapshot rather than re-reading the signals after an `await`: the editor
   * can close in between, and a chapter rebuilt from an emptied item list
   * would take every other item off that chapter.
   */
  const requireOpen = (): {
    record: string;
    current: ContentLibraryManifest;
    all: readonly ContentItem[];
  } => {
    const record = recordName.value;
    const current = manifest.value;
    if (!record || !current) {
      throw new ContentLibraryError(
        "library_not_open",
        "No content library is open."
      );
    }
    return { record, current, all: items.value };
  };

  const setItemsIfOpen = (record: string, next: readonly ContentItem[]) => {
    if (recordName.value === record) {
      items.value = [...next].sort((a, b) => b.createdAt - a.createdAt);
    }
  };

  const writeManifest = async (
    record: string,
    next: ContentLibraryManifest
  ): Promise<void> => {
    assertStored(
      await store.recordData(
        record,
        CONTENT_MANIFEST_ADDRESS,
        next,
        CONTENT_LIBRARY_MARKER
      ),
      "save the content library"
    );
    if (recordName.value === record) {
      manifest.value = next;
    }
  };

  const writeItem = async (
    record: string,
    item: ContentItem
  ): Promise<void> => {
    assertStored(
      await store.recordData(
        record,
        contentItemAddress(item.id),
        item,
        CONTENT_ITEM_MARKER
      ),
      "save the item"
    );
  };

  /**
   * Rebuilds chapters after items were saved: on the import worker when
   * there is one, so a library has a single publisher, otherwise here.
   */
  const publish = async (
    record: string,
    options: { keys?: Iterable<string>; full?: boolean },
    allItems: readonly ContentItem[]
  ): Promise<void> => {
    const next = importService
      ? await importService.publish(requireSessionKey(), {
          contentRecordName: record,
          ...(options.keys ? { keys: [...options.keys] } : {}),
          ...(options.full ? { full: true } : {}),
        })
      : await publishChapters(store, record, { ...options, items: allItems });
    if (recordName.value === record) {
      chapterIndex.value = next;
    }
    publishedVersion.value++;
  };

  const reloadItems = async (record: string): Promise<void> => {
    const loaded = await loadLibraryItems(store, record);
    setItemsIfOpen(record, loaded);
  };

  // --- Watching an import ---

  let watchGeneration = 0;

  const isActive = (progress: ImportProgress | null) =>
    !!progress && ACTIVE_IMPORT_STATUSES.includes(progress.status);

  /** A website import that hasn't started importing pages yet. */
  const isSiteLookup = (progress: ImportProgress | null) =>
    progress?.kind === "site" &&
    (progress.status === "listing" || progress.status === "awaiting_pick");

  const refreshSiteImport = async (
    key: string,
    id: string
  ): Promise<SiteImport> => {
    const next = await importService!.getSiteImport(key, id);
    siteImport.value = isSiteLookup(next.progress) ? next : null;
    return next;
  };

  /**
   * Polls an import while the editor shows its library, reloading the items
   * whenever more of them have been added, and once more when it ends.
   */
  const watchImport = (record: string, initial: ImportProgress): void => {
    importProgress.value = initial;
    const generation = ++watchGeneration;
    let settled = initial.done + initial.failed;
    const watching = () =>
      generation === watchGeneration && recordName.value === record;

    const tick = async (): Promise<void> => {
      if (
        !watching() ||
        !importService ||
        !isActive(importProgress.value) ||
        // Listed and waiting: nothing changes until the owner picks.
        (importProgress.value?.status === "awaiting_pick" &&
          siteImport.value?.candidates)
      ) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, importPollMs));
      const current = importProgress.value;
      const key = os.sessionKey.value;
      if (!watching() || !current || !key) {
        return;
      }
      try {
        const next = isSiteLookup(current)
          ? (await refreshSiteImport(key, current.id)).progress
          : await importService.getImport(key, current.id);
        if (!watching()) {
          return;
        }
        importProgress.value = next;
        const nowSettled = next.done + next.failed;
        if (nowSettled !== settled || !isActive(next)) {
          settled = nowSettled;
          await reloadItems(record);
        }
      } catch (error) {
        console.warn("Couldn't check on the content import:", error);
      }
      void tick();
    };
    void tick();
  };

  const stopWatching = () => {
    watchGeneration++;
    importProgress.value = null;
    siteImport.value = null;
  };

  // --- Editing ---

  const openLibrary = async (record: string): Promise<void> => {
    stopWatching();
    recordName.value = record;
    status.value = "loading";
    manifest.value = null;
    chapterIndex.value = null;
    items.value = [];
    try {
      const [loadedManifest, loadedIndex, loadedItems] = await Promise.all([
        readLibraryManifest(store, record),
        readChapterIndex(store, record),
        loadLibraryItems(store, record),
      ]);
      if (recordName.value !== record) {
        return;
      }
      manifest.value = loadedManifest;
      chapterIndex.value = loadedIndex;
      setItemsIfOpen(record, loadedItems);
      status.value = "ready";
    } catch (error) {
      if (recordName.value !== record) {
        return;
      }
      if (
        error instanceof ContentLibraryError &&
        error.code === "library_not_found"
      ) {
        status.value = "missing";
      } else {
        console.error("Failed to load content library:", error);
        status.value = "error";
      }
      return;
    }

    const key = os.sessionKey.value;
    if (importService && key) {
      try {
        const active = await importService.findActiveImport(key, record);
        if (active && isSiteLookup(active)) {
          await refreshSiteImport(key, active.id);
        }
        if (active && recordName.value === record) {
          watchImport(record, active);
        }
      } catch (error) {
        console.warn("Couldn't check for a running content import:", error);
      }
    }
  };

  const closeLibrary = (): void => {
    stopWatching();
    stopRequested = true;
    aiGeneration++;
    aiRun.value = null;
    unsaved.clear();
    recordName.value = null;
    status.value = "closed";
    manifest.value = null;
    chapterIndex.value = null;
    items.value = [];
  };

  const createLibrary = (): Promise<void> =>
    queueWrite(async () => {
      const userId = login.userId.value;
      const customization = customizations.editingCustomization.value;
      if (!userId || !customization) {
        throw new ContentLibraryError(
          "not_logged_in",
          "Sign in and open a Custom Branding to create a content library."
        );
      }
      const record = `${RECORD_NAME_PREFIX}${uuid()}`;
      const createdRecord = await os.createRecord(record, userId);
      if (!createdRecord.success) {
        throw new ContentLibraryError(
          String(createdRecord.errorCode),
          `Failed to create the content library: ${createdRecord.errorMessage}`
        );
      }
      const created: ContentLibraryManifest = {
        schemaVersion: 1,
        name: customization.name,
        customizationLocator: `${userId}.${customization.id}`,
        categories: [],
        updatedAt: Date.now(),
      };
      await writeManifest(record, created);
      await customizations.setEditingContentRecordName(record);
      stopWatching();
      recordName.value = record;
      manifest.value = created;
      chapterIndex.value = { schemaVersion: 1, chapters: {}, updatedAt: 0 };
      items.value = [];
      status.value = "ready";
    });

  const deleteLibrary = (): Promise<void> =>
    queueWrite(async () => {
      const { record } = requireOpen();
      const running = importProgress.value;
      if (importService && isActive(running) && running) {
        await importService.cancelImport(requireSessionKey(), running.id);
      }
      stopWatching();
      // Readers stop finding the library first, so they never see a half-erased one.
      await customizations.setEditingContentRecordName(null);
      for (const marker of [CONTENT_CHAPTER_MARKER, CONTENT_ITEM_MARKER]) {
        for (const entry of await store.listByMarker(record, marker)) {
          await store.eraseData(record, entry.address);
        }
      }
      for (const address of [
        CONTENT_CHAPTER_INDEX_ADDRESS,
        CONTENT_IMPORT_STATUS_ADDRESS,
        CONTENT_MANIFEST_ADDRESS,
      ]) {
        await store.eraseData(record, address);
      }
      closeLibrary();
    });

  const addCategory = (name: string): Promise<ContentCategory> =>
    queueWrite(async () => {
      const { record, current } = requireOpen();
      const category: ContentCategory = {
        id: `cat_${uuid()}`,
        name: name.trim(),
      };
      await writeManifest(record, {
        ...current,
        categories: [...current.categories, category],
        updatedAt: Date.now(),
      });
      return category;
    });

  const renameCategory = (id: string, name: string): Promise<void> =>
    queueWrite(async () => {
      const { record, current } = requireOpen();
      await writeManifest(record, {
        ...current,
        categories: current.categories.map((category) =>
          category.id === id ? { ...category, name: name.trim() } : category
        ),
        updatedAt: Date.now(),
      });
      publishedVersion.value++;
    });

  const removeCategory = (id: string): Promise<void> =>
    queueWrite(async () => {
      const { record, current, all } = requireOpen();
      const now = Date.now();
      const keys = new Set<string>();
      let next = all;
      for (const item of all) {
        if (!item.categoryIds.includes(id)) {
          continue;
        }
        const updated: ContentItem = {
          ...item,
          categoryIds: item.categoryIds.filter((c) => c !== id),
          updatedAt: now,
        };
        await writeItem(record, updated);
        next = next.map((i) => (i.id === item.id ? updated : i));
        for (const key of publishedChapterKeys(updated)) {
          keys.add(key);
        }
      }
      setItemsIfOpen(record, next);
      await writeManifest(record, {
        ...current,
        categories: current.categories.filter((c) => c.id !== id),
        updatedAt: now,
      });
      if (keys.size > 0) {
        await publish(record, { keys }, next);
      } else {
        publishedVersion.value++;
      }
    });

  const setDefaultAuthor = (author: string): Promise<void> =>
    queueWrite(async () => {
      const { record, current } = requireOpen();
      const trimmed = author.trim();
      const next: ContentLibraryManifest = {
        ...current,
        updatedAt: Date.now(),
      };
      if (trimmed) {
        next.defaultAuthor = trimmed;
      } else {
        delete next.defaultAuthor;
      }
      await writeManifest(record, next);
    });

  const saveItem = (
    input: ContentItemInput,
    options: { publish?: boolean } = {}
  ): Promise<ContentItem> =>
    queueWrite(async () => {
      const { record, current, all } = requireOpen();
      const url = input.url.trim();
      if (!normalizeContentUrl(url)) {
        throw new ContentLibraryError(
          "invalid_url",
          "Content links must start with http:// or https://."
        );
      }
      const before = input.id
        ? all.find((item) => item.id === input.id)
        : undefined;
      const now = Date.now();
      const knownCategories = new Set(current.categories.map((c) => c.id));
      const wasPublished = before?.status === "published";
      const shouldPublish = options.publish ?? wasPublished;
      const parsed = contentItemSchema.safeParse({
        id: before?.id ?? `item_${uuid()}`,
        url,
        // Saving without publishing keeps an imported item in review.
        status: shouldPublish
          ? "published"
          : before && before.status !== "published"
            ? before.status === "failed"
              ? "needs_review"
              : before.status
            : "draft",
        title: input.title.trim(),
        description: input.description.trim(),
        ...(input.image?.trim() ? { image: input.image.trim() } : {}),
        ...(input.author?.trim() ? { author: input.author.trim() } : {}),
        categoryIds: input.categoryIds.filter((id) => knownCategories.has(id)),
        references: input.references,
        // The embedded video belongs to the page; a new link drops it.
        ...(before?.mediaUrl && before.url === url
          ? { mediaUrl: before.mediaUrl }
          : {}),
        ...(before?.origin ? { origin: before.origin } : {}),
        createdAt: before?.createdAt ?? now,
        updatedAt: now,
      });
      if (!parsed.success) {
        throw new ContentLibraryError("invalid_item", parsed.error.message);
      }
      const saved = parsed.data;
      await writeItem(record, saved);
      const next = before
        ? all.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...all];
      setItemsIfOpen(record, next);

      const keys = affectedChapterKeys(before, saved);
      if (keys.size > 0) {
        await publish(record, { keys }, next);
      }
      return saved;
    });

  const setItemPublished = async (
    id: string,
    published: boolean
  ): Promise<void> => {
    const item = items.value.find((i) => i.id === id);
    if (!item) {
      return;
    }
    await saveItem(item, { publish: published });
  };

  const deleteItem = (id: string): Promise<void> =>
    queueWrite(async () => {
      const { record, all } = requireOpen();
      const before = all.find((item) => item.id === id);
      if (!before) {
        return;
      }
      const erased = await store.eraseData(record, contentItemAddress(id));
      if (!erased.success && erased.errorCode !== "data_not_found") {
        assertStored(erased, "delete the item");
      }
      const next = all.filter((item) => item.id !== id);
      setItemsIfOpen(record, next);
      const keys = affectedChapterKeys(before, undefined);
      if (keys.size > 0) {
        await publish(record, { keys }, next);
      }
    });

  const rebuildIndex = (): Promise<void> =>
    queueWrite(async () => {
      const { record, all } = requireOpen();
      await publish(record, { full: true }, all);
    });

  // --- Importing ---

  const importEntries = async (
    entries: readonly ImportEntry[],
    options: { books?: TranslationBook[] } = {}
  ): Promise<ImportSummary> => {
    if (!importService) {
      throw new ContentLibraryError(
        "import_unavailable",
        "Importing isn't set up on this server."
      );
    }
    const { record, current, all } = requireOpen();
    const key = requireSessionKey();
    const inLibrary = new Set(
      all.map((item) => normalizeContentUrl(item.url)).filter(Boolean)
    );
    const categoryByName = new Map(
      current.categories.map((c) => [c.name.trim().toLowerCase(), c.id])
    );
    const unknownCategories = new Set<string>();
    const unrecognizedPassages: string[] = [];
    let alreadyInLibrary = 0;

    const inputs: ImportItemInput[] = [];
    const parsePassages = entries.some((entry) => entry.passages)
      ? (await import("./customContent/passages")).parsePassages
      : null;
    for (const entry of entries) {
      if (inLibrary.has(normalizeContentUrl(entry.url))) {
        alreadyInLibrary++;
        continue;
      }
      const categoryIds: string[] = [];
      for (const name of entry.categories ?? []) {
        const id = categoryByName.get(name.toLowerCase());
        if (id) {
          categoryIds.push(id);
        } else {
          unknownCategories.add(name);
        }
      }
      let references: ContentReference[] | undefined;
      if (entry.passages) {
        const parsed = parsePassages!(entry.passages, options.books);
        references = parsed.references;
        unrecognizedPassages.push(...parsed.unrecognized);
      }
      // Trimmed to the item limits here: one over-long cell would otherwise
      // get the whole import refused.
      const title = entry.title?.slice(0, MAX_CONTENT_TITLE_LENGTH);
      const description = entry.description?.slice(
        0,
        MAX_CONTENT_DESCRIPTION_LENGTH
      );
      const author = entry.author?.slice(0, 200);
      inputs.push({
        url: entry.url,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
        ...(author ? { author } : {}),
        ...(categoryIds.length ? { categoryIds } : {}),
        ...(references?.length ? { references } : {}),
      });
    }
    const summary: ImportSummary = {
      queued: inputs.length,
      alreadyInLibrary,
      unknownCategories: [...unknownCategories],
      unrecognizedPassages,
    };
    if (inputs.length === 0) {
      return summary;
    }
    if (inputs.length > MAX_IMPORT_ITEMS) {
      throw new ContentLibraryError(
        "too_many_items",
        `One import can hold up to ${MAX_IMPORT_ITEMS} links.`
      );
    }
    const started = await importService.startImport(key, {
      contentRecordName: record,
      items: inputs,
    });
    watchImport(record, started);
    return summary;
  };

  const cancelImport = async (): Promise<void> => {
    const running = importProgress.value;
    const record = recordName.value;
    if (!importService || !running || !record) {
      return;
    }
    const cancelled = await importService.cancelImport(
      requireSessionKey(),
      running.id
    );
    watchGeneration++;
    importProgress.value = cancelled;
    siteImport.value = null;
    await reloadItems(record);
  };

  const resumeImport = async (): Promise<void> => {
    const paused = importProgress.value;
    const record = recordName.value;
    if (!importService || !paused || !record) {
      return;
    }
    const resumed = await importService.resumeImport(
      requireSessionKey(),
      paused.id
    );
    watchImport(record, resumed);
  };

  // --- Importing a website ---

  const siteCandidates = computed(() => {
    const found = siteImport.value?.candidates ?? [];
    const inLibrary = new Set(
      items.value.map((item) => normalizeContentUrl(item.url)).filter(Boolean)
    );
    const pages = found.filter(
      (page) => !inLibrary.has(normalizeContentUrl(page.url))
    );
    return { pages, alreadyInLibrary: found.length - pages.length };
  });

  const lookUpSite = async (
    request: Omit<StartSiteImportRequest, "contentRecordName">
  ): Promise<void> => {
    if (!importService) {
      throw new ContentLibraryError(
        "import_unavailable",
        "Importing isn't set up on this server."
      );
    }
    const { record } = requireOpen();
    const started = await importService.startSiteImport(requireSessionKey(), {
      ...request,
      contentRecordName: record,
    });
    siteImport.value = started;
    watchImport(record, started.progress);
  };

  const startSiteImport = (request: {
    site: string;
    include?: string[];
    exclude?: string[];
  }): Promise<void> =>
    lookUpSite({
      site: request.site,
      ...(request.include?.length ? { include: request.include } : {}),
      ...(request.exclude?.length ? { exclude: request.exclude } : {}),
    });

  const checkSiteForNewPages = async (sourceId: string): Promise<void> => {
    const source = manifest.value?.siteSources?.find((s) => s.id === sourceId);
    if (!source) {
      throw new ContentLibraryError(
        "site_not_found",
        "That website isn't saved in this library."
      );
    }
    await lookUpSite({
      site: source.site,
      include: source.include,
      exclude: source.exclude,
      sourceId: source.id,
      sinceCrawlId: source.newestCrawlId,
    });
  };

  const pickSitePages = async (itemIds: readonly string[]): Promise<void> => {
    const lookup = siteImport.value;
    if (!importService || lookup?.progress.status !== "awaiting_pick") {
      throw new ContentLibraryError(
        "nothing_to_pick",
        "There's no website import waiting for pages to be picked."
      );
    }
    const { record } = requireOpen();
    const started = await importService.pickSitePages(
      requireSessionKey(),
      lookup.progress.id,
      itemIds
    );
    siteImport.value = null;
    watchImport(record, started);
    await queueWrite(async () => {
      const { current } = requireOpen();
      const sources = current.siteSources ?? [];
      const previous = sources.find((s) => s.id === lookup.sourceId);
      const newestCrawlId = [lookup.crawls[0]?.id, previous?.newestCrawlId]
        .filter((id): id is string => !!id)
        .sort()
        .at(-1);
      if (!newestCrawlId) {
        return;
      }
      const source: ContentSiteSource = {
        id: lookup.sourceId,
        site: lookup.site,
        include: lookup.include,
        exclude: lookup.exclude,
        lastImportedAt: Date.now(),
        newestCrawlId,
      };
      await writeManifest(record, {
        ...current,
        siteSources: [source, ...sources.filter((s) => s.id !== source.id)]
          .sort((a, b) => b.lastImportedAt - a.lastImportedAt)
          .slice(0, MAX_SITE_SOURCES),
        updatedAt: Date.now(),
      });
    });
  };

  // --- Suggesting categories and passages ---

  const classifierProviders = computed(() =>
    chats.providers.value.filter((provider) => !!provider.classifyContent)
  );
  const classifier = computed(() => {
    const id = manifest.value?.classifierProviderId;
    return id
      ? (classifierProviders.value.find((provider) => provider.id === id) ??
          null)
      : null;
  });

  /**
   * Imported items whose text hasn't been read for the passages it names.
   * That's the only suggesting that happens by itself; the AI is only asked
   * when the owner asks ({@link suggestWithAi}).
   */
  const needsExplicitPassages = (item: ContentItem): boolean =>
    item.status === "needs_review" && !item.classification;

  const classifying = new Set<string>();
  // Items whose result couldn't be saved; skipped until the library reopens,
  // so a failing write doesn't retry in a tight loop.
  const unsaved = new Set<string>();
  const classifyQueue = computed(
    () =>
      items.value.filter(
        (item) => needsExplicitPassages(item) && !unsaved.has(item.id)
      ).length
  );
  const aiCandidates = computed(
    () =>
      items.value.filter(
        (item) =>
          item.status === "needs_review" && !item.classification?.providerId
      ).length
  );
  const aiRun = signal<AiSuggestionRun | null>(null);
  /** Requests to a provider at once, so a big batch doesn't flood it. */
  const AI_CONCURRENCY = 2;

  /**
   * Finds the passages an item names and, with `provider`, asks it for
   * categories and more passages; then saves the result to the item as it
   * is now (the owner may have edited it meanwhile). Returns false when the
   * provider failed; the failure is recorded on the item.
   */
  const classifyOne = async (
    record: string,
    id: string,
    provider: ChatProvider | null
  ): Promise<boolean> => {
    const item = items.value.find((i) => i.id === id);
    const current = manifest.value;
    if (!item || !current || recordName.value !== record) {
      return true;
    }
    const {
      applyClassification,
      buildClassificationRequest,
      isConfidentlyClassified,
    } = await loadEditingHelpers();
    const { findExplicitReferences } =
      await import("./customContent/explicitReferences");
    const { formatContentReference } = await import("./customContent/passages");
    const explicit = findExplicitReferences(item);
    let result: ContentClassificationResult | undefined;
    let error: string | undefined;
    if (provider?.classifyContent) {
      try {
        result = await provider.classifyContent(
          buildClassificationRequest(
            item,
            current.categories,
            explicit.map((reference) => formatContentReference(reference))
          )
        );
      } catch (caught) {
        console.warn("Couldn't get suggestions for a content item:", caught);
        error = caught instanceof Error ? caught.message : String(caught);
      }
    }

    await queueWrite(async () => {
      if (recordName.value !== record) {
        return;
      }
      const { current: latestManifest, all } = requireOpen();
      const latest = all.find((i) => i.id === id);
      // The automatic pass leaves an item alone once the owner has moved it
      // on; asking the AI is the owner's own request, so it applies anyway.
      if (!latest || (!provider && !needsExplicitPassages(latest))) {
        return;
      }
      let next = applyClassification(latest, {
        explicit,
        result,
        error,
        providerId: provider?.id,
        categories: latestManifest.categories,
        now: Date.now(),
      });
      if (
        latestManifest.autoPublish &&
        latest.status === "needs_review" &&
        provider &&
        !error &&
        isConfidentlyClassified(next)
      ) {
        next = { ...next, status: "published" };
      }
      await writeItem(record, next);
      const updated = all.map((i) => (i.id === id ? next : i));
      setItemsIfOpen(record, updated);
      const keys = affectedChapterKeys(latest, next);
      if (keys.size > 0) {
        await publish(record, { keys }, updated);
      }
    });
    return !error;
  };

  /** Reads newly imported items for the passages they name, while the library is open. */
  const pump = (): void => {
    const record = recordName.value;
    if (!record || status.value !== "ready") {
      return;
    }
    for (const item of items.value) {
      if (
        classifying.has(item.id) ||
        unsaved.has(item.id) ||
        !needsExplicitPassages(item)
      ) {
        continue;
      }
      classifying.add(item.id);
      void classifyOne(record, item.id, null)
        .catch((error) => {
          console.warn("Couldn't save passages for a content item:", error);
          unsaved.add(item.id);
        })
        .finally(() => {
          classifying.delete(item.id);
          pump();
        });
    }
  };

  effect(() => {
    void items.value;
    if (status.value === "ready") {
      pump();
    }
  });

  let aiGeneration = 0;
  let stopRequested = false;

  const suggestWithAi = async (ids?: readonly string[]): Promise<void> => {
    const record = recordName.value;
    const provider = classifier.value;
    if (!record) {
      return;
    }
    if (!provider) {
      throw new ContentLibraryError(
        "no_classifier",
        "Choose an AI agent for this library first."
      );
    }
    const queue = [
      ...(ids ??
        items.value
          .filter(
            (item) =>
              item.status === "needs_review" && !item.classification?.providerId
          )
          .map((item) => item.id)),
    ];
    if (queue.length === 0) {
      return;
    }
    const generation = ++aiGeneration;
    stopRequested = false;
    const run: AiSuggestionRun = {
      total: queue.length,
      done: 0,
      failed: 0,
      running: true,
    };
    aiRun.value = run;
    const update = (patch: Partial<AiSuggestionRun>) => {
      if (generation === aiGeneration) {
        aiRun.value = { ...aiRun.value!, ...patch };
      }
    };

    const worker = async (): Promise<void> => {
      for (;;) {
        const id = queue.shift();
        if (
          id === undefined ||
          stopRequested ||
          generation !== aiGeneration ||
          recordName.value !== record
        ) {
          return;
        }
        unsaved.delete(id);
        classifying.add(id);
        let ok = false;
        try {
          ok = await classifyOne(record, id, provider);
        } catch (error) {
          console.warn("Couldn't save suggestions for a content item:", error);
        } finally {
          classifying.delete(id);
        }
        if (generation === aiGeneration) {
          const latest = aiRun.value!;
          update({
            done: latest.done + 1,
            failed: latest.failed + (ok ? 0 : 1),
          });
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(AI_CONCURRENCY, queue.length) }, worker)
    );
    update({ running: false });
  };

  // The items already being asked about finish and are saved; their count
  // keeps going until they do, so the run reports what actually happened.
  const stopSuggesting = (): void => {
    if (aiRun.value?.running) {
      stopRequested = true;
      aiRun.value = { ...aiRun.value, stopping: true };
    }
  };

  const setClassifier = (providerId: string | null): Promise<void> =>
    queueWrite(async () => {
      const { record, current } = requireOpen();
      const next: ContentLibraryManifest = {
        ...current,
        updatedAt: Date.now(),
      };
      if (providerId) {
        next.classifierProviderId = providerId;
      } else {
        delete next.classifierProviderId;
      }
      await writeManifest(record, next);
    });

  const setAutoPublish = (autoPublish: boolean): Promise<void> =>
    queueWrite(async () => {
      const { record, current } = requireOpen();
      await writeManifest(record, {
        ...current,
        autoPublish,
        updatedAt: Date.now(),
      });
    });

  const classifyItem = (id: string): Promise<void> => suggestWithAi([id]);

  // --- Reading: Discover for the active Customization's library ---

  const openEntry = (entry: ContentChapterEntry): void => {
    modals.openModal({
      id: `custom-content-${entry.itemId}`,
      title: entry.title,
      content: () => (
        <PlaylistLinkContent
          url={entry.mediaUrl ?? entry.url}
          title={entry.title}
        />
      ),
    });
  };

  /** One page of a chapter's entries; empty when it can't be read. */
  const readChapterPage = async (
    record: string,
    book: string,
    chapter: number,
    page: number
  ): Promise<ContentChapterEntry[]> => {
    const result = await os.getData(
      record,
      contentChapterAddress(book, chapter, page)
    );
    if (!result.success) {
      if (result.errorCode !== "data_not_found") {
        console.warn("Could not load custom content for Discover", result);
      }
      return [];
    }
    const parsed = contentChapterRecordSchema.safeParse(result.data);
    if (!parsed.success) {
      console.warn("Invalid custom content chapter record:", parsed.error);
      return [];
    }
    return parsed.data.entries;
  };

  const registerLibrary = (
    record: string,
    library: ContentLibraryManifest,
    index: ContentChapterIndex
  ): (() => void) => {
    const known = new Set(library.categories.map((c) => c.id));
    const cleanups = [
      ...library.categories.map((category, position) =>
        discover.registerContentType({
          id: customContentTypeId(record, category.id),
          title: category.name,
          hiddenByDefault: category.hiddenByDefault,
          priority: category.priority ?? 100 + position,
        })
      ),
      discover.registerContentType({
        id: customContentTypeId(record, UNCATEGORIZED_ID),
        title: { key: "custom-content-other", defaultValue: "Other" },
        priority: 100 + library.categories.length,
      }),
    ];

    const provider: DiscoverProvider = {
      id: `custom-content:${record}`,
      title: library.name,
      description: "Content from this Custom Branding's library.",
      discover: async ({ book, chapter }) => {
        const key = contentChapterKey(book, chapter);
        if (!index.chapters[key]) {
          return [];
        }
        const pages = await Promise.all(
          Array.from({ length: index.pages?.[key] ?? 1 }, (_, page) =>
            readChapterPage(record, book, chapter, page + 1)
          )
        );
        // A publish running while this reads can move an entry to another
        // page, so the same item may turn up twice.
        const seen = new Set<string>();
        const entries = pages
          .flat()
          .filter((entry) => !seen.has(entry.itemId) && seen.add(entry.itemId));
        return entries.map((entry): DiscoverContentResult => {
          const primary = entry.categoryIds.find((id) => known.has(id));
          return {
            type: "content",
            contentType: customContentTypeId(
              record,
              primary ?? UNCATEGORIZED_ID
            ),
            // An empty list would match no selected verse; leaving it out
            // is how Discover spells "the whole chapter".
            verses: entry.verses.length > 0 ? entry.verses : undefined,
            title: entry.title,
            description: entry.description,
            reference: entry.reference,
            author: entry.author,
            image: entry.image,
            onClick: () => openEntry(entry),
          };
        });
      },
    };
    cleanups.push(discover.registerDiscoverProvider(provider));
    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  };

  let unregisterActive: (() => void) | null = null;
  let activeGeneration = 0;
  effect(() => {
    // Discover only runs in the browser; a server render has nothing to
    // register for and shouldn't wait on the network for it.
    if (import.meta.env.SSR) {
      return;
    }
    const record =
      customizations.activeCustomization.value?.contentRecordName ?? null;
    // Re-registering after a publish hands Discover a new provider object,
    // which drops its cached answers, so the owner sees the change at once.
    void publishedVersion.value;
    const generation = ++activeGeneration;
    if (!record) {
      unregisterActive?.();
      unregisterActive = null;
      return;
    }
    void (async () => {
      let loaded: [ContentLibraryManifest, ContentChapterIndex] | null = null;
      try {
        loaded = await Promise.all([
          readLibraryManifest(store, record),
          readChapterIndex(store, record),
        ]);
      } catch (error) {
        console.warn("Could not load the content library", error);
      }
      if (generation !== activeGeneration) {
        return;
      }
      unregisterActive?.();
      unregisterActive = loaded
        ? registerLibrary(record, loaded[0], loaded[1])
        : null;
    })();
  });

  return {
    recordName,
    status,
    manifest,
    chapterIndex,
    items,
    isSaving,
    canImport: importService !== null,
    importProgress,
    siteImport,
    siteCandidates,
    startSiteImport,
    checkSiteForNewPages,
    pickSitePages,
    openLibrary,
    closeLibrary,
    createLibrary,
    deleteLibrary,
    addCategory,
    renameCategory,
    removeCategory,
    setDefaultAuthor,
    saveItem,
    setItemPublished,
    deleteItem,
    rebuildIndex,
    importEntries,
    cancelImport,
    resumeImport,
    classifierProviders,
    classifier,
    classifyQueue,
    aiCandidates,
    aiRun,
    suggestWithAi,
    stopSuggesting,
    setClassifier,
    setAutoPublish,
    classifyItem,
  };
}
