import {
  BibleDataManager,
  getCachedBibleData,
  getCachedFootnotes,
} from "app.hooks.bibleDataManager";
import { getSettingsPreset } from "app.components.types";

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
import { VerseToolbar } from "app.components.verseToolbar";
import { useHoldAction } from "app.hooks.useHold";
import {
  MobileSettingsIcon,
  MenuIcon,
  BookMarkIcon,
  InfoSettingsIcon,
} from "app.components.icons";

import { MobileSettingsCard } from "app.components.themeSettings";
import { useSideBarContext } from "app.hooks.sideBar";
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
  deleteTab,
  setDeleteTab,
}) {
  const [tab, setTab] = useState(T);
  const [commandHighlight, setCommandHighlight] = useState([]);
  const [direction, setDirection] = useState(null);
  const commandsRef = useRef(null);
  const lastScrollTopRef = useRef(0);
  const swipeNavOccurredRef = useRef(false);
  const [userMovedToolbar, setUserMovedToolbar] = useState();
  const {
    openOnMobile,
    setOpenOnMobile,
    sidebarWidth,
    setSidebarWidth,
    setCollapsed,
    setSideBarMode,
  } = useSideBarContext();
  useEffect(() => {
    if (deleteTab) {
      if (deleteTab.tabId === tab?.id) {
        setTab(null);
      }
      setDeleteTab(false);
    }
  }, [deleteTab]);
  useEffect(() => {
    if (!T) globalThis.CurrentPanelAvailable = panelId;
    else globalThis.CurrentPanelAvailable = null;
  }, [T]);
  const { inSession, role, config } = getUserSessionInfo(configBot.id);
  const [tabEntered, setTabEntered] = useState(false);
  const {
    updateTab,
    tabs,
    activeTab,
    setActiveTab,
    sharedTab,
    activeSpace,
    spaces,
  } = useTabsContext();
  const { isDragging, setIsDragging, Element, position } = useMouseMove();
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
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  useEffect(() => {
    if (showMobileSettings) {
      document.body.classList.add("mobile-settings-open");
    } else {
      document.body.classList.remove("mobile-settings-open");
    }
    return () => document.body.classList.remove("mobile-settings-open");
  }, [showMobileSettings]);

  const [highlighted, setHighlighted] = useState({});

  // NEW: State for clicked verses
  const [clickedVerses, setClickedVerses] = useState([]);
  const [clickedVersesContext, setClickedVersesContext] = useState({});
  const [showVerseToolbar, setShowVerseToolbar] = useState(false);

  useEffect(() => {
    globalThis.SetIsVerseToolBarOpen?.(showVerseToolbar);
  }, [showVerseToolbar]);

  const [wordHighlights, setWordHighlights] = useState({});
  const [wordHighlightsTC, setWordHighlightsTC] = useState("black");
  const [wordHighlightsBC, setWordHighlightsBC] = useState("#ffeb3b");

  const [bible, setBible] = useState();
  const [footnotes, setFootnotes] = useState(() => {
    if (tab) {
      return getCachedFootnotes(
        tab.data?.translation,
        tab.data?.bookId,
        tab.data?.chapter
      );
    }
    return null;
  });
  const [showFootnoteModal, setShowFootnoteModal] = useState(false);
  const [activeFootnote, setActiveFootnote] = useState(null);
  if (tab) globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;

  const loadTranslationFromUrl = async () => {
    console.log(configBot.tags.translationId, "translation id");
    const translationId =
      configBot.tags.translationId ||
      configBot.tags.translation ||
      tab.data.translation;
    let baseUrl = "https://vmfnri.helloao.org";
    let bookId = tab.data.bookId || "GEN";
    let bookTranslationId = tab.data.translation;
    let firstBookData;
    let firstChapterApiLink;
    let books = [];
    if (translationId) {
      const available_translations_req = await web.get(
        "https://vmfnri.helloao.org/api/available_translations.json"
      );
      let allTranslations = [];
      const translations = {};
      const defaultTranslations = [
        "english",
        "spanish",
        "arabic",
        "hindi",
        "hebrew",
        "ancient greek",
        "custom",
      ];
      allTranslations = available_translations_req.data.translations.map(
        (item) => {
          return {
            ...item,
            languageEnglishName: item?.languageEnglishName || item.englishName,
          };
        }
      );

      const trValue = {
        pass: false,
        value: null,
      };
      if (available_translations_req.status === 200) {
        allTranslations.forEach((translationData) => {
          if (
            translationData.id.toLowerCase() === translationId.toLowerCase()
          ) {
            trValue.pass = true;
            trValue.value = translationData;
          }
        });

        const urlId = translationId.includes("https://");

        if (trValue.pass && !urlId) {
          const bookData = await web.get(
            `https://vmfnri.helloao.org/api/${trValue.value.id}/books.json`
          );
          books = bookData.data.books;
          const book0 = bookData.data.books[0];
          firstBookData = book0;
          setTagMask(thisBot, "selectedTranslation", trValue.value, "local");
          setTagMask(thisBot, "booksData", bookData.data.books, "local");
          bookId = book0.id;
          bookTranslationId = trValue.value.id;
          firstChapterApiLink = book0.firstChapterApiLink;
        } else {
          const result = await web.get(translationId);
          if (result.status === 200) {
            const url = new URL(translationId);
            let newTranslations = result.data.translations;
            if (newTranslations.length === 0) {
              configBot.tags.translationId = null;
              configBot.tags.translation = null;
              const translationData = await loadTranslationFromUrl();
              os.toast("No translations found from url!");
              return {
                ...translationData,
              };
            }
            const defaultTranslation = newTranslations[0];
            newTranslations = newTranslations.map((trans) => {
              return {
                ...trans,
                name: trans.name,
                languageEnglishName:
                  trans.languageEnglishName || "Unspecified Language",
                id: trans.id,
                listOfBooksApiLink: `${url.origin}${trans.listOfBooksApiLink}`,
                origin: url.origin,
                shortName: trans.shortName,
              };
            });
            setTagMask(
              thisBot,
              "newTranslations",
              masks?.newTranslations
                ? [...masks.newTranslations, ...newTranslations]
                : newTranslations,
              "local"
            );
            for (const translation of newTranslations) {
              const englishName = translation.languageEnglishName.toLowerCase();
              if (!defaultTranslations.includes(englishName)) {
                defaultTranslations.push(englishName);
              }
            }
            const translation = {
              name: defaultTranslation.name,
              languageEnglishName: defaultTranslation.languageEnglishName,
              id: defaultTranslation.id,
              listOfBooksApiLink: `${url.origin}${defaultTranslation.listOfBooksApiLink}`,
              origin: url.origin,
              shortName: defaultTranslation.shortName,
            };
            const englishName = translation.languageEnglishName.toLowerCase();
            const shortName = translation.shortName.toLowerCase();

            const bookData = await web.get(translation.listOfBooksApiLink);

            books = bookData.data.books;
            const book0 = bookData.data.books[0];
            firstBookData = book0;
            setTagMask(thisBot, "selectedTranslation", translation, "local");
            setTagMask(thisBot, "booksData", bookData.data.books, "local");
            if (!defaultTranslations.includes(englishName)) {
              defaultTranslations.push(englishName);
              translations[englishName] = {
                [shortName]: translation,
              };
            }
            baseUrl = translation.origin;
            bookId = book0.id;
            bookTranslationId = translation.id;
            firstChapterApiLink = book0.firstChapterApiLink;
          }
        }
        if (masks?.newTranslations) {
          allTranslations = [...allTranslations, ...masks.newTranslations];
        }
        allTranslations.forEach((translation) => {
          const englishName =
            translation?.languageEnglishName?.toLowerCase() ||
            translation?.englishName?.toLowerCase();
          const shortName = translation.shortName.toLowerCase();
          if (translations[englishName]) {
            if (!translations[englishName][shortName]) {
              translations[englishName][shortName] = translation;
            }
          } else {
            translations[englishName] = {
              [shortName]: translation,
            };
          }
        });
        setTagMask(thisBot, "allTranslations", allTranslations, "local");
        setTagMask(thisBot, "apiTranslations", { ...translations }, "local");
        setTagMask(
          thisBot,
          "defaultTranslations",
          defaultTranslations,
          "local"
        );
      }
    } else {
      return {
        baseUrl,
        bookId,
        bookTranslationId,
        firstChapterApiLink,
        firstBookData,
        books,
      };
    }
    return {
      baseUrl,
      bookId,
      bookTranslationId,
      firstChapterApiLink,
      firstBookData,
      books,
    };
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setClickedVerses([]);
        setShowVerseToolbar(false);
      }
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
      // os.log("updated shared tab", "not approved");
      // if (!globalThis.CurrentTab?.sharedTab) {
      //   updateTab(masks["sharedTab"], data);
      //   return;
      // }
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
    os.addBotListener(thisBot, "remoteBookChange", onBookChange);
    os.addBotListener(thisBot, "remoteHighlightChange", onHighlightChange);
    return () => {
      // os.removeBotListener(thisBot, 'remoteBookChange', onBookChange)
      // os.removeBotListener(thisBot, 'remoteHighlightChange', onHighlightChange)
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDataSafe() {
      if (!tab) return;
      const { firstBookData, bookTranslationId, baseUrl, books } =
        await loadTranslationFromUrl();
      const bible = new BibleDataManager({
        tabId: tab?.id,
        translation: tab.data.translation,
        bookId: tab.data.bookId,
        chapter: tab.data.chapter,
        baseUrl: tab.data?.baseUrl || "https://vmfnri.helloao.org",
      });
      setBible(bible);

      console.log("bible data: ", bible);

      await bible.fetch();

      if (cancelled) return; // Don't update state if navigation changed

      globalThis.BookId = bible.bookId;

      const {
        data,
        loading,
        error,
        footnotes: bibleFootnotes,
      } = bible.getState();
      console.log(data, tab, bibleFootnotes, "the data loaded");
      setFootnotes(bibleFootnotes);

      globalThis.refreshScrollers && globalThis.refreshScrollers();

      if (cancelled) return; // Check again after async operation

      if (!configBot.tags.defaultChecked) {
        if (books && bookTranslationId && baseUrl) {
          await bible.changeTranslation(bookTranslationId, books, baseUrl);
        }
        if (cancelled) return;

        if (books) {
          if (configBot.tags?.book && books && books?.length > 0) {
            let bookData;
            books.forEach((book) => {
              if (book.id.toLowerCase() === configBot.tags.book.toLowerCase()) {
                bookData = book;
              }
            });
            if (bookData) {
              let chapterNo;
              if (Number(configBot.tags.chapter) <= bookData.numberOfChapters)
                chapterNo = configBot.tags.chapter;
              const chapterUrl = chapterNo
                ? bookData.firstChapterApiLink.replace(
                    "1.json",
                    `${chapterNo}.json`
                  )
                : bookData.firstChapterApiLink.replace(
                    "1.json",
                    `${tab.data.chapter}.json`
                  );
              await bible.open(
                bookData.id,
                configBot.tags.chapter || 1,
                bookTranslationId,
                chapterUrl
              );
            }
          } else if (configBot.tags?.chapter && books?.length > 0) {
            let bookData;
            books.forEach((book) => {
              if (book.id.toLowerCase() === tab.data.bookId.toLowerCase()) {
                bookData = book;
              }
            });
            let chapterNo;
            if (Number(configBot.tags.chapter) <= bookData.numberOfChapters)
              chapterNo = configBot.tags.chapter;
            const chapterUrl = chapterNo
              ? bookData.firstChapterApiLink.replace(
                  "1.json",
                  `${chapterNo}.json`
                )
              : bookData.firstChapterApiLink.replace(
                  "1.json",
                  `${tab.data.chapter}.json`
                );
            os.log("opening with chapter url", chapterUrl, {
              bookData,
              configBot,
            });
            await bible.open(
              bookData.id,
              configBot.tags.chapter || 1,
              bookTranslationId,
              chapterUrl
            );
          }
        } else {
          if (configBot.tags?.book) {
            await bible.open(
              configBot.tags?.book,
              configBot.tags?.chapter || tab.data.chapter,
              configBot.tags?.translation ||
                configBot.tags?.translationId ||
                null,
              undefined
            );
          } else if (configBot.tags?.chapter) {
            await bible.open(
              tab.data.book,
              configBot.tags?.chapter,
              configBot.tags?.translation ||
                configBot.tags?.translationId ||
                null,
              undefined
            );
          }
        }
        configBot.tags.defaultChecked = true;
      } else {
        if (masks?.allTranslations) {
          for (const translation of masks.allTranslations) {
            if (translation.id === tab.data.translation) {
              setTagMask(thisBot, "selectedTranslation", translation, "local");
              break;
            }
          }
        }
      }

      if (cancelled) return; // Final check before setting data

      setData(bible.data);
      SetShowToolbar(true);
      whisper(getBot("system", "introduction.searchBar"), "initialize");
    }

    if (!bible || (bible && bible?.tabId && bible.tabId !== tab?.id)) {
      loadDataSafe();
    }
    globalThis.CurrentTab = tab;

    return () => {
      cancelled = true; // Cancel on cleanup
    };
  }, [tab]);

  useEffect(() => {
    globalThis.PanelTabsMap = {
      ...globalThis.PanelTabsMap,
      [panelId]: {
        ...tab,
      },
    };
  }, [tab, panelId]);

  // GLOBAL GUARDS
  if (!globalThis.__remoteBookUpdate) globalThis.__remoteBookUpdate = false;
  if (!globalThis.__lastBookEmit) globalThis.__lastBookEmit = 0;
  const BOOK_EMIT_DEBOUNCE = 250; // ms

  // SAFELY EMIT BOOK WITHOUT LOOPS OR SPAM
  function safeEmitBook(payload) {
    const now = Date.now();

    // 1) Prevent loop from remote → local → remote
    if (globalThis.__remoteBookUpdate) {
      globalThis.__remoteBookUpdate = false;
      return;
    }

    // 2) Prevent spam when navigating fast
    if (now - globalThis.__lastBookEmit < BOOK_EMIT_DEBOUNCE) {
      return;
    }

    globalThis.__lastBookEmit = now;

    // 3) Finally emit
    EmitData("book", payload);
  }

  useEffect(() => {
    if (data) {
      //  EmitData("book", { ...data });
      hanldNavFunctions();
      SetShowCommands(false);
      updateTab(tab?.id, data);
      if (
        config &&
        !config?.sharedTab &&
        role === "host" &&
        masks["sharedTab"] !== tab?.id
      ) {
        updateTab(tab?.id, data);
        updateTab(masks["sharedTab"], data);
      }
      if (role === "host") EmitData("book", { ...data });
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
      if (masks["sharedTab"] === tab?.id) EmitData("book", { ...data });
      // const emitter = getBot("system", "app.emitter");
      // sendRemoteData(emitter.masks.otherRemotes, "updateSharingData", {
      //   id: tab?.id,
      //   bookId: data?.bookId,
      //   book: data?.book,
      //   chapter: data?.chapter,
      // });
      const emitter = getBot("system", "app.emitter");
      os.log("emitter updateSharingData", emitter);
      globalThis.CurrentBookData = data;
      shout("bookDataUpdated", data);
      sendRemoteData(emitter.masks.otherRemotes, "updateSharingData", {
        id: tab?.id,
        bookId: data?.bookId,
        book: data?.book,
        chapter: data?.chapter,
      });
      os.syncConfigBotTagsToURL(["book", "chapter", "translation", "lang"]);
    }
  }, [data]);

  useEffect(() => {
    if (data && tab?.id === activeTab) {
      configBot.tags.book = data?.bookId;
      configBot.tags.chapter = data?.chapter;
      configBot.tags.translation = data?.translation;
    }
  }, [activeTab, data, tab]);

  // useEffect(() => {
  //   // Create the interval
  //   const interval = setInterval(() => {
  //     if (data) {
  //       const emitter = getBot("system", "app.emitter");

  //       sendRemoteData(emitter.masks.otherRemotes, "updateSharingData", {
  //         id: tab?.id,
  //         bookId: data?.bookId,
  //         book: data?.book,
  //         chapter: data?.chapter,
  //       });
  //     }
  //   }, 1000);
  //   globalThis.CurrentTab = tab;
  //   return () => clearInterval(interval);
  // }, [data]);

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
        configBot.tags.translation || "AAB"
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
    function getUnifiedSelectedVerses(rawSelectedVerses, clickedVerses) {
      if (clickedVerses && clickedVerses.length > 0) {
        return [...new Set(clickedVerses)].sort((a, b) => a - b);
      }

      return [...new Set(rawSelectedVerses)].sort((a, b) => a - b);
    }

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedRange = selection.getRangeAt(0);
      const container =
        selectedRange.commonAncestorContainer.nodeType === Node.TEXT_NODE
          ? selectedRange.commonAncestorContainer.parentElement
          : selectedRange.commonAncestorContainer;

      if (commandsRef.current && commandsRef.current.contains(container)) {
        return;
      }

      // Collect selected verse numbers
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

      // Exit if nothing selected and no clicked verses
      if (selectedVerses.size === 0 && clickedVerses.length === 0) {
        setShowCommands(false);
        setSelectedText("");
        setLastSelectedVerse(null);
        return;
      }

      // Merge selection with clicked verses
      const unifiedVerses = getUnifiedSelectedVerses(
        Array.from(selectedVerses),
        clickedVerses
      );

      const highestVerse = unifiedVerses[unifiedVerses.length - 1];
      const lowestVerse = unifiedVerses[0];

      //  selected text from verse data (excludes headings)
      const selectedTextFinal = unifiedVerses
        .map((v) => {
          const verseObj = data?.content
            ?.flatMap((c) => c.verses)
            .find((x) => x.verseNumber === v);
          return verseObj?.text || "";
        })
        .join(" ");

      setSelectedText(selectedTextFinal);
      setLastSelectedVerse(highestVerse);

      // Build context data
      setContextData({
        verse: selectedTextFinal,
        reference: `${data?.book} ${data?.chapter}:${lowestVerse}${
          lowestVerse !== highestVerse ? `-${highestVerse}` : ""
        }`,
        book: data?.book,
        chapter: data?.chapter,
        verses: unifiedVerses,
      });

      // 🔥 NEW — Convert selection into clicked verses
      setClickedVerses((prev) => {
        const newOnes = unifiedVerses.filter((v) => !prev.includes(v));
        return [...prev, ...newOnes];
      });
      setClickedVersesContext({
        verseNumber: unifiedVerses,
        text: selectedTextFinal,
        book: data?.book,
        chapter: data?.chapter,
        translation: data?.translation,
      });
      const sel = window.getSelection();
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
      setShowVerseToolbar(true);

      // Reset toolbar drag state on new selection
      // userMovedToolbar.current = false;

      // 🔥 NEW — Auto-position toolbar under final selected verse
      if (!userMovedToolbar) {
        const ele = document.getElementById(`v-${highestVerse}`);
        if (ele) {
          const rect = ele.getBoundingClientRect();
          setToolbarPos({
            x: rect.left,
            y: rect.bottom,
          });
        }
      }

      // Notify systems about verse selection
      shout("onVeresRightClick", {
        verseNumber: unifiedVerses,
        text: selectedTextFinal,
        book: data?.book,
        chapter: data?.chapter,
        translation: data?.translation,
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [data, userMovedToolbar]);

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
          `https://vmfnri.helloao.org/api/${Element.data.data.translation}/books.json`,
          Element.data.data.translation
        );
    }
    setIsDragging(false);
    setTabEntered(false);
  }

  async function openNextChapter() {
    await bible.openNext();
    setData(bible.data);
    setFootnotes(bible.footnotes);

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
    setFootnotes(bible.footnotes);

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
      setFootnotes(bible.footnotes);
    } catch {
      if (tab) return;
      const newTab = globalThis.AddTab({
        id: uuid(),
        taken: false,
        data: {
          use: "thePage",
          type: "book",
          book: bookId,
          bookId: bookId,
          chapter: chapter,
          translation: translation || "AAB",
        },
      });
      setTab(newTab);
      console.log("newTab created for open error", newTab);
      return;
    }
  }

  async function changeTranslation(id, booksData, forcedBaseUrl) {
    await bible.changeTranslation(id, booksData, forcedBaseUrl);
    setData(bible.data);
    setFootnotes(bible.footnotes);
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
    setCommandHighlight([]);
    if (data && JSON.stringify(tab?.data) !== JSON.stringify(data)) {
      setTab((prev) => ({ ...prev, data }));
    }
  }, [data]);

  function hanldNavFunctions() {
    console.log("hanldNavFunctions", { tab, sharedTab, setActiveTab, panelId });
    if (tab && tab?.id && !sharedTab) setActiveTab(tab?.id);
    setNavFunctions({
      openNextChapter,
      openPrevChapter,
      open,
      changeTranslation: bible?.changeTranslation || undefined,
      setPanalApp: () => {},
    });
    globalThis.Open = open;
    globalThis.ChangeTranslation = changeTranslation;
    globalThis.SetPanalApp = () => {};
    globalThis.ToggleVerseHighlight = toggleVerseHighlight;
    globalThis.UnHighlightVerse = unHighlightVerse;
    globalThis.HighlightVerse = highlightVerse;
    globalThis.SetWordHighlightsTC = setWordHighlightsTC;
    globalThis.SetWordHighlightsBC = setWordHighlightsBC;
    globalThis.SetInHold = setInHold;
    globalThis.SetShowCommands = setShowCommands;

    globalThis.ClearMobileVerseSelection = () => {
      setClickedVerses([]);
      setClickedVersesContext({});
      setShowVerseToolbar(false);
      setCommandHighlight([]);
      setLastSelectedVerse(null);
      setSelectedText("");
      setShowCommands(false);
      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel?.removeAllRanges) sel.removeAllRanges();
      }
    };

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
    globalThis.LastClickedPanelUpdate = panelId;
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
    if (tab?.id) {
      if (!masks?.tabHighlights) {
        setTagMask(thisBot, "tabHighlights", {}, "local");
      }

      const savedHighlights = masks?.tabHighlights?.[tab.id] || {};
      setHighlighted(savedHighlights);
    }

    globalThis.SetHighlighted = setHighlighted;

    return () => {
      globalThis.SetHighlighted = null;
    };
  }, [tab?.id]);

  useEffect(() => {
    if (tab?.id && data?.book && data?.chapter) {
      const savedHighlights = masks?.tabHighlights?.[tab.id] || {};
      setHighlighted(savedHighlights);
    }
  }, [tab?.id, data?.book, data?.chapter]);

  const clearAllVerseHighlights = useCallback(() => {
    setHighlighted({});
    setCommandHighlight([]);

    if (tab?.id) {
      const updatedMaskHighlights = { ...masks?.tabHighlights, [tab.id]: {} };
      setTagMask(thisBot, "tabHighlights", updatedMaskHighlights, "local");
    }

    shout("onAllVerseHighlightsCleared", {
      tabId: tab?.id,
      book: data?.book,
      chapter: data?.chapter,
    });
  }, [tab?.id, data?.book, data?.chapter]);

  const toggleVerseHighlight = useCallback(
    (verseNumbers, color, scroll, fadeIn, skipIt) => {
      if (!tab?.id) return;

      const verseId = `v-${
        Array.isArray(verseNumbers)
          ? verseNumbers[verseNumbers.length - 1]
          : verseNumbers
      }`;

      if (scroll)
        document.getElementById(verseId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

      const numbers = Array.isArray(verseNumbers)
        ? verseNumbers
        : [verseNumbers];

      setHighlighted((prev) => {
        const newHighlighted = { ...prev };
        const groupId = Date.now();

        const allHighlighted = numbers.every((vn) => {
          const key = `${data?.book}-${data?.chapter}-${vn}`;
          return newHighlighted[key];
        });

        if (allHighlighted) {
          numbers.forEach((vn) => {
            const key = `${data?.book}-${data?.chapter}-${vn}`;
            delete newHighlighted[key];
          });
        } else {
          numbers.forEach((vn) => {
            const key = `${data?.book}-${data?.chapter}-${vn}`;
            newHighlighted[key] = {
              timestamp: groupId,
              book: data?.book,
              chapter: data?.chapter,
              verseNumber: vn,
              group: groupId,
              color: color || wordHighlightsBC,
              bookId: data?.bookId,
            };
          });
        }

        const updatedMaskHighlights = {
          ...masks?.tabHighlights,
          [tab.id]: newHighlighted,
        };
        setTagMask(thisBot, "tabHighlights", updatedMaskHighlights, "local");

        if (
          fadeIn ||
          tags?.sessions?.[configBot.id]?.config.highlightDuration
        ) {
          let duration = 0;
          if (tags?.sessions?.[configBot.id]?.config.highlightDuration)
            fadeIn = tags?.sessions?.[configBot.id]?.config.highlightDuration;
          if (fadeIn === 4) {
            duration = 0;
          } else if (typeof fadeIn === "number") {
            duration = fadeIn * 1000;
          }

          if (duration > 0) {
            setTimeout(() => {
              setHighlighted((prevFade) => {
                const faded = { ...prevFade };
                numbers.forEach((vn) => {
                  const key = `${data?.book}-${data?.chapter}-${vn}`;
                  delete faded[key];
                });

                const fadedMaskHighlights = {
                  ...masks?.tabHighlights,
                  [tab.id]: faded,
                };
                setTagMask(
                  thisBot,
                  "tabHighlights",
                  fadedMaskHighlights,
                  "local"
                );

                return faded;
              });
            }, duration);
          }
        }

        shout("onVerseHighlightUpdated", {
          highlightedVerses: newHighlighted,
        });

        return newHighlighted;
      });
    },
    [tab?.id, data, data?.book, data?.chapter, wordHighlightsBC]
  );

  const highlightVerse = useCallback(
    (verseNumbers, color, scroll = true) => {
      if (!tab?.id) return;

      const verseId = `v-${
        Array.isArray(verseNumbers)
          ? verseNumbers[verseNumbers.length - 1]
          : verseNumbers
      }`;

      if (scroll)
        document.getElementById(verseId)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

      const numbers = Array.isArray(verseNumbers)
        ? verseNumbers
        : [verseNumbers];

      setHighlighted((prev) => {
        const newHighlighted = { ...prev };
        const groupId = Date.now();

        numbers.forEach((vn) => {
          const key = `${data?.book}-${data?.chapter}-${vn}`;
          newHighlighted[key] = {
            timestamp: groupId,
            book: data?.book,
            chapter: data?.chapter,
            verseNumber: vn,
            group: groupId,
            color: color || wordHighlightsBC,
            bookId: data?.bookId,
          };
        });

        const updatedMaskHighlights = {
          ...masks?.tabHighlights,
          [tab.id]: newHighlighted,
        };
        setTagMask(thisBot, "tabHighlights", updatedMaskHighlights, "local");

        shout("onVerseHighlightUpdated", {
          highlightedVerses: newHighlighted,
        });

        return newHighlighted;
      });
    },
    [tab?.id, data, data?.book, data?.chapter, wordHighlightsBC]
  );

  const unHighlightVerse = useCallback(
    (verseNumbers) => {
      if (!tab?.id) return;

      const verseId = `v-${
        typeof verseNumbers === "object"
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

        const allHighlighted = numbers.every((vn) => {
          const key = `${data?.book}-${data?.chapter}-${vn}`;
          return newHighlighted[key];
        });

        if (allHighlighted) {
          numbers.forEach((vn) => {
            const key = `${data?.book}-${data?.chapter}-${vn}`;
            delete newHighlighted[key];
          });
        }

        const updatedMaskHighlights = {
          ...masks?.tabHighlights,
          [tab.id]: newHighlighted,
        };
        setTagMask(thisBot, "tabHighlights", updatedMaskHighlights, "local");

        shout("onVerseHighlightUpdated", {
          highlightedVerses: newHighlighted,
        });

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
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        // Clear verse clicks
        setClickedVerses([]);
        setClickedVersesContext({});
        setShowVerseToolbar(false);

        // Clear selection highlight
        setCommandHighlight([]);
        setLastSelectedVerse(null);
        setSelectedText("");
        setShowCommands(false);

        // Remove browser selected text
        if (window.getSelection) {
          const sel = window.getSelection();
          if (sel.removeAllRanges) sel.removeAllRanges();
        }
      }
    }

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const hasSelection = clickedVerses.length > 0 || showCommands;
    (globalThis as any).SetMobileHasSelection?.(hasSelection);
  }, [clickedVerses, showCommands]);

  // NEW: Handle verse clicks
  const handleVerseClick = useCallback(
    (verseNumber, verseElement) => {
      const ele = document.getElementById(`v-${verseNumber}`);
      const rect = ele.getBoundingClientRect();

      if (!userMovedToolbar) {
        setToolbarPos({
          x: rect.left + rect.width / 2,
          y: rect.bottom - 150,
        });
      }

      setClickedVerses((prev) => {
        const isAlreadyClicked = prev.includes(verseNumber);

        if (isAlreadyClicked) {
          const newClicked = prev.filter((v) => v !== verseNumber);

          if (newClicked.length === 0) {
            setTimeout(() => {
              setShowVerseToolbar(false);
            }, 5);
            setClickedVersesContext({});
          }

          return newClicked;
        }

        const newClicked = [...prev, verseNumber];
        const verseObj = data?.content
          ?.flatMap((c) => c.verses)
          .find((v) => v.verseNumber === verseNumber);

        setClickedVersesContext({
          verseNumber: newClicked,
          text: newClicked
            .map((v) => {
              const obj = data?.content
                ?.flatMap((c) => c.verses)
                .find((vv) => vv.verseNumber === v);
              return obj?.text || "";
            })
            .join(" "),
          book: data?.book,
          chapter: data?.chapter,
          translation: data?.translation,
        });

        setShowVerseToolbar(true);
        return newClicked;
      });
    },
    [data, highlighted, showVerseToolbar, userMovedToolbar]
  );

  // NEW: Handle color selection from toolbar
  // NEW: Handle color selection from toolbar
  const handleColorSelect = useCallback(
    (color) => {
      if (clickedVerses.length === 0) return;
      setWordHighlightsBC(color);
      // Apply the selected color to all clicked verses
      // clickedVerses.forEach((verseNum) => {
      //   toggleVerseHighlight(verseNum, color);
      // });
      toggleVerseHighlight(clickedVerses, color);
      EmitData("highlight", { verseNumbers: clickedVerses, color }); // Fixed: use clickedVerses instead of undefined verseNum
      // Clear clicked verses and hide toolbar
      setClickedVerses([]);
      setTimeout(() => {
        setShowVerseToolbar(false);
      }, 5);
    },
    [clickedVerses, toggleVerseHighlight]
  );

  // NEW: Close toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showVerseToolbar &&
        !e.target.closest(".verse-toolbar") &&
        !e.target.closest(".sectionText") &&
        !e.target.closest(".sectionCover") &&
        !e.target.closest(".sectionTitle")
      ) {
        setClickedVerses([]);
        setTimeout(() => {
          setShowVerseToolbar(false);
        }, 5);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVerseToolbar]);
  const [dragToolbar, setDragToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 200, y: 200 }); // initial position
  const { showHeading } = useBibleContext();
  useEffect(() => {
    if (!dragToolbar) return;
    setToolbarPos({
      x: position.x,
      y: position.y,
    });
  }, [position, dragToolbar]);

  // Preloaded adjacent chapter data for smooth carousel
  const [prevChapterData, setPrevChapterData] = useState(null);
  const [nextChapterData, setNextChapterData] = useState(null);
  const prevChapterDataRef = useRef(null) as { current: any };
  const nextChapterDataRef = useRef(null) as { current: any };
  prevChapterDataRef.current = prevChapterData;
  nextChapterDataRef.current = nextChapterData;

  // Preload adjacent chapters whenever the current chapter changes
  useEffect(() => {
    if (!data) return;
    const baseUrl = data.baseUrl || "https://vmfnri.helloao.org";

    const preload = async (
      url: string | null | undefined,
      setter: (d: any) => void
    ) => {
      if (!url) {
        setter(null);
        return;
      }
      try {
        const mgr = new BibleDataManager({ baseUrl });
        await mgr.fetch(url);
        setter(mgr.data);
      } catch {
        setter(null);
      }
    };

    preload(data.nextChapter, setNextChapterData);
    preload(data.prevChapter, setPrevChapterData);
  }, [data?.nextChapter, data?.prevChapter]);

  // Carousel refs
  const swipeViewportRef = useRef(null) as { current: HTMLDivElement | null };
  const swipeTrackRef = useRef(null) as { current: HTMLDivElement | null };
  const currentPanelRef = useRef(null) as { current: HTMLDivElement | null };
  const swipeTouchStartX = useRef(null) as { current: number | null };
  const swipeTouchStartY = useRef(null) as { current: number | null };
  const swipeDirectionLocked = useRef(null) as { current: "h" | "v" | null };
  const swipeCurrentDx = useRef(0) as { current: number };
  const openNextChapterRef = useRef(null) as {
    current: (() => Promise<void>) | null;
  };
  const openPrevChapterRef = useRef(null) as {
    current: (() => Promise<void>) | null;
  };

  const clearSelectionRef = useRef(null) as { current: (() => void) | null };

  // Keep function refs fresh every render
  openNextChapterRef.current = openNextChapter;
  openPrevChapterRef.current = openPrevChapter;
  clearSelectionRef.current = () => {
    setClickedVerses([]);
    setClickedVersesContext({});
    setShowVerseToolbar(false);
    setSelectedText("");
    setCommandHighlight([]);
    setLastSelectedVerse(null);
    setShowCommands(false);
  };

  useEffect(() => {
    const viewport = swipeViewportRef.current;
    if (!viewport) return;

    const PANEL_PCT = 100 / 3; // 33.333…%

    const getTrack = () => swipeTrackRef.current;
    const getPanel = () => currentPanelRef.current;

    const onTouchStart = (e: TouchEvent) => {
      swipeTouchStartX.current = e.touches[0].clientX;
      swipeTouchStartY.current = e.touches[0].clientY;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;
      const track = getTrack();
      if (track) track.style.transition = "none";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (
        swipeTouchStartX.current === null ||
        swipeTouchStartY.current === null
      )
        return;
      const dx = e.touches[0].clientX - swipeTouchStartX.current;
      const dy = e.touches[0].clientY - swipeTouchStartY.current;

      if (!swipeDirectionLocked.current) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
          swipeDirectionLocked.current = "h";
        } else if (Math.abs(dy) > 10) {
          swipeDirectionLocked.current = "v";
          return;
        } else {
          return;
        }
      }

      if (swipeDirectionLocked.current === "v") return;
      e.preventDefault();

      const hasNext = !!nextChapterDataRef.current;
      const hasPrev = !!prevChapterDataRef.current;
      let offset = dx;

      // Strong rubber-band when no adjacent content loaded yet
      if ((dx < 0 && !hasNext) || (dx > 0 && !hasPrev)) {
        offset = Math.sign(dx) * Math.min(Math.abs(dx) * 0.15, 30);
      } else {
        // Soft rubber-band past 50% of viewport
        const limit = window.innerWidth * 0.5;
        if (Math.abs(dx) > limit) {
          offset = Math.sign(dx) * (limit + (Math.abs(dx) - limit) * 0.2);
        }
      }

      swipeCurrentDx.current = offset;
      const track = getTrack();
      if (track)
        track.style.transform = `translateX(calc(-${PANEL_PCT}% + ${offset}px))`;
    };

    const onTouchEnd = () => {
      if (swipeDirectionLocked.current !== "h") {
        swipeTouchStartX.current = null;
        swipeDirectionLocked.current = null;
        return;
      }

      const dx = swipeCurrentDx.current;
      const THRESHOLD = 80;
      const hasNext = !!nextChapterDataRef.current;
      const hasPrev = !!prevChapterDataRef.current;

      swipeTouchStartX.current = null;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;

      const track = getTrack();
      const panel = getPanel();
      if (!track) return;

      if (dx < -THRESHOLD && hasNext && openNextChapterRef.current) {
        clearSelectionRef.current?.();
        const fn = openNextChapterRef.current;
        track.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = `translateX(-${PANEL_PCT * 2}%)`;
        swipeNavOccurredRef.current = true;
        setTimeout(async () => {
          track.style.transition = "none";
          track.style.transform = `translateX(-${PANEL_PCT}%)`;
          if (panel) panel.scrollTop = 0;
          await fn();
        }, 250);
      } else if (dx > THRESHOLD && hasPrev && openPrevChapterRef.current) {
        clearSelectionRef.current?.();
        const fn = openPrevChapterRef.current;
        track.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = `translateX(0%)`;
        swipeNavOccurredRef.current = true;
        setTimeout(async () => {
          track.style.transition = "none";
          track.style.transform = `translateX(-${PANEL_PCT}%)`;
          if (panel) panel.scrollTop = 0;
          await fn();
        }, 250);
      } else {
        track.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = `translateX(-${PANEL_PCT}%)`;
      }
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const removeBibleStack =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.removeBibleStack;

  const removeBookMark =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.appSettings
      ?.removeBookMark;
  const mobileBookLogo =
    tags?.settingsConfigs?.presets?.[getSettingsPreset()]?.mobileBookLogo;

  return (
    <>
      {showMobileSettings && (
        <>
          <div
            className="mobile-settings-overlay"
            onClick={() => setShowMobileSettings(false)}
          />
          <div className="mobile-settings-sheet">
            <MobileSettingsCard onClose={() => setShowMobileSettings(false)} />
          </div>
        </>
      )}
      <div
        ref={swipeViewportRef}
        style={{
          overflow: "hidden",
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        <div
          ref={swipeTrackRef}
          style={{
            display: "flex",
            width: "300%",
            height: "100%",
            transform: "translateX(-33.333%)",
            willChange: "transform",
          }}
        >
          {/* Previous chapter preview panel */}
          <div
            className="pageContainer"
            style={{
              flex: "0 0 33.333%",
              overflowX: "hidden",
              direction,
              pointerEvents: "none",
            }}
          >
            <SidePanelContent data={prevChapterData} />
          </div>

          {/* Current chapter panel */}
          <div
            className="pageContainer"
            ref={currentPanelRef}
            onMouseLeave={handleMouseLeave}
            onMouseEnter={handleMouseEnter}
            onMouseUp={handleMouseUp}
            onClick={hanldNavFunctions}
            onScroll={(e) => {
              os.log("scrolling, closing popups", e);
              globalThis.closePopupSettings();
              const el = e.currentTarget;
              const currentScrollTop = el.scrollTop;
              if (globalThis.IsMobileNow && globalThis.IsMobileNow()) {
                if (swipeNavOccurredRef.current) {
                  // After swipe navigation, keep bars hidden until user scrolls up
                  if (
                    currentScrollTop > 0 &&
                    currentScrollTop < lastScrollTopRef.current
                  ) {
                    // User is scrolling up — clear the flag and show bars
                    globalThis.SetIsBottomBar(false);
                    swipeNavOccurredRef.current = false;
                    document.body.classList.remove("scroll-hide-bars");
                  }
                  // Otherwise keep bars hidden
                } else if (currentScrollTop <= 0) {
                  globalThis.SetIsBottomBar(false);
                  document.body.classList.remove("scroll-hide-bars");
                } else if (
                  currentScrollTop > lastScrollTopRef.current &&
                  currentScrollTop > 50
                ) {
                  globalThis.SetIsBottomBar(true);
                  document.body.classList.add("scroll-hide-bars");
                } else if (currentScrollTop < lastScrollTopRef.current) {
                  globalThis.SetIsBottomBar(false);
                  document.body.classList.remove("scroll-hide-bars");
                }

                lastScrollTopRef.current = currentScrollTop;
              }
            }}
            style={{
              flex: "0 0 33.333%",
              direction,
              overflowX: "hidden",
            }}
          >
            <style>
              {`
        .pageContainer{
          position: relative;
        }
        .toolbar-1 {
          background:${showVerseToolbar && globalThis.IsMobileNow() ? "transparent !important" : ""};
          pointer-events:${showVerseToolbar && globalThis.IsMobileNow() ? "none" : ""};
        }
        .toolbar-item-wrapper{
            display:${showVerseToolbar && globalThis.IsMobileNow() ? "none !important" : ""}
          }
        .mobile-bottom-navbar {
          display:${showVerseToolbar && globalThis.IsMobileNow() ? "none !important" : ""}
        }
        .bookTitle,
        .sectionTitle {
          display:${direction ? "ruby" : null}
        }

        .verse-clicked {
          border-bottom: 2px dashed var(--tertiaryColor) !important;

        }

        .footnote-icon {
          display: inline-flex;
          align-items: center;
          margin-left: 4px;
          font-size: inherit;
          color: var(--spaceSelection);
          cursor: pointer;
          user-select: none;
          vertical-align: baseline;
          position: relative;
          top: 0.1em;
        }

        .footnote-icon .material-symbols-outlined {
          font-size: 0.85em;
        }

        .footnote-icon:hover {
          color: #2030C0;
          transform: scale(1.1);
        }

        .footnote-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10001;
          padding: 20px;
        }

        .footnote-modal {
          background: var(--pageBackground);
          border-radius: 12px;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
        }

        .footnote-modal-header {
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .footnote-modal-header h3 {
          margin: 0;
          font-size: 1.2em;
          color: var(--text1);
        }

        .footnote-modal-close {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: var(--text1);
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .footnote-modal-close:hover {
          background: #f0f0f0;
          color: var(--text1);
        }

        .footnote-modal-content {
          padding: 20px;
          overflow-y: auto;
        }

        .footnote-item {
          margin-bottom: 16px;
          line-height: 1.6;
        }

        .footnote-number {
          font-weight: 600;
          color: var(--spaceSelection);
          margin-right: 8px;
          font-size: 0.95em;
        }

        .footnote-text {
          color: var(--text1);
          font-size: 0.95em;
        }

        /* Mobile Header Styles */
        .mobile-header {
          display: none;
          position: sticky;
          top: 0;
          background: var(--pageBackground);
          border-bottom: 1px solid #e0e0e0;
          padding: 12px 16px;
          z-index: 100;
          transition: transform 0.3s ease;
        }

        body.scroll-hide-bars .mobile-header {
          transform: translateY(-100%);
          overflow: hidden;
        }

        @media (max-width: 768px) {
          .mobile-header {
            display: flex;
          }
        }

        .mobile-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }

        .mobile-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .mobile-header-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text1);
          margin: 0;
        }

        .mobile-header-translation {
          font-size: 12px;
          color: #999;
          margin: 0;
          display: inline;
        }

        .mobile-header-nav {
          display: flex;
          gap: 8px;
        }

        .mobile-nav-button {
          background: none;
          border: none;
          color: var(--spaceSelection);
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          min-height: 36px;
          transition: background 0.2s;
        }

        .mobile-nav-button:active {
          background: rgba(0, 0, 0, 0.05);
        }

        .mobile-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mobile-icon-button {
          background: none;
          border: none;
          color: var(--text1);
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 40px;
          min-height: 40px;
          border-radius: 6px;
          transition: all 0.2s;
          border-radius: 50%;
        }

        .mobile-icon-button:active {
          background: rgba(0, 0, 0, 0.05);
          transform: scale(0.95);
        }

        .mobile-bookmark-icon {
          font-size: 22px;
        }

        .bookTitle {
          @media (max-width: 768px) {
            display: none;
          }
        }

        /* Compact scroll header - shows book/chapter when main header is hidden */
        .mobile-compact-scroll-header {
             display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    text-align: center;
    padding: 0px 13px;
    background: var(--pageBackground);
    z-index: 99;
    font-size: 11px;
    font-weight: 600;
    color: var(--text1);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
        }

        body.scroll-hide-bars .mobile-compact-scroll-header {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .mobile-compact-scroll-header {
            display: block;
          }
        }

        .compact-header-divider {
          margin: 0 6px;
          color: #666;
          font-weight: 400;
        }

        .compact-header-translation {
          font-weight: 400;
          font-size: 12px;
          color: #999;
        }

        .mobile-settings-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 9998;
        }

        .mobile-settings-sheet {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: var(--pageBackground, #fff);
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.12);
          animation: slideUpSheet 0.25s ease-out;
        }

        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        body.mobile-settings-open .mobile-bottom-navbar {
          display: none !important;
        }
         `}
            </style>
            {data && tab && !tabEntered ? (
              <>
                {/* Mobile Header */}
                {globalThis.IsMobileNow && globalThis.IsMobileNow() && (
                  <div className="mobile-header">
                    <div className="mobile-header-content">
                      <div
                        className="mobile-header-left"
                        style={{
                          zoom: (globalThis as any).changes?.uiTextSize || 1,
                        }}
                      >
                        <div>
                          <h1 className="mobile-header-title">
                            <span
                              onClick={(e) => {
                                if (
                                  globalThis.setOpenSidebar &&
                                  globalThis.openSidebar
                                ) {
                                  globalThis.setOpenSidebar(false);
                                  globalThis.selectBookSelectorBook &&
                                    globalThis.selectBookSelectorBook(null);
                                } else {
                                  globalThis.setOpenSidebar &&
                                    globalThis.setOpenSidebar(true);
                                  globalThis.selectBookSelectorBook &&
                                    globalThis.selectBookSelectorBook(
                                      data.bookId
                                    );
                                }
                              }}
                            >
                              {`${data?.book} ${data?.chapter}`}{" "}
                            </span>

                            <p
                              onClick={(e) => {
                                e.stopPropagation();
                                if (
                                  globalThis.setOpenSidebar &&
                                  globalThis.openSidebar
                                ) {
                                  globalThis.setOpenSidebar(false);
                                  globalThis.setSelectingTranslation &&
                                    globalThis.setSelectingTranslation(false);
                                  globalThis.selectBookSelectorBook &&
                                    globalThis.selectBookSelectorBook(null);
                                } else {
                                  globalThis.setOpenSidebar(true);
                                  globalThis.setSelectingTranslation &&
                                    globalThis.setSelectingTranslation(true);
                                  globalThis.selectBookSelectorBook &&
                                    globalThis.selectBookSelectorBook(
                                      data.bookId
                                    );
                                }
                              }}
                              className="mobile-header-translation"
                            >
                              • {data?.shortName || ""}
                            </p>
                          </h1>
                        </div>
                      </div>

                      <div className="mobile-header-right">
                        <button
                          className="mobile-icon-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMobileSettings((prev) => !prev);
                          }}
                          title={t("settings")}
                        >
                          <InfoSettingsIcon />
                        </button>
                      </div>
                    </div>
                    {!removeBookMark &&
                      tab?.id &&
                      masks?.mobileBookmarks &&
                      Object.values(masks.mobileBookmarks)
                        .flat()
                        .includes(tab.id) && (
                        <div className={"mobile-header-bookmark"}>
                          <BookMarkIcon
                            stroke={"var(--selectedSpaceColor)"}
                            fill={"var(--selectedSpaceColor)"}
                          />
                        </div>
                      )}
                  </div>
                )}
                <div
                  onClick={(e) => {
                    if (globalThis.setOpenSidebar && globalThis.openSidebar) {
                      globalThis.setOpenSidebar(false);
                      globalThis.selectBookSelectorBook &&
                        globalThis.selectBookSelectorBook(null);
                    } else {
                      globalThis.setOpenSidebar &&
                        globalThis.setOpenSidebar(true);
                      globalThis.selectBookSelectorBook &&
                        globalThis.selectBookSelectorBook(data.bookId);
                    }
                  }}
                  style={{ "pointer-events": isDragging ? "none" : null }}
                  className="bookTitle"
                  id="bookTitle"
                >
                  {`${data?.book} ${data?.chapter}`}{" "}
                  <span
                    style={{
                      fontSize: "24px",
                      color:
                        "color-mix(in srgb, var(--text1), transparent 40%)",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (globalThis.setOpenSidebar && globalThis.openSidebar) {
                        globalThis.setOpenSidebar(false);
                        globalThis.setSelectingTranslation &&
                          globalThis.setSelectingTranslation(false);
                        globalThis.selectBookSelectorBook &&
                          globalThis.selectBookSelectorBook(null);
                      } else {
                        globalThis.setOpenSidebar(true);
                        globalThis.setSelectingTranslation &&
                          globalThis.setSelectingTranslation(true);
                        globalThis.selectBookSelectorBook &&
                          globalThis.selectBookSelectorBook(data.bookId);
                      }
                    }}
                  >{` / ${data?.shortName}`}</span>
                </div>
                {showHeading[activeSpace] && (
                  <div style={{ height: "1rem" }}></div>
                )}
                {data &&
                  data.content.map((e) => {
                    return (
                      <>
                        <div
                          style={{
                            "pointer-events": isDragging ? "none" : null,
                          }}
                        >
                          <Section
                            {...e}
                            data={data}
                            inHold={inHold}
                            setInHold={setInHold}
                            book={data.book}
                            chapter={data.chapter}
                            blinker={blinker}
                            setRef={refs}
                            holded={holded}
                            clickedVersesContext={clickedVersesContext}
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
                            setClickedVerses={setClickedVerses}
                            setShowVerseToolbar={setShowVerseToolbar}
                            footnotes={footnotes}
                            setActiveFootnote={setActiveFootnote}
                            setShowFootnoteModal={setShowFootnoteModal}
                          />
                        </div>
                      </>
                    );
                  })}
                <div style={{ height: "120px" }}></div>
                <div
                  style={{
                    margin: "auto",
                    width: "80%",
                    height: "1px",
                    background: "gray",
                  }}
                ></div>
                {removeBibleStack ? null : (
                  <div
                    style={{
                      width: "50%",
                      display: "flex",
                      "align-items": "center",
                      "justify-content": "center",
                      position: "relative",
                    }}
                  >
                    <PageToolbar tab={tab} panelId={panelId} />
                  </div>
                )}
                <div style={{ height: "160px" }}></div>
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
                    // backgroundColor: "#f8f9fa",
                  }}
                  className={`pageContainer ${
                    tabEntered ? "tabEntered" : "tabDrop"
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
                        globalThis.MakingNewTab = true;
                      }}
                      style={{
                        fontSize: "24px",
                        marginBottom: "20px",
                        color: "#333",
                      }}
                    >
                      <img
                        className="coloredIcon"
                        style={{ width: "50px" }}
                        src={
                          mobileBookLogo ||
                          "https://res.cloudinary.com/dfbtwwa8p/image/upload/v1755365776/717a8527988cca7e0bdc9449ec68581a8400b977_vqc7mx.png"
                        }
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
                      {!removeBibleStack && (
                        <PageToolbar
                          panelId={panelId}
                          tab={tab}
                          path="showInStarterToolbar"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Next chapter preview panel */}
          <div
            className="pageContainer"
            style={{
              flex: "0 0 33.333%",
              overflowX: "hidden",
              direction,
              pointerEvents: "none",
            }}
          >
            <SidePanelContent data={nextChapterData} />
          </div>
        </div>
      </div>

      {/* Verse toolbar rendered outside the carousel so position:fixed works relative to the viewport */}
      {showVerseToolbar &&
        !(role === "follower" && config.onlyHostHighlight) && (
          <div
            onMouseDown={() => {
              if (!globalThis.IsMobileNow()) {
                setUserMovedToolbar(true);
                setDragToolbar(true);
              }
            }}
            onMouseUp={() => setDragToolbar(false)}
            style={
              globalThis.IsMobileNow()
                ? {
                    position: "fixed",
                    left: "50%",
                    bottom: "20px",
                    transform: "translateX(-50%)",
                    zIndex: 10000,
                    width: "90%",
                    maxWidth: "420px",
                    cursor: "default",
                    userSelect: "none",
                  }
                : {
                    position: "fixed",
                    left: toolbarPos.x - 50,
                    top: toolbarPos.y,
                    zIndex: 10000,
                    cursor: dragToolbar ? "grabbing" : "grab",
                    userSelect: "none",
                  }
            }
            className="verse-toolbar"
          >
            <VerseToolbar
              clickedVerses={clickedVerses}
              showVerseToolbar={showVerseToolbar}
              toggleVerseHighlight={toggleVerseHighlight}
              book={data?.book}
              setClickedVerses={setClickedVerses}
              chapter={data?.chapter}
              highlighted={highlighted}
              clickedVersesContext={clickedVersesContext}
              onColorSelect={handleColorSelect}
              activeSpace={activeSpace}
              spaces={spaces}
              onClose={() => {
                setClickedVerses([]);
                setTimeout(() => {
                  setShowVerseToolbar(false);
                }, 5);
              }}
            />
          </div>
        )}

      {/* Compact scroll header - shows book/chapter info when scrolled down on mobile */}
      {globalThis.IsMobileNow && globalThis.IsMobileNow() && data && (
        <div className="mobile-compact-scroll-header">
          {showVerseToolbar && clickedVerses.length > 0 ? (
            <>
              {`Selected: ${data?.book} ${data?.chapter}:${[...clickedVerses].sort((a, b) => a - b).join(",")}`}
              <span className="compact-header-divider">|</span>
              <span className="compact-header-translation">
                {data?.shortName || ""}
              </span>
            </>
          ) : (
            <>
              {`${data?.book} ${data?.chapter}`}
              <span className="compact-header-divider">|</span>
              <span className="compact-header-translation">
                {data?.shortName || ""}
              </span>
            </>
          )}
        </div>
      )}

      {/* Footnote Modal rendered outside the carousel so position:fixed works relative to the viewport */}
      {showFootnoteModal && activeFootnote && (
        <div
          className="footnote-modal-overlay"
          onClick={() => {
            setShowFootnoteModal(false);
            setActiveFootnote(null);
          }}
        >
          <div className="footnote-modal" onClick={(e) => e.stopPropagation()}>
            <div className="footnote-modal-header">
              <h3>
                {`${activeFootnote.book} ${activeFootnote.chapter}:${activeFootnote.verse}`}
              </h3>
              <button
                className="footnote-modal-close"
                onClick={() => {
                  setShowFootnoteModal(false);
                  setActiveFootnote(null);
                }}
              >
                ✕
              </button>
            </div>
            <div className="footnote-modal-content">
              {activeFootnote.footnotes.map((footnote, idx) => {
                if (!footnote) return null;

                const footnoteText =
                  footnote.text || footnote.note || footnote.content || "";
                if (!footnoteText) return null;

                return (
                  <div key={idx} className="footnote-item">
                    <span className="footnote-number">
                      {footnote.caller || idx + 1}
                    </span>
                    <span className="footnote-text">{footnoteText}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SidePanelContent({ data }: { data: any }) {
  if (!data?.content) return null;
  return (
    <>
      <div className="bookTitle">{`${data.book} ${data.chapter}`}</div>
      {data.content.map((section: any, i: number) => (
        <div key={i}>
          {section.heading && (
            <div className="sectionTitle">{section.heading}</div>
          )}
          <div className="sectionCover">
            {section.verses?.map((verse: any, j: number) => {
              if (verse.lineBreak) return <br key={j} />;
              return (
                <span key={j}>
                  {verse.verseNumber != null && (
                    <span className="sectionTextNumber">
                      {verse.verseNumber}
                    </span>
                  )}
                  <span className="sectionText"> {verse.text}</span>{" "}
                </span>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ height: "160px" }} />
    </>
  );
}

function PageToolbar({ panelId, tab, path = "showInPageToolbar" }) {
  const { tools } = useBibleContext();

  const visibleTools = tools.filter((tool) => tool[path]);
  if (visibleTools.length === 0) return null;

  return (
    <div
      onClick={() => {
        globalThis.LastClickedPanelUpdate = panelId;
      }}
      className="thePageToolbar"
    >
      {visibleTools.map((tool) => (
        <div
          onClick={(e) => {
            globalThis.LastClickedPanelUpdate = panelId;
            setTimeout(() => {
              tool.onClick({ mode: !tab ? "panel" : "" });
            }, 5);
          }}
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
  data,
  heading,
  hebrew_subtitle,
  commandHighlight,
  setCommandHighlight,
  clickedVersesContext,
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
  setClickedVerses,
  setShowVerseToolbar,
  footnotes,
  setActiveFootnote,
  setShowFootnoteModal,
}) {
  const selectAllHeadingVerses = useCallback(() => {
    const verseNumbers = verses.map((v) => v.verseNumber);

    setClickedVerses((prev) => {
      const merged = [...new Set([...prev, ...verseNumbers])].sort(
        (a, b) => a - b
      );

      // Build unified text
      const text = merged
        .map((v) => {
          const verseObj = verses.find((vv) => vv.verseNumber === v);
          return verseObj?.text || "";
        })
        .join(" ");

      // Show verse toolbar
      setShowVerseToolbar(true);
      setLastSelectedVerse(merged[merged.length - 1]);

      // Update context
      setContextData({
        verses: merged,
        verse: text,
        text,
        book,
        chapter,
        reference: `${book} ${chapter}:${merged[0]}-${merged[merged.length - 1]}`,
      });

      return merged;
    });
  }, [
    verses,
    setClickedVerses,
    setShowVerseToolbar,
    setLastSelectedVerse,
    setContextData,
    book,
    chapter,
  ]);
  const { eventHandlers, shouldSuppressClick } = useHoldAction(
    selectAllHeadingVerses,
    1500 // 1.5 seconds hold
  );

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
    border: "2px solid var(--spaceSelection)",
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

  const getVerseFootnotes = (verseNumber) => {
    if (!footnotes || !Array.isArray(footnotes)) return [];

    // Filter footnotes that match this verse number
    return footnotes.filter(
      (footnote) => footnote?.reference?.verse === verseNumber
    );
  };

  const parseTextWithFootnotes = (text, verseNumber) => {
    const verseFootnotes = getVerseFootnotes(verseNumber);
    if (!verseFootnotes || verseFootnotes.length === 0) {
      return text;
    }

    // Parse text and insert footnote markers where needed
    // The footnote format from API typically includes markers in the text
    let processedText = text;
    const parts = [];
    let lastIndex = 0;

    // If footnotes exist, they usually have a 'noteId' or marker in the original text
    verseFootnotes.forEach((footnote, idx) => {
      const marker = footnote.marker || footnote.noteId;
      if (marker && typeof processedText === "string") {
        const markerRegex = new RegExp(`\\[${marker}\\]|${marker}`, "g");
        const matches = [...processedText.matchAll(markerRegex)];

        matches.forEach((match) => {
          if (match.index > lastIndex) {
            parts.push({
              type: "text",
              content: processedText.slice(lastIndex, match.index),
            });
          }
          parts.push({
            type: "footnote",
            marker: idx + 1,
            content: footnote.text || footnote.note || "",
          });
          lastIndex = match.index + match[0].length;
        });
      }
    });

    if (lastIndex < processedText.length) {
      parts.push({
        type: "text",
        content: processedText.slice(lastIndex),
      });
    }

    return parts.length > 0 ? parts : text;
  };

  const renderVerseText = (verse) => {
    const verseKey = `${book}-${chapter}-${verse.verseNumber}`;
    const hasWordHighlights =
      wordHighlights[verseKey] &&
      Object.keys(wordHighlights[verseKey]).length > 0;

    const verseFootnotes = getVerseFootnotes(verse.verseNumber);
    const hasFootnotes = verseFootnotes && verseFootnotes.length > 0;

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
            className={`clickableCursor highlightened ${
              isActive ? "highlighted-word" : ""
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
            const attributes = part.highlightConfig.createAttributes(
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
  const { showHeading, showVerses, showFootnotes } = useBibleContext();
  const { activeSpace } = useTabsContext();
  return (
    <div>
      {showHeading[activeSpace] ? (
        <div
          className="sectionTitle"
          {...eventHandlers}
          onClick={(e) => {
            if (shouldSuppressClick()) return; // Prevent normal click if hold already triggered

            shout("onHeadingClick", { heading });
          }}
        >
          {heading}
        </div>
      ) : (
        <div style={{ height: "1em" }} />
      )}

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
              return <p className="verseLineBreak"></p>;
            }

            const [c, setC] = useState(false);
            const isActive = verse.verseNumber.toString() === activeVerse;
            const maxClicked = clickedVerses?.length
              ? Math.max(...clickedVerses)
              : null;

            const commandAnchorVerse = maxClicked || lastSelectedVerse;

            const shouldShowCommands =
              showCommands && commandAnchorVerse === verse.verseNumber;

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
                    handleVerseClick(verse.verseNumber);
                    SetShowCommands(false);
                    // setInHold(verse.verseNumber);
                    // setLastSelectedVerse(verse.verseNumber);

                    setContextData({
                      verse: verse.text,
                      reference: `${book} ${chapter}:${verse.verseNumber}`,
                      book,
                      chapter,
                      verses: [verse.verseNumber],
                    });
                    // shout("onVeresRightClick", {
                    //   verseNumber: verse.verseNumber,
                    //   text: verse.text,
                    //   chapter,
                    //   book,
                    //   highlighted: highlighted?.[verse.verseNumber],
                    // });
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log(data, "data in verse click");
                    if (globalThis?.SetCurrentReference) {
                      shout("ToggleReference", {
                        bookId: data?.bookId,
                        chapter,
                        verse: verse.verseNumber,
                        baseUrl: data?.baseUrl,
                        translation: data?.translation,
                        bookName: data?.book,
                      });
                    }
                    handleVerseClick(verse.verseNumber);
                    SetShowCommands(false);
                    const highlightKey = `${book}-${chapter}-${verse.verseNumber}`;
                    os.log({
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                      chapter,
                      book,
                      highlighted: highlighted?.[highlightKey],
                    });
                    const verseClickData = {
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                      chapter,
                      book,
                      highlighted: highlighted?.[highlightKey],
                    };
                    EmitData("onVerseClick", verseClickData);
                    shout("onVerseClick", verseClickData);
                  }}
                  style={{
                    "background-color":
                      highlighted?.[
                        `${book}-${chapter}-${verse.verseNumber}`
                      ] || commandHighlight.includes(verse.verseNumber)
                        ? highlighted?.[
                            `${book}-${chapter}-${verse.verseNumber}`
                          ]?.color
                        : "transparent",
                    color:
                      highlighted?.[
                        `${book}-${chapter}-${verse.verseNumber}`
                      ] || commandHighlight.includes(verse.verseNumber)
                        ? wordHighlightsTC
                        : "",
                    transition: "background-color 0.2s ease, border 0.2s ease",
                    "border-radius":
                      highlighted?.[
                        `${book}-${chapter}-${verse.verseNumber}`
                      ] || isClicked
                        ? "3px"
                        : "0",
                    padding:
                      highlighted?.[
                        `${book}-${chapter}-${verse.verseNumber}`
                      ] || isClicked
                        ? ""
                        : "0",
                    margin:
                      highlighted?.[
                        `${book}-${chapter}-${verse.verseNumber}`
                      ] || isClicked
                        ? ""
                        : "0",
                    "text-decoration":
                      inHold === verse.verseNumber || isTextDecorUnderline
                        ? "underline"
                        : "",
                    "text-decoration-style":
                      inHold === verse.verseNumber || isTextDecorUnderline
                        ? "dotted"
                        : "",
                    borderBottom: isClicked
                      ? "2px dashed var(--spaceSelection)"
                      : "none",
                  }}
                  className={`sectionText ${
                    verse?.verseNumber.toString() === activeVerse.toString()
                      ? "highlighted"
                      : ""
                  } ${
                    highlighted?.[`${book}-${chapter}-${verse.verseNumber}`]
                      ? "verse-highlighted"
                      : ""
                  } ${isClicked ? "verse-clicked" : ""}`}
                >
                  {!c ? (
                    (() => {
                      const verseContent = renderVerseText(verse);
                      const verseNumberElement = showVerses[activeSpace] ? (
                        <span
                          className={`sectionTextNumber ${
                            globalThis.studyNotesPresent
                              ? "clickableCursor"
                              : ""
                          }`}
                          onClick={() => {
                            if (globalThis.studyNotesPresent) {
                              HighlightStudyNoteSection(verse?.verseNumber);
                            }
                          }}
                          onPointerEnter={(e) => {
                            globalThis.showRefModal = true;
                            setTimeout(() => {
                              if (globalThis.showRefModal) {
                                shout("toggleReferenceModal", {
                                  book,
                                  chapter,
                                  verse: verse.verseNumber,
                                  mouseEvent: e,
                                  ...data,
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
                      ) : null;

                      // Keep verse number with first word using nowrap span
                      // Only wrap the verse number + first word together
                      if (typeof verseContent === "string") {
                        const firstSpaceIdx = verseContent.indexOf(" ");
                        if (firstSpaceIdx > 0) {
                          const firstWord = verseContent.slice(
                            0,
                            firstSpaceIdx
                          );
                          const restText = verseContent.slice(firstSpaceIdx);
                          return (
                            <>
                              <span style={{ whiteSpace: "nowrap" }}>
                                {verseNumberElement}
                                {firstWord}
                              </span>
                              {restText}
                              {(() => {
                                const verseFootnotes = getVerseFootnotes(
                                  verse.verseNumber
                                );
                                if (
                                  showFootnotes[activeSpace] &&
                                  verseFootnotes &&
                                  verseFootnotes.length > 0
                                ) {
                                  return (
                                    <span
                                      className="footnote-icon"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFootnote({
                                          verse: verse.verseNumber,
                                          footnotes: verseFootnotes,
                                          book,
                                          chapter,
                                        });
                                        setShowFootnoteModal(true);
                                      }}
                                      title={t("viewFootnotes")}
                                    >
                                      <span class="material-symbols-outlined">
                                        info
                                      </span>
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </>
                          );
                        }
                        // Single word verse
                        return (
                          <>
                            {verseNumberElement}
                            {verseContent}
                            {(() => {
                              const verseFootnotes = getVerseFootnotes(
                                verse.verseNumber
                              );
                              if (
                                showFootnotes[activeSpace] &&
                                verseFootnotes &&
                                verseFootnotes.length > 0
                              ) {
                                return (
                                  <span
                                    className="footnote-icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveFootnote({
                                        verse: verse.verseNumber,
                                        footnotes: verseFootnotes,
                                        book,
                                        chapter,
                                      });
                                      setShowFootnoteModal(true);
                                    }}
                                    title={t("viewFootnotes")}
                                  >
                                    <span class="material-symbols-outlined">
                                      info
                                    </span>
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </>
                        );
                      }

                      // For JSX array content, just render inline without nowrap wrapper
                      // The text will flow naturally
                      return (
                        <>
                          {verseNumberElement}
                          {verseContent}
                          {(() => {
                            const verseFootnotes = getVerseFootnotes(
                              verse.verseNumber
                            );
                            if (
                              showFootnotes[activeSpace] &&
                              verseFootnotes &&
                              verseFootnotes.length > 0
                            ) {
                              return (
                                <span
                                  className="footnote-icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveFootnote({
                                      verse: verse.verseNumber,
                                      footnotes: verseFootnotes,
                                      book,
                                      chapter,
                                    });
                                    setShowFootnoteModal(true);
                                  }}
                                  title={t("viewFootnotes")}
                                >
                                  <span class="material-symbols-outlined">
                                    info
                                  </span>
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <span
                        style={{
                          display: showVerses[activeSpace] ? "" : "none",
                        }}
                        className={`sectionTextNumber ${
                          globalThis.studyNotesPresent ? "clickableCursor" : ""
                        }`}
                        onClick={() => {
                          if (globalThis.studyNotesPresent) {
                            HighlightStudyNoteSection(verse?.verseNumber);
                          }
                        }}
                        onPointerEnter={(e) => {
                          globalThis.showRefModal = true;
                          setTimeout(() => {
                            if (globalThis.showRefModal) {
                              shout("toggleReferenceModal", {
                                book,
                                chapter,
                                verse: verse.verseNumber,
                                mouseEvent: e,
                                ...data,
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
                      <MiniTextEditor
                        initialHtml={verse.text}
                        onChange={(html) => console.log("Updated HTML:", html)}
                      />
                    </>
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
                    <ConfigurableFunctionCommands
                      contextData={clickedVersesContext}
                      clickedVerses={clickedVerses}
                    />
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
        onResize={() => {}}
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
  console.log("active tab in the page", panelId, activeTab);
  const [enableEditor, setEnableEditor] = useState(false);
  useEffect(() => {}, [enableEditor]);
  const [data, setData] = useState(() => {
    if (activeTab) {
      return getCachedBibleData(
        activeTab?.data?.translation,
        activeTab?.data?.bookId,
        activeTab?.data?.chapter
      );
    } else {
      return getCachedBibleData(
        tab?.data?.translation,
        tab?.data?.bookId,
        tab?.data?.chapter
      );
    }
  });
  const [deleteTab, setDeleteTab] = useState(false);
  if (tab) globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;
  useEffect(() => {
    os.addBotListener(thisBot, "onTabDelete", (data) => {
      os.log("tab delete event received in thePage", data, panelId, activeTab);
      setEnableEditor(false);
      setDeleteTab(data);
    });
  }, []);
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
            enableEditor={enableEditor}
            setEnableEditor={setEnableEditor}
            tab={activeTab}
            panelId={panelId}
            setPanalApp={setPanalApp}
            deleteTab={deleteTab}
            setDeleteTab={setDeleteTab}
          />
        }
        tab={activeTab}
      />
      <style>{getStyleOf("page.css")}</style>
    </>
  );
};

export { ThePage, ThePageWithEditor };
