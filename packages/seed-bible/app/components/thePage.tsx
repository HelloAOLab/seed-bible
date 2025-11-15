import { BibleDataManager } from "app.hooks.bibleDataManager";
import { getStyleOf } from "app.styles.styler";
const {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useLayoutEffect,
  useRef,
  createRef,
} = os.appHooks;
import { useMouseMove } from "app.hooks.mouseMove";
import { useTabsContext } from "app.hooks.tabs";
import { useBibleContext } from "app.hooks.bibleVariables";
import { TextFormattingToolbar } from "app.components.textSettings";
import { DivSpliter } from "app.hooks.screenDevider";
import { TextEditor } from "app.components.editor";
import { MiniTextEditor } from "app.components.smallEditor";
import { ConfigurableFunctionCommands } from "app.components.commands";
import { VerseToolbar } from 'app.components.verseToolbar'

function getUserSessionInfo(userId) {
  try {
    if (typeof tags === "undefined" || !tags.sessions) {
      return { inSession: false, role: "none", config: null };
    }

    const sessions = tags.sessions;
    let role = "none";
    let config = null;
    let hostId = null;

    // 1️⃣ Check if user is a host
    if (sessions[userId]) {
      role = "host";
      config = sessions[userId].config || null;
      hostId = userId;
    } else {
      // 2️⃣ Check if user is a co-host or follower in another session
      for (const [hId, sess] of Object.entries(sessions)) {
        if (sess.coHosts?.includes(userId)) {
          role = "coHost";
          config = sess.config || null;
          hostId = hId;
          break;
        }
        if (sess.followers?.includes(userId)) {
          role = "follower";
          config = sess.config || null;
          hostId = hId;
          break;
        }
      }
    }

    const inSession = role !== "none";
    return { inSession, role, config, hostId };
  } catch (err) {
    os.log?.("getUserSessionInfo failed:", err);
    return { inSession: false, role: "none", config: null };
  }
}

