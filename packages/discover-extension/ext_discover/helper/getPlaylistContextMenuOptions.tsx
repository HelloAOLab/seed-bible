import { MenuIcon } from "app.components.icons";

const G = globalThis as Record<string, any>;

export function getPlaylistContextMenuOptions() {
  return [
    {
      icon: <MenuIcon name="file_export" />,
      title: () => {
        return !G[`defaultcreatingPlaylist`] &&
          !G[`defaultnamingPlaylist`] &&
          G.DEV_ENV
          ? !G.IsPlaylistPlaying
            ? t("annotate")
            : t("addToQueue")
          : null;
      },
      onClick: (selectedItem: any) => {
        if (
          G[`defaultcreatingPlaylist`] ||
          G[`defaultnamingPlaylist`] ||
          !G.DEV_ENV
        ) {
          return;
        }
        const dataTempItems: any[] = [];
        const booksDetails = G.findNameRank(selectedItem.book);

        const makeVerseItem = (vNumber: number) => {
          const id = G.createUUID();
          return {
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
        };

        if (G.IsPlaylistPlaying) {
          const verseNums = (selectedItem.verseNumber || [])
            .map((v: any) => Number(v))
            .filter((v: number) => Number.isFinite(v))
            .sort((a: number, b: number) => a - b);
          const uniqueSorted: number[] = Array.from(new Set(verseNums));

          const runs: { start: number; end: number }[] = [];
          for (const v of uniqueSorted) {
            const last = runs[runs.length - 1];
            if (last && v === last.end + 1) {
              last.end = v;
            } else {
              runs.push({ start: v, end: v });
            }
          }

          for (const run of runs) {
            if (run.start === run.end) {
              dataTempItems.push(makeVerseItem(run.start));
            } else {
              const verses = Array.from(
                { length: run.end - run.start + 1 },
                (_, i) => run.start + i
              );
              const id = G.createUUID();
              dataTempItems.push({
                type: "verse-grouped",
                content: `${selectedItem.book} ${selectedItem.chapter}:${run.start}-${run.end}`,
                additionalInfo: {
                  verse: verses,
                  chapter: selectedItem.chapter,
                  book: selectedItem.book,
                  bookRank: booksDetails.item,
                  data: {
                    ...selectedItem,
                    verseNumber: verses,
                  },
                  chapterData: { ...G.CHAPTER_DATA },
                  groupID: G.ADD_VERSE_ITEM_PLAYLIST_GROUP_ID,
                },
                id,
              });
            }
          }
        } else {
          selectedItem.verseNumber?.forEach((vNumber: any) => {
            dataTempItems.push(makeVerseItem(Number(vNumber)));
          });
        }
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
              G.Playlist?.tryAddDataToHistory?.({ dataItem: dataItemTemp });
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
      icon: <MenuIcon name="playlist_add" />,
      title: () =>
        G.IsPlaylistPlaying ||
        G[`defaultcreatingPlaylist`] ||
        G[`defaultnamingPlaylist`]
          ? null
          : t("addToPlaylist"),
      onClick: (selectedItem: any) => {
        if (
          G.IsPlaylistPlaying ||
          G[`defaultcreatingPlaylist`] ||
          G[`defaultnamingPlaylist`]
        ) {
          return;
        }
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
}
