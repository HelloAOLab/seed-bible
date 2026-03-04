import { MenuIcon } from "app.components.icons";
const G = globalThis as any;

const items = [
  {
    icon: <MenuIcon name="file_export" />,
    title: () => (!G.IsPlaylistPlaying ? t("annotate") : t("addToQueue")),
    onClick: (selectedItem: any) => {
      const dataTempItems: any[] = [];
      selectedItem.verseNumber?.forEach((vNumber: any) => {
        const id = G.createUUID();
        const booksDetails = G.findNameRank(selectedItem.book);
        const dataItemTemp = {
          type: "verse",
          content: `${selectedItem.book} ${selectedItem.chapter}:${vNumber}`,
          additionalInfo: {
            verse: vNumber,
            chapter: selectedItem.chapter,
            book: selectedItem.book,
            bookRank: booksDetails.item,
            data: { ...selectedItem },
            chapterData: { ...G.CHAPTER_DATA },
            groupID: G.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
          },
          id,
        };
        dataTempItems.push(dataItemTemp);
      });
      if (!G.IsPlaylistPlaying) {
        if (!authBot?.id) {
          ShowNotification({
            message: t("pleaseLoginToUseFeature"),
            severity: "error",
          });
          shout("tryUserLogin");
          return;
        }
        G.SetTab("create");
        G[`${"default"}mode`] = G.PlaylistModeTypes.annotations;

        let isAnnotationGoingToAdd = G.AddAnotationUI;
        if (isAnnotationGoingToAdd) {
          isAnnotationGoingToAdd =
            dataTempItems[0].additionalInfo.chapter ===
            G[`FirstAnnnotationItem`].additionalInfo.chapter;
          if (!isAnnotationGoingToAdd) {
            ShowNotification({
              message:
                "You can only annotate the same chapter at a time. In current mode.",
              severity: "error",
            });
            return;
          }
        }

        if (isAnnotationGoingToAdd && G.SetSelectedAnnotations) {
          G.SetSelectedAnnotations(dataTempItems[0].id);
        } else {
          G.SelectedItemIDForAttachments = dataTempItems[0].id;
        }
        setTimeout(() => {
          dataTempItems.forEach((dataItemTemp) => {
            G.Playlist &&
              G.Playlist.tryAddDataToHistory({ dataItem: dataItemTemp });
          });
        }, 100);
        return;
      }
      if (G.RemotePlaylistPlayed) {
        return ShowNotification({
          message: "Only Host can add items to the queue.",
          severity: "error",
        });
      }
      dataTempItems.forEach((dataItemTemp) => {
        G.SetQueue?.(dataItemTemp);
      });
    },
  },

  {
    icon: <MenuIcon name="book" />,
    title: (item: any = {}) => {
      const title = `${item?.book} ${item?.chapter}:${item?.verseNumber?.join(", ")}`;
      if (thisBot.tags.bookmarks[title]) {
        return t("unbookmark");
      }
      return t("bookmark");
    },
    onClick: async (selectedItem: any) => {
      if (!authBot?.id) {
        ShowNotification({
          message: t("pleaseLoginToUseFeature"),
          severity: "error",
        });
        shout("tryUserLogin");
        return;
      }

      let msg = "";
      let errorMsg = "";
      const oldBookmarks = { ...thisBot.tags.bookmarks };

      selectedItem.verseNumber.forEach((vNumber: any) => {
        const id = G.createUUID();
        const booksDetails = G.findNameRank(selectedItem.book);
        const title = `${selectedItem.book} ${selectedItem.chapter}:${vNumber}`;

        if (oldBookmarks[title]) {
          delete oldBookmarks[title];

          msg = t("bookmarkRemovedSuccessfully");
          errorMsg = t("failedToRemoveBookmark");
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
              chapterData: { ...G.CHAPTER_DATA },
              groupID: G.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
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

        if (G.SetBookmarks) {
          G.SetBookmarks(oldBookmarks);
        }
        ShowNotification({ message: msg, severity: "success" });
      } catch (err) {
        ShowNotification({ message: errorMsg, severity: "error" });
      }
    },
  },
  {
    icon: <MenuIcon name="playlist_add" />,
    title: t("addToPlaylist"),
    onClick: (selectedItem: any) => {
      const dataTempItems: any[] = [];
      const joinedAndGroupedVerses: {
        verse: number | number[];
        content: string;
      }[] = [];

      let oldVerseNumber = 0;

      selectedItem.verseNumber.forEach((vNumber: any) => {
        if (oldVerseNumber === 0) {
          joinedAndGroupedVerses.push({
            verse: vNumber,
            content: `${vNumber}`,
          });
          oldVerseNumber = vNumber;
        } else {
          const lastItem: any =
            joinedAndGroupedVerses[joinedAndGroupedVerses.length - 1];
          const lastVerseNumber =
            typeof lastItem?.verse === "number"
              ? lastItem.verse
              : lastItem.verse[lastItem.verse.length - 1];
          if (lastVerseNumber + 1 === vNumber) {
            if (typeof lastItem.verse === "number") {
              lastItem.verse = [lastItem.verse, vNumber];
            } else {
              lastItem.verse.push(vNumber);
            }
            lastItem.content = `${lastItem.verse[0]}-${vNumber}`;
            joinedAndGroupedVerses[joinedAndGroupedVerses.length - 1] =
              lastItem;
          } else {
            joinedAndGroupedVerses.push({
              verse: vNumber,
              content: `${vNumber}`,
            });
          }
        }
      });

      joinedAndGroupedVerses?.forEach((item) => {
        const id = G.createUUID();
        const booksDetails = G.findNameRank(selectedItem.book);
        const dataItemTemp = {
          type: "verse",
          content: `${selectedItem.book} ${selectedItem.chapter}:${item.content}`,
          additionalInfo: {
            verse: item.verse,
            chapter: selectedItem.chapter,
            book: selectedItem.book,
            bookRank: booksDetails.item,
            data: { ...selectedItem },
            chapterData: { ...G.CHAPTER_DATA },
            groupID: G.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
          },
          id,
        };
        dataTempItems.push(dataItemTemp);
      });
      G.AddToPlaylistData = dataTempItems;
      G.SetShowAddToPlaylist(true);
    },
  },
];

return items;
