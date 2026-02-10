if (globalThis.HISTORYExploreMode) return;
if (globalThis.makingPlaylist) {
  const dataItem = that.dataItem;
  let combineLast = that.combineLast;

  if (
    globalThis.AddAnotationUI &&
    globalThis[`FirstAnnnotationItem`]?.additionalInfo
  ) {
    if (
      dataItem.additionalInfo.chapter !=
      globalThis[`FirstAnnnotationItem`].additionalInfo.chapter
    ) {
      ShowNotification({
        message:
          "You can only annotate the same chapter at a time. In current mode.",
        severity: "error",
      });
      return;
    }
  }

  if (globalThis.AddAnotationUI && globalThis.AnnotationUISingleMode) {
    const oldItems = [...globalThis[`defaultcurrentPlaylist`]];

    const allVersePresent: Record<number, boolean> = {};

    oldItems.forEach((ele: any) => {
      if (ele.type === "verse-grouped") {
        ele.additionalInfo.verse.forEach((verse: number) => {
          allVersePresent[verse] = true;
        });
      } else if (ele.type === "verse") {
        allVersePresent[ele.additionalInfo.verse] = true;
      }
    });

    const sameItem = oldItems.find((ele: any) => {
      const isTypeSame =
        ele.type === dataItem.type ||
        (ele.type === "verse" && dataItem.type === "verse-grouped") ||
        (ele.type === "verse-grouped" && dataItem.type === "verse");
      const isBookSame =
        ele.additionalInfo.book === dataItem.additionalInfo.book;
      if (!isTypeSame || !isBookSame) return false;

      const isChapterSame =
        ele.additionalInfo.chapter === dataItem.additionalInfo.chapter;

      if (dataItem.type === "chapter") {
        return isChapterSame;
      }

      if (dataItem.type === "verse") {
        const isVerseSame = allVersePresent[dataItem.additionalInfo.verse];
        return isVerseSame;
      }

      if (dataItem.type === "verse-grouped") {
        const filteredVerses = (
          Array.isArray(dataItem.additionalInfo.verse)
            ? dataItem.additionalInfo.verse
            : [dataItem.additionalInfo.verse]
        )
          .filter((verse: number) => !allVersePresent[verse])
          .sort((a: number, b: number) => a - b);
        dataItem.additionalInfo.verse = filteredVerses;
        dataItem.content = `${dataItem.additionalInfo.book} ${dataItem.additionalInfo.chapter}:${globalThis.GetVerseSummaryHeading(filteredVerses)}`;
        combineLast = false;
        return filteredVerses.length === 0;
      }

      return false;
    });
    if (sameItem) {
      ShowNotification({
        message: "You have already annotated this item.",
        severity: "error",
      });
      return;
    }
  }

  if (!dataItem.content) return;
  if (dataItem.content.startsWith("Psalm")) {
    const secondHalf = dataItem.content.split(" ")[1];
    const dataName = getPsalmsBookName(dataItem.additionalInfo.chapter);
    dataItem.content = `${dataName} ${secondHalf}`;
  }
  if (dataItem.type === "chapter") {
    const bookDetails = findNameRank(
      dataItem.additionalInfo.book || dataItem.additionalInfo.bookName
    );
    dataItem.additionalInfo.chapters = bookDetails.chapters;
  }
  const idsActive = ["default"];
  // const idsActive = that.playlistID ? [that.playlistID] : Object.keys(PlaylistsGroups).filter(key => PlaylistsGroups[key].active);
  // if (dataItem.type === "book" && that.forceAddChapter) {
  //     idsActive.forEach(id => {
  //         const bookDetails = findNameRank(dataItem.additionalInfo.bookName);
  //         if (!(dataItem.additionalInfo.bookName === globalThis[`${id}.lastHistoryBookItem`])) {
  //             globalThis[`${id}lastHistoryBookItem`] = dataItem.additionalInfo.bookName;
  //             let startChapter = 0;

  //             if (dataItem.content.includes("Psalm")) {
  //                 const secondHalf = dataItem.content.split(" ")[0];
  //                 const psalmsDivision = ["_", 0, 41, 72, 89, 106, 150];

  //                 startChapter = psalmsDivision[secondHalf];
  //             }

  //             new Array(bookDetails.chapters).fill(0).forEach((_, i) => {
  //                 thisBot.tryAddDataToHistory({
  //                     dataItem: {
  //                         content: `${dataItem.additionalInfo.bookName} ${startChapter + i + 1}`,
  //                         type: "chapter",
  //                         additionalInfo: {
  //                             bookRank: bookDetails.rank,
  //                             bookName: dataItem.additionalInfo.bookName,
  //                             chapter: startChapter + i + 1,
  //                             data: {
  //                                 ...dataItem.additionalInfo.data
  //                             }
  //                         },
  //                     },
  //                     playlistID: id,
  //                 });
  //             })
  //         }

  //     })
  //     return;
  // }
  if (!dataItem.id) dataItem.id = createUUID();
  const isDelete = that.isDelete;
  if (dataItem.content === "undefined") return;
  if (!dataItem || !dataItem.type || !dataItem.content)
    return os.toast("Invalid Data format!");

  idsActive.forEach((id) => {
    if (globalThis[`${id}creatingPlaylist`] || that.force) {
      thisBot.tryAddDataToPlaylist({
        dataItem,
        isDelete,
        playlistID: id,
        force: that.force,
        combineLast,
      });
    } else {
      if (globalThis[`${id}AddDataToHistory`]) {
        // globalThis[`${id}AddDataToHistory`](dataItem);
      } else {
        return;
        if (globalThis[`${id}currentHistory`]) {
          const lastData =
            globalThis[`${id}currentHistory`][
              globalThis[`${id}currentHistory`].length - 1
            ];
          const isSame = objectComparator(dataItem, lastData, ["content"]);
          if (!isSame) {
            globalThis[`${id}currentHistory`].push(dataItem);
          } else {
            os.toast("Last item repeated!");
          }
        } else {
          globalThis[`${id}currentHistory`] = [dataItem];
        }
        setHistoryLocale(globalThis[`${id}currentHistory`], id);
      }
    }
  });
}
