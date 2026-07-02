import type { Signal } from "@preact/signals";

export interface BookmarksManager {
  bookmarks: Signal<Record<string, any>>;
  finalBookmarks: Signal<any[]>;
  deleteBookmark: (item: any) => Promise<void>;
}
