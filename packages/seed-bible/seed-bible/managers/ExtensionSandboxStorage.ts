import * as z from "zod/v4";
import { effect } from "@preact/signals";
import { safeLocalStorage } from "../app/ssrEnv";
import type { LoginManager } from "./LoginManager";
import type { CasualOSManager } from "./OsManager";
import type { SandboxJsonValue } from "../extensions/protocol";
import { SandboxBrokerError } from "./ExtensionSandboxServices";

/** The records calls storage sync needs; `CasualOSManager` provides them. */
export type SandboxStorageRecords = Pick<
  CasualOSManager,
  "getData" | "recordData"
>;

/** How much a sandboxed extension can keep, counting values only. */
export const MAX_SANDBOX_STORAGE_BYTES = 256 * 1024;

/** How long a deleted key is remembered, so an old copy can't bring it back. */
const TOMBSTONE_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

const DEFAULT_PUSH_DELAY_MS = 1000;

/**
 * Only the owner can read it, unlike most of what the app writes
 * (`publicRead`): it's whatever an extension chose to keep for this user.
 */
const PRIVATE_MARKER = "private";

const entrySchema = z.union([
  z.object({ value: z.unknown(), updatedAtMs: z.number() }),
  z.object({ deletedAtMs: z.number() }),
]);

const storeSchema = z.object({
  // Checked entry by entry in `parseStore`: a zod record drops a
  // `__proto__` key.
  entries: z.record(z.string(), z.unknown()),
  /** Everything at or before this was cleared (the extension was uninstalled). */
  clearedAtMs: z.number().optional(),
});

type Entry =
  | { value: SandboxJsonValue; updatedAtMs: number }
  | { deletedAtMs: number };

export interface SandboxStore {
  entries: Record<string, Entry>;
  clearedAtMs?: number;
}

/**
 * A record with no prototype, so an extension's keys are only ever its own:
 * `toString` isn't already there, and `__proto__` is stored like any other
 * key instead of changing the object. Read it with `own`.
 */
function emptyRecord<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

const own = <T>(record: Record<string, T>, key: string): T | undefined =>
  Object.hasOwn(record, key) ? record[key] : undefined;

const entryTime = (entry: Entry) =>
  "deletedAtMs" in entry ? entry.deletedAtMs : entry.updatedAtMs;

/**
 * Combines two copies of one extension's store, key by key: the newer write
 * or delete wins, and on a tie `b` does. A clear removes everything from
 * before it, and deletes older than `TOMBSTONE_LIFETIME_MS` are forgotten.
 */
export function mergeSandboxStores(
  a: SandboxStore,
  b: SandboxStore,
  nowMs: number
): SandboxStore {
  const clearedAtMs = Math.max(a.clearedAtMs ?? 0, b.clearedAtMs ?? 0);
  const entries = emptyRecord<Entry>();
  for (const key of new Set([
    ...Object.keys(a.entries),
    ...Object.keys(b.entries),
  ])) {
    const left = own(a.entries, key);
    const right = own(b.entries, key);
    const winner =
      left && right
        ? entryTime(left) > entryTime(right)
          ? left
          : right
        : (left ?? right)!;
    if (entryTime(winner) <= clearedAtMs) {
      continue;
    }
    if (
      "deletedAtMs" in winner &&
      nowMs - winner.deletedAtMs > TOMBSTONE_LIFETIME_MS
    ) {
      continue;
    }
    entries[key] = winner;
  }
  return clearedAtMs > 0 ? { entries, clearedAtMs } : { entries };
}

function parseStore(value: unknown): SandboxStore | null {
  const parsed = storeSchema.safeParse(value);
  if (
    !parsed.success ||
    typeof value !== "object" ||
    value === null ||
    !("entries" in value)
  ) {
    return null;
  }
  // From the unparsed value, which still has every key.
  const entries = emptyRecord<Entry>();
  for (const [key, raw] of Object.entries(value.entries as object)) {
    const entry = entrySchema.safeParse(raw);
    if (!entry.success) {
      return null;
    }
    entries[key] = entry.data as Entry;
  }
  return parsed.data.clearedAtMs === undefined
    ? { entries }
    : { entries, clearedAtMs: parsed.data.clearedAtMs };
}

