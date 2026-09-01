/**
 * Pushes locally-recorded changes to the server, and asks the user what to do
 * when a record changed in both places.
 *
 * ## Why conflicts have to be handled here at all
 *
 * CasualOS data records have no version or etag, and `recordData` is a blind
 * overwrite. So the only way to avoid silently destroying somebody's writing is
 * to read the server's copy first and check it is still the one the local edit
 * was based on. Each stored row keeps that "base" pointer (see
 * `StoredRecord.base`), which is why this compares against a remembered
 * version rather than asking whose timestamp is larger — timestamps are
 * written by whichever device made the edit, and two devices' clocks do not
 * have to agree.
 *
 * ## What it does not do
 *
 * The check is read-then-write, not compare-and-set. A write from another device
 * that lands in the gap between our read and our write is still last-write-wins.
 * Closing that would need the server to support conditional writes.
 */

import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import type { LoginManager } from "./LoginManager";
import type { CasualOSManager } from "./OsManager";
import { FATAL_SESSION_ERROR_CODES } from "./SessionGuard";
import {
  LOCAL_OWNER,
  MAX_SYNC_ATTEMPTS,
  syncedRow,
  type OfflineRecordStore,
  type StoredRecord,
  type SyncDomain,
} from "./OfflineRecordStore";

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
export type ConflictKind =
  /** Edited here and also edited elsewhere. */
  | "edited_elsewhere"
  /** Edited here, but deleted elsewhere. */
  | "deleted_elsewhere"
  /** Deleted here, but edited elsewhere. */
  | "deleted_locally_edited_elsewhere";

export interface RecordConflict<T> {
  /** Stable id, so the modal can address one conflict out of several. */
  id: string;

  kind: ConflictKind;

  /** The account whose record this is. */
  owner: string;

  /** What this device has. Null when the local change was a deletion. */
  local: T | null;

  /** What the server has. Null when the server's copy is gone. */
  server: T | null;
}

/**
 * What to do about one conflict.
 *
 * - `keep_mine` — overwrite the server with the local version (or carry out the
 *   local deletion).
 * - `keep_theirs` — discard the local change and take the server's version.
 * - `keep_both` — save the local version as a *new* record alongside the
 *   server's, so no writing is lost. Not offered where it would be meaningless
 *   (see {@link conflictResolutions}).
 */
export type ConflictResolution = "keep_mine" | "keep_theirs" | "keep_both";

/**
 * The choices worth offering for a conflict.
 *
 * "Keep both" only makes sense when there are two versions to keep. If the
 * record was deleted elsewhere there is nothing of theirs to preserve, and if
 * the local change was a deletion there is nothing of ours — so both of those
 * offer two choices rather than three.
 */
export function conflictResolutions(kind: ConflictKind): ConflictResolution[] {
  return kind === "edited_elsewhere"
    ? ["keep_mine", "keep_theirs", "keep_both"]
    : ["keep_mine", "keep_theirs"];
}

export interface RecordSyncManager<T> {
  /** Whether the browser currently reports a network connection. */
  isOnline: ReadonlySignal<boolean>;

  /** True while a sync pass is running. */
  isSyncing: ReadonlySignal<boolean>;

  /** How many local changes are still waiting to reach the server. */
  pendingCount: ReadonlySignal<number>;

  /**
   * How many of those local changes belong to one collection.
   *
   * `pendingCount` is account-wide, so a change left unsynced in one
   * collection would otherwise still show up as "waiting to sync" everywhere
   * else — this is what a collection-scoped display should read instead.
   */
  pendingCountForCollection: (collection: string) => number;

  /**
   * Conflicts waiting on the user. Nothing is written to the server, and no
   * local change is discarded, until each one is resolved.
   */
  conflicts: ReadonlySignal<RecordConflict<T>[]>;

