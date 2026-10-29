import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import { v4 as uuid } from "uuid";
import { PlaylistLinkContent } from "../components/PlaylistLinkContent/PlaylistLinkContent";
import type { CustomizationsManager } from "./CustomizationsManager";
import type {
  DiscoverContentResult,
  DiscoverManager,
  DiscoverProvider,
} from "./DiscoverManager";
import type { LoginManager } from "./LoginManager";
import type { ModalManager } from "./ModalManager";
import type { CasualOSManager } from "./OsManager";
import {
  affectedChapterKeys,
  buildChapterRecord,
  countPublishedChapters,
  publishedChapterKeys,
} from "./customContent/chapterIndex";
import {
  CONTENT_CHAPTER_MARKER,
  CONTENT_ITEM_MARKER,
  CONTENT_LIBRARY_MARKER,
  CONTENT_MANIFEST_ADDRESS,
  contentChapterAddress,
  contentChapterKey,
  contentChapterRecordSchema,
  contentItemAddress,
  contentItemSchema,
  contentLibraryManifestSchema,
  parseContentChapterKey,
  type ContentCategory,
  type ContentChapterEntry,
  type ContentItem,
  type ContentLibraryManifest,
  type ContentReference,
} from "./customContent/schema";

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

/** Thrown when CasualOS refuses a library write; `code` is its error code. */
export class ContentLibraryError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ContentLibraryError";
  }
}

export interface CustomContentManager {
  /** The record of the library open in the editor, or null. */
  recordName: ReadonlySignal<string | null>;
  status: ReadonlySignal<ContentLibraryStatus>;
  manifest: ReadonlySignal<ContentLibraryManifest | null>;
  /** Every item in the open library, newest first. */
  items: ReadonlySignal<readonly ContentItem[]>;
  /** True while a write to the open library is in flight. */
  isSaving: ReadonlySignal<boolean>;

  /** Loads a library into the editor. */
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
}

const RECORD_NAME_PREFIX = "seedbible-content-";

/** Discover content types are per library, so two libraries' categories never collide. */
export function customContentTypeId(
  recordName: string,
  categoryId: string
): string {
  return `custom-content:${recordName}:${categoryId}`;
}

