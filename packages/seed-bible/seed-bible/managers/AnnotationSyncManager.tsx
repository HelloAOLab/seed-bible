/**
 * Pushes locally-recorded annotation changes to the server, and asks the user
 * what to do when a note changed in both places.
 *
 * ## Why conflicts have to be handled here at all
 *
 * CasualOS data records have no version or etag, and `recordData` is a blind
 * overwrite. So the only way to avoid silently destroying somebody's writing is
 * to read the server's copy first and check it is still the one the local edit
 * was based on. Each stored row keeps that "base" pointer (see
 * `StoredAnnotation.baseUpdatedAtMs`), which is why this compares against a
 * remembered version rather than asking whose timestamp is larger — timestamps
 * are written by whichever device made the edit, and two devices' clocks do not
 * have to agree.
 *
 * ## What it does not do
 *
 * The check is read-then-write, not compare-and-set. A write from another device
 * that lands in the gap between our read and our write is still last-write-wins.
 * Closing that would need the server to support conditional writes.
 */

import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import { v4 as uuid } from "uuid";
import type { Annotation } from "./AnnotationsManager";
import type { LoginManager } from "./LoginManager";
import type { CasualOSManager } from "./OsManager";
import { FATAL_SESSION_ERROR_CODES } from "./SessionGuard";
import {
  annotationFingerprint,
  annotationUpdatedAtMs,
  LOCAL_OWNER,
  MAX_SYNC_ATTEMPTS,
  syncedRow,
  type OfflineAnnotationStore,
  type StoredAnnotation,
} from "./OfflineAnnotationStore";

/**
 * Server failures that a later attempt could plausibly succeed at.
 *
 * Everything else is treated as permanent, because retrying a request the
 * server has already refused on its merits just burns battery on every
 * reconnect. The codes meaning "this session is over" are handled separately
 * again — see {@link SESSION_ENDED_ERROR_CODES}.
 */
const RETRYABLE_ERROR_CODES: ReadonlySet<string> = new Set([
  "server_error",
  "rate_limit_exceeded",
  "not_logged_in",
]);

/**
 * Failures that mean the session is over rather than that the change is bad.
 *
 * These need their own outcome, not "permanent". `SessionGuard` spots them with
 * `.then`, so it fires a sign-out as a side effect but still *resolves* the
 * original `{success: false}` object — the request does not reject. Folding them
 * into "permanent" therefore cleared `pendingOp` and destroyed the queued edit,
 * which is the opposite of what an expired session should cost: the change is
 * perfectly valid and simply needs a live session to land.
 */
const SESSION_ENDED_ERROR_CODES: ReadonlySet<string> = new Set(
  FATAL_SESSION_ERROR_CODES
);

/** Why a local change and the server's copy can't both be kept as they are. */
export type AnnotationConflictKind =
  /** Edited here and also edited elsewhere. */
  | "edited_elsewhere"
  /** Edited here, but deleted elsewhere. */
  | "deleted_elsewhere"
  /** Deleted here, but edited elsewhere. */
  | "deleted_locally_edited_elsewhere";

export interface AnnotationConflict {
  /** Stable id, so the modal can address one conflict out of several. */
  id: string;

  kind: AnnotationConflictKind;

  /** The account whose note this is. */
  owner: string;

  /** What this device has. Null when the local change was a deletion. */
  local: Annotation | null;

  /** What the server has. Null when the server's copy is gone. */
  server: Annotation | null;

  /** When the local change was made. */
  localUpdatedAtMs: number;

  /** When the server's copy was last changed, if it says. */
  serverUpdatedAtMs: number | null;
}

/**
 * What to do about one conflict.
 *
 * - `keep_mine` — overwrite the server with the local version (or carry out the
 *   local deletion).
 * - `keep_theirs` — discard the local change and take the server's version.
 * - `keep_both` — save the local version as a *new* note alongside the
 *   server's, so no writing is lost. Not offered where it would be meaningless
 *   (see {@link conflictResolutions}).
 */
