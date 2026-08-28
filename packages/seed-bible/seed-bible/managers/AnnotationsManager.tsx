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
import type { ReaderTab, TabsManager } from "./TabsManager";
import type { TranslationBookChapter } from "./FreeUseBibleAPI";
import {
  createAnnotationSyncManager,
  type AnnotationSyncManager,
} from "./AnnotationSyncManager";
import {
  createIndexedDbAnnotationStore,
  LOCAL_OWNER,
  type OfflineAnnotationStore,
  type StoredAnnotation,
} from "./OfflineAnnotationStore";

export interface AnnotationQuery {
  /**
   * The record to read/write against: either a bare record name or an
   * actual record key. Both `os.recordData`/`os.eraseData` and
   * `os.listDataByMarker` resolve this through the records server's
   * `recordKeyOrRecordName` handling, so a real key works for listing too,
   * not just for writes.
   */
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
   * Reactive view of one chapter's annotations, sorted the same way
   * `listAnnotationsForChapter` sorts: from the record override when one was
   * passed to `createAnnotationsManager`, otherwise from the signed-in
   * account's own record. Loads lazily on first access, keyed by the
   * effective record id + bookId/chapterNumber; empty (not loading) only
   * when there's no override and the user is signed out. Stays live-updated
   * by `saveEditingAnnotation`/`deleteAnnotationAndRefresh` below.
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

  /**
   * True when a `recordOverride` was passed to `createAnnotationsManager`,
   * so annotations are being read/written against that record instead of
   * the signed-in account's own. The UI uses this to show a banner letting
   * the visitor know where their notes are actually being saved.
   */
  hasRecordOverride: boolean;

  /**
   * Pushes locally-recorded changes to the server and surfaces conflicts.
   *
   * Exposed so the UI can show how much is still waiting to sync and prompt for
   * a decision when a note changed in two places at once.
   */
  sync: AnnotationSyncManager;
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

/**
 * Resolves the verse numbers an annotation targets: `verseNumbers` when
 * present (the exact, possibly non-contiguous selection), else expanded from
 * `verseNumber`/`endVerseNumber` for annotations saved before that field
 * existed, else empty for a whole-chapter annotation.
 */
export function annotationVerseNumbers(
  annotation: Pick<
    Annotation,
    "verseNumber" | "endVerseNumber" | "verseNumbers"
  >
): number[] {
  if (annotation.verseNumbers && annotation.verseNumbers.length > 0) {
    return annotation.verseNumbers;
  }
  if (annotation.verseNumber == null) {
    return [];
  }
  const end = annotation.endVerseNumber ?? annotation.verseNumber;
  const numbers: number[] = [];
  for (let n = annotation.verseNumber; n <= end; n++) {
    numbers.push(n);
  }
  return numbers;
}

/**
 * Formats verse numbers into a compact label, grouping consecutive runs:
 * `[3, 4, 5]` -> `"3-5"`, `[3, 4, 5, 7]` -> `"3-5,7"`, `[7]` -> `"7"`.
 */
/**
 * Finds the chapter data for an annotation's book/chapter, searching every
 * open tab's currently loaded chapter. Returns null if the annotated chapter
 * isn't loaded in any open tab (e.g. editing a note for a chapter the user
 * has since navigated away from).
 */
export function findAnnotationChapterData(
  annotation: Pick<Annotation, "bookId" | "chapterNumber">,
  tabs: TabsManager
): TranslationBookChapter | null {
  return (
    tabs.tabs.value
      .map((tab) => tab.readingState.chapterData.value)
      .find(
        (c) =>
          c?.book.id === annotation.bookId &&
          c?.chapter.number === annotation.chapterNumber
      ) ?? null
  );
}

/**
 * True when any comment in the list was written by someone other than the
 * current user. Used to decide whether author avatars need the animal+color
 * combo so people can tell each other apart.
 */
export function annotationListHasOtherAuthors(
  annotations: readonly Annotation[],
  selfUserId: string | null | undefined
): boolean {
  for (const annotation of annotations) {
    if (annotation.data.type !== "comment") {
      continue;
    }
    const authorId = annotation.data.userId;
    if (authorId && authorId !== selfUserId) {
      return true;
    }
  }
  return false;
}

export function formatAnnotationVerseNumbers(verseNumbers: number[]): string {
  const sorted = Array.from(new Set(verseNumbers)).sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i <= sorted.length; i++) {
    const n = sorted[i];
    if (n !== undefined && end !== undefined && n === end + 1) {
      end = n;
      continue;
    }
    if (start !== undefined && end !== undefined) {
      groups.push(start === end ? `${start}` : `${start}-${end}`);
    }
    start = n;
    end = n;
  }
  return groups.join(",");
}

