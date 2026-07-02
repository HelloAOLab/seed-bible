import { computed, signal } from "@preact/signals";
import { navigationWithDataItem } from "ext_discover.helper.navigationWithDataItem";
import { saveBookmarks } from "ext_discover.helper.saveBookmarks";
import { isMobilePlaylistViewport } from "ext_discover.hooks.isMobilePlaylistViewport";
import type { BookmarksManager } from "ext_discover.interfaces.managers.BookmarksManager";

const G = globalThis as Record<string, any>;

function getPlaylistBot(): Record<string, any> {
  return (
    (G.Playlist as Record<string, any>) ||
    (G.thisBot as Record<string, any>) ||
    {}
  );
}

let singleton: BookmarksManager | undefined;

export function getBookmarksManager(): BookmarksManager {
  if (!singleton) {
    singleton = createBookmarksManager();
  }
  return singleton;
}

export function createBookmarksManager(): BookmarksManager {
  const bookmarks = signal<Record<string, any>>({
    ...(getPlaylistBot().tags?.bookmarks || {}),
  });

  const finalBookmarks = computed(() =>
    Object.keys(bookmarks.value).map((key) => bookmarks.value[key])
  );

  G.SetBookmarks = (next: Record<string, any>) => {
    bookmarks.value = { ...next };
  };

  const deleteBookmark = async (item: any) => {
    try {
      const content = item.content;
      const bot = getPlaylistBot();
      const oldBookmarks = { ...(bot.tags?.bookmarks || {}) };
      delete oldBookmarks[content];

      await saveBookmarks({
        bookmarks: oldBookmarks,
        t,
      });

      setTag(bot, "bookmarks", oldBookmarks);
      bookmarks.value = oldBookmarks;
      ShowNotification({
        message: `Bookmark delete successfully.`,
        severity: "success",
      });
    } catch (err) {
      console.log(err);
      ShowNotification({
        message: `Unable to delete bookmarks. Please try again.`,
        severity: "error",
      });
    }
  };

  return {
    bookmarks,
    finalBookmarks,
    deleteBookmark,
  };
}