const sameStore = (a: SandboxStore, b: SandboxStore) =>
  JSON.stringify(a) === JSON.stringify(b);

/** The live values, as an extension sees them. */
function liveValues(store: SandboxStore): Record<string, SandboxJsonValue> {
  const values = emptyRecord<SandboxJsonValue>();
  for (const [key, entry] of Object.entries(store.entries)) {
    if (!("deletedAtMs" in entry)) {
      values[key] = entry.value;
    }
  }
  return values;
}

export const sandboxStorageAddress = (extensionId: string) =>
  `extensionStorage/${extensionId}`;

/**
 * The device's copy of one owner's store. Signed out, the owner is this
 * device; signed in, it's the account. They never mix, so one person's
 * extension data can't end up in someone else's account on a shared device.
 */
const localKey = (extensionId: string, owner: string | null) =>
  owner
    ? `sb-sandbox-storage:${extensionId}:${owner}`
    : `sb-sandbox-storage:${extensionId}`;

interface LocalCopy {
  store: SandboxStore;
  /** Changed since the account's record last took it. */
  dirty: boolean;
}

function readLocal(extensionId: string, owner: string | null): LocalCopy {
  try {
    const raw = safeLocalStorage.getItem(localKey(extensionId, owner));
    if (!raw) {
      return { store: { entries: {} }, dirty: false };
    }
    const parsed: unknown = JSON.parse(raw);
    const copy = z
      .object({ store: z.unknown(), dirty: z.boolean() })
      .safeParse(parsed);
    if (copy.success) {
      const store = parseStore(copy.data.store);
      if (store) {
        return { store, dirty: copy.data.dirty };
      }
    }
    // Before syncing, the device copy was the values themselves.
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = emptyRecord<Entry>();
      for (const [key, value] of Object.entries(parsed)) {
        entries[key] = { value: value as SandboxJsonValue, updatedAtMs: 1 };
      }
      return { store: { entries }, dirty: true };
    }
  } catch (err) {
    console.error(
      `Failed to read storage for extension '${extensionId}':`,
      err
    );
  }
  return { store: { entries: {} }, dirty: false };
}

function writeLocal(
  extensionId: string,
  owner: string | null,
  copy: LocalCopy
) {
  safeLocalStorage.setItem(localKey(extensionId, owner), JSON.stringify(copy));
}

export interface SandboxStorage {
  get: (key: string) => SandboxJsonValue | null;
  /** Throws a `limit_exceeded` `SandboxBrokerError` past the size limit. */
  set: (key: string, value: SandboxJsonValue) => void;
  remove: (key: string) => void;
  keys: () => string[];
  /**
   * Forgets everything, on this device and in the account (for an
   * uninstall). Other devices drop their copies when they next sync.
   */
  clear: () => Promise<void>;
  /** Pulls the account's copy, merges it, and pushes the result if it changed. */
  sync: () => Promise<void>;
  /** Pushes anything waiting, and stops following sign-in changes. */
  dispose: () => Promise<void>;
}

export interface SandboxStorageOptions {
  extensionId: string;
  login: Pick<LoginManager, "userId">;
  /** Without it, the store stays on this device. */
  records?: SandboxStorageRecords;
  /** How long writes are batched before they're sent. */
  pushDelayMs?: number;
  now?: () => number;
}

/**
 * One sandboxed extension's `sb.storage`. Reads and writes are served from
 * the device's copy straight away; while the user is signed in, that copy
 * is kept in step with a private record in their account, so it follows
 * them to other devices.
 */
