import {
  computed,
  effect,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import * as z from "zod/v4";
import type { LoginManager } from "./LoginManager";
import {
  canonicalize,
  createInMemoryRecordStore,
  createIndexedDbRecordStore,
  pendingRow,
  type OfflineRecordStore,
  type StoredRecord,
  type SyncDomain,
} from "./OfflineRecordStore";
import type { CasualOSManager } from "./OsManager";
import { readRecord } from "./RecordRead";
import {
  createRecordSyncManager,
  type RecordSyncManager,
} from "./RecordSyncManager";

/**
 * Schema for one bookmark.
 *
 * A bookmark is a named, colored marker for where you are in a book — "Reading
 * plan", "Sermon prep" — that you move forward as you read. Unlike a save it is
 * not archival: it always points at exactly one chapter, moving it replaces
 * where it was, and there is no verse-level form. Several bookmarks may sit on
 * the same chapter.
 *
 * The location fields are required on purpose. A bookmark that points nowhere
 * is never stored; the premade "My bookmark" offered to a user with none exists
 * only as modal state until they place it.
 */
export const bookmarkSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colorId: z.string().min(1),
  translationId: z.string().min(1),
  bookId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  /** Stamped on every move. Drives "most recently moved first" ordering. */
  updatedAt: z.number().int().nonnegative(),
});

export const bookmarksPayloadSchema = z.object({
  bookmarks: z.array(bookmarkSchema),
});

/**
 * Reads a stored list, dropping any entry that isn't a valid bookmark rather
 * than rejecting the whole list. The sync engine treats a record it can't parse
 * as empty and writes over it, so one bad entry would otherwise cost all of
 * them.
 */
const bookmarksRecordSchema = z.object({
  bookmarks: z.array(z.unknown()).transform((entries) =>
    entries.flatMap((entry) => {
      const parsed = bookmarkSchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    })
  ),
});

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarksPayload = z.infer<typeof bookmarksPayloadSchema>;

/** The chapter a bookmark points at. */
export interface BookmarkLocation {
  translationId: string;
  bookId: string;
  chapterNumber: number;
}

/** The parts of a bookmark the user names and colors. */
export interface BookmarkDetails {
  name: string;
  colorId: string;
}

/**
 * Soft cap on how many bookmarks a user can create. Bookmarks are markers you
 * move, not a collection you grow — Saves is where things accumulate.
 *
 * "Soft" because it only stops *creating* one: a stored list already over the
 * cap (from a later raise of it, or another client) is kept whole, never
 * truncated.
 */
export const MAX_BOOKMARKS = 5;

/**
 * The bookmarks record. Deliberately not `bookmarks` (the legacy saves record,
 * see SavesManager) or `saves`: reading either would surface a user's whole
 * save history as bookmarks.
 */
const STORAGE_ADDRESS = "readingBookmarks";

