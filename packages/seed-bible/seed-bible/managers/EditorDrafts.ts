import type { z } from "zod";

export interface EditorDraftStore<T> {
  /** The draft kept for `locator`, or null when there's none (or it's unreadable). */
  read: (locator: string) => T | null;
  /** Keeps `draft` for `locator`. Best-effort: storage can be full or blocked. */
  write: (locator: string, draft: T) => void;
  /** Forgets the draft kept for `locator`, if any. */
  clear: (locator: string) => void;
}

/**
 * Unsaved edits kept in this browser's localStorage so a refresh (or closing
 * the tab) doesn't lose them. One per edited record, keyed by its
 * `{recordName}.{id}` locator under `keyPrefix`.
 */
export function createEditorDraftStore<S extends z.ZodType>(
  keyPrefix: string,
  /** Called on use, so it can name a schema whose module is still loading. */
  schema: () => S
): EditorDraftStore<z.output<S>> {
  return {
    read: (locator) => {
      if (typeof window === "undefined") {
        return null;
      }
      try {
        const raw = window.localStorage.getItem(keyPrefix + locator);
        if (!raw) {
          return null;
        }
        const parsed = schema().safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        // Unavailable storage or a malformed entry: as if there were none.
        return null;
      }
    },
    write: (locator, draft) => {
      if (typeof window === "undefined") {
        return;
      }
      try {
        window.localStorage.setItem(keyPrefix + locator, JSON.stringify(draft));
      } catch {
        // Losing it only means losing unsaved edits on a refresh, as before.
      }
    },
    clear: (locator) => {
      if (typeof window === "undefined") {
        return;
      }
      try {
        window.localStorage.removeItem(keyPrefix + locator);
      } catch {
        // Nothing to do: an unreadable entry is ignored on read anyway.
      }
    },
  };
}
