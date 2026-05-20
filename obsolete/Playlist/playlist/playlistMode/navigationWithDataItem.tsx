const G = globalThis as any;
if (G.NagiationTimeout) {
  clearTimeout(G.NagiationTimeout);
  G.NagiationTimeout = null;
}
if (G.RenderLinkTimer) clearTimeout(G.RenderLinkTimer);

function scrollToVerse(verseNumber: number) {
  const element = document.getElementById(`v-${verseNumber}`);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth", // smooth scrolling animation
      block: "center", // scroll so it's centered in the viewport
    });
  } else {
    console.warn(`Verse ${verseNumber} not found`);
  }
}

G.NagiationTimeout = setTimeout(async () => {
  const initialValue = G.HISTORYExploreMode;
  G.HISTORYExploreMode = true;
  const { dataItem, bulkAdd } = that;

  let dataToNavigate = dataItem;
  if (Array.isArray(dataItem)) {
    dataToNavigate = dataItem[0];
  }

  const openTestamentByBook = async (
    bookName: string,
    isFindByRank = false
  ) => {
    const mainWordBibleOldTestament = getBot("isOldTestament", true);
    const mainWordBibleNewTestament = getBot("isNewTestament", true);
    const bookDetails = G.findNameRank(bookName, null, false, isFindByRank);
    const bookTestament =
      bookDetails?.testament === "Old Testament"
        ? mainWordBibleOldTestament
        : mainWordBibleNewTestament;
    if (bookTestament) {
      bookTestament.convertIntoArrangement();
      await os.sleep(4000);
    }
    return bookDetails;
  };

  const openTestamentBySection = async (
    sectionName: string,
    isFindByRank = false
  ) => {
    const sectionRanks = getSectionRanking();
    let section: any = undefined;
    Object.keys(sectionRanks).forEach((key) => {
      if (isFindByRank) {
        const curreSec = sectionRanks[key];
        if (sectionName === curreSec.sectionRank) {
          section = curreSec;
        }
      } else {
        if (key.toLocaleLowerCase() === sectionName.toLocaleLowerCase()) {
          section = sectionRanks[key];
        }
      }
    });
    const mainWordBibleOldTestament = getBot("isOldTestament", true);
    const mainWordBibleNewTestament = getBot("isNewTestament", true);

    const bookTestament =
      section?.testament === "Old Testament"
        ? mainWordBibleOldTestament
        : mainWordBibleNewTestament;
    if (bookTestament) {
      bookTestament.convertIntoArrangement();
      await os.sleep(4000);
    }
  };

  const openSection = async (sectionName: string) => {
    let sectionBot: any = getBot(
      byTag("isSection", true),
      byTag("sectionName", sectionName)
    );

    if (sectionBot && !sectionBot.masks.selected) {
      // Double time is for interaction and select
      await sectionBot.interact({ notATour: true });
      await sectionBot.interact({ notATour: true });
    } else {
      os.toast(`${sectionName} is Already opened.`);
    }
  };

  const openBook = async (commonName: string, chapter = 1, verse = []) => {
    let bookBot = getBot(byTag("bookName", commonName), byTag("isBook", true));
    if (bookBot) {
      await os
        .focusOn(bookBot, {
          duration: 1,
          easing: "quadratic",
        })
        .then(async () => {
          await openBookHelper(bookBot, commonName, chapter, verse);
        });
    }
  };

  async function openBookHelper(
    bookBot: any,
    commonName: string,
    chapter: number,
    versesState = [1]
  ) {
    shout("closeFormMenu");
    G.Playlist.tryAddDataToHistory({ dataItem });
    if (bookBot.masks.isSelected) {
      G.bible.openAt(`${bookBot.tags.bookName} ${chapter}:1`);
      await os.sleep(100);
      G.updateCustomHeight(0.8);
      G.arrowActionsFreeze = false;
    } else {
      setTagMask(
        bookBot,
        "searchSelect",
        { commonName: commonName, chapter: chapter },
        "tempLocal"
      );
      await bookBot.interact().then(async () => {
        if (!bookBot.masks.isSelected) {
          setTagMask(
            bookBot,
            "searchSelect",
            { commonName: commonName, chapter: chapter },
            "tempLocal"
          );
          await bookBot.interact().then(async () => {
            if (!bookBot.masks.isSelected) {
              setTagMask(
                bookBot,
                "searchSelect",
                { commonName: commonName, chapter: chapter },
                "tempLocal"
              );
              await bookBot.interact();
            }
          });
        }
      });
      G.arrowActionsFreeze = false;
    }
    try {
      G.setVersesState(versesState);
    } catch {
      os.log("setVersesState not global yet");
    }
  }

  if (G.SetMediaURL && !that.skipEmbed) {
    G.SetMediaURL(null);
  }
  setTimeout(() => {
    thisBot.CloseFloatingApp();
  }, 100);

  if (G.SetVideoSrc && !that.skipEmbed) {
    G.SetVideoSrc(null);
    if (
      dataToNavigate.additionalInfo?.type === "video-recording" ||
      that.additionalInfo?.type === "Video" ||
      dataToNavigate.additionalInfo?.type === "video"
    ) {
      thisBot.VideoPlayer({
        src: dataToNavigate.additionalInfo.link,
      });
      // globalThis.SetVideoSrc(dataToNavigate.additionalInfo.link);
      return;
    }
  }

  switch (dataToNavigate.type) {
    case "testament": {
      const mainWordBibleOldTestament = getBot("isOldTestament", true);
      const mainWordBibleNewTestament = getBot("isNewTestament", true);
      const bot = dataToNavigate.additionalInfo.isNewTestament
        ? mainWordBibleNewTestament
        : mainWordBibleOldTestament;
      if (bot) {
        await bot.convertIntoArrangement();
      } else {
        os.toast(
          `${dataToNavigate.additionalInfo.bookName} is Already opened.`
        );
      }
      G.ModifyTransformedHistory &&
        G.PlayingPlaylist &&
        G.ModifyTransformedHistory((thh: any) => thisBot.checkGreyOut(thh));
      if (G.updateCustomHeight) G.updateCustomHeight(0);
      break;
    }
    case "section": {
      await openTestamentBySection(dataToNavigate.additionalInfo.sectionName);
      await openSection(dataToNavigate.additionalInfo.sectionName);
      G.ModifyTransformedHistory &&
        G.PlayingPlaylist &&
        G.ModifyTransformedHistory((thh: any) => thisBot.checkGreyOut(thh));
      if (G.updateCustomHeight) G.updateCustomHeight(0);
      break;
    }
    case "book": {
      // const bookDetails = await openTestamentByBook(dataToNavigate.additionalInfo.bookRank, true);
      // await openSection(bookDetails.section);
      // await openBook(dataToNavigate.additionalInfo.bookName);
      let book = dataToNavigate.additionalInfo.bookName;
      const chapter = 1;
      // const psalmsDivision = [0, 41 , 72, 89, 106, 150];

      if (book === "Psalms" || book === "Psalm") {
        book = getPsalmsBookName(chapter);
      }

      G.SetSelected && G.SetSelected({});
      G.SetHolded && G.SetHolded({});

      await os.sleep(10);

      G.Open(
        dataToNavigate.additionalInfo.data.bookId,
        1,
        dataToNavigate.translationId
      );
      break;
    }
    case "chapter-grouped":
    case "chapter": {
      let book = dataToNavigate.additionalInfo.bookName;
      const chapter =
        dataToNavigate.type === "chapter-grouped"
          ? dataToNavigate.additionalInfo.chapter[0]
          : dataToNavigate.additionalInfo.chapter;
      // const psalmsDivision = [0, 41 , 72, 89, 106, 150];

      if (book === "Psalms" || book === "Psalm") {
        book = getPsalmsBookName(chapter);
      }

      G.SetSelected && G.SetSelected({});
      G.SetHolded && G.SetHolded({});

      await os.sleep(10);

      G.Open(
        dataToNavigate.additionalInfo.data.bookId ||
          dataToNavigate.additionalInfo.data.id,
        chapter,
        dataToNavigate.translationId
      );

      // const bookDetails = await openTestamentByBook(book);
      // await openSection(bookDetails.section);
      // await openBook(book, dataToNavigate.additionalInfo.chapter);
      break;
    }
    case "verse-grouped":
    case "verse": {
      let bookName = dataToNavigate.additionalInfo.book;
      const chapterNo = dataToNavigate.additionalInfo.chapter;
      const verseData = dataToNavigate.additionalInfo.data;

      let { book, chapter, bookId, sectionData, viewer, highlight, ...verse } =
        verseData;

      if (book === "Psalms" || book === "Psalm") {
        book = getPsalmsBookName(chapter);
      }

      // const bookDetails = await openTestamentByBook(book);

      G.SetSelectedVerses && G.SetSelectedVerses([]);
      G.SetHolded && G.SetHolded({});
      if (G.CloseNewList) G.CloseNewList();
      await G.Open(
        dataToNavigate.additionalInfo.data.bookId ||
          dataToNavigate.additionalInfo.chapterData.id ||
          dataToNavigate.additionalInfo.chapterData.bookId,
        chapterNo,
        dataToNavigate.translationId ||
          dataToNavigate.additionalInfo.chapterData.translation
      );
      await os.sleep(20);

      const versesNumber = [];
      const multiVerse: any = {};
      let vNumber = -2;
      if (
        dataToNavigate.type === "verse-grouped" ||
        dataToNavigate.type === "verse-range"
      ) {
        dataToNavigate.additionalInfo.verse.forEach((verseP: number) => {
          if (vNumber === -2) {
            vNumber = verseP;
          }
          versesNumber.push(verseP);
          multiVerse[verseP] = true;
        });
      } else if (!bulkAdd) {
        versesNumber.push(dataToNavigate.additionalInfo.verse);
        // shout("newList", { chapter: chapter, verse, book, bookId, viewer, highlight, setMid: true });
        vNumber = dataToNavigate.additionalInfo.verse;
        multiVerse[dataToNavigate.additionalInfo.verse] = true;
      } else {
        dataItem.forEach((data: any) => {
          if (vNumber === -2) {
            vNumber = data.additionalInfo.verse;
          }
          versesNumber.push(data.additionalInfo.verse);
          multiVerse[data.additionalInfo.verse] = true;
        });
      }

      if (os.device().supportsDOM) {
        setTimeout(() => scrollToVerse(vNumber), 200);
      }

      // if (os.device().supportsDOM) {
      //     const element = globalThis.document;
      //     const verseNumber = verse.verseNumber; // Assume this is provided

      //     // Construct the ID dynamically based on the verse number
      //     const targetElement = element.getElementById(`the-page-verse-${verseNumber}`);

      //     console.log("targetElement", targetElement, globalThis.window, `the-page-verse-${verseNumber}`);

      //     // Check if the element exists, then scroll to it
      //     if (targetElement) {
      //         targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      //     }

      //     globalThis.window.scrollTo({
      //         top: globalThis.document.documentElement.scrollHeight,
      //         behavior: 'smooth'
      //     });

      // }
      if (G.ScrollToVerse) G.ScrollToVerse({ vNumber });
      G.SetSelected && G.SetSelected(multiVerse);
      G.SetHolded && G.SetHolded(multiVerse);
      break;
    }
    default: {
      return;
    }
  }

  thisBot.CloseSelf();
  G.HISTORYExploreMode = initialValue;
}, 75);
