import * as z from "zod/v4";
import { v4 as uuid } from "uuid";
import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { LoginManager } from "../managers/LoginManager";
import type { CasualOSManager } from "./OsManager";
import type { DiscoverManager } from "./DiscoverManager";
import type { TabsManager } from "./TabsManager";

export interface AnnotationQuery {
  recordName?: string;
  group?: string;
}

export interface AnnotationsManager {
  saveAnnotation: (
    annotation: Annotation,
    query?: AnnotationQuery
  ) => Promise<Annotation>;
  deleteAnnotation: (
    annotationId: string,
    query?: AnnotationQuery
  ) => Promise<void>;
  listAnnotationsForChapter: (
    bookId: string,
    chapterNumber: number,
    query?: AnnotationQuery
  ) => Promise<Annotation[]>;

  /**
   * Reactive view of the signed-in account's annotations for one chapter,
   * sorted the same way `listAnnotationsForChapter` sorts. Loads lazily on
   * first access, keyed by account + bookId/chapterNumber; empty (not
   * loading) when signed out. Stays live-updated by
   * `saveEditingAnnotation`/`deleteAnnotationAndRefresh` below.
   */
  getAnnotationsForChapter: (
    bookId: string,
    chapterNumber: number
  ) => ReadonlySignal<Annotation[]>;

  /** The annotation currently being created/edited in the pane, or null. */
  editingAnnotation: Signal<Annotation | null>;

  /**
   * Starts creating a new annotation on the active tab's current chapter and
   * switches the pane to the create/edit view. Pre-fills the verse targeting
   * from the reader's current text selection when one exists for that
   * chapter. No-op (with a console warning) when signed out and login is
   * declined, or when there is no active chapter to attach to.
   */
  createNewAnnotation: () => Promise<void>;

  /**
   * Opens an existing annotation for editing: sets `editingAnnotation` to a
   * copy of it and switches to the create/edit view.
   */
  editAnnotation: (annotation: Annotation) => void;

  /**
   * Persists `editingAnnotation` (upsert), updates the chapter cache, clears
   * the draft, and returns to the discover view. No-op when nothing is being
   * edited. Rethrows on save failure, leaving `editingAnnotation` intact so
   * the caller doesn't lose the draft.
   */
  saveEditingAnnotation: () => Promise<void>;

  /** Discards the current edit and returns to the discover view. */
  cancelEditingAnnotation: () => void;

  /**
   * Deletes an annotation, updates the chapter cache, and clears the editing
   * draft if it was the one being edited. Rethrows on failure.
   */
  deleteAnnotationAndRefresh: (annotation: Annotation) => Promise<void>;
}