function ThePage({
  tab: T,
  setPanalApp,
  panelId,
  setEnableEditor,
  setData,
  data,
}) {
  const [tab, setTab] = useState(T);
  const [commandHighlight, setCommandHighlight] = useState([]);
  const [direction, setDirection] = useState(null);
  const commandsRef = useRef(null);

  useEffect(() => {
    if (!T) globalThis.CurrentPanelAvailable = panelId;
    else globalThis.CurrentPanelAvailable = null;
  }, [T]);
  const { inSession, role, config } = getUserSessionInfo(configBot.id)
  const [tabEntered, setTabEntered] = useState(false);
  const { updateTab, tabs, setActiveTab } = useTabsContext();
  const { isDragging, setIsDragging, Element } = useMouseMove();
  const { navFunctions, setNavFunctions, scrollToVerse } = useBibleContext();
  const [inHold, setInHold] = useState();
  const [contextData, setContextData] = useState({
    verse:
      "And God said, 'Let there be light,' and there was light. And God saw that the light was good, and He separated the light from the darkness. God called the light 'day,' and the darkness He called 'night.' And there was evening, and there was morning—the first day.",
    reference: "Genesis 1:3-5",
    book: "Genesis",
    chapter: 1,
    verses: [3, 4, 5],
  });

  const [selectedText, setSelectedText] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [lastSelectedVerse, setLastSelectedVerse] = useState(null);
  const [highlighted, setHighlighted] = useState({});

  // NEW: State for clicked verses
  const [clickedVerses, setClickedVerses] = useState([]);
  const [clickedVersesContext, setClickedVersesContext] = useState({});
  const [showVerseToolbar, setShowVerseToolbar] = useState(false);

  const [wordHighlights, setWordHighlights] = useState({});
  const [wordHighlightsTC, setWordHighlightsTC] = useState("black");
  const [wordHighlightsBC, setWordHighlightsBC] = useState("#ffeb3b");

  const [bible, setBible] = useState();
  if (tab) globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;

  const loadTranslationFromUrl = async () => {
    console.log(configBot.tags.translationId, "translation id")
    let translationId = configBot.tags.translationId || configBot.tags.translation || tab.data.translation;
    let baseUrl = "https://bible.helloao.org";
    let bookId = "GEN";
    let bookTranslationId = tab.data.translation;
    let firstBookData;
    let firstChapterApiLink;
    let books = [];
    if (translationId) {
      let available_translations_req = await web.get("https://bible.helloao.org/api/available_translations.json");
      let allTranslations = [];
      let translations = {};
      let defaultTranslations = [
        "english",
        "spanish",
        "arabic",
        "hindi",
        "hebrew",
        "ancient greek",
        "custom"
      ]
      allTranslations = available_translations_req.data.translations.map(item => {
        return {
          ...item,
          languageEnglishName: item?.languageEnglishName || item.englishName
        }
      });

      let trValue = {
        pass: false,
        value: null
      };
      if (available_translations_req.status === 200) {
        allTranslations.forEach(translationData => {
          if (translationData.id.toLowerCase() === translationId.toLowerCase()) {
            trValue.pass = true;
            trValue.value = translationData;
          }
        })

        let urlId = translationId.includes("https://");

        if (trValue.pass && !urlId) {
          let bookData = await web.get(`https://bible.helloao.org/api/${trValue.value.id}/books.json`);
          books = bookData.data.books;
          let book0 = bookData.data.books[0];
          firstBookData = book0;
          setTagMask(thisBot, "selectedTranslation", trValue.value, "local");
          setTagMask(thisBot, "booksData", bookData.data.books, "local");
          bookId = book0.id;
          bookTranslationId = trValue.value.id;
          firstChapterApiLink = book0.firstChapterApiLink;
        } else {
          let result = await web.get(translationId);
          if (result.status === 200) {
            const url = new URL(translationId);
            let newTranslations = result.data.translations;
            if (newTranslations.length === 0) {
              configBot.tags.translationId = null;
              configBot.tags.translation = null;
              const translationData = await loadTranslationFromUrl();
              return {
                ...translationData
              }
            }
            let defaultTranslation = newTranslations[0];
            newTranslations = newTranslations.map(trans => {
              return {
                languageEnglishName: trans.languageEnglishName,
                id: trans.id,
                listOfBooksApiLink: `${url.origin}${trans.listOfBooksApiLink}`,
                origin: url.origin,
                shortName: trans.shortName
              }
            })
            allTranslations = [...allTranslations, ...newTranslations];
            for (let translation of newTranslations) {
              let englishName = translation.languageEnglishName.toLowerCase();
              if (!defaultTranslations.includes(englishName)) {
                defaultTranslations.push(englishName);
              }
            }
            let translation = {
              languageEnglishName: defaultTranslation.languageEnglishName,
              id: defaultTranslation.id,
              listOfBooksApiLink: `${url.origin}${defaultTranslation.listOfBooksApiLink}`,
              origin: url.origin,
              shortName: defaultTranslation.shortName
            }
            let englishName = translation.languageEnglishName.toLowerCase();
            let shortName = translation.shortName.toLowerCase();

            let bookData = await web.get(translation.listOfBooksApiLink);

            books = bookData.data.books;
            let book0 = bookData.data.books[0];
            firstBookData = book0;
            setTagMask(thisBot, "selectedTranslation", translation, "local");
            setTagMask(thisBot, "booksData", bookData.data.books, "local");
            if (!defaultTranslations.includes(englishName)) {
              defaultTranslations.push(englishName)
              translations[englishName] = {
                [shortName]: translation
              }
            }
            baseUrl = translation.origin;
            bookId = book0.id;
            bookTranslationId = translation.id;
            firstChapterApiLink = book0.firstChapterApiLink;
          }
        }
        allTranslations.forEach(translation => {
          let englishName = translation?.languageEnglishName?.toLowerCase() || translation?.englishName?.toLowerCase();
          let shortName = translation.shortName.toLowerCase();
          if (translations[englishName]) {
            if (!translations[englishName][shortName]) {
              translations[englishName][shortName] = translation;
            }
          } else {
            translations[englishName] = {
              [shortName]: translation
            }
          }
        })
        setTagMask(thisBot, "allTranslations", allTranslations, "local");
        setTagMask(thisBot, "apiTranslations", { ...translations }, "local")
        setTagMask(thisBot, "defaultTranslations", defaultTranslations, "local")
        console.log(defaultTranslations, translations, "trans")
      }
    } else {
      return {}
    }
    return {
      baseUrl,
      bookId,
      bookTranslationId,
      firstChapterApiLink,
      firstBookData,
      books
    }
  }

  async function loadData() {
    if (!tab) return;
    const bible = new BibleDataManager({
      tabId: tab?.id,
      translation: tab.data.translation,
      bookId: tab.data.bookId,
      chapter: tab.data.chapter
    });
    setBible(bible);

    console.log("bible data: ", bible);

    await bible.fetch();

    globalThis.BookId = bible.bookId;

    const { data, loading, error } = bible.getState();
    console.log(data, tab, "the data loaded");

    globalThis.refreshScrollers && globalThis.refreshScrollers();
    let { firstBookData, bookTranslationId, baseUrl, books } = await loadTranslationFromUrl();

    if (!configBot.tags.defaultChecked) {
      if (firstBookData && bookTranslationId && baseUrl) {
        await bible.changeTranslation(bookTranslationId, firstBookData, baseUrl)
      }
      if (books) {
        if (configBot.tags?.book && books && books?.length > 0) {
          let bookData;
          books.forEach(book => {
            if (book.id.toLowerCase() === configBot.tags.book.toLowerCase()) {
              bookData = book;
            }
          })
          if (bookData) {
            let chapterNo;
            if (Number(configBot.tags.chapter) < bookData.numberOfChapters) chapterNo = configBot.tags.chapter;
            let chapterUrl = chapterNo ? bookData.firstChapterApiLink.replace("1.json", `${chapterNo}.json`) : bookData.firstChapterApiLink.replace("1.json", `${tab.data.chapter}.json`);
            await bible.open(
              bookData.id,
              configBot.tags.chapter || 1,
              bookTranslationId,
              chapterUrl
            );
          }
        } else if (configBot.tags?.chapter && books?.length > 0) {
          let bookData;
          books.forEach(book => {
            if (book.id.toLowerCase() === tab.data.bookId.toLowerCase()) {
              bookData = book;
            }
          })
          let chapterNo;
          if (Number(configBot.tags.chapter) < bookData.numberOfChapters) chapterNo = configBot.tags.chapter;
          let chapterUrl = chapterNo ? bookData.firstChapterApiLink.replace("1.json", `${chapterNo}.json`) : bookData.firstChapterApiLink.replace("1.json", `${tab.data.chapter}.json`);
          await bible.open(
            bookData.id,
            configBot.tags.chapter || 1,
            bookTranslationId,
            chapterUrl
          );
        }
      } else {
        if (configBot.tags?.book) {
          await bible.open(configBot.tags?.book, configBot.tags?.chapter || tab.data.chapter);
        } else if (configBot.tags?.chapter) {
          await bible.open(tab.data.book, configBot.tags?.chapter);
        }
      }
      configBot.tags.defaultChecked = true;
    } else {
      if (masks?.allTranslations) {
        for (let translation of masks.allTranslations) {
          if (translation.id === tab.data.translation) {
            setTagMask(thisBot, "selectedTranslation", translation, "local");
            break
          }
        }
      }
    }

    setData(bible.data);
    whisper(getBot('system', 'introduction.searchBar'), 'initialize')
  }
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setClickedVerses([]);
        setShowVerseToolbar(false)
      };
    };
    if (window) {
      window.addEventListener("keydown", onKey);
    }
    return () => {
      if (window) {
        window.removeEventListener("keydown", onKey);
      }
    };
  }, []);
  useEffect(() => {
    const onBookChange = (data) => {
      os.log("updated shared tab", 'not approved');
      if (!globalThis.CurrentTab?.sharedTab) {
        updateTab(masks['sharedTab'], data)
        return
      };
      console.log("remoteBookChange", data);
      globalThis.Open?.(data.bookId, data.chapter);
    };

    const onHighlightChange = (data) => {
      if (!globalThis.CurrentTab?.sharedTab) return;
      console.log("remoteHighlightChange", data);
      globalThis.ToggleVerseHighlight?.(
        data?.verseNumbers,
        data?.color,
        data?.scroll,
        data?.fadeIn,
        true
      );
    };
    os.addBotListener(thisBot, "remoteBookChange", onBookChange)
    os.addBotListener(thisBot, "remoteHighlightChange", onHighlightChange)
    return () => {
      // os.removeBotListener(thisBot, 'remoteBookChange', onBookChange)
      // os.removeBotListener(thisBot, 'remoteHighlightChange', onHighlightChange)
    }
  }, []);

  useEffect(() => {
    loadData();
    globalThis.CurrentTab = tab
  }, []);

  useEffect(() => {
    if (data) {
      //  EmitData("book", { ...data });
      hanldNavFunctions();
      SetShowCommands(false);
      updateTab(tab?.id, data);
      if (config && !config?.sharedTab && role === 'host' && masks['sharedTab'] !== tab.id) {
        updateTab(tab?.id, data);
        updateTab(masks['sharedTab'], data);
      }
      if (role === 'host')
        EmitData("book", { ...data });
      if (panelId && tab) {
        os.log("recoreded", panelId, {
          ...tab,
          data: { ...tab.data, ...data },
        });
        globalThis.PanelTabsMap[panelId] = {
          ...tab,
          data: { ...tab.data, ...data },
        };
      }
      os.log("bookdata", data);
      if (data.translation === "ARBNAV" || data.translation === "arb_vdv") {
        setDirection("rtl");
      } else {
        setDirection(null);
      }
      if (masks['sharedTab'] === tab.id)
        EmitData("book", { ...data });
      // const emitter = getBot("system", "app.emitter");
      // sendRemoteData(emitter.masks.otherRemotes, "updateSharingData", {
      //   id: tab?.id,
      //   bookId: data?.bookId,
      //   book: data?.book,
      //   chapter: data?.chapter,
      // });
      const emitter = getBot("system", "app.emitter");

      sendRemoteData(emitter.masks.otherRemotes, "updateSharingData", {
        id: tab?.id,
        bookId: data?.bookId,
        book: data?.book,
        chapter: data?.chapter,
      });
      configBot.tags.book = data?.bookId;
      configBot.tags.chapter = data?.chapter;
    }
  }, [data]);
  useEffect(() => {
    // Create the interval
    const interval = setInterval(() => {
      if (data) {

        const emitter = getBot("system", "app.emitter");

        sendRemoteData(emitter.masks.otherRemotes, "updateSharingData", {
          id: tab?.id,
          bookId: data?.bookId,
          book: data?.book,
          chapter: data?.chapter,
        });
      }
    }, 1000);
    globalThis.CurrentTab = tab
    return () => clearInterval(interval);
  }, [data]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      const emitter = getBot("system", "app.emitter");
      sendRemoteData(emitter.masks.otherRemotes, "personLeftTheChat", {
        id: tab?.id,
        bookId: data?.bookId,
        book: data?.book,
        chapter: data?.chapter,
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  async function checkDefault() {
    if (
      configBot.tags.book &&
      configBot.tags.chapter & !configBot.tags.defaultChecked
    ) {
      await os.sleep(1000);
      await bible.open(
        configBot.tags.book.toUpperCase(),
        configBot.tags.chapter,
        configBot.tags.translation || "BSB"
      );
      setData(bible.data);
      configBot.tags.defaultChecked = true;
    }
  }

  useEffect(() => {
    globalThis.NavFunctions = navFunctions;
    globalThis.BibleData = data;
    // checkDefault();
    return () => {
      globalThis.BibleData = null;
      globalThis.NavFunctions = navFunctions;
    };
  }, [navFunctions, data]);

  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedRange = selection.getRangeAt(0);
      const container =
        selectedRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? selectedRange.commonAncestorContainer.parentElement
          : selectedRange.commonAncestorContainer;

      if (commandsRef.current && commandsRef.current.contains(container)) {
        setShowCommands(true);
        return;
      }

      const treeWalker = document.createTreeWalker(
        selectedRange.commonAncestorContainer,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            if (
              node.classList?.contains("sectionText") &&
              selectedRange.intersectsNode(node)
            ) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          },
        }
      );

      const selectedVerses = new Set();

      let currentNode = treeWalker.nextNode();
      while (currentNode) {
        const verseNumberElem = currentNode.querySelector(".sectionTextNumber");
        if (verseNumberElem) {
          const verseNum = parseInt(verseNumberElem.textContent);
          if (!isNaN(verseNum)) {
            selectedVerses.add(verseNum);
          }
        }
        currentNode = treeWalker.nextNode();
      }

      if (selectedVerses.size > 0) {
        const selectedArray = Array.from(selectedVerses).sort((a, b) => a - b);
        console.log("Selected verse numbers:", selectedArray);
        setSelectedText(selection.toString());
        setLastSelectedVerse(selectedArray[selectedArray.length - 1]);
        setContextData({
          verse: window.getSelection().toString(),
          reference: `${data?.book} ${data?.chapter}:${selectedArray[0]}-${selectedArray[selectedArray.length - 1]
            }`,
          book: data?.book,
          chapter: data?.chapter,
          verses: selectedArray,
        });
        shout("onVeresRightClick", {
          verseNumber: selectedArray,
          text: window.getSelection().toString(),
          book: data?.book,
          chapter: data?.chapter,
          highlighted: false,
        });

      } else {
        setShowCommands(false);
        setSelectedText("");
        setLastSelectedVerse(null);
      }
    };
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [data]);

  function handleMouseEnter() {
    if (!isDragging) return;
    setTabEntered(true);
  }

  function handleMouseLeave() {
    if (!isDragging) return;
    setTabEntered(false);
  }

  function handleMouseUp() {
    if (!isDragging) return;
    console.log(Element.data, "El.data");
    if (Element?.data?.data?.pkgApp) {
      const handoff = Element?.data?.data;
      const App = handoff.app;
      const id = uuid();
      ReplaceApplication(panelId, { id, App, to: "panel", minWidth: "30rem" });
      console.log("replaced");
    } else {
      Update(Element.data);
      if (globalThis.GetBooksDataForMenu)
        globalThis.GetBooksDataForMenu(
          `https://bible.helloao.org/api/${Element.data.data.translation}/books.json`,
          Element.data.data.translation
        );
    }
    setIsDragging(false);
    setTabEntered(false);
  }

  async function openNextChapter() {
    await bible.openNext();
    setData(bible.data);

    globalThis.GlobalChapter = bible.data.chapter - 1;

    if (globalThis.studyNotesPresent) {
      UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
        App: (
          <StudyNotes
            id={globalThis.STUDYNOTES_PANEL_ID}
            chapter={globalThis.GlobalChapter}
          />
        ),
        to: "panel",
      });
    }
  }

  async function openPrevChapter() {
    await bible.openPrevious();
    setData(bible.data);

    globalThis.GlobalChapter = bible.data.chapter - 1;

    if (globalThis.studyNotesPresent) {
      UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
        App: (
          <StudyNotes
            id={globalThis.STUDYNOTES_PANEL_ID}
            chapter={globalThis.GlobalChapter}
          />
        ),
        to: "panel",
      });
    }
  }

  async function open(bookId, chapter, translation = null, chapterUrl = null) {
    try {
      await bible.open(bookId, chapter, (translation = null), chapterUrl);
      setData(bible.data);
    } catch {
      const tab = globalThis.AddTab({
        id: uuid(),
        taken: false,
        data: {
          use: "thePage",
          type: "book",
          book: bookId,
          bookId: bookId,
          chapter: chapter,
          translation: translation || "BSB",
        },
      });
      setTab(tab);
      setData(bible.data);
    }

  }

  async function changeTranslation(id, bookData, forcedBaseUrl) {
    await bible.changeTranslation(id, bookData, forcedBaseUrl);
    setData(bible.data);
  }

  const highlightWords = useCallback(
    (config) => {
      if (!tab?.id) return;

      const targetBook = config.book == null ? data?.book : config.book;
      const targetChapter =
        config.chapter == null ? data?.chapter : config.chapter;

      let targetVerses = [];
      if (config.verse == null) {
        const content = data?.content || [];
        content.forEach(({ verses }) => {
          verses.forEach((v) => {
            if (typeof v?.verseNumber === "number")
              targetVerses.push(v.verseNumber);
          });
        });
      } else if (Array.isArray(config.verse)) {
        targetVerses = config.verse;
      } else {
        targetVerses = [config.verse];
      }

      if (!targetVerses.length) return;

      const wordsToAdd = (config.words || []).filter(Boolean);
      if (!wordsToAdd.length) return;

      setWordHighlights((prev) => {
        const newHighlights = { ...prev };

        if (!globalThis.wordHighlights) globalThis.wordHighlights = {};
        if (!globalThis.wordHighlights[tab?.id])
          globalThis.wordHighlights[tab?.id] = {};

        targetVerses.forEach((vn) => {
          const key = `${targetBook}-${targetChapter}-${vn}`;
          if (!newHighlights[key]) newHighlights[key] = {};

          wordsToAdd.forEach((word) => {
            const wordKey = String(word).toLowerCase();
            newHighlights[key][wordKey] = {
              color: config.color || "#000",
              backgroundColor: config.backgroundColor || "#ffeb3b",
              onClick: config.onClick || null,
              timestamp: Date.now(),
              createAttributes: config?.createAttributes
                ? config.createAttributes
                : () => {
                  return {};
                },
            };
          });
        });

        globalThis.wordHighlights[tab?.id] = newHighlights;
        return newHighlights;
      });
    },
    [data, tab?.id]
  );

  const removeWordHighlight = useCallback(
    (config) => {
      if (!tab?.id) return;

      setWordHighlights((prev) => {
        const newHighlights = { ...prev };
        const key = `${config.book}-${config.chapter}-${config.verse}`;

        if (!newHighlights[key]) return prev;

        if (config.words) {
          config.words.forEach((word) => {
            const wordKey = word.toLowerCase();
            delete newHighlights[key][wordKey];
          });

          if (Object.keys(newHighlights[key]).length === 0) {
            delete newHighlights[key];
          }
        } else {
          delete newHighlights[key];
        }

        if (globalThis.wordHighlights) {
          globalThis.wordHighlights[tab?.id] = newHighlights;
        }

        return newHighlights;
      });
    },
    [data]
  );

  const clearAllWordHighlights = useCallback(() => {
    setWordHighlights({});
    if (globalThis.wordHighlights && tab?.id) {
      delete globalThis.wordHighlights[tab?.id];
    }
  }, [data]);

  useEffect(() => {
    globalThis.HighlightWords = highlightWords;
    globalThis.RemoveWordHighlight = removeWordHighlight;
    globalThis.ClearAllWordHighlights = clearAllWordHighlights;
    shout("onBookChanged", { ...data, tabId: tab?.id });
    clearAllVerseHighlights();
    // os.log("clearAllVerseHighlights", clearAllVerseHighlights);
    if (data && JSON.stringify(tab?.data) !== JSON.stringify(data)) {
      setTab(prev => ({ ...prev, data }))
    }
  }, [data]);

  function hanldNavFunctions() {
    if (tab && tab?.id) setActiveTab(tab?.id);
    setNavFunctions({
      openNextChapter,
      openPrevChapter,
      open,
      changeTranslation: bible?.changeTranslation || undefined,
      setPanalApp: () => { },
    });
    globalThis.Open = open;
    globalThis.ChangeTranslation = changeTranslation;
    globalThis.SetPanalApp = () => { };
    globalThis.ToggleVerseHighlight = toggleVerseHighlight;
    globalThis.UnHighlightVerse = unHighlightVerse;
    globalThis.HighlightVerse = highlightVerse;
    globalThis.SetWordHighlightsTC = setWordHighlightsTC;
    globalThis.SetWordHighlightsBC = setWordHighlightsBC;
    globalThis.SetInHold = setInHold;
    globalThis.SetShowCommands = setShowCommands;

    globalThis.HighlightWords = highlightWords;
    globalThis.RemoveWordHighlight = removeWordHighlight;
    globalThis.ClearAllWordHighlights = clearAllWordHighlights;

    globalThis.GlobalChapter = (data?.chapter || 1) - 1;

    if (globalThis.studyNotesPresent) {
      UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
        App: (
          <StudyNotes
            id={globalThis.STUDYNOTES_PANEL_ID}
            chapter={globalThis.GlobalChapter}
          />
        ),
        to: "panel",
      });
    }
  }

  function Update(tab) {
    os.log("Update-data", tab);
    setTab(tab);
    hanldNavFunctions();
  }
  globalThis.UpdateTab = Update;

  const [blinker, setBlinker] = useState({});
  const [selected, setSelected] = useState({});
  const [holded, setHolded] = useState({});

  useEffect(() => {
    setInHold(null);
    scrollToVerse(1);
    if (globalThis.SetCurrentBook) {
      globalThis.SetCurrentBook(data);
      globalThis.CHAPTER_DATA = {
        ...data,
      };
    }
    globalThis.CurrentBookData = { ...data };
  }, [data]);

  useEffect(() => {
    globalThis.SetBlinker = setBlinker;
    globalThis.SetSelected = setSelected;
    globalThis.SetHolded = setHolded;
    return () => {
      globalThis.SetBlinker = null;
      globalThis.SetSelected = null;
      globalThis.SetHolded = null;
    };
  }, [blinker, selected, holded]);

  const refs = useMemo(() => {
    const refs = {};
    if (data && data.content)
      data.content.forEach(({ verses }) => {
        verses.forEach((verse) => {
          refs[verse.verseNumber] = createRef();
        });
      });
    return refs;
  }, [data]);

  const onScrollToRef = useCallback(
    ({ vNumber = -1 }) => {
      if (globalThis.ScrollTimerToVerse) {
        clearTimeout(globalThis.ScrollTimerToVerse);
        globalThis.ScrollTimerToVerse = null;
      }

      globalThis.ScrollTimerToVerse = setTimeout(() => {
        if (refs?.[vNumber].current) {
          refs?.[vNumber]?.current?.focus();
        }
      }, 100);
    },
    [refs]
  );

  useEffect(() => {
    globalThis.ScrollToVerse = onScrollToRef;
    return () => {
      globalThis.ScrollToVerse = null;
    };
  }, [onScrollToRef]);

  useEffect(() => {
    if (!globalThis.wordHighlights) {
      globalThis.wordHighlights = {};
    }
    if (tab?.id && globalThis.wordHighlights[tab?.id]) {
      setWordHighlights(globalThis.wordHighlights[tab?.id]);
    }
  }, [tab?.id]);

  const [highlightOnce, setHighlightOnce] = useState(false);

  useEffect(() => {
    if (!globalThis.tabHighlights) {
      globalThis.tabHighlights = {};
    }
    if (tab?.id && !globalThis.tabHighlights[tab?.id]) {
      globalThis.tabHighlights[tab?.id] = {};
    }

    if (tab?.id && globalThis.tabHighlights[tab?.id]) {
      setHighlighted(globalThis.tabHighlights[tab?.id]);
    }

    globalThis.SetHighlighted = setHighlighted;

    return () => {
      globalThis.SetHighlighted = null;
    };
  }, [tab?.id, highlighted]);

  const clearAllVerseHighlights = useCallback(() => {
    setHighlighted({});
    setCommandHighlight([]);

    if (!globalThis.tabHighlights) globalThis.tabHighlights = {};
    if (tab?.id) globalThis.tabHighlights[tab.id] = {};

    shout("onAllVerseHighlightsCleared", {
      tabId: tab?.id,
      book: data?.book,
      chapter: data?.chapter,
    });
  }, [tab?.id, data?.book, data?.chapter]);


  const toggleVerseHighlight = useCallback(
    (verseNumbers, color, scroll, fadeIn, skipIt) => {
      // if (!skipIt)
      //   return
      if (!tab?.id) return;
      EmitData("highlight", { verseNumbers, color });

      const verseId = `v-${Array.isArray(verseNumbers)
        ? verseNumbers[verseNumbers.length - 1]
        : verseNumbers}`;

      if (scroll)
        document.getElementById(verseId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

      const numbers = Array.isArray(verseNumbers) ? verseNumbers : [verseNumbers];

      setHighlighted((prev) => {
        const newHighlighted = { ...prev };
        const allHighlighted = numbers.every((vn) => newHighlighted[vn]);
        const groupId = Date.now();

        if (allHighlighted) {
          numbers.forEach((vn) => delete newHighlighted[vn]);
        } else {
          numbers.forEach((vn) => {
            newHighlighted[vn] = {
              timestamp: groupId,
              book: data?.book,
              chapter: data?.chapter,
              group: groupId,
              color: color || wordHighlightsBC,
            };
          });
        }

        if (!globalThis.tabHighlights) globalThis.tabHighlights = {};
        globalThis.tabHighlights[tab?.id] = newHighlighted;

        if (fadeIn || tags?.sessions[configBot.id]?.config.highlightDuration) {
          let duration = 0;
          if (tags?.sessions[configBot.id]?.config.highlightDuration)
            fadeIn = tags?.sessions[configBot.id]?.config.highlightDuration
          if (fadeIn === 4) {
            duration = 0; // Never remove highlight
          } else if (typeof fadeIn === "number") {
            duration = fadeIn * 1000; // Convert seconds to ms
          }

          if (duration > 0) {
            setTimeout(() => {
              setHighlighted((prevFade) => {
                const faded = { ...prevFade };
                numbers.forEach((vn) => delete faded[vn]);
                globalThis.tabHighlights[tab?.id] = faded;
                return faded;
              });
            }, duration);
          }
        }

        return newHighlighted;
      });
    },
    [tab?.id, data, data?.book, data?.chapter]
  );


  const highlightVerse = useCallback(
    (verseNumbers, color, scroll, fadeIn, skipIt) => {
      // if (!skipIt)
      //   return
      if (!tab?.id) return;
      EmitData("highlight", { verseNumbers, color });

      const verseId = `v-${Array.isArray(verseNumbers)
        ? verseNumbers[verseNumbers.length - 1]
        : verseNumbers}`;

      if (scroll)
        document.getElementById(verseId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

      const numbers = Array.isArray(verseNumbers) ? verseNumbers : [verseNumbers];

      setHighlighted((prev) => {
        const newHighlighted = { ...prev };
        const groupId = Date.now();

        numbers.forEach((vn) => {
          newHighlighted[vn] = {
            timestamp: groupId,
            book: data?.book,
            chapter: data?.chapter,
            group: groupId,
            color: color || wordHighlightsBC,
          };
        });

        if (!globalThis.tabHighlights) globalThis.tabHighlights = {};
        globalThis.tabHighlights[tab?.id] = newHighlighted;

        if (fadeIn || tags?.sessions[configBot.id]?.config.highlightDuration) {
          let duration = 0;
          if (tags?.sessions[configBot.id]?.config.highlightDuration)
            fadeIn = tags?.sessions[configBot.id]?.config.highlightDuration
          if (fadeIn === 4) {
            duration = 0; // Never remove highlight
          } else if (typeof fadeIn === "number") {
            duration = fadeIn * 1000; // Convert seconds to ms
          }

          if (duration > 0) {
            setTimeout(() => {
              setHighlighted((prevFade) => {
                const faded = { ...prevFade };
                numbers.forEach((vn) => delete faded[vn]);
                globalThis.tabHighlights[tab?.id] = faded;
                return faded;
              });
            }, duration);
          }
        }

        return newHighlighted;
      });
    },
    [tab?.id, data, data?.book, data?.chapter]
  );

  const unHighlightVerse = useCallback(
    (verseNumbers) => {
      if (!tab?.id) return;
      EmitData("highlight", { verseNumbers });

      const verseId = `v-${typeof verseNumbers === "object"
        ? verseNumbers[verseNumbers.length - 1]
        : verseNumbers
        }`;

      document.getElementById(verseId).scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });

      const numbers = Array.isArray(verseNumbers)
        ? verseNumbers
        : [verseNumbers];

      setHighlighted((prev) => {
        const newHighlighted = { ...prev };

        const allHighlighted = numbers.every((vn) => newHighlighted[vn]);

        if (allHighlighted) {
          numbers.forEach((vn) => {
            delete newHighlighted[vn];
          });
        }

        if (!globalThis.tabHighlights) {
          globalThis.tabHighlights = {};
        }
        globalThis.tabHighlights[tab?.id] = newHighlighted;

        return newHighlighted;
      });
    },
    [tab?.id, data, data?.book, data?.chapter]
  );

  useEffect(() => {
    if (showCommands) {
      setCommandHighlight(contextData.verses);
    } else {
      setCommandHighlight([]);
    }
  }, [showCommands]);

  function clearUserSelection() {
    if (window.getSelection) {
      const selection = window.getSelection();
      if (selection.empty) {
        selection.empty();
      } else if (selection.removeAllRanges) {
        selection.removeAllRanges();
      }
    } else if (document.selection) {
      document.selection.empty();
    }
  }
  globalThis.ClearUserSelection = clearUserSelection;

  // NEW: Handle verse clicks
  const handleVerseClick = useCallback((verseNumber) => {
    setClickedVerses(prev => {
      const isAlreadyClicked = prev.includes(verseNumber);
      if (isAlreadyClicked) {
        // Remove verse from clicked list
        const newClicked = prev.filter(v => v !== verseNumber);
        if (newClicked.length === 0) {
          setShowVerseToolbar(false);
          setClickedVersesContext({});
        } else {
          // Update context with remaining clicked verses
          const remainingVerseObjects = newClicked.map(v => {
            const verseObj = data?.content?.flatMap(c => c.verses).find(vv => vv.verseNumber === v);
            return {
              verseNumber: v,
              text: verseObj?.text || "",
              book: data?.book,
              chapter: data?.chapter,
              highlighted: !!highlighted?.[v],
            };
          });
          setClickedVersesContext({
            verses: newClicked,
            book: data?.book,
            chapter: data?.chapter,
            verseNumber: newClicked,
            reference: `${data?.book} ${data?.chapter}:${newClicked.join(",")}`,
            text: remainingVerseObjects.map(o => o.text).join(" "),
          });
        }
        return newClicked;
      } else {
        // Add verse to clicked list
        const newClicked = [...prev, verseNumber];
        const verseObj = data?.content?.flatMap(c => c.verses).find(v => v.verseNumber === verseNumber);

        // Build context data like onVeresRightClick
        const context = {
          verseNumber: newClicked,
          text: newClicked.map(v => {
            const vo = data?.content?.flatMap(c => c.verses).find(vv => vv.verseNumber === v);
            return vo?.text || "";
          }).join(" "),
          book: data?.book,
          chapter: data?.chapter,
          highlighted: !!highlighted?.[verseNumber],
        };

        setClickedVersesContext(context);
        setShowVerseToolbar(true);
        return newClicked;
      }
    });
  }, [data, highlighted]);


  // NEW: Handle color selection from toolbar
  const handleColorSelect = useCallback((color) => {
    if (clickedVerses.length === 0) return;
    setWordHighlightsBC(color)
    // Apply the selected color to all clicked verses
    clickedVerses.forEach(verseNum => {
      toggleVerseHighlight(verseNum, color);
    });

    // Clear clicked verses and hide toolbar
    setClickedVerses([]);
    setShowVerseToolbar(false);
  }, [clickedVerses, toggleVerseHighlight]);

  // NEW: Close toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showVerseToolbar && !e.target.closest('.verse-toolbar') && !e.target.closest('.sectionText') && !e.target.closest('.sectionCover') && !e.target.closest('.sectionTitle')) {
        setClickedVerses([]);
        setShowVerseToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showVerseToolbar]);

  return (
    <div
      className="pageContainer"
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      onClick={hanldNavFunctions}
      style={{
        direction
      }}
    >
      <style>
        {`
        .pageContainer{
          position: relative;
        }
        .toolbar-1 {
          display:${showVerseToolbar ? 'none !important' : ''}
        }
        .bookTitle,
        .sectionTitle {
          display:${direction ? "ruby" : null}
        }

        .verse-clicked {
          border-bottom: 2px dashed #4459F3 !important;
          padding: 2px 4px !important;
          border-radius: 3px !important;
        }
         `}
      </style>
      {data && tab && !tabEntered ? (
        <>
          <div
            style={{ "pointer-events": isDragging ? "none" : null }}
            className="bookTitle"
          >{`${data?.book} ${data?.chapter}`}</div>
          {data &&
            data.content.map((e) => {
              return (
                <>
                  <div style={{ "pointer-events": isDragging ? "none" : null }}>
                    <Section
                      {...e}
                      inHold={inHold}
                      setInHold={setInHold}
                      book={data.book}
                      chapter={data.chapter}
                      blinker={blinker}
                      setRef={refs}
                      holded={holded}
                      selected={selected}
                      highlighted={highlighted}
                      wordHighlights={wordHighlights}
                      textEdit={false}
                      showCommands={showCommands}
                      setShowCommands={setShowCommands}
                      selectedText={selectedText}
                      lastSelectedVerse={lastSelectedVerse}
                      contextData={contextData}
                      setContextData={setContextData}
                      commandsRef={commandsRef}
                      setLastSelectedVerse={setLastSelectedVerse}
                      setCommandHighlight={setCommandHighlight}
                      commandHighlight={commandHighlight}
                      wordHighlightsTC={wordHighlightsTC}
                      wordHighlightsBC={wordHighlightsBC}
                      clickedVerses={clickedVerses}
                      handleVerseClick={handleVerseClick}
                    />
                  </div>
                </>
              );
            })}
          <div style={{ height: "40px" }}></div>
          <div
            style={{
              margin: "auto",
              width: "80%",
              height: "1px",
              background: "gray",
            }}
          ></div>
          <div
            style={{
              width: "50%",
              display: "flex",
              "align-items": "center",
              "justify-content": "center",
              position: "relative",
            }}
          >
            <PageToolbar />
          </div>
          <div style={{ height: "160px" }}></div>

          {showVerseToolbar && !(role === 'follower' && config.onlyHostHighlight) && (
            <VerseToolbar
              clickedVerses={clickedVerses}
              toggleVerseHighlight={toggleVerseHighlight}
              book={data?.book}
              setClickedVerses={setClickedVerses}
              chapter={data?.chapter}
              highlighted={highlighted}
              clickedVersesContext={clickedVersesContext}
              onColorSelect={handleColorSelect}
              onClose={() => {
                setClickedVerses([]);
                setShowVerseToolbar(false);
              }}
            />
          )}
        </>
      ) : (
        <>
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f8f9fa",
            }}
            className={`pageContainer ${tabEntered ? "tabEntered" : "tabDrop"
              } ${highlightOnce ? "tabHighlightBg" : ""}`}
          >
            <div
              style={{
                pointerEvents: isDragging ? "none" : undefined,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "40px",
                borderRadius: "12px",
                maxWidth: "400px",
                width: "90%",
              }}
            >
              <div
                onClick={() => {
                  setOpenSidebar((prev) => !prev);
                  setCurrentExperience(0);
                }}
                style={{
                  fontSize: "24px",
                  marginBottom: "20px",
                  color: "#333",
                }}
              >
                <img
                  style={{ width: "50px" }}
                  src="https://res.cloudinary.com/dfbtwwa8p/image/upload/v1755365776/717a8527988cca7e0bdc9449ec68581a8400b977_vqc7mx.png"
                />
              </div>

              <div
                style={{
                  width: "80%",
                  height: "1px",
                  background: "#e0e0e0",
                  marginTop: "40px",
                  margin: "auto",
                }}
              ></div>
              <div
                style={{
                  width: "100%",
                  marginTop: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <PageToolbar path="showInStarterToolbar" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageToolbar({ path = "showInPageToolbar" }) {
  const { tools } = useBibleContext();

  const visibleTools = tools.filter((tool) => tool[path]);
  if (visibleTools.length === 0) return null;

  return (
    <div className="thePageToolbar">
      {visibleTools.map((tool) => (
        <div
          onClick={tool.onClick}
          className="tool-preview-page"
          key={tool.label}
        >
          {tool.isImg ? (
            <img
              src={tool.icon}
              style={{ width: "24px", height: "24px", objectFit: "contain" }}
              alt={tool.label}
            />
          ) : (
            <span className="material-symbols-outlined">{tool.icon}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function splitBySectionKeys(text, verseSectionMap) {
  const stripRe = /[.,'"""'']/g;

  const subphraseMap = {};
  let maxLen = 1;

  Object.keys(verseSectionMap).forEach((fullKey) => {
    const normalized = fullKey.replace(stripRe, "").trim();
    const wordsKey = normalized.split(/\s+/);
    const n = wordsKey.length;
    maxLen = Math.max(maxLen, n);

    if (n === 1) {
      subphraseMap[normalized] = fullKey;
    } else {
      for (let L = n; L >= 2; L--) {
        for (let start = 0; start + L <= n; start++) {
          const phrase = wordsKey.slice(start, start + L).join(" ");
          subphraseMap[phrase] = fullKey;
        }
      }
    }
  });

  const words = text.split(/\s+/);
  const norm = words.map((w) => w.replace(stripRe, ""));

  const chunks = [];
  let i = 0;
  while (i < words.length) {
    let matchLen = 0,
      matchKey = null;

    const limit = Math.min(maxLen, words.length - i);
    for (let L = limit; L >= 1; L--) {
      const slice = norm.slice(i, i + L).join(" ");
      if (subphraseMap[slice]) {
        matchKey = subphraseMap[slice];
        matchLen = L;
        break;
      }
    }

    if (matchLen > 0) {
      chunks.push({
        text: words.slice(i, i + matchLen).join(" "),
        isSection: true,
        key: matchKey,
      });
      i += matchLen;
    } else {
      const w = words[i++];
      if (chunks.length && !chunks[chunks.length - 1].isSection) {
        chunks[chunks.length - 1].text += " " + w;
      } else {
        chunks.push({ text: w, isSection: false });
      }
    }
  }

  return chunks;
}

function splitByWordHighlights(
  text,
  wordHighlights,
  book,
  chapter,
  verseNumber,
  wordHighlightsTC,
  wordHighlightsBC
) {
  if (!wordHighlights || Object.keys(wordHighlights).length === 0) {
    return [{ text, isHighlighted: false }];
  }

  const verseKey = `${book}-${chapter}-${verseNumber}`;
  const highlights = wordHighlights[verseKey];

  if (!highlights || Object.keys(highlights).length === 0) {
    return [{ text, isHighlighted: false }];
  }

  const highlightWords = Object.keys(highlights);
  if (highlightWords.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  highlightWords.sort((a, b) => b.length - a.length);

  const pattern = new RegExp(
    `\\b(${highlightWords
      .map((word) => word.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&"))
      .join("|")})\\b`,
    "gi"
  );

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isHighlighted: false,
      });
    }

    const matchedWord = match[1].toLowerCase();
    parts.push({
      text: match[1],
      isHighlighted: true,
      highlightConfig: highlights[matchedWord],
    });

    lastIndex = match.index + match[1].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isHighlighted: false,
    });
  }

  return parts;
}

function Section({
  heading,
  hebrew_subtitle,
  commandHighlight,
  setCommandHighlight,
  setLastSelectedVerse,
  setRef,
  commandsRef,
  setContextData,
  contextData,
  verses,
  book,
  chapter,
  holded,
  blinker,
  selected,
  highlighted,
  wordHighlights,
  textEdit,
  setInHold,
  inHold,
  showCommands,
  setShowCommands,
  selectedText,
  lastSelectedVerse,
  wordHighlightsTC,
  wordHighlightsBC,
  clickedVerses,
  handleVerseClick,
}) {
  const stripRe = /[.,'"""'']/g;
  const normalize = (k) => k.replace(stripRe, "").toLowerCase().trim();

  const [activeKey, setActiveKey] = useState(
    globalThis.HighlightedSectionKey || ""
  );
  const [activeVerse, setActiveVerse] = useState(
    globalThis.HighlightedVerseNumber || ""
  );

  const verseRefs = useMemo(() => {
    const m = {};
    verses.forEach((v) => {
      m[v.verseNumber] = createRef();
    });
    return m;
  }, [verses]);

  useEffect(() => {
    const handler = () => {
      setActiveKey(globalThis.HighlightedSectionKey || "");
    };
    window.addEventListener("highlightedSectionKeyChanged", handler);
    return () =>
      window.removeEventListener("highlightedSectionKeyChanged", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      setActiveVerse(globalThis.HighlightedVerseNumber || "");
      console.log(
        "verse number clicked: ",
        globalThis.HighlightedVerseNumber || ""
      );
    };
    window.addEventListener("highlightedVerseChanged", handler);
    return () => window.removeEventListener("highlightedVerseChanged", handler);
  }, []);

  useLayoutEffect(() => {
    if (!activeVerse) return;
    const ref = verseRefs[activeVerse];
    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [activeVerse, verseRefs]);

  const editTextStyle = {
    "border-radius": "6px",
    border: "2px solid #4459F3",
    background: "rgba(68, 89, 243, 0.10)",
    padding: "8px",
    position: "relative",
  };

  const styles = {
    font: `'Montserrat', sans-serif`,
    weight: "600",
    color: "black",
    styles: {
      bold: true,
      italic: false,
      underline: false,
      alignment: "left",
    },
  };

  const chunksMap = useMemo(() => {
    const result = {};
    if (globalThis.studyNotesPresent) {
      verses.forEach((v) => {
        result[v.verseNumber] = splitBySectionKeys(
          v.text,
          globalThis.VerseSectionMap
        );
      });
    }
    return result;
  }, [verses, globalThis.studyNotesPresent, globalThis.VerseSectionMap]);

  const wordChunksMap = useMemo(() => {
    const result = {};
    verses.forEach((v) => {
      result[v.verseNumber] = splitByWordHighlights(
        v.text,
        wordHighlights,
        book,
        chapter,
        v.verseNumber,
        wordHighlightsTC,
        wordHighlightsBC
      );
    });
    return result;
  }, [verses, wordHighlights, book, chapter]);

  const getContextData = (verseNumber) => {
    const verse = verses.find((v) => v.verseNumber === verseNumber);
    if (!verse) return null;

    return {
      verse: selectedText || verse.text,
      reference: `${book} ${chapter}:${verseNumber}`,
      book: book,
      chapter: chapter,
      verses: [verseNumber],
      selectedText: selectedText,
    };
  };

  const renderVerseText = (verse) => {
    const verseKey = `${book}-${chapter}-${verse.verseNumber}`;
    const hasWordHighlights =
      wordHighlights[verseKey] &&
      Object.keys(wordHighlights[verseKey]).length > 0;

    if (globalThis.studyNotesPresent) {
      return (chunksMap[verse.verseNumber] || []).map((part, i) => {
        if (!part.isSection) {
          if (hasWordHighlights) {
            const wordParts = splitByWordHighlights(
              part.text,
              wordHighlights,
              book,
              chapter,
              verse.verseNumber
            );
            return wordParts.map((wordPart, wordIndex) => {
              if (wordPart.isHighlighted) {
                return (
                  <span
                    key={`${i}-word-${wordIndex}`}
                    style={{
                      color: wordHighlightsTC,
                      backgroundColor: wordHighlightsBC,
                      cursor: wordPart.highlightConfig.onClick
                        ? "pointer"
                        : "default",
                      padding: "1px 2px",
                      borderRadius: "2px",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (wordPart.highlightConfig.onClick) {
                        wordPart.highlightConfig.onClick(
                          wordPart.text,
                          verse.verseNumber
                        );
                      }
                    }}
                  >
                    {wordPart.text}
                  </span>
                );
              }
              return (
                <span key={`${i}-word-${wordIndex}`}>{wordPart.text}</span>
              );
            });
          }
          return <span key={i}>{part.text}</span>;
        }

        const partNorm = normalize(part.key);
        const activeNorm = (activeKey || "").toLowerCase();
        const isActive = activeNorm.includes(partNorm);

        return (
          <span
            key={i}
            className={`clickableCursor highlightened ${isActive ? "highlighted-word" : ""
              }`}
            style={{ animationDelay: `${i * 0.1}s` }}
            onClick={() => {
              console.log(part.key);
              const raw = globalThis.VerseSectionMap[part.key].original;
              console.log(raw);
              const m = /:(\d+)$/.exec(raw);
              console.log(m);
              const sec = m ? m[1] : part.key;
              console.log(sec);
              globalThis.HighlightStudyNoteSection(raw);
            }}
          >
            {part.text}
          </span>
        );
      });
    } else {
      if (hasWordHighlights) {
        const wordParts = wordChunksMap[verse.verseNumber] || [
          { text: verse.text, isHighlighted: false },
        ];
        return wordParts.map((part, i) => {
          if (part.isHighlighted) {
            let attributes = part.highlightConfig.createAttributes(
              book,
              chapter,
              part
            );
            return (
              <span
                key={i}
                style={{
                  cursor: part.highlightConfig.onClick ? "pointer" : "default",
                  padding: "1px 2px",
                  borderRadius: "2px",
                  color: wordHighlightsTC,
                  backgroundColor: wordHighlightsBC,
                }}
                {...attributes}
              >
                {part.text}
              </span>
            );
          }
          return <span key={i}>{part.text}</span>;
        });
      }
      return verse.text;
    }
  };

  return (
    <div>
      <div
        onClick={() => {
          shout("onHeadingClick", {
            heading,
          });
        }}
        className="sectionTitle"
      >
        {heading}
      </div>
      {hebrew_subtitle && <div className="sectionTitle">{hebrew_subtitle}</div>}
      <div style={textEdit ? editTextStyle : null}>
        {textEdit && <div className="editVerseTitle">Verse - Text</div>}
        {textEdit && (
          <div
            style={{ right: "20px", top: "-65px", background: "transparent" }}
            className="flexElementGap-4 editVerseTitle"
          >
            <TextFormattingToolbar sectionStyles={styles} />
          </div>
        )}
        <div className="sectionCover">
          {verses.map((verse) => {
            if (verse.lineBreak) {
              return <p class="verseLineBreak"></p>;
            }

            const [c, setC] = useState(false);
            const isActive = verse.verseNumber.toString() === activeVerse;
            const shouldShowCommands =
              showCommands && lastSelectedVerse === verse.verseNumber;
            const isTextDecorUnderline =
              holded?.[verse.verseNumber] ||
              selected[verse.verseNumber] ||
              blinker[verse.verseNumber];
            const isClicked = clickedVerses.includes(verse.verseNumber);

            return (
              <span key={verse.verseNumber}>
                <span
                  ref={verseRefs[verse.verseNumber]}
                  id={`v-${verse.verseNumber}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setInHold(verse.verseNumber);
                    setLastSelectedVerse(verse.verseNumber);

                    setContextData({
                      verse: verse.text,
                      reference: `${book} ${chapter}:${verse.verseNumber}`,
                      book,
                      chapter,
                      verses: [verse.verseNumber],
                    });
                    shout("onVeresRightClick", {
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                      chapter,
                      book,
                      highlighted: highlighted?.[verse.verseNumber],
                    });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (globalThis?.SetCurrentReference) {
                      shout("ToggleReference", {
                        book,
                        chapter,
                        verse: verse.verseNumber,
                      });
                      return;
                    }
                    handleVerseClick(verse.verseNumber);
                    SetShowCommands(false);
                    os.log({
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                      chapter,
                      book,
                      highlighted: highlighted?.[verse.verseNumber],
                    });
                    const verseClickData = {
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                      chapter,
                      book,
                      highlighted: highlighted?.[verse.verseNumber],
                    };
                    EmitData("onVerseClick", verseClickData);
                    shout("onVerseClick", verseClickData);
                  }}
                  style={{
                    "background-color":
                      (highlighted?.[verse.verseNumber] &&
                        highlighted?.[verse.verseNumber].book === book &&
                        highlighted?.[verse.verseNumber].chapter === chapter) ||
                        commandHighlight.includes(verse.verseNumber)
                        ? highlighted?.[verse.verseNumber]?.color
                        : "transparent",
                    color:
                      (highlighted?.[verse.verseNumber] &&
                        highlighted?.[verse.verseNumber].book === book &&
                        highlighted?.[verse.verseNumber].chapter === chapter) ||
                        commandHighlight.includes(verse.verseNumber)
                        ? wordHighlightsTC
                        : "black",
                    transition: "background-color 0.2s ease, border 0.2s ease",
                    "border-radius": highlighted?.[verse.verseNumber] || isClicked
                      ? "3px"
                      : "0",
                    padding: highlighted?.[verse.verseNumber] || isClicked ? "2px 4px" : "0",
                    margin: highlighted?.[verse.verseNumber] || isClicked ? "0 1px" : "0",
                    "text-decoration":
                      inHold === verse.verseNumber || isTextDecorUnderline
                        ? "underline"
                        : "",
                    "text-decoration-style":
                      inHold === verse.verseNumber || isTextDecorUnderline
                        ? "dotted"
                        : "",
                    borderBottom: isClicked ? "2px dashed #4459F3" : "none",
                  }}
                  className={`sectionText ${verse?.verseNumber.toString() === activeVerse.toString()
                    ? "highlighted"
                    : ""
                    } ${highlighted?.[verse.verseNumber] ? "verse-highlighted" : ""
                    } ${isClicked ? "verse-clicked" : ""}`}
                >
                  <span
                    className={`sectionTextNumber ${globalThis.studyNotesPresent ? "clickableCursor" : ""
                      }`}
                    onClick={() => {
                      if (globalThis.studyNotesPresent) {
                        HighlightStudyNoteSection(verse?.verseNumber);
                      }
                    }}
                    onPointerEnter={() => {
                      globalThis.showRefModal = true;
                      setTimeout(() => {
                        if (globalThis.showRefModal) {
                          shout("toggleReferenceModal", {
                            book,
                            chapter,
                            verse: verse.verseNumber,
                          });
                        }
                      }, 500);
                    }}
                    onPointerLeave={() => {
                      globalThis.showRefModal = false;
                    }}
                  >
                    {verse?.verseNumber}
                  </span>
                  {!c ? (
                    renderVerseText(verse)
                  ) : (
                    <MiniTextEditor
                      initialHtml={verse.text}
                      onChange={(html) => console.log("Updated HTML:", html)}
                    />
                  )}
                  <input
                    style={{
                      opacity: "0",
                      "pointer-events": "none",
                      position: "absolute",
                      left: 0,
                      top: 0,
                      zIndex: -1,
                    }}
                    placeholder={"test"}
                    ref={(ref) => {
                      if (setRef && setRef[verse.verseNumber]) {
                        setRef[verse.verseNumber].current = ref;
                      }
                    }}
                  />
                </span>

                {shouldShowCommands && (
                  <div
                    ref={commandsRef}
                    style={{
                      marginTop: "10px",
                      marginBottom: "20px",
                      borderTop: "1px solid #eee",
                      paddingTop: "10px",
                    }}
                  >
                    <ConfigurableFunctionCommands contextData={contextData} />
                  </div>
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const ThePageWithPanel = ({ tab }) => {
  const [panalApp, setPanalApp] = useState(false);
  return (
    <>
      <DivSpliter
        split={panalApp}
        stop={false}
        initialWidth={gridPortalBot.tags.pixelWidth}
        containerWidth={gridPortalBot.tags.pixelWidth}
        containerHeight={1000}
        onResize={() => { }}
        otherTab={panalApp}
      >
        <ThePage setPanalApp={setPanalApp} tab={tab} />
      </DivSpliter>
    </>
  );
};

export const ThePageWithEditor = ({ tab, setPanalApp, panelId }) => {
  useEffect(() => {
    os.log("tab in the page", panelId, tab);
  }, []);

  const activeTab = panelId ? globalThis.PanelTabsMap[panelId] || tab : tab;
  const [enableEditor, setEnableEditor] = useState(false);
  useEffect(() => {
  }, [enableEditor]);
  const [data, setData] = useState();
  if (tab) globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;
  return (
    <>
      <TextEditor
        enableEditor={enableEditor}
        setEnableEditor={setEnableEditor}
        data={data}
        content={
          <ThePage
            data={data}
            setData={setData}
            setEnableEditor={setEnableEditor}
            tab={activeTab}
            panelId={panelId}
            setPanalApp={setPanalApp}
          />
        }
        tab={activeTab}
      />
      <style>{getStyleOf("page.css")}</style>
    </>
  );
};

export { ThePage, ThePageWithEditor };