/** Where items with no category, or a deleted one, are listed. */
export const UNCATEGORIZED_ID = "other";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Fails loudly on a refused write, so the editor never shows unsaved work as saved. */
function assertWritten(
  result: { success: boolean; errorCode?: string; errorMessage?: string },
  what: string
): void {
  if (!result.success) {
    throw new ContentLibraryError(
      result.errorCode ?? "server_error",
      `Failed to ${what}: ${result.errorMessage ?? result.errorCode}`
    );
  }
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
}): CustomContentManager {
  const { os, login, customizations, discover, modals } = deps;

  const recordName = signal<string | null>(null);
  const status = signal<ContentLibraryStatus>("closed");
  const manifest = signal<ContentLibraryManifest | null>(null);
  const items = signal<readonly ContentItem[]>([]);
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
      items.value = next;
    }
  };

  const readManifest = async (
    record: string
  ): Promise<ContentLibraryManifest> => {
    if (recordName.value === record && manifest.value) {
      return manifest.value;
    }
    const result = await os.getData(record, CONTENT_MANIFEST_ADDRESS);
    const parsed = result.success
      ? contentLibraryManifestSchema.safeParse(result.data)
      : null;
    if (!parsed?.success) {
      throw new ContentLibraryError(
        "library_not_found",
        "The content library could not be read."
      );
    }
    return parsed.data;
  };

  const writeManifest = async (
    record: string,
    next: ContentLibraryManifest
  ): Promise<void> => {
    assertWritten(
      await os.recordData(record, CONTENT_MANIFEST_ADDRESS, next, {
        marker: CONTENT_LIBRARY_MARKER,
      }),
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
    assertWritten(
      await os.recordData(record, contentItemAddress(item.id), item, {
        marker: CONTENT_ITEM_MARKER,
      }),
      "save the item"
    );
  };

  /**
   * Rewrites the given chapters from `allItems`, then the manifest's chapter
   * counts. Callers save the items first, so a failure here leaves the items
   * right and the index repairable with {@link rebuildIndex}.
   */
  const rebuildChapters = async (
    record: string,
    keys: Iterable<string>,
    allItems: readonly ContentItem[]
  ): Promise<void> => {
    const now = Date.now();
    for (const key of keys) {
      const chapter = parseContentChapterKey(key);
      if (!chapter) {
        continue;
      }
      const address = contentChapterAddress(chapter.book, chapter.chapter);
      const built = buildChapterRecord(
        allItems,
        chapter.book,
        chapter.chapter,
        now
      );
      if (built) {
        assertWritten(
          await os.recordData(record, address, built, {
            marker: CONTENT_CHAPTER_MARKER,
          }),
          `update ${key}`
        );
      } else {
        const erased = await os.eraseData(record, address);
        if (!erased.success && erased.errorCode !== "data_not_found") {
          assertWritten(erased, `clear ${key}`);
        }
      }
    }

    const current = await readManifest(record);
    await writeManifest(record, {
      ...current,
      chapters: countPublishedChapters(allItems),
      updatedAt: now,
    });
    publishedVersion.value++;
  };

  const openLibrary = async (record: string): Promise<void> => {
    recordName.value = record;
    status.value = "loading";
    manifest.value = null;
    items.value = [];
    try {
      const [manifestResult, itemsResult] = await Promise.all([
        os.getData(record, CONTENT_MANIFEST_ADDRESS),
        os.listAllDataByMarker(record, CONTENT_ITEM_MARKER),
      ]);
      if (recordName.value !== record) {
        return;
      }
      if (!manifestResult.success) {
        status.value =
          manifestResult.errorCode === "data_not_found" ? "missing" : "error";
        return;
      }
      const parsed = contentLibraryManifestSchema.safeParse(
        manifestResult.data
      );
      if (!parsed.success) {
        console.warn("Invalid content library manifest:", parsed.error);
        status.value = "error";
        return;
      }
      const loaded: ContentItem[] = [];
      for (const entry of itemsResult.items) {
        const item = contentItemSchema.safeParse(entry.data);
        if (item.success) {
          loaded.push(item.data);
        } else {
          console.warn("Skipping invalid content item:", item.error);
        }
      }
      loaded.sort((a, b) => b.createdAt - a.createdAt);
      manifest.value = parsed.data;
      items.value = loaded;
      status.value = "ready";
    } catch (error) {
      if (recordName.value === record) {
        console.error("Failed to load content library:", error);
        status.value = "error";
      }
    }
  };

  const closeLibrary = (): void => {
    recordName.value = null;
    status.value = "closed";
    manifest.value = null;
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
      assertWritten(
        await os.createRecord(record, userId),
        "create the content library"
      );
      const created: ContentLibraryManifest = {
        schemaVersion: 1,
        name: customization.name,
        customizationLocator: `${userId}.${customization.id}`,
        categories: [],
        chapters: {},
        updatedAt: Date.now(),
      };
      assertWritten(
        await os.recordData(record, CONTENT_MANIFEST_ADDRESS, created, {
          marker: CONTENT_LIBRARY_MARKER,
        }),
        "save the content library"
      );
      await customizations.setEditingContentRecordName(record);
      recordName.value = record;
      manifest.value = created;
      items.value = [];
      status.value = "ready";
    });

  const deleteLibrary = (): Promise<void> =>
    queueWrite(async () => {
      const { record } = requireOpen();
      // Readers stop finding the library first, so they never see a half-erased one.
      await customizations.setEditingContentRecordName(null);
      for (const marker of [CONTENT_CHAPTER_MARKER, CONTENT_ITEM_MARKER]) {
        const listed = await os.listAllDataByMarker(record, marker);
        for (const entry of listed.items) {
          await os.eraseData(record, entry.address);
        }
      }
      await os.eraseData(record, CONTENT_MANIFEST_ADDRESS);
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
      await rebuildChapters(record, keys, next);
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
      if (!isHttpUrl(url)) {
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
      const publish = options.publish ?? wasPublished;
      const parsed = contentItemSchema.safeParse({
        id: before?.id ?? `item_${uuid()}`,
        url,
        status: publish ? "published" : "draft",
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
        await rebuildChapters(record, keys, next);
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
      const erased = await os.eraseData(record, contentItemAddress(id));
      if (!erased.success && erased.errorCode !== "data_not_found") {
        assertWritten(erased, "delete the item");
      }
      const next = all.filter((item) => item.id !== id);
      setItemsIfOpen(record, next);
      const keys = affectedChapterKeys(before, undefined);
      if (keys.size > 0) {
        await rebuildChapters(record, keys, next);
      }
    });

  const rebuildIndex = (): Promise<void> =>
    queueWrite(async () => {
      const { record, all } = requireOpen();
      // Chapters that have records now, plus the ones that should: a stale
      // record for a chapter nothing points at any more gets erased too.
      const existing = await os.listAllDataByMarker(
        record,
        CONTENT_CHAPTER_MARKER
      );
      const keys = new Set(
        existing.items.map((entry) => entry.address.replace(/^ch\./, ""))
      );
      for (const item of all) {
        for (const key of publishedChapterKeys(item)) {
          keys.add(key);
        }
      }
      await rebuildChapters(record, keys, all);
    });

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
    library: ContentLibraryManifest
  ): (() => void) => {
    const known = new Set(library.categories.map((c) => c.id));
    const cleanups = [
      ...library.categories.map((category, index) =>
        discover.registerContentType({
          id: customContentTypeId(record, category.id),
          title: category.name,
          hiddenByDefault: category.hiddenByDefault,
          priority: category.priority ?? 100 + index,
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
        if (!library.chapters[contentChapterKey(book, chapter)]) {
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
      let library: ContentLibraryManifest | null = null;
      try {
        const result = await os.getData(record, CONTENT_MANIFEST_ADDRESS);
        const parsed = result.success
          ? contentLibraryManifestSchema.safeParse(result.data)
          : null;
        library = parsed?.success ? parsed.data : null;
      } catch (error) {
        console.warn("Could not load the content library", error);
      }
      if (generation !== activeGeneration) {
        return;
      }
      unregisterActive?.();
      unregisterActive = library ? registerLibrary(record, library) : null;
    })();
  });

  return {
    recordName,
    status,
    manifest,
    items,
    isSaving,
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
  };
}