export const commentAnnotationSchema = z.object({
  type: z.literal("comment"),
  html: z.string(),
  replyTo: z.string().nullable().optional(),
  createdAtMs: z.number().nullable().optional(),
  updatedAtMs: z.number().nullable().optional(),
  userProfilePicture: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

const annotationDataSchema = z.discriminatedUnion("type", [
  commentAnnotationSchema,
]);

export type AnnotationData = z.infer<typeof annotationDataSchema>;
export type CommentAnnotationData = z.infer<typeof commentAnnotationSchema>;
export type Annotation = z.infer<typeof annotationSchema>;

export const annotationSchema = z.object({
  id: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  verseNumber: z.number().int().positive().nullable().optional(),
  endVerseNumber: z.number().int().positive().nullable().optional(),
  verseNumbers: z.array(z.number().int().positive()).nullable().optional(),
  order: z.number().nullable().optional(),
  data: annotationDataSchema,
});

function getAnnotationMarker(
  bookId: string,
  chapterNumber: number,
  group: string = "annotations"
): string {
  return `publicRead:${group}/${bookId}/${chapterNumber}`;
}

function sortAnnotations(annotations: Annotation[]): Annotation[] {
  return [...annotations].sort((a, b) => {
    if (typeof a.order === "number") {
      if (typeof b.order === "number") {
        return a.order - b.order;
      }
      return -1;
    }

    if (typeof b.order === "number") {
      return 1;
    }

    return a.id < b.id ? -1 : 1;
  });
}

type AnnotationsEntry = {
  /** Account these annotations belong to. */
  userId: string;
  /** Latest known annotations for this account + chapter. */
  data: Signal<Annotation[]>;
  /** True once a load or a mutation has put real annotations in `data`. */
  settled: boolean;
  /** In-flight load, shared by concurrent readers. */
  load: Promise<void> | null;
};

function entryKey(userId: string, address: string): string {
  return `${userId} ${address}`;
}

export function createAnnotationsManager(
  os: CasualOSManager,
  login: LoginManager,
  tabs: TabsManager,
  discover: DiscoverManager
): AnnotationsManager {
  const resolveRecordName = async (recordName?: string): Promise<string> => {
    if (recordName) {
      return recordName;
    }

    if (!login.userId.value) {
      await login.login();
    }

    const userId = login.userId.value;
    if (!userId) {
      throw new Error(
        "Unable to resolve annotation record. User is not authenticated."
      );
    }

    return userId;
  };

  const saveAnnotation = async (
    annotation: Annotation,
    query?: AnnotationQuery
  ): Promise<Annotation> => {
    const parsed = annotationSchema.parse(annotation);
    const recordName = await resolveRecordName(query?.recordName);
    const marker = getAnnotationMarker(
      parsed.bookId,
      parsed.chapterNumber,
      query?.group
    );

    const result = await os.recordData(recordName, parsed.id, parsed, {
      marker,
    });

    if (!result.success) {
      console.error("Error saving annotation:", result);
      throw new Error(`Error saving annotation: ${result.errorCode}`);
    }

    return parsed;
  };

  const deleteAnnotation = async (
    annotationId: string,
    query?: AnnotationQuery
  ): Promise<void> => {
    const recordName = await resolveRecordName(query?.recordName);
    const result = await os.eraseData(recordName, annotationId);

    if (!result.success) {
      console.error("Error deleting annotation:", result);
      throw new Error(`Error deleting annotation: ${result.errorCode}`);
    }
  };

  const listAnnotationsForChapter = async (
    bookId: string,
    chapterNumber: number,
    query?: AnnotationQuery
  ): Promise<Annotation[]> => {
    const recordName = await resolveRecordName(query?.recordName);
    const marker = getAnnotationMarker(bookId, chapterNumber, query?.group);

    const annotations: Annotation[] = [];
    let lastAddress: string | undefined;

    while (true) {
      const page = await os.listDataByMarker(recordName, marker, lastAddress);

      if (!page.success) {
        console.error("Error listing annotations:", page);
        throw new Error(`Error listing annotations: ${page.errorCode}`);
      }

      if (page.items.length === 0) {
        break;
      }

      for (const item of page.items) {
        const parsed = annotationSchema.safeParse(item.data);
        if (!parsed.success) {
          console.warn("Skipping invalid annotation record:", parsed.error);
          continue;
        }
        annotations.push(parsed.data);
      }

      lastAddress = page.items[page.items.length - 1]?.address;
    }

    return sortAnnotations(annotations);
  };

  // --- Reactive per-chapter cache, mirroring HighlightsManager's pattern ---

  function annotationsCacheAddress(
    bookId: string,
    chapterNumber: number
  ): string {
    return `annotations:${bookId}/${chapterNumber}`;
  }

  function upsertAnnotation(
    list: Annotation[],
    next: Annotation
  ): Annotation[] {
    const exists = list.some((a) => a.id === next.id);
    const merged = exists
      ? list.map((a) => (a.id === next.id ? next : a))
      : [...list, next];
    return sortAnnotations(merged);
  }

  function removeAnnotationById(list: Annotation[], id: string): Annotation[] {
    return list.filter((a) => a.id !== id);
  }

  // Cached annotations, keyed by account + chapter address.
  const entries = new Map<string, AnnotationsEntry>();
  // Identity-stable per-chapter views handed to callers, keyed by address.
  const views = new Map<string, ReadonlySignal<Annotation[]>>();

  const getOrCreateEntry = (
    userId: string,
    address: string
  ): AnnotationsEntry => {
    const key = entryKey(userId, address);
    let entry = entries.get(key);
    if (!entry) {
      entry = {
        userId,
        data: signal<Annotation[]>([]),
        settled: false,
        load: null,
      };
      entries.set(key, entry);
    }
    return entry;
  };

  const loadEntry = async (
    userId: string,
    bookId: string,
    chapterNumber: number,
    entry: AnnotationsEntry
  ): Promise<void> => {
    try {
      const loaded = await listAnnotationsForChapter(bookId, chapterNumber, {
        recordName: userId,
      });
      // A mutation that settled the entry while this request was in the air
      // holds newer annotations than this response does.
      if (entry.settled) {
        return;
      }
      entry.data.value = loaded;
      entry.settled = true;
    } catch (error) {
      console.error("Failed to load annotations for chapter:", error);
      if (!entry.settled) {
        entry.data.value = [];
        entry.settled = true;
      }
    }
  };

  const ensureLoaded = (
    userId: string,
    bookId: string,
    chapterNumber: number,
    entry: AnnotationsEntry
  ): Promise<void> | null => {
    if (entry.settled) {
      return entry.load;
    }
    if (!entry.load) {
      entry.load = loadEntry(userId, bookId, chapterNumber, entry).finally(
        () => {
          entry.load = null;
        }
      );
    }
    return entry.load;
  };

  const getOrCreateView = (
    bookId: string,
    chapterNumber: number
  ): ReadonlySignal<Annotation[]> => {
    const address = annotationsCacheAddress(bookId, chapterNumber);
    let view = views.get(address);
    if (!view) {
      view = computed(() => {
        const userId = login.userId.value; // keeps this view following the signed-in account
        if (!userId) {
          return [];
        }
        const entry = getOrCreateEntry(userId, address);
        void ensureLoaded(userId, bookId, chapterNumber, entry);
        return entry.data.value;
      });
      views.set(address, view);
    }
    return view;
  };

  // Drops every cached entry that no longer belongs to the signed-in
  // account, so signing back in re-reads from the server instead of serving
  // a stale entry left over from a previous session as that same account.
  let cachedUserId: string | null | undefined;
  effect(() => {
    const userId = login.userId.value;
    if (userId === cachedUserId) {
      return;
    }
    cachedUserId = userId;
    for (const [key, entry] of entries) {
      if (entry.userId !== userId) {
        entries.delete(key);
      }
    }
  });

  const getAnnotationsForChapter = (
    bookId: string,
    chapterNumber: number
  ): ReadonlySignal<Annotation[]> => getOrCreateView(bookId, chapterNumber);

  const upsertIntoCache = (annotation: Annotation): void => {
    const userId = login.userId.peek();
    if (!userId) {
      return;
    }
    const address = annotationsCacheAddress(
      annotation.bookId,
      annotation.chapterNumber
    );
    const entry = getOrCreateEntry(userId, address);
    entry.data.value = upsertAnnotation(entry.data.value, annotation);
    entry.settled = true;
  };

  const removeFromCache = (annotation: Annotation): void => {
    const userId = login.userId.peek();
    if (!userId) {
      return;
    }
    const address = annotationsCacheAddress(
      annotation.bookId,
      annotation.chapterNumber
    );
    const entry = entries.get(entryKey(userId, address));
    if (!entry) {
      return;
    }
    entry.data.value = removeAnnotationById(entry.data.value, annotation.id);
  };

  // --- Editing/view-transition state, mirroring PlaylistManager's pattern ---

  const editingAnnotation = signal<Annotation | null>(null);

  const activeTab = computed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );

  const createNewAnnotation = async (): Promise<void> => {
    let userId = login.userId.value;
    if (!userId) {
      const userInfo = await login.login();
      if (!userInfo) {
        console.warn("Cannot create an annotation while signed out.");
        return;
      }
      userId = userInfo.id;
    }

    const tab = activeTab.value;
    const bookId = tab?.readingState.bookId.value ?? null;
    const chapterNumber = tab?.readingState.chapterNumber.value ?? null;
    if (!tab || !bookId || !chapterNumber) {
      console.warn("Cannot create an annotation: no active chapter.");
      return;
    }

    // Pre-fill verse targeting from the reader's current text selection, if
    // any of it lands on this same chapter (mirrors how BibleReaderToolbar
    // reads `selectedVerses` for highlighting).
    const selectedVerseNumbers = tab.readingState.selectedVerses.value
      .filter((v) => v.bookId === bookId && v.chapterNumber === chapterNumber)
      .map((v) => v.verse.number);
    let verseNumber: number | null = null;
    let endVerseNumber: number | null = null;
    if (selectedVerseNumbers.length > 0) {
      verseNumber = Math.min(...selectedVerseNumbers);
      const maxVerseNumber = Math.max(...selectedVerseNumbers);
      endVerseNumber = maxVerseNumber !== verseNumber ? maxVerseNumber : null;
    }

    const now = Date.now();
    editingAnnotation.value = annotationSchema.parse({
      id: `annotation_${uuid()}`,
      bookId,
      chapterNumber,
      verseNumber,
      endVerseNumber,
      data: {
        type: "comment",
        html: "",
        userId,
        createdAtMs: now,
        updatedAtMs: now,
      },
    });
    discover.view.value = "create_annotation";
  };

  const editAnnotation = (annotation: Annotation): void => {
    editingAnnotation.value = { ...annotation };
    discover.view.value = "create_annotation";
  };

  const saveEditingAnnotation = async (): Promise<void> => {
    const current = editingAnnotation.value;
    if (!current) {
      return;
    }
    const now = Date.now();
    const next: Annotation = {
      ...current,
      data: {
        ...current.data,
        updatedAtMs: now,
        createdAtMs: current.data.createdAtMs ?? now,
      },
    };
    const saved = await saveAnnotation(next);
    upsertIntoCache(saved);
    editingAnnotation.value = null;
    discover.view.value = "discover";
  };

  const cancelEditingAnnotation = (): void => {
    editingAnnotation.value = null;
    discover.view.value = "discover";
  };

  const deleteAnnotationAndRefresh = async (
    annotation: Annotation
  ): Promise<void> => {
    await deleteAnnotation(annotation.id);
    removeFromCache(annotation);
    if (editingAnnotation.peek()?.id === annotation.id) {
      cancelEditingAnnotation();
    }
  };

  return {
    saveAnnotation,
    deleteAnnotation,
    listAnnotationsForChapter,
    getAnnotationsForChapter,
    editingAnnotation,
    createNewAnnotation,
    editAnnotation,
    saveEditingAnnotation,
    cancelEditingAnnotation,
    deleteAnnotationAndRefresh,
  };
}
