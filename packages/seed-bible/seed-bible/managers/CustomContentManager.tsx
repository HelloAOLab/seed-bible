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
import {
  affectedChapterKeys,
  publishedChapterKeys,
} from "./customContent/chapterIndex";
import {
  ACTIVE_IMPORT_STATUSES,
  MAX_IMPORT_ITEMS,
  type ImportItemInput,
  type ImportProgress,
} from "./customContent/importApi";
import type { ContentImportService } from "./customContent/importClient";
import type { ImportEntry } from "./customContent/importEntries";
import { normalizeContentUrl } from "./customContent/normalizeUrl";
import { parsePassages } from "./customContent/passages";
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
}

const RECORD_NAME_PREFIX = "seedbible-content-";
const DEFAULT_IMPORT_POLL_MS = 3000;

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
  /** The import worker. Without one, bulk import is off and publishing happens in the browser. */
  importService?: ContentImportService | null;
  importPollMs?: number;
}): CustomContentManager {
  const { os, login, customizations, discover, modals } = deps;
  const importService = deps.importService ?? null;
  const importPollMs = deps.importPollMs ?? DEFAULT_IMPORT_POLL_MS;
  const store = storeFor(os);

  const recordName = signal<string | null>(null);
  const status = signal<ContentLibraryStatus>("closed");
  const manifest = signal<ContentLibraryManifest | null>(null);
  const chapterIndex = signal<ContentChapterIndex | null>(null);
  const items = signal<readonly ContentItem[]>([]);
  const importProgress = signal<ImportProgress | null>(null);
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
      if (!watching() || !importService || !isActive(importProgress.value)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, importPollMs));
      const current = importProgress.value;
      const key = os.sessionKey.value;
      if (!watching() || !current || !key) {
        return;
      }
      try {
        const next = await importService.getImport(key, current.id);
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
        const parsed = parsePassages(entry.passages, options.books);
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

  // --- Reading: Discover for the active Customization's library ---

  const openEntry = (entry: ContentChapterEntry): void => {
    modals.openModal({
      id: `custom-content-${entry.itemId}`,
      title: entry.title,
      content: () => (
        <PlaylistLinkContent url={entry.url} title={entry.title} />
      ),
    });
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
        if (!index.chapters[contentChapterKey(book, chapter)]) {
          return [];
        }
        const result = await os.getData(
          record,
          contentChapterAddress(book, chapter)
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
        return parsed.data.entries.map((entry): DiscoverContentResult => {
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
  };
}
