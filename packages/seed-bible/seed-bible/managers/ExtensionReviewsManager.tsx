import { effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";

declare const __EXTENSION_REVIEWS_RECORD__: string | null | undefined;

/**
 * The record extension reviews are kept in, set at build time from the
 * `EXTENSION_REVIEWS_RECORD_NAME` environment variable. Null when the build
 * didn't set one, which leaves every extension unverified.
 */
export const EXTENSION_REVIEWS_RECORD: string | null =
  typeof __EXTENSION_REVIEWS_RECORD__ === "string" &&
  __EXTENSION_REVIEWS_RECORD__
    ? __EXTENSION_REVIEWS_RECORD__
    : null;

/** The records server refuses longer data addresses. */
const MAX_ADDRESS_LENGTH = 512;

/**
 * Reviewers' notes about an extension live beside its public entry, under
 * this prefix and the `private` marker, so only the record's admins can read
 * them. They can't share the public entry: whoever can read data reads all of it.
 */
const INTERNAL_NOTES_PREFIX = "internal/";

/**
 * What the reviews record says publicly about one extension. It's stored as
 * public data at the extension's full id (for a third-party extension, its
 * source and declared id, like `https://example.com/ext/#my-ext`).
 */
export interface ExtensionVerification {
  verified: boolean;
  /** When the reviewer says the extension was verified. */
  verifiedAtMs?: number;
  /** Shown to everyone with the Verified mark. */
  publicNotes?: string;
  updatedAtMs?: number;
  /** The user who last changed it. */
  updatedBy?: string;
}

/** What a reviewer fills in to mark an extension verified. */
export interface ExtensionVerificationDetails {
  verifiedAtMs: number;
  publicNotes: string;
  /** Kept from everyone but the record's admins. */
  internalNotes: string;
}

export function parseExtensionVerification(
  value: unknown
): ExtensionVerification | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const entry = value as Partial<ExtensionVerification>;
  return {
    verified: entry.verified === true,
    ...(typeof entry.verifiedAtMs === "number"
      ? { verifiedAtMs: entry.verifiedAtMs }
      : {}),
    ...(typeof entry.publicNotes === "string" && entry.publicNotes
      ? { publicNotes: entry.publicNotes }
      : {}),
    ...(typeof entry.updatedAtMs === "number"
      ? { updatedAtMs: entry.updatedAtMs }
      : {}),
    ...(typeof entry.updatedBy === "string"
      ? { updatedBy: entry.updatedBy }
      : {}),
  };
}

export interface ExtensionReviewsManager {
  /** The reviews record this build reads, or null for none. */
  recordName: string | null;
  /**
   * Verifications looked up so far, by extension id. Null for an extension
   * the record says nothing about; absent for one not looked up yet.
   */
  reviews: ReadonlySignal<Record<string, ExtensionVerification | null>>;
  /**
   * Extensions whose last lookup failed, so their verification is unknown
   * rather than missing. A later `load` that succeeds takes them off.
   */
  failed: ReadonlySignal<ReadonlySet<string>>;
  /**
   * Whether the signed-in user may verify extensions. Stays false until
   * `checkCanManage` asks, since most users never open a screen that needs it.
   */
  canManage: ReadonlySignal<boolean>;
  /** Starts checking whether the signed-in user may verify extensions. */
  checkCanManage: () => void;
  /**
   * Looks up an extension's verification, once per page load. Null when
   * there's none, or when it couldn't be read (and then it's tried again
   * next time).
   */
  load: (extensionId: string) => Promise<ExtensionVerification | null>;
  /**
   * Reads reviewers' internal notes about an extension: an empty string when
   * there are none, null when they couldn't be read.
   */
  loadInternalNotes: (extensionId: string) => Promise<string | null>;
  /** Marks an extension verified. False when the record refused it. */
  verify: (
    extensionId: string,
    details: ExtensionVerificationDetails
  ) => Promise<boolean>;
  /**
   * Takes an extension's Verified mark away, keeping its internal notes.
   * False when the record refused it.
   */
  unverify: (extensionId: string) => Promise<boolean>;
}

