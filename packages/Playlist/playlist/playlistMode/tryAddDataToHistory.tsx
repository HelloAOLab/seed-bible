const G = globalThis as any;
if (G.HISTORYExploreMode) return;
if (G.makingPlaylist || G[`${"default"}creatingPlaylist`]) {
  const dataItem = that.dataItem;
  let combineLast = that.combineLast;

  if (G.AddAnotationUI && G[`FirstAnnnotationItem`]?.additionalInfo) {
    if (
      dataItem.additionalInfo.chapter !=
      G[`FirstAnnnotationItem`].additionalInfo.chapter
    ) {
      ShowNotification({
        message:
          "You can only annotate the same chapter at a time. In current mode.",
        severity: "error",
      });
      return;
    }
  }

  if (G.AddAnotationUI && G.AnnotationUISingleMode) {
    const oldItems = [...G[`defaultcurrentPlaylist`]];

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
        dataItem.content = `${dataItem.additionalInfo.book} ${dataItem.additionalInfo.chapter}:${G.GetVerseSummaryHeading(filteredVerses)}`;
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
  if (!dataItem.id) dataItem.id = G.createUUID();
  const isDelete = that.isDelete;
  if (dataItem.content === "undefined") return;
  if (!dataItem || !dataItem.type || !dataItem.content)
    return os.toast("Invalid Data format!");

  idsActive.forEach((id) => {
    if (G[`${id}creatingPlaylist`] || that.force) {
      thisBot.tryAddDataToPlaylist({
        dataItem,
        isDelete,
        playlistID: id,
        force: that.force,
        combineLast,
      });
    }
  });
}
