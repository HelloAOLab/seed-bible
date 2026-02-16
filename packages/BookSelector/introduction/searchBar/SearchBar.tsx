import {
  TreeIcon,
  LogIcon,
  LeafIcon,
  CatIcon,
  DogIcon,
  CoffeBeanIcon,
} from "app.components.phosphoricons";

import TranslationModal from "introduction.searchBar.TranslationModal";
import { getTranslations, getTranslatedNumber } from "app.hooks.i18n";
import type {
  BookInterface,
  TranslationInterface,
} from "introduction.searchBar.Interfaces";
const {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  createRef,
  useLayoutEffect,
} = os.appHooks;

// Provide a fallback JSX.IntrinsicElements declaration so TSX compiles
// even when React types are not available in the environment.

const PsalmsData: BookInterface[] = [
  {
    id: "PSA",
    translationId: "BSB",
    name: "Psalms",
    commonName: "1 Psalms",
    title: "Psalms",
    order: 19,
    numberOfChapters: 41,
    firstChapterNumber: 1,
    firstChapterApiLink: "/api/BSB/PSA/1.json",
    lastChapterNumber: 41,
    lastChapterApiLink: "/api/BSB/PSA/41.json",
  },
  {
    id: "PSA",
    translationId: "BSB",
    name: "Psalms",
    commonName: "2 Psalms",
    title: "Psalms",
    order: 19,
    numberOfChapters: 31,
    firstChapterNumber: 42,
    firstChapterApiLink: "/api/BSB/PSA/42.json",
    lastChapterNumber: 72,
    lastChapterApiLink: "/api/BSB/PSA/72.json",
  },
  {
    id: "PSA",
    translationId: "BSB",
    name: "Psalms",
    commonName: "3 Psalms",
    title: "Psalms",
    order: 19,
    numberOfChapters: 17,
    firstChapterNumber: 73,
    firstChapterApiLink: "/api/BSB/PSA/73.json",
    lastChapterNumber: 89,
    lastChapterApiLink: "/api/BSB/PSA/89.json",
  },
  {
    id: "PSA",
    translationId: "BSB",
    name: "Psalms",
    commonName: "4 Psalms",
    title: "Psalms",
    order: 19,
    numberOfChapters: 16,
    firstChapterNumber: 90,
    firstChapterApiLink: "/api/BSB/PSA/90.json",
    lastChapterNumber: 106,
    lastChapterApiLink: "/api/BSB/PSA/106.json",
  },
  {
    id: "PSA",
    translationId: "BSB",
    name: "Psalms",
    commonName: "5 Psalms",
    title: "Psalms",
    order: 19,
    numberOfChapters: 20,
    firstChapterNumber: 107,
    firstChapterApiLink: "/api/BSB/PSA/107.json",
    lastChapterNumber: 150,
    lastChapterApiLink: "/api/BSB/PSA/150.json",
  },
];

const tanakOrder: number[] = [
  1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 23, 24, 26, 28, 29, 30, 31, 32, 33, 34,
  35, 36, 37, 38, 39, 19, 20, 18, 22, 8, 25, 21, 17, 27, 15, 16, 13, 14,
];

const tanakhIndex: { [key: number]: number } = Object.fromEntries(
  tanakOrder.map((num, idx) => [num, idx])
);

const thePage = getBot("system", "app.components");