export interface AnnotationGroup {
  /** Lowest verse number targeted by every annotation in this group, or `null` for a whole-chapter group. */
  startVerseNumber: number | null;
  /** Highest verse number targeted by every annotation in this group, or `null` for a whole-chapter group. */
  endVerseNumber: number | null;
  annotations: Annotation[];
}

function annotationVerseRangeKey(annotation: Annotation): string {
  const verseNumbers = annotationVerseNumbers(annotation);
  if (verseNumbers.length === 0) {
    return "chapter";
  }
  return [...verseNumbers].sort((a, b) => a - b).join(",");
}

/**
 * Groups annotations that target the exact same set of verses (a
 * whole-chapter annotation only groups with other whole-chapter
 * annotations; two annotations that merely share the same start and end
 * verse but differ in between - e.g. `[3, 5]` vs. `[3, 4, 5]` - land in
 * separate groups), sorts within each group oldest-first by `createdAtMs`
 * (a comment thread reads top-to-bottom in the order it was written; ties
 * or missing timestamps keep their incoming relative order), and sorts the
 * groups themselves with whole-chapter groups first, then ascending by
 * start verse, then by end verse.
 */
export function groupAnnotationsByVerseRange(
  annotations: Annotation[]
): AnnotationGroup[] {
  const groups = new Map<string, AnnotationGroup>();

  for (const annotation of annotations) {
    const key = annotationVerseRangeKey(annotation);
    let group = groups.get(key);
    if (!group) {
      const verseNumbers = annotationVerseNumbers(annotation);
      group = {
        startVerseNumber:
          verseNumbers.length > 0 ? Math.min(...verseNumbers) : null,
        endVerseNumber:
          verseNumbers.length > 0 ? Math.max(...verseNumbers) : null,
        annotations: [],
      };
      groups.set(key, group);
    }
    group.annotations.push(annotation);
  }

  for (const group of groups.values()) {
    group.annotations.sort((a, b) => {
      const aTime = a.data.createdAtMs;
      const bTime = b.data.createdAtMs;
      if (typeof aTime === "number" && typeof bTime === "number") {
        return aTime - bTime;
      }
      return 0;
    });
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.startVerseNumber == null) {
      return b.startVerseNumber == null ? 0 : -1;
    }
    if (b.startVerseNumber == null) {
      return 1;
    }
    if (a.startVerseNumber !== b.startVerseNumber) {
      return a.startVerseNumber - b.startVerseNumber;
    }
    return (a.endVerseNumber ?? 0) - (b.endVerseNumber ?? 0);
  });
}

interface VerseTargeting {
  verseNumber: number | null;
  endVerseNumber: number | null;
  verseNumbers: number[] | null;
}

/**
 * Derives verse targeting from a tab's current text selection, restricted to
 * the given book/chapter (mirrors how `BibleReaderToolbar` reads
 * `selectedVerses` for highlighting). Empty/non-matching selection means
 * "whole chapter".
 */
