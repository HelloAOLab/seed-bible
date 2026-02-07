import { MenuIcon } from "app.components.icons";

const items = [
  {
    icon: <MenuIcon name="file_export" />,
    title: () =>
      !globalThis.IsPlaylistPlaying ? t("annotate") : t("addToQueue"),
    onClick: (selectedItem) => {
      const dataTempItems = [];
      selectedItem.verseNumber?.forEach((vNumber) => {
        const id = createUUID();
        const booksDetails = globalThis.findNameRank(selectedItem.book);
        const dataItemTemp = {
          type: "verse",
          content: `${selectedItem.book} ${selectedItem.chapter}:${vNumber}`,
          additionalInfo: {
            verse: vNumber,
            chapter: selectedItem.chapter,
            book: selectedItem.book,
            bookRank: booksDetails.item,
            data: { ...selectedItem },
            chapterData: { ...globalThis.CHAPTER_DATA },
            groupID: globalThis.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
          },
          id,
        };
        dataTempItems.push(dataItemTemp);
      });
      if (!globalThis.IsPlaylistPlaying) {
        if (!authBot?.id) {
          return ShowNotification({
            message: t("pleaseLoginToUseFeature"),
            severity: "error",
          });
        }
        globalThis.SetTab("create");
        globalThis[`${"default"}mode`] = PlaylistModeTypes.annotations;

        let isAnnotationGoingToAdd = globalThis.AddAnotationUI;
        if (isAnnotationGoingToAdd) {
          isAnnotationGoingToAdd = dataTempItems[0].additionalInfo.chapter === globalThis[`FirstAnnnotationItem`].additionalInfo.chapter;
          if (!isAnnotationGoingToAdd) {
            ShowNotification({
              message: "You can only annotate the same chapter at a time. In current mode.",
              severity: "error",
            });
            return;
          }
        };

        if (isAnnotationGoingToAdd && globalThis.SetSelectedAnnotations) {
          globalThis.SetSelectedAnnotations(dataTempItems[0].id);
        } else {
          globalThis.SelectedItemIDForAttachments = dataTempItems[0].id;
        }
        setTimeout(() => {
          dataTempItems.forEach((dataItemTemp) => {
            globalThis.Playlist &&
              Playlist.tryAddDataToHistory({ dataItem: dataItemTemp });
          });
        }, 100);
        return;
      }
      if (globalThis.RemotePlaylistPlayed) {
        return ShowNotification({
          message: "Only Host can add items to the queue.",
          severity: "error",
        });
      }
      dataTempItems.forEach((dataItemTemp) => {
        globalThis.SetQueue?.(dataItemTemp);
      });
    },
  },

  {
    icon: <MenuIcon name="book" />,
    title: (item = {}) => {
      const title = `${item?.book} ${item?.chapter}:${item?.verseNumber?.join(", ")}`;
      if (thisBot.tags.bookmarks[title]) {
        return t("unbookmark");
      }
      return t("bookmark");
    },
    onClick: async (selectedItem) => {
      if (!authBot?.id) {
        return ShowNotification({
          message: t("pleaseLoginToUseFeature"),
          severity: "error",
        });
      }

      let msg = "";
      let errorMsg = "";
      const oldBookmarks = { ...thisBot.tags.bookmarks };

      selectedItem.verseNumber.forEach((vNumber) => {
        const id = createUUID();
        const booksDetails = globalThis.findNameRank(selectedItem.book);
        const title = `${selectedItem.book} ${selectedItem.chapter}:${vNumber}`;

        if (oldBookmarks[title]) {
          delete oldBookmarks[title];

          msg = "Bookmark Updated successfully.";
          errorMsg = "Failed to update bookmark. Please try again.";
        } else {
          const dataItemTemp = {
            type: "verse",
            content: title,
            additionalInfo: {
              verse: vNumber,
              chapter: selectedItem.chapter,
              book: selectedItem.book,
              bookRank: booksDetails.item,
              data: { ...selectedItem },
              chapterData: { ...globalThis.CHAPTER_DATA },
              groupID: globalThis.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
            },
            id,
            time: new Date().toLocaleString(),
          };

          oldBookmarks[title] = {
            ...dataItemTemp,
          };
          msg = t("bookmarkUpdatedSuccessfully");
          errorMsg = t("failedToUpdateBookmark");
        }
      });

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