export type ConflictResolution = "keep_mine" | "keep_theirs" | "keep_both";

/**
 * The choices worth offering for a conflict.
 *
 * "Keep both" only makes sense when there are two versions to keep. If the note
 * was deleted elsewhere there is nothing of theirs to preserve, and if the local
 * change was a deletion there is nothing of ours — so both of those offer two
 * choices rather than three.
 */
export function conflictResolutions(
  kind: AnnotationConflictKind
): ConflictResolution[] {
  return kind === "edited_elsewhere"
    ? ["keep_mine", "keep_theirs", "keep_both"]
    : ["keep_mine", "keep_theirs"];
}

export interface AnnotationSyncManager {
  /** Whether the browser currently reports a network connection. */
  isOnline: ReadonlySignal<boolean>;

  /** True while a sync pass is running. */
  isSyncing: ReadonlySignal<boolean>;

  /** How many local changes are still waiting to reach the server. */
  pendingCount: ReadonlySignal<number>;

  /**
   * How many of those local changes belong to one chapter.
   *
   * `pendingCount` is account-wide, so a note left unsynced in Exodus would
   * otherwise still show up as "waiting to sync" under Genesis 1 — this is
   * what a chapter-scoped display should read instead.
   */
  pendingCountForChapter: (bookId: string, chapterNumber: number) => number;

  /**
   * Conflicts waiting on the user. Nothing is written to the server, and no
   * local change is discarded, until each one is resolved.
   */
  conflicts: ReadonlySignal<AnnotationConflict[]>;

  /** The most recent failure per annotation id. */
  syncErrors: ReadonlySignal<Map<string, string>>;

  /**
   * Runs a sync pass.
   *
   * Resolves when the pass finishes. Does nothing while offline, while signed
   * out, or when a pass is already running — in which case it resolves with the
   * running pass, so callers can await it without starting a second one.
   */
  sync: () => Promise<void>;

  /** Applies the user's choice for one conflict. */
  resolveConflict: (
    conflictId: string,
    resolution: ConflictResolution
  ) => Promise<void>;

  /** Notes that local state changed, and syncs if there's a connection. */
  notifyLocalChange: () => void;

  /** Recomputes {@link pendingCount} from the store. */
  refreshPendingCount: () => Promise<void>;

  /** Removes the `online`/`offline` listeners. Mainly for tests. */
  dispose: () => void;
}

export interface CreateAnnotationSyncManagerOptions {
  os: CasualOSManager;
  login: LoginManager;

  /** Where local changes are recorded. Null disables syncing entirely. */
  store: OfflineAnnotationStore | null;

  /**
   * Validates a record read back from the server.
   *
   * Injected rather than imported so this module needs nothing at runtime from
   * `AnnotationsManager`, which constructs it — otherwise the two would import
   * each other.
   */
  parseAnnotation: (value: unknown) => Annotation | null;

  /** The marker a chapter's annotations are indexed under. Injected for the same reason. */
  getMarker: (bookId: string, chapterNumber: number) => string;

  /**
   * Called so caches can be refreshed: after a push changes the server, or
   * when a resolution queues a row that should already be visible (see
   * `keep_both` below) rather than waiting for its first push.
   */
  onSynced?: (annotation: Annotation, owner: string) => void;

  /** Called when a resolution removes an annotation, so caches can drop it. */
  onRemoved?: (annotationId: string, owner: string) => void;
}

/** What the server currently holds for one annotation. */
type ServerState =
  | { present: true; annotation: Annotation }
  | { present: false };

/** Distinguishes "the server said no" from "we couldn't reach the server". */
type PushOutcome =
  | { status: "done" }
  | { status: "conflict"; conflict: AnnotationConflict }
  | { status: "retry"; message: string }
  | { status: "permanent"; message: string }
  /** The session ended. Nothing about the row changes; a new sign-in retries it. */
  | { status: "session_ended"; message: string };