function deriveVerseTargeting(
  tab: ReaderTab,
  bookId: string,
  chapterNumber: number
): VerseTargeting {
  const selectedVerseNumbers = Array.from(
    new Set(
      tab.readingState.selectedVerses.value
        .filter((v) => v.bookId === bookId && v.chapterNumber === chapterNumber)
        .map((v) => v.verse.number)
    )
  ).sort((a, b) => a - b);

  if (selectedVerseNumbers.length === 0) {
    return { verseNumber: null, endVerseNumber: null, verseNumbers: null };
  }

  const verseNumber = selectedVerseNumbers[0]!;
  const maxVerseNumber = selectedVerseNumbers[selectedVerseNumbers.length - 1]!;
  return {
    verseNumber,
    endVerseNumber: maxVerseNumber !== verseNumber ? maxVerseNumber : null,
    verseNumbers: selectedVerseNumbers,
  };
}

function verseNumbersEqual(a: number[] | null, b: number[] | null): boolean {
  if (a == null || b == null) {
    return a == null && b == null;
  }
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

export function getAnnotationMarker(
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
  /**
   * Effective record id these annotations belong to: the override, the
   * signed-in account, or the signed-out bucket.
   */
  recordId: string;
  /** The chapter these annotations belong to, so a retry knows what to reload. */
  bookId: string;
  chapterNumber: number;
  /** Latest known annotations for this record + chapter. */
  data: Signal<Annotation[]>;
  /** True once a load or a mutation has put real annotations in `data`. */
  settled: boolean;
  /**
   * True when the last load failed.
   *
   * Kept separate from `settled` so a failure is not mistaken for "this chapter
   * has no annotations" — but it still stops the load being retried, because
   * reads happen inside a `computed` and retrying on every read would spin.
   * Cleared when the connection returns, which is the point at which a retry
   * could actually succeed.
   */
  loadFailed: boolean;
  /** In-flight load, shared by concurrent readers. */
  load: Promise<void> | null;
};

function entryKey(recordId: string, address: string): string {
  return `${recordId} ${address}`;
}

export interface CreateAnnotationsManagerOptions {
  /**
   * Where changes are recorded before they reach the server.
   *
   * Defaults to IndexedDB. Pass an explicit store to inject a fake in tests, or
   * null to switch offline support off — which is also what happens on its own
   * during SSR and wherever the browser blocks storage, since the IndexedDB
   * factory returns null there.
   */
  store?: OfflineAnnotationStore | null;
}

/**
 * Creates a new AnnotationsManager instance.
 * @param recordOverride The name of the record or record key to use for annotations, overriding the default behavior of using the signed-in user's ID.
 */
export function createAnnotationsManager(
  os: CasualOSManager,
  login: LoginManager,
  tabs: TabsManager,
  discover: DiscoverManager,
  recordOverride?: string,
  options: CreateAnnotationsManagerOptions = {}
): AnnotationsManager {
  const store =
    options.store === undefined
      ? createIndexedDbAnnotationStore()
      : options.store;

  /**
   * The record a query targets, or null when only the local store can answer.
   *
   * Deliberately does not prompt for login. Prompting mid-save would be wrong
   * offline (the request cannot succeed) and wrong for a signed-out draft (there
   * is a local bucket to write to instead). The prompt lives in
   * `createNewAnnotation`, where the user is present and expecting it.
   *
   * `recordOverride` wins over the signed-in account whenever the query
   * itself doesn't name a record, since it means every annotation for this
   * manager instance should be read from and written to that record.
   */
  const resolveRecordName = (recordName?: string): string | null =>
    recordName ?? recordOverride ?? login.userId.value ?? null;

  /**
   * The bucket local rows belong to: the signed-in account, or the signed-out
   * one. Never null, so a note can always be written somewhere.
   */
  const localOwner = (): string => login.userId.value ?? LOCAL_OWNER;

  /**
   * True when a query targets somebody else's record or a different group,
   * or when this manager instance itself was created with a `recordOverride`
   * — annotations then always belong to that record, never to the local
   * offline queue.
   */
  const isForeignQuery = (query?: AnnotationQuery): boolean =>
    Boolean(query?.recordName || query?.group || recordOverride);

  const saveToServer = async (
    recordName: string,
    parsed: Annotation,
    query?: AnnotationQuery
  ): Promise<void> => {
    const result = await os.recordData(recordName, parsed.id, parsed, {
      marker: getAnnotationMarker(
        parsed.bookId,
        parsed.chapterNumber,
        query?.group
      ),
    });

    if (!result.success) {
      console.error("Error saving annotation:", result);
      throw new Error(`Error saving annotation: ${result.errorCode}`);
    }
  };

  const saveAnnotation = async (
    annotation: Annotation,
    query?: AnnotationQuery
  ): Promise<Annotation> => {
    const now = Date.now();
    // Stamped here rather than only in `saveEditingAnnotation` so every path
    // that persists an annotation gets timestamps — the sync engine's conflict
    // check has nothing to compare without them.
    const parsed = annotationSchema.parse({
      ...annotation,
      data: {
        ...annotation.data,
        createdAtMs: annotation.data.createdAtMs ?? now,
        updatedAtMs: now,
      },
    });

    // Writing into somebody else's record is a direct operation with no local
    // mirror: it isn't this device's note to queue.
    if (isForeignQuery(query) || !store) {
      const recordName = resolveRecordName(query?.recordName);
      if (!recordName) {
        throw new Error(
          "Unable to resolve annotation record. User is not authenticated."
        );
      }
      await saveToServer(recordName, parsed, query);
      return parsed;
    }

    const owner = localOwner();
    const existing = await store.get(owner, parsed.id);
    await store.put({
      key: `${owner}/${parsed.id}`,
      owner,
      annotationId: parsed.id,
      bookId: parsed.bookId,
      chapterNumber: parsed.chapterNumber,
      annotation: parsed,
      deleted: false,
      updatedAtMs: now,
      // Keep whichever server version this edit was built on. A second offline
      // edit must still be judged against the copy the server actually holds,
      // not against our own previous unsent edit.
      baseUpdatedAtMs: existing?.baseUpdatedAtMs ?? null,
      baseFingerprint: existing?.baseFingerprint ?? null,
      pendingOp: "upsert",
      attempts: 0,
    });

    // Resolves once the local write lands, so the composer closes cleanly with
    // no connection instead of reporting a failure the user can do nothing
    // about. The push is the sync engine's job from here.
    sync?.notifyLocalChange();
    return parsed;
  };

  const deleteAnnotation = async (
    annotationId: string,
    query?: AnnotationQuery
  ): Promise<void> => {
    if (isForeignQuery(query) || !store) {
      const recordName = resolveRecordName(query?.recordName);
      if (!recordName) {
        throw new Error(
          "Unable to resolve annotation record. User is not authenticated."
        );
      }
      const result = await os.eraseData(recordName, annotationId);
      if (!result.success) {
        console.error("Error deleting annotation:", result);
        throw new Error(`Error deleting annotation: ${result.errorCode}`);
      }
      return;
    }

    const owner = localOwner();
    const existing = await store.get(owner, annotationId);

    // Never reached the server, so there is nothing to tombstone — including
    // the create-then-delete-while-offline case, which now costs no requests
    // at all.
    if (
      existing &&
      existing.baseUpdatedAtMs === null &&
      !existing.baseFingerprint
    ) {
      await store.delete(owner, annotationId);
      sync?.notifyLocalChange();
      return;
    }

    await store.put({
      key: `${owner}/${annotationId}`,
      owner,
      annotationId,
      bookId: existing?.bookId ?? "",
      chapterNumber: existing?.chapterNumber ?? 0,
      annotation: null,
      deleted: true,
      updatedAtMs: Date.now(),
      baseUpdatedAtMs: existing?.baseUpdatedAtMs ?? null,
      baseFingerprint: existing?.baseFingerprint ?? null,
      pendingOp: "delete",
      attempts: 0,
    });

    sync?.notifyLocalChange();
  };

  /** Reads every annotation a chapter's marker holds, following pagination. */
  const listFromServer = async (
    recordName: string,
    bookId: string,
    chapterNumber: number,
    query?: AnnotationQuery
  ): Promise<Annotation[]> => {
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

  /** The annotations a chapter's local rows represent, tombstones removed. */
  const readLocalChapter = async (
    owner: string,
    bookId: string,
    chapterNumber: number
  ): Promise<Annotation[]> => {
    if (!store) {
      return [];
    }
    const rows = await store.listForChapter(owner, bookId, chapterNumber);
    return sortAnnotations(
      rows
        .filter((row): row is StoredAnnotation & { annotation: Annotation } =>
          Boolean(!row.deleted && row.annotation)
        )
        .map((row) => row.annotation)
    );
  };

  /** Whether the local mirror holds a complete list for a chapter. */
  const hasLocalChapter = async (
    owner: string,
    bookId: string,
    chapterNumber: number
  ): Promise<boolean> => {
    if (!store) {
      return false;
    }
    return (await store.getChapter(owner, bookId, chapterNumber)) !== null;
  };

  /**
   * Loads a chapter's annotations for one specific account, refreshing the
   * mirror from the server when there's a connection.
   *
   * Pinned to an `owner` rather than reading `login.userId` itself, so a load
   * that started under one account can never fold its results into another's
   * rows if the user signs out mid-request.
   */
  const loadChapterForOwner = async (
    owner: string,
    bookId: string,
    chapterNumber: number
  ): Promise<Annotation[]> => {
    // Signed out with nowhere to store anything locally: there are no
    // annotations to show, and `LOCAL_OWNER` is not a record name to ask about.
    if (!store && owner === LOCAL_OWNER) {
      return [];
    }
    if (!store) {
      return listFromServer(owner, bookId, chapterNumber);
    }

    // Signed-out drafts have no server side, and offline there's nothing to ask.
    const canReachServer =
      owner !== LOCAL_OWNER && sync?.isOnline.value !== false;

    if (canReachServer) {
      try {
        const fromServer = await listFromServer(owner, bookId, chapterNumber);
        await store.reconcileChapter(
          owner,
          bookId,
          chapterNumber,
          fromServer,
          Date.now()
        );
      } catch (error) {
        // Couldn't refresh. The mirror still holds whatever we last knew, which
        // is strictly better than reporting the chapter as empty.
        console.warn("Failed to refresh annotations from the server.", error);
      }
    }

    return readLocalChapter(owner, bookId, chapterNumber);
  };

  const listAnnotationsForChapter = async (
    bookId: string,
    chapterNumber: number,
    query?: AnnotationQuery
  ): Promise<Annotation[]> => {
    if (isForeignQuery(query) || !store) {
      const recordName = resolveRecordName(query?.recordName);
      if (!recordName) {
        throw new Error(
          "Unable to resolve annotation record. User is not authenticated."
        );
      }
      return listFromServer(recordName, bookId, chapterNumber, query);
    }

    return loadChapterForOwner(localOwner(), bookId, chapterNumber);
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
    recordId: string,
    bookId: string,
    chapterNumber: number
  ): AnnotationsEntry => {
    const key = entryKey(
      recordId,
      annotationsCacheAddress(bookId, chapterNumber)
    );
    let entry = entries.get(key);
    if (!entry) {
      entry = {
        recordId,
        bookId,
        chapterNumber,
        data: signal<Annotation[]>([]),
        settled: false,
        loadFailed: false,
        load: null,
      };
      entries.set(key, entry);
    }
    return entry;
  };

  const loadEntry = async (
    recordId: string,
    bookId: string,
    chapterNumber: number,
    entry: AnnotationsEntry
  ): Promise<void> => {
    try {
      // A record override always reads straight from that record — it has no
      // local mirror to fall back on. Otherwise `loadChapterForOwner` covers
      // both the signed-in account and the signed-out local bucket.
      const loaded = recordOverride
        ? await listFromServer(recordOverride, bookId, chapterNumber)
        : await loadChapterForOwner(recordId, bookId, chapterNumber);
      // A mutation that settled the entry while this request was in the air
      // holds newer annotations than this response does.
      if (entry.settled) {
        return;
      }
      entry.data.value = loaded;
      entry.loadFailed = false;
      // Only authoritative once we know the list is complete: either the server
      // answered, or the mirror has a record of having listed this chapter
      // before. Settling on a guess is what used to make an offline visit stick
      // as "you have no annotations" for the rest of the page's life.
      entry.settled =
        loaded.length > 0 ||
        (!recordOverride &&
          (await hasLocalChapter(recordId, bookId, chapterNumber)));
      entry.loadFailed = !entry.settled;
    } catch (error) {
      console.error("Failed to load annotations for chapter:", error);
      // `settled` is deliberately left alone, so this is never mistaken for an
      // empty chapter — `loadFailed` is what stops it retrying on every read.
      entry.loadFailed = true;
    }
  };

  const ensureLoaded = (
    recordId: string,
    bookId: string,
    chapterNumber: number,
    entry: AnnotationsEntry
  ): Promise<void> | null => {
    if (entry.settled || entry.loadFailed) {
      return entry.load;
    }
    if (!entry.load) {
      entry.load = loadEntry(recordId, bookId, chapterNumber, entry).finally(
        () => {
          entry.load = null;
        }
      );
    }
    return entry.load;
  };

  // The record id the reactive cache keys off: the override when one was
  // passed to `createAnnotationsManager`, otherwise the signed-in account, or
  // the signed-out bucket so drafts written before signing in are still
  // shown. `??` short-circuits before reading `login.userId.value` whenever
  // an override is set, so callers of this from inside a computed()/effect()
  // never subscribe to sign-in state in that case - the override can't
  // change, so there's nothing to react to.
  const effectiveRecordId = (): string =>
    recordOverride ?? login.userId.value ?? LOCAL_OWNER;

  const getOrCreateView = (
    bookId: string,
    chapterNumber: number
  ): ReadonlySignal<Annotation[]> => {
    const address = annotationsCacheAddress(bookId, chapterNumber);
    let view = views.get(address);
    if (!view) {
      view = computed(() => {
        const recordId = effectiveRecordId();
        const entry = getOrCreateEntry(recordId, bookId, chapterNumber);
        void ensureLoaded(recordId, bookId, chapterNumber, entry);
        return entry.data.value;
      });
      views.set(address, view);
    }
    return view;
  };

  // Drops every cached entry that no longer belongs to the current record,
  // so signing back in re-reads from the server instead of serving a stale
  // entry left over from a previous session as that same account. A no-op
  // (and never re-runs after the first pass) when a record override is set,
  // since `effectiveRecordId` then never depends on sign-in state.
  let cachedRecordId: string | undefined;
  effect(() => {
    const recordId = effectiveRecordId();
    if (recordId === cachedRecordId) {
      return;
    }
    cachedRecordId = recordId;
    for (const [key, entry] of entries) {
      if (entry.recordId !== recordId) {
        entries.delete(key);
      }
    }
  });

  const getAnnotationsForChapter = (
    bookId: string,
    chapterNumber: number
  ): ReadonlySignal<Annotation[]> => getOrCreateView(bookId, chapterNumber);

  const upsertIntoCache = (annotation: Annotation, recordId?: string): void => {
    const cacheRecordId = recordId ?? effectiveRecordId();
    const entry = getOrCreateEntry(
      cacheRecordId,
      annotation.bookId,
      annotation.chapterNumber
    );
    entry.data.value = upsertAnnotation(entry.data.value, annotation);
    entry.settled = true;
  };

  const removeFromCache = (
    annotation: Pick<Annotation, "id" | "bookId" | "chapterNumber">,
    recordId?: string
  ): void => {
    const cacheRecordId = recordId ?? effectiveRecordId();
    const address = annotationsCacheAddress(
      annotation.bookId,
      annotation.chapterNumber
    );
    const entry = entries.get(entryKey(cacheRecordId, address));
    if (!entry) {
      return;
    }
    entry.data.value = removeAnnotationById(entry.data.value, annotation.id);
  };

  /**
   * Removes an annotation from whichever cached chapter holds it.
   *
   * The sync engine knows only the id — a tombstone it pushed carries no
   * chapter, and the annotation it referred to may never have been loaded here —
   * so the chapter has to be found rather than computed.
   */
  const removeFromCacheById = (annotationId: string, owner: string): void => {
    for (const entry of entries.values()) {
      if (entry.recordId !== owner) {
        continue;
      }
      if (entry.data.value.some((a) => a.id === annotationId)) {
        entry.data.value = removeAnnotationById(entry.data.value, annotationId);
      }
    }
  };

  // Created here, rather than by the caller, so it can be handed the cache
  // helpers below and this module's own schema — which is also what keeps the
  // dependency one-way and avoids the two modules importing each other.
  const sync = createAnnotationSyncManager({
    os,
    login,
    store,
    parseAnnotation: (value) => {
      const parsed = annotationSchema.safeParse(value);
      return parsed.success ? parsed.data : null;
    },
    getMarker: (bookId, chapterNumber) =>
      getAnnotationMarker(bookId, chapterNumber),
    onSynced: (annotation, owner) => upsertIntoCache(annotation, owner),
    onRemoved: (annotationId, owner) =>
      removeFromCacheById(annotationId, owner),
  });

  // A chapter whose load failed is retried once there's a connection — the
  // moment a retry could actually work. Waiting for it is what keeps the retry
  // off the read path, where it would re-fire on every read.
  let wasOnline = sync.isOnline.value;
  effect(() => {
    const online = sync.isOnline.value;
    const recovered = online && !wasOnline;
    wasOnline = online;
    if (!recovered) {
      return;
    }
    for (const entry of entries.values()) {
      // Anything not yet settled is worth another go, whether it failed or was
      // never loaded. Checking `settled` rather than `loadFailed` also covers
      // the case where the connection returned while a failing load was still
      // in flight, which would otherwise leave the entry stuck.
      if (entry.settled || entry.load) {
        continue;
      }
      entry.loadFailed = false;
      // Reloaded rather than just re-armed: clearing the flag alone changes no
      // signal, so a view already showing the failed (empty) result would never
      // notice.
      void ensureLoaded(
        entry.recordId,
        entry.bookId,
        entry.chapterNumber,
        entry
      );
    }
  });

  // --- Editing/view-transition state, mirroring PlaylistManager's pattern ---

  const editingAnnotation = signal<Annotation | null>(null);

  // True only while composing a brand-new annotation (between
  // `createNewAnnotation` and save/cancel) - gates the live-selection sync
  // effect below so re-opening an *existing* annotation for editing never
  // has its saved verse targeting silently overwritten by whatever happens
  // to still be selected in the reader.
  const isDraftingNewAnnotation = signal(false);

  // The tab a draft was started on, so the live-sync effect below keeps
  // tracking that tab's selection even if the user switches to a different
  // open tab while the composer is still up (a normal action - the composer
  // is a docked panel, not a modal).
  const draftTabId = signal<string | null>(null);

  const activeTab = computed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );

  // Keeps a new annotation's verse targeting in sync with the reader's live
  // text selection for as long as it's being drafted, so the user can select
  // verses before, during, or after opening the composer and always see (and
  // save) the current selection - no manual verse-range controls needed.
  effect(() => {
    if (!isDraftingNewAnnotation.value) {
      return;
    }
    const current = editingAnnotation.value;
    const tabId = draftTabId.value;
    const tab = tabId
      ? (tabs.tabs.value.find((t) => t.id === tabId) ?? null)
      : null;
    if (!current || !tab) {
      return;
    }
    const targeting = deriveVerseTargeting(
      tab,
      current.bookId,
      current.chapterNumber
    );
    if (
      current.verseNumber === targeting.verseNumber &&
      current.endVerseNumber === targeting.endVerseNumber &&
      verseNumbersEqual(current.verseNumbers ?? null, targeting.verseNumbers)
    ) {
      return;
    }
    editingAnnotation.value = { ...current, ...targeting };
  });

  const createNewAnnotation = async (): Promise<void> => {
    let userId = login.userId.value;

    // Offer a sign-in, but don't insist on one: with a local store the note is
    // kept on the device and adopted when the user does sign in. Skipped when
    // a record override is set (no sign-in needed at all) and while offline,
    // where signing in cannot succeed — including when there is no local
    // store, since a prompt that can only fail is worse than saying so.
    if (!userId && !recordOverride && sync.isOnline.value) {
      const userInfo = await login.login();
      userId = userInfo?.id ?? null;
    }

    // No account, no record override, and nowhere local to put it: nothing
    // can be written.
    if (!userId && !recordOverride && !store) {
      console.warn("Cannot create an annotation while signed out.");
      return;
    }

    const tab = activeTab.value;
    const bookId = tab?.readingState.bookId.value ?? null;
    const chapterNumber = tab?.readingState.chapterNumber.value ?? null;
    if (!tab || !bookId || !chapterNumber) {
      console.warn("Cannot create an annotation: no active chapter.");
      return;
    }

    const now = Date.now();
    isDraftingNewAnnotation.value = true;
    draftTabId.value = tab.id;
    // Verse targeting starts null; the sync effect above fills it in
    // immediately from the current selection, then keeps it live.
    editingAnnotation.value = annotationSchema.parse({
      id: `annotation_${uuid()}`,
      bookId,
      chapterNumber,
      verseNumber: null,
      endVerseNumber: null,
      verseNumbers: null,
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
    isDraftingNewAnnotation.value = false;
    draftTabId.value = null;
    editingAnnotation.value = { ...annotation };
    discover.view.value = "create_annotation";
  };

  const saveEditingAnnotation = async (): Promise<void> => {
    const current = editingAnnotation.value;
    if (!current) {
      return;
    }
    // Captured before awaiting, and passed through explicitly. `saveAnnotation`
    // resolves the same owner synchronously, but it then awaits two IndexedDB
    // round trips — long enough for the account to change. Letting the cache
    // update re-read the *current* login instead would file this note under
    // whichever account happens to be signed in by then, so the next reader sees
    // one account's writing as their own.
    const recordId = effectiveRecordId();
    // `saveAnnotation` stamps the timestamps now, so every path that persists an
    // annotation gets them — not just this one.
    const saved = await saveAnnotation(current);
    upsertIntoCache(saved, recordId);
    isDraftingNewAnnotation.value = false;
    draftTabId.value = null;
    editingAnnotation.value = null;
    discover.view.value = "discover";
  };

  const cancelEditingAnnotation = (): void => {
    isDraftingNewAnnotation.value = false;
    draftTabId.value = null;
    editingAnnotation.value = null;
    discover.view.value = "discover";
  };

  const deleteAnnotationAndRefresh = async (
    annotation: Annotation
  ): Promise<void> => {
    // Captured before awaiting, for the same reason as `saveEditingAnnotation`.
    const recordId = effectiveRecordId();
    await deleteAnnotation(annotation.id);
    removeFromCache(annotation, recordId);
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
    hasRecordOverride: !!recordOverride,
    sync,
  };
}
