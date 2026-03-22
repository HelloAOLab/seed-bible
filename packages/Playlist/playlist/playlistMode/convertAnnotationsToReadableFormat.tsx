const annotations = that?.annotations;
const currentOpenedBook = that?.currentOpenedBook;
const annotationSources: any = [];
const tagsSources: any = [];
const verseIndexMap: any = {};
const sourcesMap: any = {};
const tagsMap: any = {};
let allAnnotations: any = [];
const G = globalThis as any;

annotations.forEach((ele: any) => {
  if (!sourcesMap[ele.data.userId]) {
    annotationSources.push({
      label: ele.data.userName,
      value: ele.data.userId,
      profilePicture: ele.data.userProfilePicture,
    });
    sourcesMap[ele.data.userId] = true;
  }
  ele?.data?.tags?.forEach((tag: any) => {
    if (!tagsMap[tag]) {
      tagsMap[tag] = true;
      tagsSources.push({
        label: tag,
        value: tag,
      });
    }
  });
  if (ele?.data.type === "comment" && (ele.verseNumber || ele.verseNumbers)) {
    const booksDetails = G.findNameRank(ele.bookId);

    const anoItem = {
      type: "heading",
      content: ele.data.html,
      additionalInfo: {
        verse: ele.verseNumber || ele.verseNumbers,
        chapter: ele.chapter,
        book: ele.bookId,
        bookRank: booksDetails.item,
      },
      address: ele.id,
      id: ele.id,
      createdAtMs: ele?.data?.createdAtMs || Date.now(),
      updatedAtMs: ele?.data?.updatedAtMs || Date.now(),
      tags: ele?.data?.tags || [],
      createdBy: ele?.data?.userId,
      createdByName: ele?.data?.userName,
      createdByProfilePicture: ele?.data?.userProfilePicture,
    };

    const verseSummaryHeading = G.GetVerseSummaryHeading(
      ele.verseNumber ? [ele.verseNumber] : ele.verseNumbers
    );

    const data: any = {
      bookid: currentOpenedBook?.bookId,
      chapter: currentOpenedBook?.chapter,
    };

    data.heading = `${currentOpenedBook.book} ${currentOpenedBook.chapter}:${verseSummaryHeading.join(`, `)}`;
    data.data = [anoItem];
    data.verse = ele.verseNumber || ele.verseNumbers;
    data.tags = [];
    data.address = ele.id;
    if (!verseIndexMap[data.heading]) {
      // verseIndexMap[data.heading] = allAnnotations.length - 1;
      allAnnotations.push(data);
    } else {
      allAnnotations[verseIndexMap[data.heading]].data.push(anoItem);
    }
  } else if (ele?.data.type !== "comment") {
    const data: any = {
      bookid: currentOpenedBook?.bookId,
      chapter: currentOpenedBook?.chapter,
    };
    const innerele = ele?.data?.data;

    if (innerele) {
      if (!!innerele.additionalInfo && !!innerele.additionalInfo.layers) {
        const tags = [...(ele?.data.chronicle_tags || [])];
        const layers = [
          ...innerele.additionalInfo.layers.map((layer: any) => ({
            ...layer,
            address: ele.id,
            createdAtMs: innerele.createdAtMs || Date.now(),
            updatedAtMs: innerele.updatedAtMs || Date.now(),
          })),
        ];
        if (innerele?.type === "chapter") {
          data.heading = "Chapter";
          data.data = [...layers];
          data.tags = [...tags];
          data.address = ele.id;
          data.verse = [0];
        }
        if (innerele?.type === "verse-grouped") {
          const verses = [...innerele.additionalInfo.verse];
          const length = verses.length;
          data.heading = `Verse ${verses[0]}-${verses[length - 1]}`;
          data.data = [...layers];
          data.tags = [...tags];
          data.address = ele.id;
          data.verse = verses[0];
        }

        if (innerele?.type === "verse") {
          data.heading = `Verse ${innerele.additionalInfo.verse}`;
          data.data = [...layers];
          data.tags = [...tags];
          data.verse = innerele.additionalInfo.verse;
          data.address = ele.id;
        }
        if (data.data) {
          if (!verseIndexMap[data.heading]) {
            verseIndexMap[data.heading] = allAnnotations.length - 1;
            allAnnotations.push(data);
          } else {
            allAnnotations[verseIndexMap[data.heading]]?.data.push(...layers);
            allAnnotations[verseIndexMap[data.heading]]?.tags.push(...tags);
          }
        }
      }
    }
  }
});

return {
  allAnnotations,
  annotationSources,
  tagsSources,
  verseIndexMap,
  sourcesMap,
  tagsMap,
};
