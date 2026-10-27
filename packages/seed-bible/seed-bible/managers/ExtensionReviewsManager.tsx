import { effect, signal, type ReadonlySignal } from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";

declare const __EXTENSION_REVIEWS_RECORD__: string | null | undefined;

/**
 * The record extension reviews are kept in, set at build time from the
 * `EXTENSION_REVIEWS_RECORD_NAME` environment variable. Null when the build
 * didn't set one, which leaves every extension unreviewed.
 */
export const EXTENSION_REVIEWS_RECORD: string | null =
  typeof __EXTENSION_REVIEWS_RECORD__ === "string" &&
  __EXTENSION_REVIEWS_RECORD__
    ? __EXTENSION_REVIEWS_RECORD__
    : null;

/** The records server refuses longer data addresses. */
const MAX_ADDRESS_LENGTH = 512;

/**
 * What the reviews record says about one extension. It's stored as public
 * data at the extension's full id (for a third-party extension, its source
 * and declared id, like `https://example.com/ext/#my-ext`).
 */
export interface ExtensionReview {
  /** The extension comes from who it says it does. */
  verified: boolean;
  /** Someone has gone through the extension's code. */
  reviewed: boolean;
  updatedAtMs?: number;
  /** The user who last changed it. */
  updatedBy?: string;
}

export type ExtensionReviewStatus = Pick<
  ExtensionReview,
  "verified" | "reviewed"
>;

export function parseExtensionReview(value: unknown): ExtensionReview | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const review = value as Partial<ExtensionReview>;
  return {
    verified: review.verified === true,
    reviewed: review.reviewed === true,
    ...(typeof review.updatedAtMs === "number"
      ? { updatedAtMs: review.updatedAtMs }
      : {}),
    ...(typeof review.updatedBy === "string"
      ? { updatedBy: review.updatedBy }
      : {}),
  };
}

export interface ExtensionReviewsManager {
  /** The reviews record this build reads, or null for none. */
  recordName: string | null;
  /**
   * Reviews looked up so far, by extension id. Null for an extension the
   * record says nothing about; absent for one not looked up yet.
   */
  reviews: ReadonlySignal<Record<string, ExtensionReview | null>>;
  /** Whether the signed-in user may change reviews. */
  canManage: ReadonlySignal<boolean>;
  /**
   * Looks up an extension's review, once per page load. Null when there's
   * none, or when it couldn't be read (and then it's tried again next time).
   */
  load: (extensionId: string) => Promise<ExtensionReview | null>;
  /** Saves an extension's review. False when the record refused it. */
  setReview: (
    extensionId: string,
    status: ExtensionReviewStatus
  ) => Promise<boolean>;
}

export function createExtensionReviewsManager(
  os: Pick<CasualOSManager, "getData" | "recordData" | "isRecordAdmin">,
  login: Pick<LoginManager, "userId">,
  recordName: string | null = EXTENSION_REVIEWS_RECORD
): ExtensionReviewsManager {
  const reviews = signal<Record<string, ExtensionReview | null>>({});
  const canManage = signal(false);
  const loading = new Map<string, Promise<ExtensionReview | null>>();

  const store = (extensionId: string, review: ExtensionReview | null) => {
    reviews.value = { ...reviews.peek(), [extensionId]: review };
  };

  effect(() => {
    const userId = login.userId.value;
    canManage.value = false;
    if (!recordName || !userId) {
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

  const load = (extensionId: string): Promise<ExtensionReview | null> => {
    const known = reviews.peek()[extensionId];
    if (known !== undefined) {
      return Promise.resolve(known);
    }
    if (!recordName || extensionId.length > MAX_ADDRESS_LENGTH) {
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
          ? parseExtensionReview(result.data)
          : result.errorCode === "data_not_found"
            ? null
            : undefined;
        if (found === undefined) {
          return null;
        }
        // A review saved while this was loading is newer.
        if (reviews.peek()[extensionId] === undefined) {
          store(extensionId, found);
        }
        return reviews.peek()[extensionId] ?? null;
      } catch (err) {
        console.warn(`Could not load the review of '${extensionId}':`, err);
        return null;
      } finally {
        loading.delete(extensionId);
      }
    })();
    loading.set(extensionId, request);
    return request;
  };

  const setReview = async (
    extensionId: string,
    status: ExtensionReviewStatus
  ): Promise<boolean> => {
    if (!recordName || extensionId.length > MAX_ADDRESS_LENGTH) {
      return false;
    }
    const review: ExtensionReview = {
      verified: status.verified,
      reviewed: status.reviewed,
      updatedAtMs: Date.now(),
      ...(login.userId.peek() ? { updatedBy: login.userId.peek()! } : {}),
    };
    try {
      const result = await os.recordData(recordName, extensionId, review, {
        marker: "publicRead",
      });
      if (!result.success) {
        console.warn(
          `Could not save the review of '${extensionId}':`,
          result.errorMessage
        );
        return false;
      }
    } catch (err) {
      console.warn(`Could not save the review of '${extensionId}':`, err);
      return false;
    }
    store(extensionId, review);
    return true;
  };

  return { recordName, reviews, canManage, load, setReview };
}
