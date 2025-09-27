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

// Additions ------>
// import { StudyNotes, StudyNotesWithPanel } from 'app.sn_components.studyNotes';

import { ConfigurableFunctionCommands } from "app.components.commands";

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

  const commandsRef = useRef(null);

  useEffect(() => {
    if (!T) globalThis.CurrentPanelAvailable = panelId;
    else globalThis.CurrentPanelAvailable = null;
  }, [T]);
  const [tabEntered, setTabEntered] = useState(false);
  const { updateTab, tabs, setActiveTab } = useTabsContext();
  const { isDragging, setIsDragging, Element } = useMouseMove();
  const { navFunctions, setNavFunctions } = useBibleContext();
  const [inHold, setInHold] = useState();
  const [contextData, setContextData] = useState({
    verse:
      "And God said, 'Let there be light,' and there was light. And God saw that the light was good, and He separated the light from the darkness. God called the light 'day,' and the darkness He called 'night.' And there was evening, and there was morning—the first day.",
    reference: "Genesis 1:3-5",
    book: "Genesis",
    chapter: 1,
    verses: [3, 4, 5],
  });
  // Add state for text selection and commands
  const [selectedText, setSelectedText] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [lastSelectedVerse, setLastSelectedVerse] = useState(null);

  // Add state for word highlights
  const [wordHighlights, setWordHighlights] = useState({});

  const [bible, setBible] = useState();
  if (tab) globalThis[`SetEnableEditorOf${tab?.id}`] = setEnableEditor;
  async function loadData() {
    if (!tab) return;
    const bible = new BibleDataManager({
      tabId: tab?.id,
      translation: tab.data.translation,
      bookId: tab.data.bookId,
      chapter: tab.data.chapter,
    });
    setBible(bible);

    console.log("bible data: ", bible);

    await bible.fetch();

    // Additional Data ----------->
    globalThis.BookId = bible.bookId;

    const { data, loading, error } = bible.getState();
    console.log(data, tab, "the data loaded");

    setData(data);
    // setContent(data)
    // await bible.openNext();
    globalThis.refreshScrollers && globalThis.refreshScrollers();
    // await bible.changeTranslation('KJV');
  }
  useEffect(() => {
    loadData();
    // after you change something that affects height:
  }, [tab]);
  useEffect(() => {
    if (data) {
      hanldNavFunctions();
      SetShowCommands(false);
      updateTab(tab?.id, data);
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
    }
  }, [data]);

  useEffect(() => {
    globalThis.NavFunctions = navFunctions;
    globalThis.BibleData = data;
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
      // Use TreeWalker to collect all .sectionText spans inside selection
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
        // setShowCommands(false);
        setSelectedText(selection.toString());
        setLastSelectedVerse(selectedArray[selectedArray.length - 1]);
        setContextData({
          verse: window.getSelection().toString(),
          reference: `${data?.book} ${data?.chapter}:${selectedArray[0]}-${
            selectedArray[selectedArray.length - 1]
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

  // const {
  //     data,
  //     footnotes,
  //     loading,
  //     open,
  //     // translation,
  //     openNextChapter,
  //     openPrevChapter,
  //     changeTranslation,
  // } = useBibleData({
  //     initialTranslation: tab?.data?.translation,
  //     initialBookId: tab?.data?.bookId,
  //     initialChapter: tab?.data?.chapter,
  //     tab: T,
  // });
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

    // Additions ------>
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

    // Additions ------>
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
  async function open(bookId, chapter, translation = null) {
    try {
      await bible.open(bookId, chapter, (translation = null));
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
      //   await bible.open(bookId, chapter, (translation = null));
      setData(bible.data);
    }
  }
  async function changeTranslation(id) {
    await bible.changeTranslation(id);
    setData(bible.data);
  }

  // Add word highlighting functions
  const highlightWords = useCallback(
    (config) => {
      /*
        UPDATED CONFIG BEHAVIOR
        -----------------------
        - If any of book / chapter / verse is null, it will default to the CURRENT data in view and expand as follows:
            book: null   -> use current data.book
            chapter: null-> use current data.chapter
            verse: null  -> apply to ALL verses in the current data (current chapter's verses)
        - verse may be a single number or an array of numbers. If omitted or null, all verses are targeted.

        Example:
        HighlightWords({
            book: null,
            chapter: null,
            verse: null,
            words: ["light", "God", "LORD"],
            color: "#000",
            backgroundColor: "#ffeb3b",
            onClick: (word, verseNumber) => console.log(word, verseNumber)
        })
        */
      if (!tab?.id) return;

      // Derive targets from current data when null
      const targetBook = config.book == null ? data?.book : config.book;
      const targetChapter =
        config.chapter == null ? data?.chapter : config.chapter;

      // Build list of verse numbers to apply to
      let targetVerses = [];
      if (config.verse == null) {
        // Apply to all verses visible in current data
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

      // Guard: if we still have no verses, do nothing
      if (!targetVerses.length) return;

      const wordsToAdd = (config.words || []).filter(Boolean);
      if (!wordsToAdd.length) return;

      setWordHighlights((prev) => {
        const newHighlights = { ...prev };

        // Ensure container for this tab in global store
        if (!globalThis.wordHighlights) globalThis.wordHighlights = {};
        if (!globalThis.wordHighlights[tab?.id])
          globalThis.wordHighlights[tab?.id] = {};

        // Apply highlights to each targeted verse
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

        // Persist per-tab
        globalThis.wordHighlights[tab?.id] = newHighlights;
        return newHighlights;
      });
    },
    [data, tab?.id]
  );

  const removeWordHighlight = useCallback(
    (config) => {
      /*
        Original behavior preserved.
        */
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

          // Remove verse key if no words left
          if (Object.keys(newHighlights[key]).length === 0) {
            delete newHighlights[key];
          }
        } else {
          // Remove all words for this verse
          delete newHighlights[key];
        }

        // Update global storage
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
    // Add global word highlighting functions for developers
    globalThis.HighlightWords = highlightWords;
    globalThis.RemoveWordHighlight = removeWordHighlight;
    globalThis.ClearAllWordHighlights = clearAllWordHighlights;
    shout("onBookChanged", { ...data, tabId: tab?.id });
  }, [data]);
  function hanldNavFunctions() {
    //  bible.openNext()
    // console.log(bible, 'nextChapterData')
    if (tab && tab?.id) setActiveTab(tab?.id);
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
    globalThis.SetInHold = setInHold;
    globalThis.SetShowCommands = setShowCommands;

    // Add global word highlighting functions for developers
    globalThis.HighlightWords = highlightWords;
    globalThis.RemoveWordHighlight = removeWordHighlight;
    globalThis.ClearAllWordHighlights = clearAllWordHighlights;

    //     os.log(tab)
    //     if (globalThis.GetBooksDataForMenu) {
    //         os.log(`https://bible.helloao.org/api/${data?.translation}/books.json`)
    //         globalThis.GetBooksDataForMenu(`https://bible.helloao.org/api/${data?.translation}/books.json`, data?.translation)
    //     }

    // Additions ------>
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
    // return
    os.log("Update-data", tab);
    setTab(tab);
    hanldNavFunctions();
    // globalThis.PanelTabsMap[id]
    // open(tab.data.bookId, tab.data.chapter, tab.data.translation)
  }
  globalThis.UpdateTab = Update;

  const [blinker, setBlinker] = useState({});
  const [selected, setSelected] = useState({});
  const [holded, setHolded] = useState({});

  useEffect(() => {
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
  // const refs = {}
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
      console.log("vNumber", vNumber);
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

  // Load existing word highlights for this tab
  useEffect(() => {
    if (!globalThis.wordHighlights) {
      globalThis.wordHighlights = {};
    }
    if (tab?.id && globalThis.wordHighlights[tab?.id]) {
      setWordHighlights(globalThis.wordHighlights[tab?.id]);
    }
  }, [tab?.id]);

  const [highlightOnce, setHighlightOnce] = useState(false);

  const [highlighted, setHighlighted] = useState({});

  // Add this useEffect after the existing globalThis assignments:
  useEffect(() => {
    // Initialize tab highlights if not exists
    if (!globalThis.tabHighlights) {
      globalThis.tabHighlights = {};
    }
    if (tab?.id && !globalThis.tabHighlights[tab?.id]) {
      globalThis.tabHighlights[tab?.id] = {};
    }

    // Load existing highlights for this tab
    if (tab?.id && globalThis.tabHighlights[tab?.id]) {
      setHighlighted(globalThis.tabHighlights[tab?.id]);
    }

    globalThis.SetHighlighted = setHighlighted;

    return () => {
      globalThis.SetHighlighted = null;
    };
  }, [tab?.id, highlighted]);

  // Add these helper functions in ThePage component:
  const toggleVerseHighlight = useCallback(
    (verseNumbers) => {
      if (!tab?.id) return;

      const numbers = Array.isArray(verseNumbers)
        ? verseNumbers
        : [verseNumbers];

      setHighlighted((prev) => {
        const newHighlighted = { ...prev };

        // Check if all verses in this group are already highlighted together
        const allHighlighted = numbers.every((vn) => newHighlighted[vn]);
        const groupId = Date.now(); // Unique group ID for new highlights

        if (allHighlighted) {
          // All are highlighted → unhighlight them as a group
          numbers.forEach((vn) => {
            delete newHighlighted[vn];
          });
        } else {
          // Highlight them together with same groupId
          numbers.forEach((vn) => {
            newHighlighted[vn] = {
              timestamp: groupId,
              book: data?.book,
              chapter: data?.chapter,
              group: groupId,
            };
          });
        }

        // Update global storage
        if (!globalThis.tabHighlights) {
          globalThis.tabHighlights = {};
        }
        globalThis.tabHighlights[tab?.id] = newHighlighted;

        return newHighlighted;
      });
    },
    [tab?.id, data?.book, data?.chapter]
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
        // Chrome
        selection.empty();
      } else if (selection.removeAllRanges) {
        // Firefox / Edge
        selection.removeAllRanges();
      }
    } else if (document.selection) {
      // IE
      document.selection.empty();
    }
  }
  globalThis.ClearUserSelection = clearUserSelection;
  return (
    <div
      className="pageContainer"
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onMouseUp={handleMouseUp}
      onClick={hanldNavFunctions}
    >
      <link
        href="https://fonts.cdnfonts.com/css/helvetica-neue-55"
        rel="stylesheet"
      />
      <link href="https://fonts.cdnfonts.com/css/montserrat" rel="stylesheet" />
      <link
        href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap"
        rel="stylesheet"
      />
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
                // backgroundColor: 'white',
                borderRadius: "12px",
                // boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
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

// Additions ------>
/**
 * Split text into chunks of words vs. exact section-keys,
 * matching any multi-word subphrase (≥2 words) *and* any single-word keys.
 */
function splitBySectionKeys(text, verseSectionMap) {
  const stripRe = /[.,'"""'']/g;

  // 1) Build a map of all subphrases (length ≥2) and single-word keys → parent key
  const subphraseMap = {};
  let maxLen = 1;

  Object.keys(verseSectionMap).forEach((fullKey) => {
    // normalize the key
    const normalized = fullKey.replace(stripRe, "").trim();
    const wordsKey = normalized.split(/\s+/);
    const n = wordsKey.length;
    maxLen = Math.max(maxLen, n);

    if (n === 1) {
      // single-word key
      subphraseMap[normalized] = fullKey;
    } else {
      // all contiguous subphrases of length ≥2
      for (let L = n; L >= 2; L--) {
        for (let start = 0; start + L <= n; start++) {
          const phrase = wordsKey.slice(start, start + L).join(" ");
          subphraseMap[phrase] = fullKey;
        }
      }
    }
  });

  // 2) Tokenize & normalize your text
  const words = text.split(/\s+/);
  const norm = words.map((w) => w.replace(stripRe, ""));

  // 3) Scan through words greedily
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    let matchLen = 0,
      matchKey = null;

    // try lengths from maxLen down to 1
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
      // emit matched chunk
      chunks.push({
        text: words.slice(i, i + matchLen).join(" "),
        isSection: true,
        key: matchKey,
      });
      i += matchLen;
    } else {
      // no match → emit/merge single plain word
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

// Helper function to split text by word highlights
function splitByWordHighlights(
  text,
  wordHighlights,
  book,
  chapter,
  verseNumber
) {
  if (!wordHighlights || Object.keys(wordHighlights).length === 0) {
    return [{ text, isHighlighted: false }];
  }

  const verseKey = `${book}-${chapter}-${verseNumber}`;
  const highlights = wordHighlights[verseKey];

  if (!highlights || Object.keys(highlights).length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Create regex pattern for all highlighted words
  const highlightWords = Object.keys(highlights);
  if (highlightWords.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  // Sort by length (longest first) to handle overlapping words correctly
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
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isHighlighted: false,
      });
    }

    // Add the highlighted word
    const matchedWord = match[1].toLowerCase();
    parts.push({
      text: match[1],
      isHighlighted: true,
      highlightConfig: highlights[matchedWord],
    });

    lastIndex = match.index + match[1].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isHighlighted: false,
    });
  }

  return parts;
}

// Replace the Section component with this updated one:

function Section({
  heading,
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
}) {
  const stripRe = /[.,'"""'']/g;
  const normalize = (k) => k.replace(stripRe, "").toLowerCase().trim();

  // read the active key
  const [activeKey, setActiveKey] = useState(
    globalThis.HighlightedSectionKey || ""
  );
  const [activeVerse, setActiveVerse] = useState(
    globalThis.HighlightedVerseNumber || ""
  );

  // 1) build refs once per verse
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

  // inside your Section component, before the return:
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

  // Create word highlight chunks map
  const wordChunksMap = useMemo(() => {
    const result = {};
    verses.forEach((v) => {
      result[v.verseNumber] = splitByWordHighlights(
        v.text,
        wordHighlights,
        book,
        chapter,
        v.verseNumber
      );
    });
    return result;
  }, [verses, wordHighlights, book, chapter]);

  // Get context data for the selected verse
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

  // Function to render verse text with word highlights
  const renderVerseText = (verse) => {
    const verseKey = `${book}-${chapter}-${verse.verseNumber}`;
    const hasWordHighlights =
      wordHighlights[verseKey] &&
      Object.keys(wordHighlights[verseKey]).length > 0;

    if (globalThis.studyNotesPresent) {
      // Use section-based rendering
      return (chunksMap[verse.verseNumber] || []).map((part, i) => {
        if (!part.isSection) {
          // For non-section text, apply word highlights if any
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
                      color: wordPart.highlightConfig.color,
                      backgroundColor: wordPart.highlightConfig.backgroundColor,
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
      // Use word highlighting only
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
                  marginRight: "-0.25em",
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
            const [c, setC] = useState(false);
            const isActive = verse.verseNumber.toString() === activeVerse;
            const shouldShowCommands =
              showCommands && lastSelectedVerse === verse.verseNumber;
            const isTextDecorUnderline =
              holded?.[verse.verseNumber] ||
              selected[verse.verseNumber] ||
              blinker[verse.verseNumber];

            return (
              <span key={verse.verseNumber}>
                <span
                  ref={verseRefs[verse.verseNumber]}
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
                  onClick={() => {
                    SetShowCommands(false);
                    os.log({
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                      chapter,
                      book,
                      highlighted: highlighted?.[verse.verseNumber],
                    });
                    shout("onVerseClick", {
                      verseNumber: verse.verseNumber,
                      text: verse.text,
                      chapter,
                      book,
                      highlighted: highlighted?.[verse.verseNumber],
                    });
                  }}
                  style={{
                    "background-color":
                      highlighted?.[verse.verseNumber] ||
                      commandHighlight.includes(verse.verseNumber)
                        ? "#ffeb3b"
                        : "transparent",
                    transition: "background-color 0.2s ease",
                    "border-radius": highlighted?.[verse.verseNumber]
                      ? "3px"
                      : "0",
                    padding: highlighted?.[verse.verseNumber] ? "2px 4px" : "0",
                    margin: highlighted?.[verse.verseNumber] ? "0 1px" : "0",
                    "text-decoration":
                      inHold === verse.verseNumber || isTextDecorUnderline
                        ? "underline"
                        : "",
                    "text-decoration-style":
                      inHold === verse.verseNumber || isTextDecorUnderline
                        ? "dotted"
                        : "",
                  }}
                  className={`sectionText ${
                    verse?.verseNumber.toString() === activeVerse.toString()
                      ? "highlighted"
                      : ""
                  } ${
                    highlighted?.[verse.verseNumber] ? "verse-highlighted" : ""
                  }`}
                >
                  <span
                    className={`sectionTextNumber ${
                      globalThis.studyNotesPresent ? "clickableCursor" : ""
                    }`}
                    onClick={() => {
                      if (globalThis.studyNotesPresent) {
                        HighlightStudyNoteSection(verse?.verseNumber);
                      }
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
  const [enableEditor, setEnableEditor] = useState(false);
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