  /** The most recent failure per record address. */
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

export interface CreateRecordSyncManagerOptions<T> {
  os: CasualOSManager;
  login: LoginManager;
  /** Where local changes are recorded. Null disables syncing entirely. */
  store: OfflineRecordStore<T> | null;
  domain: SyncDomain<T>;
  /** Called so caches can be refreshed after the server changed, or when a resolution queues a row that should already be visible. */
  onSynced?: (address: string, payload: T, owner: string) => void;
  /** Called when a resolution removes a record, so caches can drop it. */
  onRemoved?: (address: string, owner: string) => void;
}

/** What the server currently holds for one record. */
type ServerState<T> = { present: true; payload: T } | { present: false };

/** Distinguishes "the server said no" from "we couldn't reach the server". */
type PushOutcome<T> =
  | { status: "done" }
  | { status: "conflict"; conflict: RecordConflict<T> }
  | { status: "retry"; message: string }
  | { status: "permanent"; message: string }
  /** The session ended. Nothing about the row changes; a new sign-in retries it. */
  | { status: "session_ended"; message: string };

export function createRecordSyncManager<T>(
  options: CreateRecordSyncManagerOptions<T>
): RecordSyncManager<T> {
  const { os, login, store, domain, onSynced, onRemoved } = options;

  const isOnline = signal<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const isSyncing = signal(false);
  const pendingRows = signal<StoredRecord<T>[]>([]);
  const conflicts = signal<RecordConflict<T>[]>([]);
  const syncErrors = signal<Map<string, string>>(new Map());

  const pendingCount = computed(() => pendingRows.value.length);

  const pendingCountForCollection = (collection: string): number =>
    pendingRows.value.filter((row) => row.collection === collection).length;

  // Rows already raised as a conflict, so a repeated pass doesn't queue the
  // same question twice while the user is still looking at the first one.
  const awaitingUser = new Map<string, RecordConflict<T>>();

  let running: Promise<void> | null = null;
  // Set only when *new* local work arrives mid-pass. One extra pass afterwards
  // is what lets this converge without a polling timer. Deliberately not set by
  // every `sync()` call: a second caller wanting "make sure a pass happens" is
  // already satisfied by the one in flight, and treating that as new work would
  // re-run the whole queue for nothing.
  let dirty = false;

  const setError = (address: string, message: string) => {
    const next = new Map(syncErrors.value);
    next.set(address, message);
    syncErrors.value = next;
  };

  const clearError = (address: string) => {
    if (!syncErrors.value.has(address)) {
      return;
    }
    const next = new Map(syncErrors.value);
    next.delete(address);
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
      console.warn("Failed to read pending record changes.", error);
    }
  };

  /** The account rows belong to right now, or the signed-out bucket. */
  const currentOwner = (): string => login.userId.peek() ?? LOCAL_OWNER;

  /** Reads the server's copy, or reports that it isn't there. */
  const readServer = async (
    owner: string,
    address: string
  ): Promise<ServerState<T> | { failure: PushOutcome<T> }> => {
    const result = await os.getData(owner, address);

    if (result.success) {
      const parsed = domain.parse(result.data);
      if (!parsed) {
        // The address holds something that isn't one of ours. Overwriting it
        // is the least surprising thing to do — it can't be shown or edited.
        return { present: false };
      }
      return { present: true, payload: parsed };
    }

    if (result.errorCode === "data_not_found") {
      return { present: false };
    }

    return { failure: classifyFailure(result.errorCode, result.errorMessage) };
  };

  /** Whether the server still holds the version the local row was based on. */
  const serverMatchesBase = (
    server: ServerState<T>,
    row: StoredRecord<T>
  ): boolean => {
    if (!server.present) {
      return row.base === null;
    }
    if (row.base === null) {
      return false;
    }
    return domain.sameVersion(server.payload, row.base);
  };

  const toConflict = (
    row: StoredRecord<T>,
    server: ServerState<T>,
    kind: ConflictKind
  ): RecordConflict<T> => ({
    id: `${row.owner}/${row.address}`,
    kind,
    owner: row.owner,
    local: row.payload,
    server: server.present ? server.payload : null,
  });