export function createExtensionReviewsManager(
  os: Pick<
    CasualOSManager,
    "getData" | "recordData" | "eraseData" | "isRecordAdmin"
  >,
  login: Pick<LoginManager, "userId">,
  recordName: string | null = EXTENSION_REVIEWS_RECORD
): ExtensionReviewsManager {
  const reviews = signal<Record<string, ExtensionVerification | null>>({});
  const failed = signal<ReadonlySet<string>>(new Set());
  const canManage = signal(false);
  const adminCheckWanted = signal(false);
  /**
   * Each internal-notes entry as last read or saved (null: there was none),
   * to put back if a save writes the notes but not the public details.
   */
  const knownInternalEntries = new Map<string, object | null>();
  const loading = new Map<string, Promise<ExtensionVerification | null>>();

  const store = (
    extensionId: string,
    verification: ExtensionVerification | null
  ) => {
    reviews.value = { ...reviews.peek(), [extensionId]: verification };
  };

  const internalAddress = (extensionId: string) =>
    `${INTERNAL_NOTES_PREFIX}${extensionId}`;
  const fitsRecord = (extensionId: string) =>
    internalAddress(extensionId).length <= MAX_ADDRESS_LENGTH;

  const setFailed = (extensionId: string, isFailed: boolean) => {
    if (failed.peek().has(extensionId) === isFailed) {
      return;
    }
    const next = new Set(failed.peek());
    if (isFailed) {
      next.add(extensionId);
    } else {
      next.delete(extensionId);
    }
    failed.value = next;
  };

  effect(() => {
    const userId = login.userId.value;
    canManage.value = false;
    if (!adminCheckWanted.value || !recordName || !userId) {
      return;
    }
    let current = true;
    void os.isRecordAdmin(recordName).then((admin) => {
      if (current) {
        canManage.value = admin;
      }
    });
    return () => {
      current = false;
    };
  });

  const load = (extensionId: string): Promise<ExtensionVerification | null> => {
    const known = reviews.peek()[extensionId];
    if (known !== undefined) {
      return Promise.resolve(known);
    }
    if (!recordName || !fitsRecord(extensionId)) {
      return Promise.resolve(null);
    }
    const pending = loading.get(extensionId);
    if (pending) {
      return pending;
    }
    const request = (async () => {
      try {
        const result = await os.getData(recordName, extensionId);
        const found = result.success
          ? parseExtensionVerification(result.data)
          : result.errorCode === "data_not_found"
            ? null
            : undefined;
        if (found === undefined) {
          setFailed(extensionId, true);
          return null;
        }
        setFailed(extensionId, false);
        // A verification saved while this was loading is newer.
        if (reviews.peek()[extensionId] === undefined) {
          store(extensionId, found);
        }
        return reviews.peek()[extensionId] ?? null;
      } catch (err) {
        console.warn(
          `Could not load the verification of '${extensionId}':`,
          err
        );
        setFailed(extensionId, true);
        return null;
      } finally {
        loading.delete(extensionId);
      }
    })();
    loading.set(extensionId, request);
    return request;
  };

  const loadInternalNotes = async (
    extensionId: string
  ): Promise<string | null> => {
    if (!recordName || !fitsRecord(extensionId)) {
      return null;
    }
    try {
      const result = await os.getData(recordName, internalAddress(extensionId));
      if (!result.success) {
        if (result.errorCode !== "data_not_found") {
          return null;
        }
        knownInternalEntries.set(extensionId, null);
        return "";
      }
      const entry =
        typeof result.data === "object" && result.data !== null
          ? (result.data as { internalNotes?: unknown })
          : {};
      knownInternalEntries.set(extensionId, entry);
      return typeof entry.internalNotes === "string" ? entry.internalNotes : "";
    } catch (err) {
      console.warn(
        `Could not load the internal notes of '${extensionId}':`,
        err
      );
      return null;
    }
  };

  /** Writes one entry, reporting why the record refused it. */
  const write = async (
    address: string,
    data: object,
    marker: "publicRead" | "private"
  ): Promise<boolean> => {
    try {
      const result = await os.recordData(recordName!, address, data, {
        marker,
      });
      if (!result.success) {
        console.warn(`Could not save '${address}':`, result.errorMessage);
      }
      return result.success;
    } catch (err) {
      console.warn(`Could not save '${address}':`, err);
      return false;
    }
  };

  const changeStamp = () => ({
    updatedAtMs: Date.now(),
    ...(login.userId.peek() ? { updatedBy: login.userId.peek()! } : {}),
  });

  const verify = async (
    extensionId: string,
    details: ExtensionVerificationDetails
  ): Promise<boolean> => {
    if (!recordName || !fitsRecord(extensionId)) {
      return false;
    }
    // The notes go first, so a refusal can't leave the extension marked
    // verified without the notes that explain it. If the public details are
    // then refused, the notes are put back as they were.
    const internalEntry = {
      internalNotes: details.internalNotes.trim(),
      ...changeStamp(),
    };
    const savedNotes = await write(
      internalAddress(extensionId),
      internalEntry,
      "private"
    );
    if (!savedNotes) {
      return false;
    }
    const publicNotes = details.publicNotes.trim();
    const verification: ExtensionVerification = {
      verified: true,
      verifiedAtMs: details.verifiedAtMs,
      ...(publicNotes ? { publicNotes } : {}),
      ...changeStamp(),
    };
    if (!(await write(extensionId, verification, "publicRead"))) {
      await restoreInternalEntry(extensionId);
      return false;
    }
    knownInternalEntries.set(extensionId, internalEntry);
    store(extensionId, verification);
    return true;
  };

  /** Puts back the internal notes a failed `verify` overwrote, if known. */
  const restoreInternalEntry = async (extensionId: string) => {
    if (!knownInternalEntries.has(extensionId)) {
      return;
    }
    const previous = knownInternalEntries.get(extensionId);
    try {
      if (previous) {
        await write(internalAddress(extensionId), previous, "private");
      } else {
        await os.eraseData(recordName!, internalAddress(extensionId));
      }
    } catch (err) {
      console.warn(
        `Could not restore the internal notes of '${extensionId}':`,
        err
      );
    }
  };

  const unverify = async (extensionId: string): Promise<boolean> => {
    if (!recordName || !fitsRecord(extensionId)) {
      return false;
    }
    const verification: ExtensionVerification = {
      verified: false,
      ...changeStamp(),
    };
    if (!(await write(extensionId, verification, "publicRead"))) {
      return false;
    }
    store(extensionId, verification);
    return true;
  };

  return {
    recordName,
    reviews,
    failed,
    canManage,
    checkCanManage: () => {
      adminCheckWanted.value = true;
    },
    load,
    loadInternalNotes,
    verify,
    unverify,
  };
}
