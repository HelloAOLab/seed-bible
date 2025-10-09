import { MenuIcon } from "app.components.icons";

const items = [
  {
    icon: <MenuIcon name="file_export" />,
    title: () =>
      !globalThis.IsPlaylistPlaying ? "Add annotation" : "Add to queue",
    onClick: (item) => {
      const id = createUUID();
      const booksDetails = globalThis.findNameRank(item.book);

      const dataItemTemp = {
        type: "verse",
        content: `${item.book} ${item.chapter}:${item.verseNumber}`,
        additionalInfo: {
          verse: item.verseNumber,
          chapter: item.chapter,
          book: item.book,
          bookRank: booksDetails.item,
          data: { ...item },
          chapterData: { ...globalThis.CHAPTER_DATA },
          groupID: globalThis.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
        },
        id,
      };
      if (!globalThis.IsPlaylistPlaying) {
        if (!authBot?.id) {
          return ShowNotification({
            message: "Login to user this feature",
            severity: "error",
          });
        }
        globalThis.SetTab("create");
        globalThis[`${"default"}mode`] = PlaylistModeTypes.annotations;
        if (globalThis.SetSelectedAnnotations) {
          globalThis.SetSelectedAnnotations(id);
        } else {
          globalThis.SelectedItemIDForAttachments = id;
        }
        setTimeout(() => {
          globalThis.Playlist &&
            Playlist.tryAddDataToHistory({ dataItem: dataItemTemp });
        }, 100);
        return;
      }
      if (globalThis.RemotePlaylistPlayed) {
        return ShowNotification({
          message: "Only Host can add items to the queue.",
          severity: "error",
        });
      }
      globalThis.SetQueue?.(dataItemTemp);
    },
  },

  {
    icon: <MenuIcon name="book" />,
    title: (item = {}) => {
      const title = `${item?.book} ${item?.chapter}:${item?.verseNumber}`;
      if (thisBot.tags.bookmarks[title]) {
        return "Remove Bookmark";
      }
      return "Add bookmark";
    },
    onClick: async (item) => {
      if (!authBot?.id) {
        return ShowNotification({
          message: "Login to user this feature",
          severity: "error",
        });
      }
      const id = createUUID();
      const booksDetails = globalThis.findNameRank(item.book);
      const title = `${item.book} ${item.chapter}:${item.verseNumber}`;
      const oldBookmarks = { ...thisBot.tags.bookmarks };

      let msg = "";
      let errorMsg = "";

      if (oldBookmarks[title]) {
        delete oldBookmarks[title];

        msg = "Bookmark removed successfully.";
        errorMsg = "Failed to remove bookmark. Please try again.";
      } else {
        const dataItemTemp = {
          type: "verse",
          content: title,
          additionalInfo: {
            verse: item.verseNumber,
            chapter: item.chapter,
            book: item.book,
            bookRank: booksDetails.item,
            data: { ...item },
            chapterData: { ...globalThis.CHAPTER_DATA },
            groupID: globalThis.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
          },
          id,
          time: new Date().toLocaleString(),
        };

        oldBookmarks[title] = {
          ...dataItemTemp,
        };
        msg = `Bookmark saved successfully.`;
        errorMsg = "Failed to save bookmark. Please try again.";
      }

      try {
        const res = await thisBot.saveBookmarks({
          bookmarks: oldBookmarks,
        });

        setTag(thisBot, "bookmarks", oldBookmarks);

        if (globalThis.SetBookmarks) {
          globalThis.SetBookmarks(oldBookmarks);
        }
        ShowNotification({ message: msg, severity: "success" });
      } catch (err) {
        ShowNotification({ message: errorMsg, severity: "error" });
      }
    },
  },
];

return items;