  /**
   * Whether a row is still the one a push started from.
   *
   * A push is a network round trip, and the user can save the same record
   * again while it is in the air. The local change stamp plus the pending
   * operation is enough to spot that: any later save rewrites both.
   */
  const isUnchangedSince = (
    started: StoredRecord<T>,
    current: StoredRecord<T> | null
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
   * - The user saves the same record again. Marking the row synced with the
   *   older content would revert the newer edit *and* drop it from the queue,
   *   losing writing with nothing reported.
   * - The account signs out. Writing a synced (readable) row back afterwards
   *   would leave the departed account's record on a possibly shared device,
   *   which is exactly what `clearSynced` exists to prevent.
   *
   * `base` is what the server now holds, so a newer local change can be rebased
   * onto it — otherwise the next pass would compare against a stale base and
   * report our own push as somebody else's edit.
   */
  const recordPushed = async (
    owner: string,
    started: StoredRecord<T>,
    base: T | null
  ): Promise<void> => {
    if (!store) {
      return;
    }

    const current = await store.get(owner, started.address);
    const unchanged = isUnchangedSince(started, current);

    if (login.userId.peek() !== owner) {
      // Signed out mid-push. The content is safely on the server, so the local
      // copy is now a synced row for an account that has left — drop it. A newer
      // unsent edit is kept, matching sign-out's "keep unsent writing" rule.
      if (unchanged) {
        await store.delete(owner, started.address);
      }
      return;
    }

    if (!current) {
      // Removed outright while we pushed (a create-then-delete collapse); there
      // is nothing left to record against.
      return;
    }

    if (!unchanged) {
      await store.put({ ...current, base });
      return;
    }

    if (!base) {
      await store.delete(owner, started.address);
      onRemoved?.(started.address, owner);
      return;
    }

    await store.put(
      syncedRow(owner, started.address, started.collection, base)
    );
    onSynced?.(started.address, base, owner);
  };

  /** Writes a record to the server and mirrors the result locally. */
  const writeToServer = async (
    owner: string,
    row: StoredRecord<T>,
    payload: T
  ): Promise<PushOutcome<T>> => {
    const result = await os.recordData(owner, row.address, payload, {
      marker: domain.marker(row.address, payload),
    });

    if (!result.success) {
      return classifyFailure(result.errorCode, result.errorMessage);
    }

    await recordPushed(owner, row, payload);
    return { status: "done" };
  };

  /** Erases a record on the server and drops its local row. */
  const eraseOnServer = async (
    owner: string,
    row: StoredRecord<T>
  ): Promise<PushOutcome<T>> => {
    const result = await os.eraseData(owner, row.address);

    // Already gone is the outcome we wanted, not a failure.
    if (!result.success && result.errorCode !== "data_not_found") {
      return classifyFailure(result.errorCode, result.errorMessage);
    }

    // Null base: the server now holds nothing, so a record re-saved during the
    // erase becomes a fresh create rather than an update to something gone.
    await recordPushed(owner, row, null);
    return { status: "done" };
  };

  /**
   * Resolves a row whose base no longer matches the server: hands it to the
   * domain's merge when there is one, or raises a conflict for the user.
   */
  const mergeOrConflict = async (
    owner: string,
    row: StoredRecord<T>,
    server: ServerState<T>
  ): Promise<PushOutcome<T>> => {
    if (domain.merge) {
      const merged = domain.merge(
        row.base,
        row.deleted ? null : row.payload,
        server.present ? server.payload : null
      );
      return merged === null
        ? eraseOnServer(owner, row)
        : writeToServer(owner, row, merged);
    }
    const kind: ConflictKind =
      row.pendingOp === "delete"
        ? "deleted_locally_edited_elsewhere"
        : server.present
          ? "edited_elsewhere"
          : "deleted_elsewhere";
    return { status: "conflict", conflict: toConflict(row, server, kind) };
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
    row: StoredRecord<T>
  ): Promise<PushOutcome<T>> => {
    const server = await readServer(owner, row.address);
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
        return mergeOrConflict(owner, row, server);
      }
      return eraseOnServer(owner, row);
    }

    if (!row.payload) {
      // An upsert with nothing to write can only be a corrupt row; drop it
      // rather than retrying it forever — unless a real save replaced it while
      // we were reading the server, in which case that save is the truth.
      const current = await store?.get(owner, row.address);
      if (current && isUnchangedSince(row, current)) {
        await store?.delete(owner, row.address);
      }
      return { status: "done" };
    }

    if (!matchesBase) {
      return mergeOrConflict(owner, row, server);
    }