export function createAnnotationSyncManager(
  options: CreateAnnotationSyncManagerOptions
): AnnotationSyncManager {
  const { os, login, store, parseAnnotation, getMarker, onSynced, onRemoved } =
    options;

  const isOnline = signal<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const isSyncing = signal(false);
  const pendingRows = signal<StoredAnnotation[]>([]);
  const conflicts = signal<AnnotationConflict[]>([]);
  const syncErrors = signal<Map<string, string>>(new Map());

  const pendingCount = computed(() => pendingRows.value.length);

  const pendingCountForChapter = (
    bookId: string,
    chapterNumber: number
  ): number =>
    pendingRows.value.filter(
      (row) => row.bookId === bookId && row.chapterNumber === chapterNumber
    ).length;

  // Rows already raised as a conflict, so a repeated pass doesn't queue the
  // same question twice while the user is still looking at the first one.
  const awaitingUser = new Map<string, AnnotationConflict>();

  let running: Promise<void> | null = null;
  // Set only when *new* local work arrives mid-pass. One extra pass afterwards
  // is what lets this converge without a polling timer. Deliberately not set by
  // every `sync()` call: a second caller wanting "make sure a pass happens" is
  // already satisfied by the one in flight, and treating that as new work would
  // re-run the whole queue for nothing.
  let dirty = false;

  const setError = (annotationId: string, message: string) => {
    const next = new Map(syncErrors.value);
    next.set(annotationId, message);
    syncErrors.value = next;
  };

  const clearError = (annotationId: string) => {
    if (!syncErrors.value.has(annotationId)) {
      return;
    }
    const next = new Map(syncErrors.value);
    next.delete(annotationId);
    syncErrors.value = next;
  };

  const refreshPendingCount = async (): Promise<void> => {
    const owner = currentOwner();
    if (!store || !owner) {
      pendingRows.value = [];
      return;
    }
    try {
      pendingRows.value = await store.listPending(owner);
    } catch (error) {
      console.warn("Failed to read pending annotation changes.", error);
    }
  };

  /** The account rows belong to right now, or the signed-out bucket. */
  const currentOwner = (): string => login.userId.peek() ?? LOCAL_OWNER;

  /** Reads the server's copy, or reports that it isn't there. */
  const readServer = async (
    owner: string,
    annotationId: string
  ): Promise<ServerState | { failure: PushOutcome }> => {
    const result = await os.getData(owner, annotationId);

    if (result.success) {
      const parsed = parseAnnotation(result.data);
      if (!parsed) {
        // The address holds something that isn't an annotation. Overwriting it
        // is the least surprising thing to do — it can't be shown or edited.
        return { present: false };
      }
      return { present: true, annotation: parsed };
    }

    if (result.errorCode === "data_not_found") {
      return { present: false };
    }

    return { failure: classifyFailure(result.errorCode, result.errorMessage) };
  };

  /**
   * Whether the server still holds the version the local row was based on.
   *
   * Falls back to comparing content when either side has no timestamp, which is
   * the case for records written before `updatedAtMs` existed.
   */
  const serverMatchesBase = (
    server: ServerState,
    row: StoredAnnotation
  ): boolean => {
    if (!server.present) {
      return row.baseUpdatedAtMs === null && row.baseFingerprint === null;
    }

    const serverUpdatedAtMs = annotationUpdatedAtMs(server.annotation);
    if (serverUpdatedAtMs !== null && row.baseUpdatedAtMs !== null) {
      return serverUpdatedAtMs === row.baseUpdatedAtMs;
    }

    return annotationFingerprint(server.annotation) === row.baseFingerprint;
  };

  const toConflict = (
    row: StoredAnnotation,
    server: ServerState,
    kind: AnnotationConflictKind
  ): AnnotationConflict => ({
    id: `${row.owner}/${row.annotationId}`,
    kind,
    owner: row.owner,
    local: row.annotation,
    server: server.present ? server.annotation : null,
    localUpdatedAtMs: row.updatedAtMs,
    serverUpdatedAtMs: server.present
      ? annotationUpdatedAtMs(server.annotation)
      : null,
  });

  /**
   * Whether a row is still the one a push started from.
   *
   * A push is a network round trip, and the user can save the same note again
   * while it is in the air. The local change stamp plus the pending operation is
   * enough to spot that: any later save rewrites both.
   */
  const isUnchangedSince = (
    started: StoredAnnotation,
    current: StoredAnnotation | null
  ): boolean =>
    current !== null &&
    current.updatedAtMs === started.updatedAtMs &&
    current.pendingOp === started.pendingOp;

  /**
   * Records the outcome of a successful push in the local mirror.
   *
   * Deliberately re-reads the row instead of trusting the snapshot the push
   * started from. Two things can happen during a round trip, and writing the
   * snapshot back would quietly undo either of them:
   *
   * - The user saves the same note again. Marking the row synced with the older
   *   content would revert the newer edit *and* drop it from the queue, losing
   *   writing with nothing reported.
   * - The account signs out. Writing a synced (readable) row back afterwards
   *   would leave the departed account's note on a possibly shared device, which
   *   is exactly what `clearSynced` exists to prevent.
   *
   * `base` is what the server now holds, so a newer local change can be rebased
   * onto it — otherwise the next pass would compare against a stale base and
   * report our own push as somebody else's edit.
   */
  const recordPushed = async (
    owner: string,
    started: StoredAnnotation,
    base: Annotation | null
  ): Promise<void> => {
    if (!store) {
      return;
    }

    const current = await store.get(owner, started.annotationId);
    const unchanged = isUnchangedSince(started, current);

    if (login.userId.peek() !== owner) {
      // Signed out mid-push. The content is safely on the server, so the local
      // copy is now a synced row for an account that has left — drop it. A newer
      // unsent edit is kept, matching sign-out's "keep unsent writing" rule.
      if (unchanged) {
        await store.delete(owner, started.annotationId);
      }
      return;
    }

    if (!current) {
      // Removed outright while we pushed (a create-then-delete collapse); there
      // is nothing left to record against.
      return;
    }

    if (!unchanged) {
      await store.put({
        ...current,
        baseUpdatedAtMs: base ? annotationUpdatedAtMs(base) : null,
        baseFingerprint: base ? annotationFingerprint(base) : null,
      });
      return;
    }

    if (!base) {
      await store.delete(owner, started.annotationId);
      onRemoved?.(started.annotationId, owner);
      return;
    }

    await store.put(syncedRow(owner, base));
    onSynced?.(base, owner);
  };

  /** Writes an annotation to the server and mirrors the result locally. */
  const writeToServer = async (
    owner: string,
    row: StoredAnnotation,
    annotation: Annotation
  ): Promise<PushOutcome> => {
    const result = await os.recordData(owner, annotation.id, annotation, {
      marker: getMarker(annotation.bookId, annotation.chapterNumber),
    });

    if (!result.success) {
      return classifyFailure(result.errorCode, result.errorMessage);
    }

    await recordPushed(owner, row, annotation);
    return { status: "done" };
  };

  /** Erases an annotation on the server and drops its local row. */
  const eraseOnServer = async (
    owner: string,
    row: StoredAnnotation
  ): Promise<PushOutcome> => {
    const result = await os.eraseData(owner, row.annotationId);

    // Already gone is the outcome we wanted, not a failure.
    if (!result.success && result.errorCode !== "data_not_found") {
      return classifyFailure(result.errorCode, result.errorMessage);
    }

    // Null base: the server now holds nothing, so a note re-saved during the
    // erase becomes a fresh create rather than an update to something gone.
    await recordPushed(owner, row, null);
    return { status: "done" };
  };

  /**
   * Pushes one row, or reports that the user has to decide.
   *
   * Rejections are left to the caller: a rejected request means the network
   * failed, which says nothing about whether the change is valid, so the row
   * must stay pending.
   */
  const pushRow = async (
    owner: string,
    row: StoredAnnotation
  ): Promise<PushOutcome> => {
    const server = await readServer(owner, row.annotationId);
    if ("failure" in server) {
      return server.failure;
    }

    const matchesBase = serverMatchesBase(server, row);

    if (row.pendingOp === "delete") {
      if (!server.present) {
        // Already gone. Routed through `recordPushed` for the same reason a real
        // push is: `readServer` was a round trip, so a save may have landed since.
        await recordPushed(owner, row, null);
        return { status: "done" };
      }
      if (!matchesBase) {
        return {
          status: "conflict",
          conflict: toConflict(row, server, "deleted_locally_edited_elsewhere"),
        };
      }
      return eraseOnServer(owner, row);
    }

    if (!row.annotation) {
      // An upsert with nothing to write can only be a corrupt row; drop it
      // rather than retrying it forever — unless a real save replaced it while
      // we were reading the server, in which case that save is the truth.
      const current = await store?.get(owner, row.annotationId);
      if (current && isUnchangedSince(row, current)) {
        await store?.delete(owner, row.annotationId);
      }
      return { status: "done" };
    }

    if (!matchesBase) {
      return {
        status: "conflict",
        conflict: toConflict(
          row,
          server,
          server.present ? "edited_elsewhere" : "deleted_elsewhere"
        ),
      };
    }

    return writeToServer(owner, row, row.annotation);
  };

  /** Records a failed attempt, giving up on the row once it's hopeless. */
  const recordFailure = async (
    owner: string,
    row: StoredAnnotation,
    outcome: Extract<PushOutcome, { status: "retry" | "permanent" }>
  ): Promise<void> => {
    setError(row.annotationId, outcome.message);
    if (!store) {
      return;
    }

    // Built from a re-read rather than the snapshot the push started from: this
    // bookkeeping write is a blind overwrite by key, so spreading a stale row
    // would revert content the user saved during the failed round trip. A newer
    // edit deserves its own attempt count anyway.
    const current = await store.get(owner, row.annotationId);
    if (!current || !isUnchangedSince(row, current)) {
      return;
    }

    if (outcome.status === "permanent") {
      await store.put({ ...current, pendingOp: null });
      return;
    }

    const attempts = current.attempts + 1;
    await store.put({
      ...current,
      attempts,
      pendingOp: attempts >= MAX_SYNC_ATTEMPTS ? null : current.pendingOp,
    });
  };

  /**
   * Pushes everything currently pending.
   *
   * Returns false when it gave up because the network or the server was
   * unavailable, so the caller knows not to immediately try again.
   */
  const runPass = async (): Promise<boolean> => {
    if (!store) {
      return true;
    }

    // Captured once, and re-checked before every write. If the account changes
    // mid-pass, the rest of this pass belongs to an account that is no longer
    // signed in, and pushing it would write one account's notes under another's
    // id.
    const owner = login.userId.peek();
    if (!owner || !isOnline.peek()) {
      return true;
    }

    const rows = await store.listPending(owner);

    for (const row of rows) {
      if (login.userId.peek() !== owner) {
        return true;
      }
      if (awaitingUser.has(`${owner}/${row.annotationId}`)) {
        continue;
      }

      let outcome: PushOutcome;
      try {
        outcome = await pushRow(owner, row);
      } catch (error) {
        // A rejection is the network, not the change. Stop the pass and leave
        // every remaining row pending for the next trigger; carrying on would
        // just produce the same failure once per row.
        console.warn("Annotation sync stopped: the request failed.", error);
        return false;
      }

      if (outcome.status === "conflict") {
        awaitingUser.set(outcome.conflict.id, outcome.conflict);
        conflicts.value = [...conflicts.value, outcome.conflict];
        continue;
      }

      if (outcome.status === "done") {
        clearError(row.annotationId);
        continue;
      }

      if (outcome.status === "session_ended") {
        // The change is fine; there is just no live session to land it in. Leave
        // the row exactly as it is — `recordFailure` would clear `pendingOp` and
        // the edit would never be retried after signing back in.
        console.warn(
          "Annotation sync stopped: the session ended.",
          outcome.message
        );
        return false;
      }

      await recordFailure(owner, row, outcome);
      if (outcome.status === "retry") {
        // Retryable means the server is unwell, not that this row is special,
        // so stop rather than marching the whole queue into the same wall.
        return false;
      }
    }

    return true;
  };

  const sync = (): Promise<void> => {
    // A pass is already covering this; joining it is enough.
    if (running) {
      return running;
    }
    if (!store || !isOnline.peek() || !login.userId.peek()) {
      return Promise.resolve();
    }

    isSyncing.value = true;
    running = (async () => {
      try {
        let completed: boolean;
        do {
          dirty = false;
          completed = await runPass();
          // Only loop for work that arrived while we were busy, and only when
          // the last pass actually got through — repeating a pass that just
          // failed on the network would fail the same way.
        } while (dirty && completed);
      } catch (error) {
        console.warn("Annotation sync pass failed.", error);
      } finally {
        running = null;
        isSyncing.value = false;
        await refreshPendingCount();
      }
    })();

    return running;
  };

  /**
   * Syncs after the pending queue has changed.
   *
   * A plain `sync()` joins an in-flight pass, and that pass read the queue
   * before this change existed — so it would never see the new row. Marking the
   * pass dirty is what makes it look again, and means awaiting the returned
   * promise really does cover the new work.
   */
  const syncNewWork = (): Promise<void> => {
    dirty = true;
    return sync();
  };

  const notifyLocalChange = (): void => {
    void refreshPendingCount();
    if (!isOnline.peek() || !login.userId.peek()) {
      return;
    }
    void syncNewWork();
  };

  const dropConflict = (conflictId: string): void => {
    awaitingUser.delete(conflictId);
    conflicts.value = conflicts.value.filter((c) => c.id !== conflictId);
  };

  const resolveConflict = async (
    conflictId: string,
    resolution: ConflictResolution
  ): Promise<void> => {
    const conflict = awaitingUser.get(conflictId);
    if (!conflict || !store) {
      return;
    }

    const { owner } = conflict;
    // The conflict was raised for a specific account; applying it under a
    // different one would write the wrong person's note.
    if (login.userId.peek() !== owner) {
      dropConflict(conflictId);
      return;
    }

    const row = await store.get(owner, conflictId.slice(owner.length + 1));
    if (!row) {
      dropConflict(conflictId);
      return;
    }

    try {
      await applyResolution(owner, row, conflict, resolution);
      clearError(row.annotationId);
      dropConflict(conflictId);
    } catch (error) {
      console.warn("Failed to apply a conflict resolution.", error);
      setError(row.annotationId, "resolve_failed");
      // Left in `awaitingUser` on purpose: the question is still open, and
      // dropping it would silently abandon the user's decision.
      return;
    }

    await refreshPendingCount();
    // Awaited so the choice has actually been carried out by the time this
    // resolves — the modal keeps its buttons disabled until then, and a caller
    // that checks the result isn't racing the push.
    //
    // `syncNewWork`, not `sync`: a pass can still be running (the loop keeps
    // going through the other rows after raising a conflict, so the prompt can
    // be answered mid-pass), and that pass read the queue before this row was
    // unblocked. Without the dirty flag it would finish without ever pushing it.
    await syncNewWork();
  };

  const applyResolution = async (
    owner: string,
    row: StoredAnnotation,
    conflict: AnnotationConflict,
    resolution: ConflictResolution
  ): Promise<void> => {
    if (!store) {
      return;
    }

    if (resolution === "keep_theirs") {
      if (conflict.server) {
        await store.put(syncedRow(owner, conflict.server));
        onSynced?.(conflict.server, owner);
      } else {
        // They deleted it and we're deferring to that, so the local copy goes
        // too.
        await store.delete(owner, row.annotationId);
        onRemoved?.(row.annotationId, owner);
      }
      return;
    }

    if (resolution === "keep_both" && row.annotation && conflict.server) {
      // Ours becomes a new note so theirs survives untouched. A fresh id makes
      // it a create, which can't conflict with anything.
      const copy: Annotation = {
        ...row.annotation,
        id: `annotation_${uuid()}`,
      };
      await store.put({
        ...syncedRow(owner, copy),
        annotation: copy,
        baseUpdatedAtMs: null,
        baseFingerprint: null,
        pendingOp: "upsert",
        updatedAtMs: row.updatedAtMs,
      });
      // Reported right away, the same as any other newly-created offline note —
      // otherwise this copy sits invisible in the store until its first push
      // succeeds and fires this same callback.
      onSynced?.(copy, owner);
      // Replaces the pending row in place: `conflict.server` carries the same id
      // as `row`, so this leaves the original entry holding the server's version
      // with nothing left to push. Deleting it afterwards would remove the very
      // note this choice exists to preserve.
      await store.put(syncedRow(owner, conflict.server));
      onSynced?.(conflict.server, owner);
      return;
    }

    // keep_mine: take the server's current version as the new base so the push
    // is no longer treated as stale, then let the next pass write ours over it.
    await store.put({
      ...row,
      attempts: 0,
      baseUpdatedAtMs: conflict.server
        ? annotationUpdatedAtMs(conflict.server)
        : null,
      baseFingerprint: conflict.server
        ? annotationFingerprint(conflict.server)
        : null,
    });
  };

  const handleOnline = () => {
    isOnline.value = true;
    void sync();
  };
  const handleOffline = () => {
    isOnline.value = false;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  // Adopt anything written while signed out, then sync. Runs on the first
  // resolution of `userId` (app start with a stored session) and on every later
  // sign-in.
  let lastOwner: string | null | undefined;
  effect(() => {
    const owner = login.userId.value;
    if (owner === lastOwner) {
      return;
    }
    const previous = lastOwner;
    lastOwner = owner;

    if (!store) {
      return;
    }

    if (!owner) {
      // Signing out: keep unsynced writing, drop the rest so a shared device
      // isn't left holding readable notes.
      if (previous) {
        void store.clearSynced(previous).catch((error: unknown) => {
          console.warn("Failed to clear synced annotations.", error);
        });
      }
      pendingRows.value = [];
      conflicts.value = [];
      awaitingUser.clear();
      return;
    }

    void (async () => {
      try {
        await store.adoptLocalRows(owner);
      } catch (error) {
        console.warn("Failed to adopt locally-saved annotations.", error);
      }
      await refreshPendingCount();
      void sync();
    })();
  });

  const dispose = () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
  };

  return {
    isOnline,
    isSyncing,
    pendingCount,
    pendingCountForChapter,
    conflicts,
    syncErrors,
    sync,
    resolveConflict,
    notifyLocalChange,
    refreshPendingCount,
    dispose,
  };
}

/** Turns a server error code into a retry decision. */
function classifyFailure(
  errorCode: string | undefined,
  errorMessage: string | undefined
): Extract<PushOutcome, { status: "retry" | "permanent" | "session_ended" }> {
  const message = errorMessage ?? errorCode ?? "unknown_error";
  if (SESSION_ENDED_ERROR_CODES.has(errorCode ?? "")) {
    return { status: "session_ended", message };
  }
  return RETRYABLE_ERROR_CODES.has(errorCode ?? "")
    ? { status: "retry", message }
    : { status: "permanent", message };
}