export function createSandboxStorage(
  options: SandboxStorageOptions
): SandboxStorage {
  const { extensionId, login, records } = options;
  const now = options.now ?? Date.now;
  const pushDelayMs = options.pushDelayMs ?? DEFAULT_PUSH_DELAY_MS;
  const address = sandboxStorageAddress(extensionId);

  let owner = login.userId.peek();
  let copy = readLocal(extensionId, owner);
  // Pushing before the account's copy has been merged in would replace it.
  let mergedRemote = false;
  let pushTimer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let disposed = false;

  const save = (next: LocalCopy) => {
    copy = next;
    writeLocal(extensionId, owner, copy);
  };

  /**
   * Reads the account's record, merges the device's copy into it, and
   * writes the result back if that changed it. Serialized, so two can't
   * interleave.
   */
  const syncWithAccount = (forOwner: string): Promise<void> => {
    chain = chain.then(async () => {
      if (!records || owner !== forOwner) {
        return;
      }
      let remote: SandboxStore = { entries: {} };
      try {
        const result = await records.getData(forOwner, address);
        if (result.success) {
          remote = parseStore(result.data) ?? { entries: {} };
        } else if (result.errorCode !== "data_not_found") {
          // Unknown state: writing now could replace data we never saw.
          console.warn(
            `Couldn't sync storage for extension '${extensionId}':`,
            result.errorCode
          );
          return;
        }
      } catch (err) {
        console.warn(
          `Couldn't sync storage for extension '${extensionId}':`,
          err
        );
        return;
      }
      if (owner !== forOwner) {
        return;
      }
      const merged = mergeSandboxStores(remote, copy.store, now());
      mergedRemote = true;
      if (sameStore(merged, remote)) {
        save({ store: merged, dirty: false });
        return;
      }
      save({ store: merged, dirty: true });
      try {
        const result = await records.recordData(forOwner, address, merged, {
          marker: PRIVATE_MARKER,
        });
        if (
          result.success &&
          owner === forOwner &&
          sameStore(copy.store, merged)
        ) {
          save({ store: merged, dirty: false });
        } else if (!result.success) {
          console.warn(
            `Couldn't save storage for extension '${extensionId}':`,
            result.errorCode
          );
        }
      } catch (err) {
        console.warn(
          `Couldn't save storage for extension '${extensionId}':`,
          err
        );
      }
    });
    return chain;
  };

  const schedulePush = () => {
    if (!records || !owner || disposed) {
      return;
    }
    if (pushTimer) {
      clearTimeout(pushTimer);
    }
    const forOwner = owner;
    pushTimer = setTimeout(() => {
      pushTimer = null;
      void syncWithAccount(forOwner);
    }, pushDelayMs);
  };

  const write = (key: string, entry: Entry) => {
    const entries = Object.assign(emptyRecord<Entry>(), copy.store.entries);
    entries[key] = entry;
    const store: SandboxStore = { ...copy.store, entries };
    if (JSON.stringify(liveValues(store)).length > MAX_SANDBOX_STORAGE_BYTES) {
      throw new SandboxBrokerError(
        "limit_exceeded",
        `Storage is limited to ${MAX_SANDBOX_STORAGE_BYTES} bytes per extension.`
      );
    }
    save({ store, dirty: true });
    // A push reads and merges the account's copy before writing, so it's
    // safe even before the first sync has finished.
    schedulePush();
  };

  // Follows sign-in: each owner has their own copy, synced when they arrive.
  const stopFollowingLogin = effect(() => {
    const userId = login.userId.value;
    if (userId === owner && mergedRemote) {
      return;
    }
    owner = userId;
    copy = readLocal(extensionId, owner);
    mergedRemote = false;
    if (owner) {
      void syncWithAccount(owner);
    }
  });

  return {
    get: (key) => own(liveValues(copy.store), key) ?? null,
    set: (key, value) => write(key, { value, updatedAtMs: now() }),
    remove: (key) => {
      if (Object.hasOwn(liveValues(copy.store), key)) {
        write(key, { deletedAtMs: now() });
      }
    },
    keys: () => Object.keys(liveValues(copy.store)),
    clear: async () => {
      const clearedAtMs = now();
      safeLocalStorage.removeItem(localKey(extensionId, null));
      if (owner) {
        save({ store: { entries: {}, clearedAtMs }, dirty: true });
        mergedRemote = true;
        await syncWithAccount(owner);
        safeLocalStorage.removeItem(localKey(extensionId, owner));
      }
    },
    sync: () => (owner ? syncWithAccount(owner) : Promise.resolve()),
    dispose: async () => {
      disposed = true;
      stopFollowingLogin();
      if (pushTimer) {
        clearTimeout(pushTimer);
        pushTimer = null;
        if (owner) {
          await syncWithAccount(owner);
        }
      }
      await chain;
    },
  };
}