const SearchBar = (props: { openSidebar: boolean }) => {
  const { openSidebar } = props;
  const [query, setQuery] = useState("");
  const [languageQuery, setLanguageQuery] = useState("");
  const inputRef = useRef(null);
  const systemTranslation: { [key: string]: string } = getTranslations();
  const [onlineUsers, setOnlineUsers] = useState(null);
  const [orientation, setOrientation] = useState(
    masks?.orientation || "traditional"
  );

  const [booksData, setBooksData] = useState(
    thePage.masks?.booksData || tags.booksData
  );
  const [selectedTestament, setSelectedTestament] = useState(2);
  const [apocryphaAvailable, setApocryphaAvailable] = useState(false);

  const [defaultTranslations, setDefaultTranslations] = useState(
    thePage.masks?.defaultTranslations || [
      "english",
      "spanish",
      "arabic",
      "hindi",
      "hebrew",
      "ancient greek",
      "custom",
    ]
  );

  const [apiTranslations, setApiTranslations] = useState(
    thePage.masks?.apiTranslations || {
      english: {},
      spanish: {},
      arabic: {},
      hindi: {},
      hebrew: {},
      "ancient greek": {},
    }
  );

  const [allowedTranslationLimit, setAllowedTranslationLimit] = useState(50);
  const [selectedTranslation, setSelectedTranslation] = useState(
    thePage.masks?.selectedTranslation || {
      languageEnglishName: "English",
      id: "BSB",
      shortName: "BSB",
    }
  );
  const [showCustomTranslation, setShowCustomTranslation] = useState(false);
  const [selectingTranslation, setSelectingTranslation] = useState(false);
  const [windowSize, setWindowSize] = useState(window.innerWidth);

  const handleNameMatch = useCallback(
    (props: { query: string; bookData: BookInterface }) => {
      const { query, bookData } = props;
      let lowercaseQuery = query?.toLowerCase() || "";
      const commonName = bookData.commonName?.toLowerCase() || "";
      const bookId = bookData.id?.toLowerCase() || "";
      const lowercaseQueryArr = lowercaseQuery.split(" ");
      if (lowercaseQueryArr.length > 1) {
        if (
          lowercaseQueryArr[lowercaseQueryArr.length - 1] === "" ||
          parseInt(lowercaseQueryArr[lowercaseQueryArr.length - 1] || "NaN")
        ) {
          lowercaseQuery = lowercaseQueryArr
            .slice(0, lowercaseQueryArr.length - 1)
            .join(" ");
        }
      }
      if (
        commonName.slice(0, lowercaseQuery.length) === lowercaseQuery ||
        bookId.includes(lowercaseQuery) ||
        (commonName.slice(2, lowercaseQuery.length + 2) === lowercaseQuery &&
          commonName.split(" ").length > 1 &&
          parseInt(commonName.split(" ")[0] || "NaN"))
      ) {
        return true;
      }
      return false;
    },
    []
  );

  const sortBooksByTestament = useCallback(
    (books: BookInterface[]) => {
      let OTBooks: BookInterface[] = [];
      const NTBooks: BookInterface[] = [];
      const ApocryphaBooks: BookInterface[] = [];
      if (!books) return { OTBooks, NTBooks, ApocryphaBooks };
      for (const book of books) {
        if (book.order <= 39) {
          OTBooks.push(book);
        } else if (book.order > 39 && book.order <= 66) {
          NTBooks.push(book);
        } else {
          ApocryphaBooks.push(book);
        }
      }
      if (orientation === "tanak") {
        OTBooks = OTBooks.sort(
          (a, b) => (tanakhIndex[a.order] || 0) - (tanakhIndex[b.order] || 0)
        );
      }
      return {
        OTBooks,
        NTBooks,
        ApocryphaBooks,
      };
    },
    [orientation]
  );

  const selectedTestamentData = useMemo(() => {
    if (query.length > 0) {
      if (booksData === null || query === "") {
        return [];
      } else if (query.length > 0) {
        const sortedBook = [];
        for (let i = 0; i < booksData.length; i++) {
          if (handleNameMatch({ query: query, bookData: booksData[i] })) {
            sortedBook.push(booksData[i]);
          }
        }
        const { OTBooks, NTBooks, ApocryphaBooks } =
          sortBooksByTestament(sortedBook);
        if (ApocryphaBooks.length > 0) {
          setApocryphaAvailable(true);
        } else {
          setApocryphaAvailable(false);
        }
        return [...OTBooks, ...NTBooks, ...ApocryphaBooks];
        // if (selectedTestament === 0) {
        //   return OTBooks;
        // } else if (selectedTestament === 1) {
        //   return NTBooks;
        // } else if (selectedTestament === 2) {
        //   return [...OTBooks, ...NTBooks];
        // } else {
        //   return ApocryphaBooks;
        // }
      } else {
        return [];
      }
    } else {
      if (booksData) {
        const { OTBooks, NTBooks, ApocryphaBooks } =
          sortBooksByTestament(booksData);
        if (ApocryphaBooks.length > 0) {
          setApocryphaAvailable(true);
        } else {
          setApocryphaAvailable(false);
        }
        if (selectedTestament === 0) {
          return OTBooks;
        } else if (selectedTestament === 1) {
          return NTBooks;
        } else if (selectedTestament === 2) {
          return [...OTBooks, ...NTBooks];
        } else {
          return ApocryphaBooks;
        }
      } else {
        return [];
      }
    }
  }, [selectedTestament, booksData, query, handleNameMatch, orientation]);

  const getUrlUpToKeyword = useCallback((link: string, keyword: string) => {
    try {
      const url = new URL(link);
      const index = url.pathname.indexOf(keyword);
      if (index !== -1) {
        return url.origin + url.pathname.substring(0, index);
      }
      return url.origin + url.pathname; // If keyword not found, return full URL
    } catch (error) {
      if (error instanceof Error) {
        console.error("Invalid URL:", error.message);
      } else {
        console.error("Invalid URL:", String(error));
      }
      return null;
    }
  }, []);

  const handleTranslationAddition = async (props: {
    type: string;
    value: string;
    setInputValue?: (s: string) => void;
  }) => {
    const available_translations_req = await web.get(
      "https://bible.helloao.org/api/available_translations.json"
    );
    const { type, value, setInputValue } = props;
    if (type === "id") {
      const trValue: { pass: boolean; value: TranslationInterface | null } = {
        pass: false,
        value: null,
      };
      if (available_translations_req.status === 200) {
        available_translations_req.data.translations.map(
          (translation: TranslationInterface) => {
            if (translation.id.toLowerCase() === value.toLowerCase()) {
              trValue.pass = true;
              trValue.value = translation;
            }
          }
        );
        if (trValue.pass && trValue.value) {
          const translationValue = {
            ...trValue.value,
          };
          console.log(apiTranslations, "apiTranslations");
          if (
            apiTranslations[
              translationValue.languageEnglishName.toLowerCase()
            ] &&
            apiTranslations[translationValue.languageEnglishName.toLowerCase()][
              translationValue.shortName.toLowerCase()
            ]
          ) {
            globalThis.ChangeTranslation(translationValue.id);
            os.toast(`Translation Already Exists!`);
          } else {
            const translations = { ...apiTranslations };
            translations[translationValue.languageEnglishName.toLowerCase()] =
              translations[translationValue.languageEnglishName.toLowerCase()]
                ? {
                    ...translations[
                      translationValue.languageEnglishName.toLowerCase()
                    ],
                    [translationValue.shortName.toLowerCase()]:
                      translationValue,
                  }
                : {
                    [translationValue.shortName.toLowerCase()]:
                      translationValue,
                  };
            setSelectedTranslation({
              languageEnglishName:
                translationValue.languageEnglishName.toLowerCase(),
              id: translationValue.id,
              shortName: translationValue.shortName,
            });
            setApiTranslations(translations);
            setShowCustomTranslation(false);
            if (
              !defaultTranslations.includes(
                translationValue.languageEnglishName.toLowerCase()
              )
            ) {
              setDefaultTranslations([
                ...defaultTranslations,
                translationValue.languageEnglishName.toLowerCase(),
              ]);
            }
            globalThis.ChangeTranslation(translationValue.id);
            os.toast(`Translation ${value} added!`);
          }
        } else {
          os.toast("no translation found");
        }
      }
    } else {
      const trValue: { pass: boolean; value: TranslationInterface | null } = {
        pass: false,
        value: null,
      };
      if (available_translations_req.status === 200) {
        available_translations_req.data.translations.map(
          (translation: TranslationInterface) => {
            if (translation?.website?.toLowerCase() === value.toLowerCase()) {
              trValue.pass = true;
              trValue.value = translation;
            }
          }
        );
        if (trValue.pass && trValue.value) {
          const translationValue = {
            ...trValue.value,
          };
          if (
            apiTranslations[
              translationValue?.languageEnglishName?.toLowerCase() || ""
            ] &&
            apiTranslations[
              translationValue?.languageEnglishName?.toLowerCase() || ""
            ][trValue?.value?.shortName?.toLowerCase() || ""]
          ) {
            os.toast(`Translation Already Exists!`);
          } else {
            const translations = { ...apiTranslations };
            translations[translationValue.languageEnglishName.toLowerCase()] =
              translations[translationValue.languageEnglishName.toLowerCase()]
                ? {
                    ...translations[
                      translationValue.languageEnglishName.toLowerCase()
                    ],
                    [value.toLowerCase()]: translationValue,
                  }
                : { [value.toLowerCase()]: translationValue };
            setSelectedTranslation({
              languageEnglishName:
                translationValue.languageEnglishName.toLowerCase(),
              id: translationValue.shortName,
              shortName: translationValue.shortName,
            });
            setApiTranslations(translations);
            setShowCustomTranslation(false);
            if (
              !defaultTranslations.includes(
                translationValue.languageEnglishName.toLowerCase()
              )
            ) {
              setDefaultTranslations([
                ...defaultTranslations,
                translationValue.languageEnglishName.toLowerCase(),
              ]);
            }
            os.toast(`Translation ${value} added!`);
          }
        } else {
          web
            .hook({
              method: "GET",
              url: value,
            })
            .then((e) => {
              const url = new URL(value);
              const origin = getUrlUpToKeyword(value, "/api");
              const data = e.data;
              if (value.includes("/available_translations.json")) {
                const translations: TranslationInterface[] = data.translations;
                if (translations.length === 0) {
                  os.toast("No translations found from url!");
                  return;
                }
                const tempApiTranslations = { ...apiTranslations };
                let defaultTranslation: TranslationInterface | undefined;
                const controlledTranslations: TranslationInterface[] = [];
                for (const translation of translations) {
                  const languageEnglishName =
                    translation.languageEnglishName.toLowerCase();
                  const controlledTranslation = {
                    ...translation,
                    name: translation.name,
                    languageEnglishName: languageEnglishName,
                    id: translation.id,
                    listOfBooksApiLink: `${url.origin}${translation.listOfBooksApiLink}`,
                    origin: url.origin,
                    shortName: translation.shortName,
                  };
                  controlledTranslations.push(controlledTranslation);
                  if (!defaultTranslation) {
                    defaultTranslation = controlledTranslation;
                  }
                  tempApiTranslations[languageEnglishName] =
                    tempApiTranslations[languageEnglishName]
                      ? {
                          ...tempApiTranslations[languageEnglishName],
                          [translation.shortName.toLowerCase()]:
                            controlledTranslation,
                        }
                      : {
                          [translation.shortName.toLowerCase()]:
                            controlledTranslation,
                        };
                  if (!defaultTranslations.includes(languageEnglishName)) {
                    setDefaultTranslations([
                      ...defaultTranslations,
                      languageEnglishName,
                    ]);
                  }
                }
                setTagMask(
                  thePage,
                  "newTranslations",
                  masks?.newTranslations
                    ? [...masks.newTranslations, ...controlledTranslations]
                    : controlledTranslations,
                  "local"
                );
                setSelectedTranslation(defaultTranslation);
                setApiTranslations(tempApiTranslations);
                setShowCustomTranslation(false);
                if (defaultTranslation) {
                  web
                    .get(`${defaultTranslation.listOfBooksApiLink}`)
                    .then((e) => {
                      ChangeTranslation(
                        defaultTranslation.id,
                        e.data.books,
                        defaultTranslation.origin
                      );
                      setBooksData([...e.data.books]);
                      setSelectingTranslation(false);
                      setOpenSidebar(false);
                    })
                    .catch((e) => {
                      console.log(e);
                    });
                }
                os.log("All Translations Added");
              } else {
                if (data?.translation && data?.books) {
                  const translation = data.translation;
                  const controlledTranslation = {
                    ...translation,
                    name: translation.name,
                    languageEnglishName:
                      translation.languageEnglishName.toLowerCase(),
                    id: translation.id,
                    listOfBooksApiLink: `${url.origin}${translation.listOfBooksApiLink}`,
                    origin,
                    shortName: translation.shortName,
                  };
                  if (
                    apiTranslations[
                      translation.languageEnglishName.toLowerCase()
                    ] &&
                    apiTranslations[
                      translation.languageEnglishName.toLowerCase()
                    ][trValue?.value?.shortName?.toLowerCase() || ""]
                  ) {
                    os.toast(`Translation Already Exists!`);
                    ChangeTranslation(
                      controlledTranslation.id,
                      data.books,
                      controlledTranslation.origin
                    );
                    setBooksData([...data.books[0]]);
                    setSelectingTranslation(false);
                    setOpenSidebar(false);
                  } else {
                    const translations = { ...apiTranslations };

                    translations[
                      translation.languageEnglishName.toLowerCase()
                    ] = translations[
                      translation.languageEnglishName.toLowerCase()
                    ]
                      ? {
                          ...translations[
                            translation.languageEnglishName.toLowerCase()
                          ],
                          [translation.shortName.toLowerCase()]:
                            controlledTranslation,
                        }
                      : {
                          [translation.shortName.toLowerCase()]:
                            controlledTranslation,
                        };
                    setSelectedTranslation({
                      ...controlledTranslation,
                    });
                    setApiTranslations(translations);
                    setShowCustomTranslation(false);
                    if (
                      !defaultTranslations.includes(
                        translation.languageEnglishName.toLowerCase()
                      )
                    ) {
                      setDefaultTranslations([
                        ...defaultTranslations,
                        translation.languageEnglishName.toLowerCase(),
                      ]);
                    }
                    ChangeTranslation(
                      controlledTranslation.id,
                      data.books,
                      controlledTranslation.origin
                    );
                    setBooksData([...data.books[0]]);
                    setSelectingTranslation(false);
                    setOpenSidebar(false);
                    os.toast(`Translation ${value} added!`);
                  }
                } else {
                  os.toast("not a valid link");
                }
              }
            })
            .catch((e) => {
              os.log(e);
              os.toast("not a valid link");
            });
        }
      }
    }
    setInputValue("");
  };

  const focusOnBook = useCallback(
    (props: { chapterNo?: number }) => {
      const { chapterNo } = props;
      (globalThis as any).setOpenSidebar(false);
      setQuery("");
      let chapter: number | null = null,
        queryArr: string[] = [];
      if (chapterNo) {
        chapter = chapterNo;
      } else {
        queryArr = [...query.split(" ")];
        const lastPart = queryArr[queryArr.length - 1] ?? "";
        const parsed = parseInt(lastPart, 10);
        if (!isNaN(parsed)) {
          chapter = parsed;
        }
      }
      globalThis.Open(
        selectedTestamentData[0].id,
        chapter || 1,
        selectedTestamentData[0].translationId
      );
    },
    [query]
  );

  const handleEnter = useCallback(() => {
    if (query?.toLowerCase() || "".includes("psalm")) {
      if (query.split(" ").length > 1) {
        const queryArr: string[] = query.split(" ");
        const lastPart = queryArr[queryArr.length - 1] ?? "";
        const chapterNo = parseInt(lastPart, 10);
        if (!isNaN(chapterNo)) {
          let bookName;
          for (const psalmBook of PsalmsData) {
            if (chapterNo <= psalmBook.lastChapterNumber) {
              bookName = psalmBook.commonName;
              break;
            }
          }
          if (bookName) {
            focusOnBook({ chapterNo: chapterNo });
          } else {
            os.toast("That chapter doesn't exist!!!");
          }
        } else {
          os.toast("Please check the chapter no.!!!");
        }
      } else {
        focusOnBook({ chapterNo: 1 });
      }
    } else if (
      Array.isArray(selectedTestamentData) &&
      selectedTestamentData.length > 0
    ) {
      setQuery(selectedTestamentData[0]?.commonName ?? "");
    }
  }, [selectedTestamentData, query, focusOnBook]);

  const fetchBookdata = useCallback(() => {
    if (selectedTranslation?.listOfBooksApiLink?.includes("https")) {
      web
        .get(`${selectedTranslation.listOfBooksApiLink}`)
        .then((e) => {
          !thePage.masks?.translationInitiated &&
            ChangeTranslation(
              selectedTranslation.id,
              e.data.books,
              selectedTranslation.origin
            );
          // ChangeTranslation(selectedTranslation.id, book0, selectedTranslation.origin);
          setBooksData([...e.data.books]);
        })
        .catch((e) => {
          console.log(e);
        });
    } else {
      web
        .get(
          `https://bible.helloao.org/api/${selectedTranslation.id}/books.json`
        )
        .then((e) => {
          !thePage.masks?.translationInitiated &&
            ChangeTranslation(
              selectedTranslation.id,
              e.data.books,
              "https://bible.helloao.org"
            );
          // ChangeTranslation(selectedTranslation.id, book0, "https://bible.helloao.org");
          setBooksData([...e.data.books]);
        })
        .catch((e) => {
          console.log(e);
        });
    }
    setTagMask(thePage, "translationInitiated", true, "tempLocal");
  }, [selectedTranslation]);

  useEffect(() => {
    if (
      !defaultTranslations.includes(
        selectedTranslation.languageEnglishName.toLowerCase()
      )
    ) {
      setTagMask(
        thePage,
        "defaultTranslations",
        [
          ...defaultTranslations,
          selectedTranslation.languageEnglishName.toLowerCase(),
        ],
        "local"
      );
      setDefaultTranslations([
        ...defaultTranslations,
        selectedTranslation.languageEnglishName.toLowerCase(),
      ]);
    }
    setTagMask(thePage, "selectedTranslation", selectedTranslation, "local");
    // console.log(
    //   selectedTranslation,
    //   "defaultTranslations updated",
    //   !apiTranslations[selectedTranslation.languageEnglishName.toLowerCase()]
    // );
    fetchBookdata();
  }, [selectedTranslation, apiTranslations, defaultTranslations]);

  useEffect(() => {
    let allTranslations = [];
    if (!thePage.masks?.allTranslations) {
      web
        .get("https://bible.helloao.org/api/available_translations.json")
        .then((request) => {
          if (request.status === 200) {
            allTranslations = request.data.translations;
            allTranslations = allTranslations.map(
              (item: TranslationInterface) => {
                return {
                  ...item,
                  languageEnglishName:
                    item?.languageEnglishName || item.englishName,
                };
              }
            );
            setTagMask(
              thePage,
              "allTranslations",
              request.data.translations,
              "local"
            );
            const translations = { ...apiTranslations };

            allTranslations.map((translation: TranslationInterface) => {
              const englishName =
                translation.languageEnglishName?.toLowerCase() || "";
              // if (showAllLanguages) {
              const shortName = translation.shortName?.toLowerCase() || "";
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
            setTagMask(thePage, "apiTranslations", translations, "local");
            setTagMask(
              thePage,
              "defaultTranslations",
              defaultTranslations,
              "local"
            );
            setApiTranslations(translations);
            return;
          }
        });
    } else {
      allTranslations = thePage.masks.allTranslations;
    }
    const translations = { ...apiTranslations };

    if (allTranslations) {
      allTranslations.map((translation: TranslationInterface) => {
        const englishName =
          translation.languageEnglishName?.toLowerCase() || "";
        const shortName = translation.shortName?.toLowerCase() || "";
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
      setTagMask(thePage, "apiTranslations", translations, "local");
      setTagMask(thePage, "defaultTranslations", defaultTranslations, "local");
      setApiTranslations(translations);
    }
  }, [defaultTranslations]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize(window.innerWidth);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setLanguageQuery("");
  }, [selectingTranslation]);

  useEffect(() => {
    if (!openSidebar && globalThis?.bookModalOpen) {
      globalThis.bookModalOpen(false);
    }
  }, [openSidebar]);

  // Use State of Element
  const [showCheck, setShowCheck] = useState(
    globalThis.IS_PLAYLIST_ACTIVE || globalThis.IsPlaylistPlaying
  );
  const [dontopn, setDontOpen] = useState(false);
  globalThis.SET_SHOW_CHECK = setShowCheck;
  globalThis.SetDontOpenPlaylist = setDontOpen;

  const dontOpen = dontopn && showCheck;
  globalThis.SetBooksOnlineUsers = setOnlineUsers;
  globalThis.setSelectingTranslation = setSelectingTranslation;

  useEffect(() => {
    globalThis.setSelectingTranslation = setSelectingTranslation;
    globalThis.selectingTranslation = selectingTranslation;
  }, [selectingTranslation]);

  return (
    <>
      <div class="testament-selection starterAnimation">
        <span class="sidebar-select">
          <div class="sidebar-book-selector">
            {windowSize > 768 && (
              <div
                class="sidebar-translation-selector"
                onClick={() => {
                  setSelectingTranslation(!selectingTranslation);
                  setQuery("");
                }}
              >
                <span class="sidebar-selected-title">
                  {selectedTranslation.shortName}
                </span>
                <span
                  style={{ transition: "transform 0.3s" }}
                  class={`material-symbols-outlined ${selectingTranslation ? "upside-down" : ""}`}
                >
                  expand_more
                </span>
              </div>
            )}
            <div className="searchbar">
              <span className="search-icon material-symbols-outlined">
                Search
              </span>
              <input
                type="text"
                placeholder={
                  systemTranslation["searchBook"] || "Search Book..."
                }
                value={query}
                ref={inputRef}
                onInput={(e) => {
                  setQuery(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.keyCode === 13) {
                    handleEnter();
                  }
                }}
              />
            </div>
            {windowSize <= 768 && (
              <div
                class="sidebar-translation-selector"
                onClick={() => {
                  setSelectingTranslation(!selectingTranslation);
                  setQuery("");
                }}
              >
                <span class="sidebar-selected-title">
                  {selectedTranslation.shortName}
                </span>
                <span
                  style={{ transition: "transform 0.3s" }}
                  class={`material-symbols-outlined ${selectingTranslation ? "upside-down" : ""}`}
                >
                  expand_more
                </span>
              </div>
            )}
            <div class="dropdown">
              <select
                value={selectedTestament}
                onChange={(e) => setSelectedTestament(Number(e.target.value))}
                class="dropdown-select"
              >
                <option value={2} class="dropdown-option">
                  {systemTranslation["allBooks"] || "All Books"}
                </option>
                <option value={0} class="dropdown-option">
                  {windowSize > 750
                    ? systemTranslation["oldTestament"] || "Old Testament"
                    : systemTranslation["oldTestamentShort"] || "OT"}
                </option>
                <option value={1} class="dropdown-option">
                  {windowSize > 750
                    ? systemTranslation["newTestament"] || "New Testament"
                    : systemTranslation["newTestamentShort"] || "NT"}
                </option>
                {apocryphaAvailable && (
                  <option value={3} class="dropdown-option">
                    {systemTranslation["apocrypha"] || "Apocrypha"}
                  </option>
                )}
              </select>
            </div>
          </div>
        </span>
      </div>
      <div class="sidebar-results starterAnimation">
        {showCheck && (
          <div
            style={{
              marginBottom: "8px",
              width: "100%",
              background: "lightgray",
              padding: "4px 8px",
              zIndex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
              onClick={() => {
                setDontOpen((p) => !p);
              }}
            >
              {dontOpen ? (
                <span
                  style={{
                    fontSize: "20px",
                    borderRadius: "50%",
                    backgroundColor: "steelblue",
                    color: "white",
                  }}
                  class="material-symbols-outlined"
                >
                  check_circle
                </span>
              ) : (
                <span
                  style={{ fontSize: "20px" }}
                  class="material-symbols-outlined"
                >
                  radio_button_unchecked
                </span>
              )}
              <label
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  marginLeft: "4px",
                }}
                for="playlistInclude"
              >
                Include in{" "}
                {showCheck === 1
                  ? systemTranslation["queue"] || "Queue"
                  : systemTranslation["playlist"] || "Playlist"}
                .
              </label>
            </div>
          </div>
        )}
        {booksData && selectedTestamentData && selectedTranslation && (
          <SideBarBooks
            onlineUsers={onlineUsers}
            showCheck={showCheck}
            dontOpen={dontOpen}
            selectedTranslation={selectedTranslation}
            selectedTestament={selectedTestament}
            setSelectedTestament={setSelectedTestament}
            booksData={selectedTestamentData}
            sortBooksByTestament={sortBooksByTestament}
            windowSize={windowSize}
            systemTranslation={systemTranslation}
            query={query}
          />
        )}
        {selectingTranslation && (
          <TranslationModal
            selectedTranslation={selectedTranslation}
            setSelectedTranslation={setSelectedTranslation}
            setSelectingTranslation={setSelectingTranslation}
            languageQuery={languageQuery}
            setLanguageQuery={setLanguageQuery}
            handleTranslationAddition={handleTranslationAddition}
            showCustomTranslation={showCustomTranslation}
            setShowCustomTranslation={setShowCustomTranslation}
            allowedTranslationLimit={allowedTranslationLimit}
            setAllowedTranslationLimit={setAllowedTranslationLimit}
            apiTranslations={apiTranslations}
            defaultTranslations={defaultTranslations}
          />
        )}
      </div>
    </>
  );
};

const SideBarBooks = (props: {
  booksData: BookInterface[];
  selectedTestament: number;
  setSelectedTestament: (n: number) => void;
  selectedTranslation: TranslationInterface;
  dontOpen: any;
  showCheck: any;
  onlineUsers: any;
  sortBooksByTestament: (books: BookInterface[]) => {
    OTBooks: BookInterface[];
    NTBooks: BookInterface[];
    ApocryphaBooks: BookInterface[];
  };
  windowSize: number;
  systemTranslation: { [key: string]: string };
  query: string;
}) => {
  const {
    booksData,
    selectedTestament,
    selectedTranslation,
    setSelectedTestament,
    dontOpen,
    showCheck,
    onlineUsers,
    sortBooksByTestament,
    windowSize,
    systemTranslation,
    query,
  } = props;
  const [lastBookClicked, setLastBookClicked] = useState(-1);
  const [bookData, setBookData] = useState<BookInterface | null>(null);
  const [chT, setChT] = useState(0);
  const [localSelectedTestament, setLocalSelectedTestament] =
    useState(selectedTestament);

  useLayoutEffect(() => {
    if (booksData.length === 1 && booksData[0]) {
      setLastBookClicked(0);
      setBookData(booksData[0]);
      if (booksData[0].order > 39) {
        setChT(1);
      } else {
        setChT(0);
      }
    } else {
      setLastBookClicked(-1);
      setBookData(null);
      setChT(0);
    }
  }, [booksData]);

  const handleClick = useCallback(
    (props: { index: number; book: BookInterface; cht?: number }) => {
      const { index, book, cht = 0 } = props;
      if (bookData?.id === book.id) {
        setBookData(null);
        setChT(0);
        setLastBookClicked(-1);
      } else {
        setBookData(book);
        setChT(cht);
        setLastBookClicked(index);
      }
    },
    [chT, bookData, lastBookClicked]
  );

  const calcChapterPos = useCallback((index: number, separator: number) => {
    return Math.floor(index / separator) * separator + separator - 1;
  }, []);

  // const isBook = useCallback(
  //   (book: BookInterface | { ghost?: boolean }): book is BookInterface =>
  //     !("ghost" in book) || !book.ghost,
  //   []
  // );

  const isBook = useCallback(
    (book: BookInterface | { ghost?: boolean }) =>
      !("ghost" in book) || !book.ghost,
    []
  );

  const ghostArray = useCallback(
    (booksArray: BookInterface[], allowedRows: number) => {
      if (allowedRows === 1) return booksArray;
      const booksLength = booksArray.length;
      const additionalElements =
        allowedRows -
        (booksLength % allowedRows === 0
          ? allowedRows
          : booksLength % allowedRows);
      const tempBooksArray: (BookInterface | { ghost?: boolean })[] = [
        ...booksArray,
      ];
      for (let i = 0; i < additionalElements; i++) {
        tempBooksArray.push({ ghost: true });
      }
      return [...tempBooksArray];
    },
    []
  );

  const getBookName = useCallback((book: BookInterface, onlineUsers: any) => {
    const users = onlineUsers
      ? Object.entries(onlineUsers || {}).filter(
          ([, v]) => v?.bookId === book.id
        )
      : [];
    let bookName = "";
    if (book?.commonName?.length > 7 && users.length > 0) {
      const name: string = (book.id || "").toLowerCase();
      if (isNaN(Number(name.charAt(0)))) {
        bookName = name;
      } else {
        const firstChar = name.charAt(0);
        const secondChar = name.charAt(1);
        bookName = `${firstChar} ${secondChar ? secondChar.toUpperCase() : ""}${name.slice(2)}`;
      }
    } else {
      bookName = book.commonName;
    }
    return bookName;
  }, []);

  const selectBookSelectorBook = useCallback(
    (bookId) => {
      if (!bookId) {
        setBookData(null);
        setLastBookClicked(-1);
        setChT(0);
        return;
      }
      const book = booksData.find((b) => b.id === bookId);
      if (book) {
        handleClick({
          index: booksData.indexOf(book),
          book,
          cht: book.order > 39 ? 1 : 0,
        });
      }
    },
    [booksData, handleClick]
  );
  useEffect(() => {
    const sortedBooks = sortBooksByTestament(booksData);
    const OTBooks = sortedBooks.OTBooks;
    const NTBooks = sortedBooks.NTBooks;
    if (selectedTestament === 2 || query.length > 0) {
      if (OTBooks.length > 0 && NTBooks.length === 0) {
        setLocalSelectedTestament(0);
      } else if (NTBooks.length > 0 && OTBooks.length === 0) {
        setLocalSelectedTestament(1);
      } else if (query.length > 0) {
        setLocalSelectedTestament(2);
      } else {
        setLocalSelectedTestament(selectedTestament);
      }
    } else {
      setLocalSelectedTestament(selectedTestament);
    }
  }, [selectedTestament, booksData, query]);

  const RenderBooksByTestament = useMemo(() => {
    let allowedRows = 5;

    if (windowSize < 768) {
      allowedRows = 1;
    } else if (windowSize < 1200) {
      allowedRows = 3;
    } else {
      allowedRows = 5;
    }

    const sortedBooks = sortBooksByTestament(booksData);

    if (localSelectedTestament === 2) {
      const OTChapterSeparator =
        allowedRows === 1 ? 1 : allowedRows === 3 ? 2 : 3;
      const OTChapterPos = calcChapterPos(lastBookClicked, OTChapterSeparator);
      const NTChapterSeparator =
        allowedRows === 1 ? 1 : allowedRows === 3 ? 1 : 2;
      const NTChapterPos = calcChapterPos(lastBookClicked, NTChapterSeparator);
      const OTBooks = ghostArray(sortedBooks.OTBooks, OTChapterSeparator);
      const NTBooks = ghostArray(sortedBooks.NTBooks, NTChapterSeparator);
      return (
        <div
          class="books-container"
          style={showCheck ? { paddingTop: "40px" } : {}}
        >
          <div
            class="testament-container"
            style={{
              width: `${allowedRows === 5 ? 60 : allowedRows === 3 ? 66.66 : 100}%`,
            }}
          >
            <span class="testament-title">
              {systemTranslation["oldTestament"] || "Old Testament"}
            </span>
            <div class="books-item">
              {OTBooks.map((book, index) => {
                return (
                  <>
                    {isBook(book) && (
                      <div
                        class={`sidebar-itm ${index === lastBookClicked && bookData?.id === book.id ? "sidebar-selected-itm" : ""}`}
                        tabIndex={index + 1}
                        onClick={() => {
                          handleClick({ index, book, cht: 0 });
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            gap: "3px",
                            width: "100%",
                            justifyContent: "space-between",
                            textTransform: "capitalize",
                          }}
                        >
                          {getBookName(book, onlineUsers)}
                          <CircleCounter data={onlineUsers} book={book.id} />
                        </span>
                        <span
                          style={{ transition: "transform 0.3s" }}
                          class={`material-symbols-outlined ${index === lastBookClicked && bookData?.id === book.id ? "upside-down" : ""}`}
                        >
                          expand_more
                        </span>
                      </div>
                    )}
                    {!isBook(book) && (
                      <div class={`sidebar-ghost-itm`} tabIndex={index + 1} />
                    )}
                    {OTChapterPos === index && bookData && chT === 0 && (
                      <div
                        class={`sidebar-chapters show-sidebar-chapter`}
                        style={{
                          justifyContent:
                            windowSize < 768 ||
                            bookData.numberOfChapters < 4 * OTChapterSeparator
                              ? "flex-start"
                              : "space-between",
                        }}
                      >
                        <SideBarChapters
                          onlineUsers={onlineUsers}
                          bookData={bookData}
                          setLastBookClicked={setLastBookClicked}
                          dontOpen={dontOpen}
                          setBookData={setBookData}
                          selectedTranslation={selectedTranslation}
                        />
                      </div>
                    )}
                  </>
                );
              })}
            </div>
          </div>
          <div className="separator" />
          <div
            class="testament-container"
            style={{
              width: `${allowedRows === 5 ? 40 : allowedRows === 3 ? 33.33 : 100}%`,
            }}
          >
            <span class="testament-title">
              {systemTranslation["newTestament"] || "New Testament"}
            </span>
            <div class="books-item">
              {NTBooks.map((book, index) => {
                return (
                  <>
                    {isBook(book) && (
                      <div
                        class={`sidebar-itm ${index === lastBookClicked && bookData?.id === book.id ? "sidebar-selected-itm" : ""}`}
                        tabIndex={index + 1}
                        onClick={() => {
                          handleClick({ index, book, cht: 1 });
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            gap: "3px",
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          {getBookName(book, onlineUsers)}
                          <CircleCounter data={onlineUsers} book={book.id} />
                        </span>
                        <span
                          style={{ transition: "transform 0.3s" }}
                          class={`material-symbols-outlined ${index === lastBookClicked && bookData?.id === book.id ? "upside-down" : ""}`}
                        >
                          expand_more
                        </span>
                      </div>
                    )}
                    {!isBook(book) && (
                      <div class={`sidebar-ghost-itm`} tabIndex={index + 1} />
                    )}
                    {NTChapterPos === index && bookData && chT === 1 && (
                      <div
                        class={`sidebar-chapters show-sidebar-chapter`}
                        style={{
                          justifyContent:
                            windowSize < 768 ||
                            bookData.numberOfChapters < 4 * NTChapterSeparator
                              ? "flex-start"
                              : "space-between",
                        }}
                      >
                        <style>
                          {allowedRows === 3 &&
                            `
                                .show-sidebar-chapter{width: calc(100% - 5px);}
                            `}
                        </style>
                        <SideBarChapters
                          onlineUsers={onlineUsers}
                          bookData={bookData}
                          setLastBookClicked={setLastBookClicked}
                          dontOpen={dontOpen}
                          setBookData={setBookData}
                          selectedTranslation={selectedTranslation}
                        />
                      </div>
                    )}
                  </>
                );
              })}
            </div>
          </div>
        </div>
      );
    } else if (localSelectedTestament === 1) {
      const chapterPos = calcChapterPos(lastBookClicked, allowedRows);
      const booksWithGhost = ghostArray(sortedBooks.NTBooks, allowedRows);
      return (
        <div
          class="books-container"
          style={showCheck ? { paddingTop: "40px" } : {}}
        >
          <div class="testament-container">
            <span class="testament-title">
              {systemTranslation["newTestament"] || "New Testament"}
            </span>
            <div class="books-item">
              {booksWithGhost.map((book, index) => {
                return (
                  <>
                    {isBook(book) && (
                      <div
                        class={`sidebar-itm ${index === lastBookClicked && bookData?.id === book.id ? "sidebar-selected-itm" : ""}`}
                        tabIndex={index + 1}
                        onClick={() => {
                          handleClick({ index, book });
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            gap: "3px",
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          {getBookName(book, onlineUsers)}
                          <CircleCounter data={onlineUsers} book={book.id} />
                        </span>
                        <span
                          style={{ transition: "transform 0.3s" }}
                          class={`material-symbols-outlined ${index === lastBookClicked && bookData?.id === book.id ? "upside-down" : ""}`}
                        >
                          expand_more
                        </span>
                      </div>
                    )}
                    {!isBook(book) && (
                      <div class={`sidebar-ghost-itm`} tabIndex={index + 1} />
                    )}
                    {chapterPos === index && bookData && (
                      <div
                        class={`sidebar-chapters show-sidebar-chapter`}
                        style={{
                          justifyContent:
                            windowSize < 768 ||
                            bookData.numberOfChapters < 4 * allowedRows
                              ? "flex-start"
                              : "space-between",
                        }}
                      >
                        <SideBarChapters
                          onlineUsers={onlineUsers}
                          bookData={bookData}
                          setLastBookClicked={setLastBookClicked}
                          dontOpen={dontOpen}
                          setBookData={setBookData}
                          selectedTranslation={selectedTranslation}
                        />
                      </div>
                    )}
                  </>
                );
              })}
            </div>
          </div>
        </div>
      );
    } else if (localSelectedTestament === 0) {
      const chapterPos = calcChapterPos(lastBookClicked, allowedRows);
      const booksWithGhost = ghostArray(sortedBooks.OTBooks, allowedRows);
      return (
        <div
          class="books-container"
          style={showCheck ? { paddingTop: "40px" } : {}}
        >
          <div class="testament-container">
            <span class="testament-title">
              {systemTranslation["oldTestament"] || "Old Testament"}
            </span>
            <div class="books-item">
              {booksWithGhost.map((book, index) => {
                return (
                  <>
                    {isBook(book) && (
                      <div
                        class={`sidebar-itm ${index === lastBookClicked && bookData?.id === book.id ? "sidebar-selected-itm" : ""}`}
                        tabIndex={index + 1}
                        onClick={() => {
                          handleClick({ index, book });
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            gap: "3px",
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          {getBookName(book, onlineUsers)}
                          <CircleCounter data={onlineUsers} book={book.id} />
                        </span>
                        <span
                          style={{ transition: "transform 0.3s" }}
                          class={`material-symbols-outlined ${index === lastBookClicked && bookData?.id === book.id ? "upside-down" : ""}`}
                        >
                          expand_more
                        </span>
                      </div>
                    )}
                    {!isBook(book) && (
                      <div class={`sidebar-ghost-itm`} tabIndex={index + 1} />
                    )}
                    {chapterPos === index && bookData && (
                      <div
                        class={`sidebar-chapters show-sidebar-chapter`}
                        style={{
                          justifyContent:
                            windowSize < 768 ||
                            bookData.numberOfChapters < 4 * allowedRows
                              ? "flex-start"
                              : "space-between",
                        }}
                      >
                        <SideBarChapters
                          onlineUsers={onlineUsers}
                          bookData={bookData}
                          setLastBookClicked={setLastBookClicked}
                          dontOpen={dontOpen}
                          setBookData={setBookData}
                          selectedTranslation={selectedTranslation}
                        />
                      </div>
                    )}
                  </>
                );
              })}
            </div>
          </div>
        </div>
      );
    } else if (localSelectedTestament === 3) {
      const chapterPos = calcChapterPos(lastBookClicked, allowedRows);
      const booksWithGhost = ghostArray(
        sortedBooks.ApocryphaBooks,
        allowedRows
      );
      return (
        <div
          class="books-container"
          style={showCheck ? { paddingTop: "40px" } : {}}
        >
          <div class="testament-container">
            <span class="testament-title">
              {systemTranslation["apocrypha"] || "Apocrypha"}
            </span>
            <div class="books-item">
              {booksWithGhost.map((book, index) => {
                return (
                  <>
                    {isBook(book) && (
                      <div
                        class={`sidebar-itm ${index === lastBookClicked && bookData?.id === book.id ? "sidebar-selected-itm" : ""}`}
                        tabIndex={index + 1}
                        onClick={() => {
                          handleClick({ index, book });
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            gap: "3px",
                            width: "100%",
                            justifyContent: "space-between",
                          }}
                        >
                          {getBookName(book, onlineUsers)}
                          <CircleCounter data={onlineUsers} book={book.id} />
                        </span>
                        <span
                          style={{ transition: "transform 0.3s" }}
                          class={`material-symbols-outlined ${index === lastBookClicked && bookData?.id === book.id ? "upside-down" : ""}`}
                        >
                          expand_more
                        </span>
                      </div>
                    )}
                    {!isBook(book) && (
                      <div class={`sidebar-ghost-itm`} tabIndex={index + 1} />
                    )}
                    {chapterPos === index && bookData && (
                      <div
                        class={`sidebar-chapters show-sidebar-chapter`}
                        style={{
                          justifyContent:
                            windowSize < 768 ||
                            bookData.numberOfChapters < 4 * allowedRows
                              ? "flex-start"
                              : "space-between",
                        }}
                      >
                        <SideBarChapters
                          onlineUsers={onlineUsers}
                          bookData={bookData}
                          setLastBookClicked={setLastBookClicked}
                          dontOpen={dontOpen}
                          setBookData={setBookData}
                          selectedTranslation={selectedTranslation}
                        />
                      </div>
                    )}
                  </>
                );
              })}
            </div>
          </div>
        </div>
      );
    }
  }, [
    booksData,
    lastBookClicked,
    bookData,
    dontOpen,
    localSelectedTestament,
    windowSize,
    chT,
    onlineUsers,
  ]);

  useEffect(() => {
    globalThis.selectBookSelectorBook = selectBookSelectorBook;
    return () => {
      globalThis.selectBookSelectorBook = null;
    };
  }, [selectBookSelectorBook]);

  return <>{RenderBooksByTestament}</>;
};

const SideBarChapters = (props: {
  bookData: BookInterface;
  dontOpen: boolean;
  setLastBookClicked: (num: number) => void;
  setBookData: (book: BookInterface) => void;
  selectedTranslation: TranslationInterface;
  onlineUsers: any;
}) => {
  const {
    bookData,
    dontOpen,
    setLastBookClicked,
    setBookData,
    selectedTranslation,
    onlineUsers,
  } = props;
  const [highLightedButtonsID, setHighlightedButtonID] = useState<
    Record<number, boolean>
  >({});

  const handleChapterClick = (props: {
    bookName: string;
    chapterNo: number;
    bookData: BookInterface;
    [key: string]: any;
  }) => {
    const { bookName, chapterNo, bookData, ...data } = props;
    if (globalThis?.findNameRank) {
      const booksDetails = globalThis.findNameRank(bookName);
      const dataItem = {
        type: "chapter",
        content: `${bookName} ${chapterNo}`,
        additionalInfo: {
          bookRank: booksDetails.rank,
          bookName: bookName,
          chapter: chapterNo,
          data: { ...data },
        },
      };

      const isShiftHold = globalThis?.KEY_HOLD?.["Shift"];
      const isPlaylistMode =
        globalThis.makingPlaylist || globalThis.IsPlaylistPlaying;

      shout("playSound", { soundName: "UI_Numpad_Click" });

      if (
        isShiftHold &&
        isPlaylistMode &&
        globalThis.LAST_CLICKED_BOOK_CHAPTER?.additionalInfo.bookName
      ) {
        if (!dontOpen) {
          setTimeout(() => {
            globalThis.Open(data.id, chapterNo, data.translationId);
          }, 150);
          return;
        }
        const lastBook = { ...globalThis.LAST_CLICKED_BOOK_CHAPTER };
        const currentBook = { ...dataItem };
        const highLight = {};
        if (
          lastBook.additionalInfo.bookName ===
          currentBook.additionalInfo.bookName
        ) {
          let fIndex = lastBook.additionalInfo.chapter;
          let sIndex = currentBook.additionalInfo.chapter;
          let i = fIndex > sIndex ? -1 : 1;
          if (fIndex === sIndex) return;
          sIndex = sIndex + i;
          do {
            const dataItemTemp = {
              type: "chapter",
              content: `${bookName} ${fIndex}`,
              additionalInfo: {
                bookRank: booksDetails.rank,
                bookName: bookName,
                chapter: fIndex,
                data: { ...data },
              },
            };
            highLight[fIndex] = true;
            if (globalThis.SetQueue) {
              SetQueue(dataItemTemp);
            } else {
              globalThis.Playlist &&
                Playlist.tryAddDataToHistory({ dataItem: dataItemTemp });
            }
            fIndex = fIndex + i;
          } while (fIndex !== sIndex);
        }
        globalThis.LAST_CLICKED_BOOK_CHAPTER = dataItem;
        setHighlightedButtonID(highLight);
        setTimeout(() => {
          setHighlightedButtonID({});
          setTimeout(() => {
            setHighlightedButtonID(highLight);
            setTimeout(() => {
              setHighlightedButtonID({});
            }, 300);
          }, 300);
        }, 300);
        return;
      }

      globalThis.LAST_CLICKED_BOOK_CHAPTER = { ...dataItem };

      if (!dontOpen) {
        shout("playSound", { soundName: "UI_Numpad_Click" });

        globalThis.SetSelectedVerses && SetSelectedVerses([]);
        globalThis?.SetHolded({});

        if (globalThis.CloseNewList) CloseNewList();
        setTimeout(() => {
          if (globalThis.MakingNewTab) {
            const tab = {
              id: uuid(),
              taken: false,
              data: {
                use: "thePage",
                type: "book",
                book: "Genesis",
                bookId: data.id,
                chapter: chapterNo,
                translation: data.translationId,
                shortName: data?.shortName || "",
              },
            };
            globalThis.AddTab(tab);
            globalThis.MakingNewTab(tab);
            globalThis.MakingNewTab = false;
            setOpenSidebar(false);
          } else {
            let chapterUrl = bookData.firstChapterApiLink.replace(
              "1.json",
              `${chapterNo}.json`
            );
            globalThis.Open(
              data.id,
              chapterNo,
              selectedTranslation.id,
              chapterUrl
            );
            setOpenSidebar((prev) => !prev);
            setCurrentExperience(0);
          }
          // MainApp2({ action: 'addStudyNotes', props: { book: bookName, bookId: data.id, chapter: chapterNo, forced: true } })
        }, 0);

        if (!isShiftHold) {
          setLastBookClicked(-1);
          setBookData(null);
        }
      } else {
        if (globalThis.SetQueue) {
          SetQueue(dataItem);
        } else {
          globalThis.Playlist && Playlist.tryAddDataToHistory({ dataItem });
        }
      }
    } else {
      const chapterUrl = bookData.firstChapterApiLink.replace(
        "1.json",
        `${chapterNo}.json`
      );
      globalThis.Open(data.id, chapterNo, selectedTranslation.id, chapterUrl);
      setOpenSidebar((prev) => !prev);
      setCurrentExperience(0);
    }
  };
  const psalmsPartName = (props: { index: number }) => {
    const { index } = props;
    if (index <= 40) {
      return "1 Psalms";
    } else if (index <= 71) {
      return "2 Psalms";
    } else if (index <= 88) {
      return "3 Psalms";
    } else if (index <= 105) {
      return "4 Psalms";
    } else if (index <= 149) {
      return "5 Psalms";
    } else {
      return "";
    }
  };
  const [currentPsalms, setCurrentPsalms] = useState("1 Psalms");

  const renderChapters = useMemo(() => {
    const renderJSX = [];
    if (bookData.commonName === "Psalms") {
      for (let i = 0; i < bookData.numberOfChapters; i++) {
        if (i === 0) {
          renderJSX.push(
            <button
              style={{ width: "100%" }}
              onClick={() => {
                setCurrentPsalms(
                  currentPsalms === "1 Psalms" ? "" : "1 Psalms"
                );
              }}
              class={`psalms-btn ${currentPsalms === "1 Psalms" ? "sidebar-selected-itm" : ""}`}
            >
              <span style={{ width: "100%" }} class="">
                1 Psalms
              </span>
            </button>
          );
        } else if (i === 41) {
          renderJSX.push(
            <button
              style={{ width: "100%" }}
              onClick={() => {
                setCurrentPsalms(
                  currentPsalms === "2 Psalms" ? "" : "2 Psalms"
                );
              }}
              class={`psalms-btn ${currentPsalms === "2 Psalms" ? "sidebar-selected-itm" : ""}`}
            >
              <span style={{ width: "100%" }} class="">
                2 Psalms
              </span>
            </button>
          );
        } else if (i === 72) {
          renderJSX.push(
            <button
              style={{ width: "100%" }}
              onClick={() => {
                setCurrentPsalms(
                  currentPsalms === "3 Psalms" ? "" : "3 Psalms"
                );
              }}
              class={`psalms-btn ${currentPsalms === "3 Psalms" ? "sidebar-selected-itm" : ""}`}
            >
              <span style={{ width: "100%" }} class="">
                3 Psalms
              </span>
            </button>
          );
        } else if (i === 89) {
          renderJSX.push(
            <button
              style={{ width: "100%" }}
              onClick={() => {
                setCurrentPsalms(
                  currentPsalms === "4 Psalms" ? "" : "4 Psalms"
                );
              }}
              class={`psalms-btn ${currentPsalms === "4 Psalms" ? "sidebar-selected-itm" : ""}`}
            >
              <span style={{ width: "100%" }} class="">
                4 Psalms
              </span>
            </button>
          );
        } else if (i === 106) {
          renderJSX.push(
            <button
              style={{ width: "100%" }}
              onClick={() => {
                setCurrentPsalms(
                  currentPsalms === "5 Psalms" ? "" : "5 Psalms"
                );
              }}
              class={`psalms-btn ${currentPsalms === "5 Psalms" ? "sidebar-selected-itm" : ""}`}
            >
              <span style={{ width: "100%" }} class="">
                5 Psalms
              </span>
            </button>
          );
        }
        renderJSX.push(
          <button
            style={{
              display:
                currentPsalms === psalmsPartName({ index: i })
                  ? "flex"
                  : "none",
            }}
            class={`chapter-btn`}
            onClick={() =>
              handleChapterClick({
                id: bookData?.id,
                translationId: bookData.translationId,
                numberOfChapters: bookData.numberOfChapters,
                bookName: psalmsPartName({ index: i }),
                chapterNo: i + 1,
                bookData,
              })
            }
          >
            <span
              className={`sidebar-chapter-itm ${highLightedButtonsID[i + 1] ? "highlight" : "un-highlight"}`}
            >
              {i + 1}
              <CircleCounter
                data={onlineUsers}
                book={bookData.id}
                chapter={i + 1}
              />
            </span>
          </button>
        );
      }
    } else {
      for (let i = 0; i < bookData.numberOfChapters; i++) {
        renderJSX.push(
          <button
            class={`chapter-btn ${i === bookData.numberOfChapters - 1 ? "lastOne" : ""}`}
            onClick={() =>
              handleChapterClick({
                id: bookData?.id,
                translationId: bookData.translationId,
                numberOfChapters: bookData.numberOfChapters,
                bookName: bookData.commonName,
                chapterNo: i + 1,
                bookData,
              })
            }
          >
            <span
              className={`sidebar-chapter-itm ${highLightedButtonsID[i + 1] ? "highlight" : "un-highlight"}`}
            >
              {getTranslatedNumber(i + 1)}
              <CircleCounter
                data={onlineUsers}
                book={bookData.id}
                chapter={i + 1}
              />
            </span>
          </button>
        );
      }
    }
    return renderJSX;
  }, [bookData, highLightedButtonsID, dontOpen, currentPsalms, onlineUsers]);

  return (
    <>
      {renderChapters.map((jsx) => {
        return jsx;
      })}
    </>
  );
};

const CircleCounter = (props: {
  data: any;
  book: string;
  chapter?: number;
}) => {
  const { data, book, chapter } = props;
  if (!data) return null;

  const [isModalOpen, setIsModalOpen] = useState(false);

  const circles = data
    ? !chapter
      ? Object.fromEntries(
          Object.entries(data).filter(([, v]) => v?.bookId === book)
        )
      : Object.fromEntries(
          Object.entries(data).filter(
            ([, v]) => v?.bookId === book && v?.chapter === chapter
          )
        )
    : {};

  const preEntries = Object.entries(circles);

  const entries = Object.entries(preEntries);
  const visibleCount = 2;
  const remaining = entries.length - visibleCount;

  const circleStyle = {
    width: !chapter ? "16px" : "12px",
    height: !chapter ? "16px" : "12px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    fontWeight: "600",
    fontSize: !chapter ? "12px" : "8px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    border: "1px solid white",
    cursor: "pointer",
    marginLeft: "-4px",
  };

  const icons = [TreeIcon, LogIcon, LeafIcon, CatIcon, DogIcon, CoffeBeanIcon];
  const colors = [
    "#34D399",
    "#60A5FA",
    "#F472B6",
    "#FBBF24",
    "#A78BFA",
    "#F87171",
    "#10B981",
    "#F59E0B",
  ];

  // Helper to get user's visual style
  const getUserVisual = (value: any) => {
    try {
      const visual = globalThis?.GetOrSetVisualInTags(value[0]);
      if (visual) {
        const IconComponent = icons[visual.iconIndex];
        const color = colors[visual.colorIndex];
        return { IconComponent, color };
      }
    } catch (e) {
      console.error("Error getting user visual:", e);
    }
    return {
      IconComponent: TreeIcon,
      color: "#34D399",
    };
  };

  useEffect(() => {
    if (isModalOpen) {
      (
        globalThis as { bookModalOpen?: ((open: boolean) => void) | null }
      ).bookModalOpen = setIsModalOpen;
      return () => {
        (
          globalThis as { bookModalOpen?: ((open: boolean) => void) | null }
        ).bookModalOpen = null;
      };
    }
    return () => {
      (
        globalThis as { bookModalOpen?: ((open: boolean) => void) | null }
      ).bookModalOpen = null;
    };
  }, [isModalOpen]);

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: 0,
          position: chapter ? "absolute" : "",
          top: "-5px",
          right: "0px",
        }}
      >
        {entries.slice(0, visibleCount).map(([id, value], index) => {
          const { IconComponent, color } = getUserVisual(value);
          return (
            <div
              key={id}
              style={{
                ...circleStyle,
                backgroundColor: "white",
                zIndex: index + 1,
                marginLeft: index === 0 ? "0px" : "-4px",
                border: `1px solid ${color}`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
            >
              {getBot("system", "app.components").masks[`${value[0]}-photo`] ? (
                <img
                  style={{
                    "border-radius": "50%",
                    width: "16px",
                  }}
                  src={
                    getBot("system", "app.components").masks[
                      `${value[0]}-photo`
                    ]
                  }
                />
              ) : (
                <IconComponent style={{ width: "12px", height: "12px" }} />
              )}
            </div>
          );
        })}

        {remaining > 0 && (
          <div
            style={{
              ...circleStyle,
              backgroundColor: "rgba(196, 196, 196, 1)",
              border: `1px solid rgba(131, 131, 131, 1)`,
              zIndex: 20,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
          >
            <span
              style={{
                fontSize: !chapter ? "9px" : "6px",
                color: "black",
                lineHeight: !chapter ? "16px" : "12px",
                marginLeft: "-1px",
              }}
            >
              +{remaining}
            </span>
          </div>
        )}
      </div>
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(false);
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: "600",
                  color: "#111827",
                  margin: 0,
                }}
              >
                All Users ({entries.length})
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "0",
                  width: "30px",
                  height: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {entries.map(([id, value], index) => {
                const { Icon, color } = globalThis?.GetOrSetVisualInTags
                  ? globalThis.GetOrSetVisualInTags(value[0])
                  : { Icon: TreeIcon, color: "#34D399" };
                const { role } = globalThis.GetUserSessionInfo(value[0]);
                return (
                  <div
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "12px",
                      backgroundColor: "#f9fafb",
                      borderRadius: "8px",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        backgroundColor: color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "600",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      {getBot("system", "app.components").masks[
                        `${id}-photo`
                      ] ? (
                        <img
                          style={{
                            "border-radius": "50%",
                            width: "16px",
                          }}
                          src={
                            getBot("system", "app.components").masks[
                              `${id}-photo`
                            ]
                          }
                        />
                      ) : (
                        <Icon style={{ width: "18px", height: "18px" }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: "600",
                          color: "#111827",
                          marginBottom: "4px",
                        }}
                      >
                        User:{" "}
                        <span style={{ fontSize: "12px" }}>
                          {value?.[0] || id}
                        </span>
                      </div>
                      <div style={{ fontSize: "14px", color: "#6b7280" }}>
                        Book: {book} • Chapter: {chapter}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        // disabled={role !== 'host'}
                        onClick={() => {
                          InviteUser(value[0]);
                          setIsModalOpen(false);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: false
                            ? "1px solid #10B981"
                            : "1px solid #d1d5db",
                          backgroundColor: false ? "#10B981" : "white",
                          color: false ? "white" : "#374151",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        {"Follow"}
                      </button>
                      <button
                        // disabled={role !== 'host'}
                        onClick={() => {
                          HandleSharedTabClick();
                          setIsModalOpen(false);
                        }}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid #3B82F6",
                          backgroundColor: "#3B82F6",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: "500",
                          cursor: "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        Invite
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SearchBar;