function makeBookmarkId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `bookmark-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Most recently moved first; `createdAt` and `id` only break exact ties. */
function compareByMostRecentlyMoved(a: Bookmark, b: Bookmark): number {
  return (
    b.updatedAt - a.updatedAt ||
    b.createdAt - a.createdAt ||
    a.id.localeCompare(b.id)
  );
}

export interface BookmarksManager {
  /**
   * The current user's bookmarks, most recently moved first. Empty when logged
   * out.
   */
  bookmarks: ReadonlySignal<Bookmark[]>;

  /** False once the user has {@link MAX_BOOKMARKS} or more bookmarks. */
  canCreate: ReadonlySignal<boolean>;

  /** Whether the bookmarks management panel is showing in the sidebar. */
  isPanelOpen: Signal<boolean>;

  /**
   * Whether the panel was opened from the mobile toolbar's More menu, which
   * decides whether its header offers Close (dismiss the drawer) or Back (to
   * the tabs list it was opened from).
   */
  openedFromToolbar: Signal<boolean>;

  togglePanel: () => void;

  /** Closes the panel and forgets where it was opened from. */
  closePanel: () => void;

  /**
   * Every bookmark on the given chapter in the given translation, most
   * recently moved first. A bookmark on the same chapter in a different
   * translation does not count.
   */
  getBookmarksForLocation: (
    translationId: string | null | undefined,
    bookId: string | null | undefined,
    chapterNumber: number | null | undefined
  ) => Bookmark[];

  /**
   * Resolves once the signed-in user's bookmarks are in memory, from the
   * server or from the copy kept on the device, retrying a load that failed
   * earlier. False when signed out, or when neither could be read — in which
   * case nothing should be offered that would change a list we never saw.
   */
  ensureLoaded: () => Promise<boolean>;

  /**
   * Creates a bookmark at the given chapter. Returns the new bookmark, or null
   * when nothing was written: the user is signed out, the record never loaded,
   * the name is blank, or the user is already at {@link MAX_BOOKMARKS}.
   */
  createBookmark: (
    details: BookmarkDetails,
    location: BookmarkLocation
  ) => Promise<Bookmark | null>;

  /** Moves a bookmark to the given chapter and stamps it as just moved. */
  moveBookmark: (id: string, location: BookmarkLocation) => Promise<void>;

  /**
   * Renames or recolors a bookmark. Leaves its location and `updatedAt`
   * alone — editing a label is not moving it. A blank name is ignored.
   */
  updateBookmark: (id: string, details: BookmarkDetails) => Promise<void>;

  /** Deletes a bookmark. */
  removeBookmark: (id: string) => Promise<void>;

  /**
   * Sends changes made on this device to the server. Every change is kept on
   * the device first, so bookmarks can be created, moved, renamed and deleted
   * offline; the queued list is merged with the server's on reconnect.
   */
  sync: RecordSyncManager<BookmarksPayload>;
}

export interface CreateBookmarksManagerOptions {
  /**
   * Where bookmarks are kept on the device before they reach the server.
   * Defaults to IndexedDB, or to memory where the browser has none (SSR, some
   * private windows) — there changes still queue and sync while the page is
   * open, they just don't survive a reload. Tests pass their own.
   */
  store?: OfflineRecordStore<BookmarksPayload>;
}

export function createBookmarksManager(
  os: CasualOSManager,
  login: LoginManager,
  options: CreateBookmarksManagerOptions = {}
): BookmarksManager {
  const store =
    options.store ??
    createIndexedDbRecordStore<BookmarksPayload>(bookmarksSyncDomain.dbName) ??
    createInMemoryRecordStore<BookmarksPayload>();

  const stored = signal<Bookmark[]>([]);
  const loadedUserId = signal<string | null>(null);
  const isPanelOpen = signal(false);
  const openedFromToolbar = signal(false);

  /**
   * The load for the current user while it is in flight. Mutators wait on it
   * (see {@link ensureLoaded}) so a change made during the round trip isn't
   * overwritten when the load lands.
   */
  let loadPromise: Promise<void> | null = null;

  /**
   * Runs store read-modify-writes and screen refreshes one at a time.
   *
   * A change is built from the stored row's payload and saved with that same
   * row's base, so the sync merge can tell what this device changed. Building
   * it from what's on screen instead could pair an older list with a newer
   * base, and the merge would read the other device's additions as deletions
   * made here. Refreshes go through the same queue so one can't show a row
   * from before a change that was already applied.
   */
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <R,>(task: () => Promise<R>): Promise<R> => {
    const run = queue.then(task, task);
    queue = run.catch(() => undefined);
    return run;
  };

  const bookmarks = computed(() =>
    [...stored.value].sort(compareByMostRecentlyMoved)
  );
  const canCreate = computed(() => stored.value.length < MAX_BOOKMARKS);

  /** Shows what the device holds for this user, if they're still signed in. */
  const showRow = (
    userId: string,
    row: StoredRecord<BookmarksPayload> | null
  ): void => {
    if (login.userId.peek() !== userId) return;
    stored.value = row?.payload?.bookmarks ?? [];
  };

  const refreshFromStore = (userId: string): Promise<void> =>
    enqueue(async () => {
      showRow(userId, await store.get(userId, STORAGE_ADDRESS));
    });

  const sync = createRecordSyncManager<BookmarksPayload>({
    os,
    login,
    store,
    domain: bookmarksSyncDomain,
    onSynced: (_address, _payload, owner) => void refreshFromStore(owner),
    onRemoved: (_address, owner) => void refreshFromStore(owner),
  });

  /** The server's list, "absent" when it has none, or null when unreadable. */
  const readServer = async (
    userId: string
  ): Promise<BookmarksPayload | "absent" | null> => {
    let result: Awaited<ReturnType<CasualOSManager["getData"]>> | undefined;
    try {
      result = await os.getData(userId, STORAGE_ADDRESS);
    } catch (error) {
      console.warn("Could not reach the server for bookmarks.", error);
      return null;
    }
    const read = readRecord(result, bookmarksRecordSchema, "bookmarks");
    if (read.status === "error") return null;
    return read.status === "found" ? read.value : "absent";
  };

  const loadBookmarks = async (userId: string): Promise<void> => {
    const local = await store.get(userId, STORAGE_ADDRESS);
    if (login.userId.peek() !== userId) return;
    if (local) {
      showRow(userId, local);
      loadedUserId.value = userId;
    }

    const server = sync.isOnline.peek() ? await readServer(userId) : null;
    if (login.userId.peek() !== userId) return;
    if (server === null) {
      // With no copy on the device either, stay unloaded rather than show an
      // empty list: changes made to it would sit on top of a list we never
      // saw. The next mutation, or coming back online, retries the load.
      if (!local) {
        console.warn(
          "Could not read the bookmarks record; leaving bookmarks untouched until the next load."
        );
      }
      return;
    }

    // A pending row is left alone here; the sync pass merges it.
    await store.reconcileCollection(
      userId,
      STORAGE_ADDRESS,
      server === "absent"
        ? []
        : [{ address: STORAGE_ADDRESS, payload: server }],
      Date.now()
    );
    await refreshFromStore(userId);
    if (login.userId.peek() === userId) {
      loadedUserId.value = userId;
    }
  };

  const ensureLoaded = async (): Promise<boolean> => {
    const pending = loadPromise;
    if (pending) {
      await pending;
    }
    const userId = login.userId.value;
    if (!userId) {
      return false;
    }
    if (loadedUserId.value === userId) {
      return true;
    }
    // Share a retry another caller already started rather than firing another.
    if (loadPromise === pending) {
      loadPromise = loadBookmarks(userId);
    }
    const retry = loadPromise;
    if (retry) {
      await retry;
    }
    return loadedUserId.value === userId;
  };

  effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      stored.value = [];
      loadedUserId.value = null;
      loadPromise = null;
      isPanelOpen.value = false;
      openedFromToolbar.value = false;
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    loadPromise = loadBookmarks(userId);
  });

  // Coming back online reads the server again, so bookmarks changed on another
  // device show up even when this one has nothing queued for the sync to merge.
  let wasOnline = sync.isOnline.peek();
  effect(() => {
    const online = sync.isOnline.value;
    const cameOnline = online && !wasOnline;
    wasOnline = online;
    const userId = login.userId.peek();
    if (cameOnline && userId) {
      loadPromise = loadBookmarks(userId);
    }
  });

  /**
   * Applies `change` to the device's copy of the list and queues it for the
   * server. `change` returns null to leave the list as it is.
   */
  const mutate = <R,>(
    change: (current: Bookmark[]) => { next: Bookmark[]; result: R } | null
  ): Promise<R | null> =>
    enqueue(async () => {
      const userId = login.userId.peek();
      if (!userId) return null;
      let outcome: { next: Bookmark[]; result: R } | null = null;
      await store.update(userId, STORAGE_ADDRESS, (row) => {
        if (login.userId.peek() !== userId) return undefined;
        outcome = change(row?.payload?.bookmarks ?? []);
        if (!outcome) return undefined;
        return pendingRow({
          owner: userId,
          address: STORAGE_ADDRESS,
          collection: STORAGE_ADDRESS,
          payload: bookmarksPayloadSchema.parse({ bookmarks: outcome.next }),
          base: row?.base ?? null,
          // Strictly later than the row it replaces: the sync engine spots a
          // change made during a push by this stamp, and two changes inside
          // one millisecond would otherwise look like the same one.
          updatedAtMs: Math.max(Date.now(), (row?.updatedAtMs ?? 0) + 1),
        });
      });
      const applied = outcome as { next: Bookmark[]; result: R } | null;
      if (!applied) return null;
      stored.value = applied.next;
      sync.notifyLocalChange();
      return applied.result;
    });

  const getBookmarksForLocation: BookmarksManager["getBookmarksForLocation"] = (
    translationId,
    bookId,
    chapterNumber
  ) => {
    if (!translationId || !bookId || !chapterNumber) {
      return [];
    }
    return bookmarks.value.filter(
      (bookmark) =>
        bookmark.translationId === translationId &&
        bookmark.bookId === bookId &&
        bookmark.chapterNumber === chapterNumber
    );
  };

  const createBookmark: BookmarksManager["createBookmark"] = async (
    details,
    location
  ) => {
    const name = details.name.trim();
    if (!name) return null;
    if (!(await ensureLoaded())) return null;
    return mutate((current) => {
      if (current.length >= MAX_BOOKMARKS) return null;
      const now = Date.now();
      const bookmark: Bookmark = {
        id: makeBookmarkId(),
        name,
        colorId: details.colorId,
        translationId: location.translationId,
        bookId: location.bookId,
        chapterNumber: location.chapterNumber,
        createdAt: now,
        updatedAt: now,
      };
      return { next: [...current, bookmark], result: bookmark };
    });
  };

  const moveBookmark: BookmarksManager["moveBookmark"] = async (
    id,
    location
  ) => {
    if (!(await ensureLoaded())) return;
    await mutate((current) => {
      if (!current.some((bookmark) => bookmark.id === id)) return null;
      // Always restamped, even onto the chapter it already marks: placing it
      // again is what brings it to the front of the stack and the lists.
      const updatedAt = Date.now();
      const next = current.map((bookmark) =>
        bookmark.id === id
          ? {
              ...bookmark,
              translationId: location.translationId,
              bookId: location.bookId,
              chapterNumber: location.chapterNumber,
              updatedAt,
            }
          : bookmark
      );
      return { next, result: undefined };
    });
  };

  const updateBookmark: BookmarksManager["updateBookmark"] = async (
    id,
    details
  ) => {
    const name = details.name.trim();
    if (!name) return;
    if (!(await ensureLoaded())) return;
    await mutate((current) => {
      const existing = current.find((bookmark) => bookmark.id === id);
      if (!existing) return null;
      if (existing.name === name && existing.colorId === details.colorId) {
        return null;
      }
      const next = current.map((bookmark) =>
        bookmark.id === id
          ? { ...bookmark, name, colorId: details.colorId }
          : bookmark
      );
      return { next, result: undefined };
    });
  };

  const removeBookmark: BookmarksManager["removeBookmark"] = async (id) => {
    if (!(await ensureLoaded())) return;
    await mutate((current) => {
      const next = current.filter((bookmark) => bookmark.id !== id);
      return next.length === current.length
        ? null
        : { next, result: undefined };
    });
  };

  return {
    bookmarks,
    canCreate,
    isPanelOpen,
    openedFromToolbar,
    togglePanel: () => {
      isPanelOpen.value = !isPanelOpen.value;
    },
    closePanel: () => {
      isPanelOpen.value = false;
      openedFromToolbar.value = false;
    },
    getBookmarksForLocation,
    ensureLoaded,
    createBookmark,
    moveBookmark,
    updateBookmark,
    removeBookmark,
    sync,
  };
}

function sameLocation(a: Bookmark, b: Bookmark): boolean {
  return (
    a.translationId === b.translationId &&
    a.bookId === b.bookId &&
    a.chapterNumber === b.chapterNumber &&
    a.updatedAt === b.updatedAt
  );
}

/**
 * One field's three-way merge: whichever side changed it wins. When both did,
 * `both` decides.
 */
function pickChanged<V>(
  base: V | undefined,
  local: V,
  server: V,
  same: (a: V, b: V) => boolean,
  both: () => V
): V {
  const localChanged = base === undefined || !same(local, base);
  const serverChanged = base === undefined || !same(server, base);
  if (localChanged && serverChanged) return both();
  return localChanged ? local : server;
}

/** Combines one bookmark that exists both here and on the server. */
function mergeBookmark(
  base: Bookmark | undefined,
  local: Bookmark,
  server: Bookmark
): Bookmark {
  // Moves are timestamped, so a bookmark moved in both places goes where it
  // was moved last. The stamps come from each device's clock and two clocks
  // can disagree; for a reading position "the later move" is still the right
  // intent, and both devices reach the same answer from the same stamps.
  const location = pickChanged(base, local, server, sameLocation, () =>
    local.updatedAt > server.updatedAt ? local : server
  );
  // Renaming and recoloring don't touch `updatedAt`, so the label is merged on
  // its own: a rename here survives a move elsewhere. Changed in both places,
  // this device's edit wins, being the one reaching the server last.
  const same = (a: string, b: string) => a === b;
  const name = pickChanged(
    base?.name,
    local.name,
    server.name,
    same,
    () => local.name
  );
  const colorId = pickChanged(
    base?.colorId,
    local.colorId,
    server.colorId,
    same,
    () => local.colorId
  );
  return {
    ...server,
    name,
    colorId,
    translationId: location.translationId,
    bookId: location.bookId,
    chapterNumber: location.chapterNumber,
    updatedAt: location.updatedAt,
  };
}

/**
 * Three-way merge of a user's bookmark list, bookmark by bookmark.
 *
 * `base` is the server list this device's changes were made on top of, so
 * comparing `local` against it says what changed here: a bookmark missing from
 * base was created here, one missing from local was deleted here. A deletion on
 * either side wins over an edit on the other. A null `base` (nothing was on the
 * server when the change was made) keeps everything from both sides.
 *
 * Never asks the user and never trims to {@link MAX_BOOKMARKS}: two devices
 * each creating offline can end up over the cap, and the whole list is kept,
 * as it is for any stored list over the cap.
 */
export function mergeBookmarks(
  base: BookmarksPayload | null,
  local: BookmarksPayload | null,
  server: BookmarksPayload | null
): BookmarksPayload {
  const byId = (payload: BookmarksPayload | null) =>
    new Map((payload?.bookmarks ?? []).map((b) => [b.id, b]));
  const baseById = byId(base);
  const localById = byId(local);
  const serverById = byId(server);
  const ids = new Set([...serverById.keys(), ...localById.keys()]);

  const merged: Bookmark[] = [];
  for (const id of ids) {
    const before = baseById.get(id);
    const here = localById.get(id);
    const there = serverById.get(id);
    if (before && (!here || !there)) continue;
    if (here && there) {
      merged.push(mergeBookmark(before, here, there));
    } else {
      const only = here ?? there;
      if (only) merged.push(only);
    }
  }
  return { bookmarks: merged };
}

export const bookmarksSyncDomain: SyncDomain<BookmarksPayload> = {
  dbName: "seed-bible-bookmarks",
  parse: (value) => {
    const parsed = bookmarksRecordSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  },
  sameVersion: (a, b) => {
    const sorted = (p: BookmarksPayload) =>
      [...p.bookmarks].sort((x, y) => x.id.localeCompare(y.id));
    return canonicalize(sorted(a)) === canonicalize(sorted(b));
  },
  collection: () => STORAGE_ADDRESS,
  marker: () => "publicRead",
  merge: mergeBookmarks,
};