    return writeToServer(owner, row, row.payload);
  };

  /** Records a failed attempt, giving up on the row once it's hopeless. */
  const recordFailure = async (
    owner: string,
    row: StoredRecord<T>,
    outcome: Extract<PushOutcome<T>, { status: "retry" | "permanent" }>
  ): Promise<void> => {
    setError(row.address, outcome.message);
    if (!store) {
      return;
    }

    // Built from a re-read rather than the snapshot the push started from: this
    // bookkeeping write is a blind overwrite by key, so spreading a stale row
    // would revert content the user saved during the failed round trip. A newer
    // edit deserves its own attempt count anyway.
    const current = await store.get(owner, row.address);
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
    // signed in, and pushing it would write one account's records under
    // another's id.
    const owner = login.userId.peek();
    if (!owner || !isOnline.peek()) {
      return true;
    }

    const rows = await store.listPending(owner);

    for (const row of rows) {
      if (login.userId.peek() !== owner) {
        return true;
      }
      if (awaitingUser.has(`${owner}/${row.address}`)) {
        continue;
      }

      let outcome: PushOutcome<T>;
      try {
        outcome = await pushRow(owner, row);
      } catch (error) {
        // A rejection is the network, not the change. Stop the pass and leave
        // every remaining row pending for the next trigger; carrying on would
        // just produce the same failure once per row.
        console.warn("Record sync stopped: the request failed.", error);
        return false;
      }

      if (outcome.status === "conflict") {
        awaitingUser.set(outcome.conflict.id, outcome.conflict);
        conflicts.value = [...conflicts.value, outcome.conflict];
        continue;
      }

      if (outcome.status === "done") {
        clearError(row.address);
        continue;
      }

      if (outcome.status === "session_ended") {
        // The change is fine; there is just no live session to land it in. Leave
        // the row exactly as it is — `recordFailure` would clear `pendingOp` and
        // the edit would never be retried after signing back in.
        console.warn(
          "Record sync stopped: the session ended.",
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
        console.warn("Record sync pass failed.", error);
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
    // different one would write the wrong person's record.
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
      clearError(row.address);
      dropConflict(conflictId);
    } catch (error) {
      console.warn("Failed to apply a conflict resolution.", error);
      setError(row.address, "resolve_failed");
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
    row: StoredRecord<T>,
    conflict: RecordConflict<T>,
    resolution: ConflictResolution
  ): Promise<void> => {
    if (!store) {
      return;
    }

    if (resolution === "keep_theirs") {
      if (conflict.server) {
        await store.put(
          syncedRow(owner, row.address, row.collection, conflict.server)
        );
        onSynced?.(row.address, conflict.server, owner);
      } else {
        // They deleted it and we're deferring to that, so the local copy goes
        // too.
        await store.delete(owner, row.address);
        onRemoved?.(row.address, owner);
      }
      return;
    }

    if (
      resolution === "keep_both" &&
      row.payload &&
      conflict.server &&
      domain.duplicate
    ) {
      // Ours becomes a new record so theirs survives untouched. A fresh address
      // makes it a create, which can't conflict with anything.
      const copy = domain.duplicate(row.payload);
      await store.put({
        ...syncedRow(
          owner,
          copy.address,
          domain.collection(copy.address, copy.payload),
          copy.payload
        ),
        base: null,
        pendingOp: "upsert",
        updatedAtMs: row.updatedAtMs,
      });
      // Reported right away, the same as any other newly-created offline
      // record — otherwise this copy sits invisible in the store until its
      // first push succeeds and fires this same callback.
      onSynced?.(copy.address, copy.payload, owner);
      // Replaces the pending row in place: `conflict.server` carries the same
      // address as `row`, so this leaves the original entry holding the
      // server's version with nothing left to push. Deleting it afterwards
      // would remove the very record this choice exists to preserve.
      await store.put(
        syncedRow(owner, row.address, row.collection, conflict.server)
      );
      onSynced?.(row.address, conflict.server, owner);
      return;
    }

    // keep_mine (also where "keep both" was asked of a domain that can't
    // duplicate): take the server's current version as the new base so the push is
    // no longer stale, then let the next pass write ours over it.
    await store.put({
      ...row,
      attempts: 0,
      base: conflict.server,
      pendingOp: row.pendingOp ?? "upsert",
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
      // isn't left holding readable records.
      if (previous) {
        void store.clearSynced(previous).catch((error: unknown) => {
          console.warn("Failed to clear synced records.", error);
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
        console.warn("Failed to adopt locally-saved records.", error);
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
    pendingCountForCollection,
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
):
  | { status: "retry"; message: string }
  | { status: "permanent"; message: string }
  | { status: "session_ended"; message: string } {
  const message = errorMessage ?? errorCode ?? "unknown_error";
  if (SESSION_ENDED_ERROR_CODES.has(errorCode ?? "")) {
    return { status: "session_ended", message };
  }
  return RETRYABLE_ERROR_CODES.has(errorCode ?? "")
    ? { status: "retry", message }
    : { status: "permanent", message };
}
