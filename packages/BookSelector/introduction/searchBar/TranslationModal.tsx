import { ShareIcon, TickIcon } from "introduction.searchBar.Icons";
import type { TranslationInterface } from "introduction.searchBar.Interfaces";
import { changeLanguage, getTranslations } from "app.hooks.i18n";

const { useState, useEffect, useMemo } = os.appHooks;

const ModalCSS = thisBot.tags["TranslationModal.css"];

const TranslationModal = (props: {
  languageQuery: string;
  setLanguageQuery: (value: string) => void;
  selectedTranslation: TranslationInterface;
  setSelectedTranslation: (translation: TranslationInterface) => void;
  setSelectingTranslation: (value: boolean) => void;
  handleTranslationAddition: (options: {
    type: string;
    value: string;
    setInputValue: (value: string) => void;
  }) => void;
  showCustomTranslation: boolean;
  setShowCustomTranslation: (value: boolean) => void;
  showIncompleteTranslations: boolean;
  setShowIncompleteTranslations: (value: boolean) => void;
  showAllLanguages: boolean;
  setShowAllLanguages: (value: boolean) => void;
  allowedTranslationLimit: number;
  setAllowedTranslationLimit: (value: number) => void;
  apiTranslations: Record<string, TranslationInterface>;
  defaultTranslations: Array<string>;
}) => {
  const {
    languageQuery,
    setLanguageQuery,
    selectedTranslation,
    setSelectedTranslation,
    setSelectingTranslation,
    handleTranslationAddition,
    showCustomTranslation,
    setShowCustomTranslation,
    showIncompleteTranslations,
    setShowIncompleteTranslations,
    showAllLanguages,
    setShowAllLanguages,
    allowedTranslationLimit,
    setAllowedTranslationLimit,
    apiTranslations,
    defaultTranslations,
  } = props;
  const systemTranslation: { [key: string]: string } = getTranslations();
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const filteredApiTranslations = useMemo(() => {
    if (languageQuery !== "") {
      const translations: {
        [key: string]: Record<string, TranslationInterface>;
      } = {};
      const tempApiTranslations: {
        [key: string]: Record<string, TranslationInterface>;
      } = { ...JSON.parse(JSON.stringify(apiTranslations)) };
      const lowercaseQuery = languageQuery.toLowerCase();
      Object.entries(tempApiTranslations).forEach(([key, value]) => {
        if (key.includes(lowercaseQuery)) {
          translations[key] = translations[key]
            ? {
                ...translations[key],
                ...(value as Record<string, TranslationInterface>),
              }
            : { ...(value as Record<string, TranslationInterface>) };
        } else {
          const group = tempApiTranslations[key] || {};
          if (
            Object.keys(group).filter((translationKey) =>
              translationKey.includes(lowercaseQuery)
            ).length > 0
          ) {
            const values: Record<string, TranslationInterface> = {};
            Object.entries(group).forEach(([subKey, subValue]) => {
              if (subKey.includes(lowercaseQuery) && subValue) {
                values[subKey] = subValue as TranslationInterface;
              }
            });
            if (Object.keys(values).length > 0) {
              translations[key] = translations[key]
                ? { ...translations[key], ...values }
                : { ...values };
            }
          }
        }
      });

      if (!showIncompleteTranslations) {
        Object.entries(translations).forEach(([key, value]) => {
          for (const subKey in value) {
            const translation = value[subKey] as TranslationInterface;
            if (
              translation.numberOfBooks < 66 &&
              translation.id !== selectedTranslation.id
            ) {
              delete value[subKey];
            }
          }
          if (Object.keys(value).length === 0) {
            delete translations[key];
          }
        });
      }
      return Object.entries(translations)
        .slice(0, allowedTranslationLimit)
        .sort(([a, avalue], [b, bvalue]) => {
          if (a === selectedTranslation.languageEnglishName.toLowerCase())
            return -1;
          if (b === selectedTranslation.languageEnglishName.toLowerCase())
            return 1;
          return a.localeCompare(b);
        });
    } else {
      const translations: {
        [key: string]: Record<string, TranslationInterface>;
      } = {
        ...JSON.parse(JSON.stringify(apiTranslations)),
      };

      if (!showAllLanguages) {
        Object.entries(translations).forEach(([englishName, value]) => {
          if (!defaultTranslations.includes(englishName)) {
            delete translations[englishName];
          }
        });
      }

      if (!showIncompleteTranslations) {
        Object.entries(translations).forEach(([key, value]) => {
          for (const subKey in value) {
            const translation = value[subKey] as TranslationInterface;
            if (
              translation.numberOfBooks < 66 &&
              translation.id !== selectedTranslation.id
            ) {
              delete value[subKey];
            }
          }
          if (Object.keys(value).length === 0) {
            delete translations[key];
          }
        });
      }

      return Object.entries(translations)
        .sort(([a, avalue], [b, bvalue]) => {
          if (a === selectedTranslation.languageEnglishName.toLowerCase())
            return -1;
          if (b === selectedTranslation.languageEnglishName.toLowerCase())
            return 1;
          return a.localeCompare(b);
        })
        .slice(0, allowedTranslationLimit);
    }
  }, [
    apiTranslations,
    languageQuery,
    allowedTranslationLimit,
    selectedTranslation,
    showIncompleteTranslations,
    showAllLanguages,
    defaultTranslations,
  ]);
  const LanguageList = useMemo(() => {
    return (
      <div className="language-list">
        {filteredApiTranslations.map(([language, value]) => {
          return (
            <LanguageComponent
              language={language}
              translationArray={value}
              selectedTranslation={selectedTranslation}
              setSelectedTranslation={setSelectedTranslation}
              setSelectingTranslation={setSelectingTranslation}
              filteredApiTranslations={filteredApiTranslations}
            />
          );
        })}
        {showAllLanguages &&
          allowedTranslationLimit < Object.entries(apiTranslations).length &&
          Object.entries(filteredApiTranslations).length >= 50 && (
            <div
              className="item"
              onClick={() => {
                setAllowedTranslationLimit(allowedTranslationLimit + 50);
              }}
              style={{ justifyContent: "center" }}
            >
              <span
                style={{ transition: "transform 0.3s" }}
                class={`material-symbols-outlined ${false ? "upside-down" : ""}`}
              >
                expand_more
              </span>
            </div>
          )}
      </div>
    );
  }, [filteredApiTranslations, selectedTranslation]);
  return (
    <>
      <style>{ModalCSS}</style>
      <div
        className="modal-overlay"
        onClick={() => {
          setSelectingTranslation(false);
          setShowTranslationSettings(false);
        }}
      >
        <div
          className="modal"
          onClick={(e) => {
            e.stopPropagation();
            setShowTranslationSettings(false);
          }}
        >
          <div
            class="sidebar-book-selector"
            style={{ marginBottom: "5px", height: "30px" }}
          >
            <div
              className="searchbar"
              style={{ width: "100%", height: "30px" }}
            >
              <span className="search-icon material-symbols-outlined">
                Search
              </span>
              <input
                type="text"
                placeholder={
                  systemTranslation["searchTranslation"] || "Search Translation"
                }
                value={languageQuery}
                onChange={(e) => setLanguageQuery(e.target.value)}
              />
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowTranslationSettings(!showTranslationSettings);
              }}
              class="material-symbols-outlined"
            >
              settings
            </span>
          </div>
          {LanguageList}
          <div className="footer">
            <div
              class="custom-translation-header"
              onClick={() => {
                setShowCustomTranslation(!showCustomTranslation);
              }}
            >
              <span>
                {systemTranslation["customTranslations"] ||
                  "Custom Translations"}
              </span>
              <span
                style={{
                  transition: "0.5s linear all",
                  transform: showCustomTranslation
                    ? "rotateZ(45deg)"
                    : "rotateZ(0deg)",
                  cursor: "pointer",
                }}
                class="material-symbols-outlined"
              >
                add
              </span>
            </div>
            {showCustomTranslation && (
              <CustomTranslation
                handleTranslationAddition={handleTranslationAddition}
              />
            )}
          </div>
        </div>
      </div>
      {showTranslationSettings && (
        <TranslationSettings
          showIncompleteTranslations={showIncompleteTranslations}
          setShowIncompleteTranslations={setShowIncompleteTranslations}
          showAllLanguages={showAllLanguages}
          setShowAllLanguages={setShowAllLanguages}
        />
      )}
    </>
  );
};

const LanguageComponent = (props: {
  language: string;
  translationArray: Array<TranslationInterface>;
  selectedTranslation: TranslationInterface;
  setSelectedTranslation: (translation: TranslationInterface) => void;
  setSelectingTranslation: (value: boolean) => void;
  filteredApiTranslations: Array<[string, TranslationInterface[]]>;
}) => {
  const {
    language,
    translationArray,
    selectedTranslation,
    setSelectedTranslation,
    setSelectingTranslation,
    filteredApiTranslations,
  } = props;
  const [show, setShow] = useState(false);

  const translationMap: Record<string, string> = {
    eng: "en",
    spa: "es",
    arb: "ar",
    hin: "hi",
  };

  const shareTranslatation = async (props: {
    translation: TranslationInterface;
  }) => {
    const { translation } = props;
    const translationUrl = `https://ao.bot/?pattern=${configBot.tags.pattern}&bios=local%20inst&translationId=${translation.id}`;
    os.setClipboard(translationUrl);
    os.toast("Copied translation share code");
  };

  const sortedTranslations = useMemo(() => {
    if (!show) {
      return [];
    }
    return Object.values(translationArray).sort((a, b) => {
      if (a.id === selectedTranslation.id) return -1;
      if (b.id === selectedTranslation.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [translationArray, selectedTranslation, show]);

  useEffect(() => {
    if (
      selectedTranslation.languageEnglishName.toLowerCase() ===
      language.toLowerCase()
    ) {
      setShow(true);
    }
  }, [selectedTranslation]);

  useEffect(() => {
    if (filteredApiTranslations.length === 1) {
      setShow(true);
    }
  }, [filteredApiTranslations]);

  return (
    <>
      <div
        key={language}
        className="item"
        onClick={() => setShow(!show)}
        style={{
          backgroundColor: show
            ? "color-mix(in srgb, var(--tabSelection) 50%, transparent)"
            : "var(--background)",
          marginBottom: show ? "0px" : "10px",
        }}
      >
        <span style={{ textTransform: "capitalize" }}>{language}</span>
        <span
          style={{ transition: "transform 0.3s" }}
          class={`material-symbols-outlined ${show ? "upside-down" : ""}`}
        >
          expand_more
        </span>
      </div>
      {show && (
        <>
          <div style={{ margin: "5px 5px" }}>
            {sortedTranslations.map((value) => {
              return (
                <div
                  onClick={async () => {
                    setSelectedTranslation(value);
                    setSelectingTranslation(false);
                    if (value?.listOfBooksApiLink?.includes("https")) {
                      web
                        .get(`${value.listOfBooksApiLink}`)
                        .then((e) => {
                          let book0 = e.data.books[0];
                          ChangeTranslation(value.id, book0, value.origin);
                          if (translationMap[value.language]) {
                            changeLanguage(translationMap[value.language]);
                          }
                        })
                        .catch((e) => {
                          console.log(e);
                        });
                    } else {
                      web
                        .get(
                          `https://bible.helloao.org/api/${value.id}/books.json`
                        )
                        .then((e) => {
                          let book0 = e.data.books[0];
                          ChangeTranslation(
                            value.id,
                            book0,
                            "https://bible.helloao.org"
                          );
                          if (translationMap[value.language]) {
                            changeLanguage(translationMap[value.language]);
                          }
                        })
                        .catch((e) => {
                          console.log(e);
                        });
                    }
                  }}
                  style={{
                    background:
                      selectedTranslation.id === value.id
                        ? "color-mix(in srgb, var(--tabSelection) 50%, transparent)"
                        : "var(--background)",
                  }}
                  class="translation-option"
                >
                  <span class="translation-title">
                    {selectedTranslation.id === value.id ? (
                      <TickIcon height={15} width={15} />
                    ) : (
                      <span class="emptyCircle"></span>
                    )}
                    <span class="translation-description">{`${value.name} (${value.shortName})`}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareTranslatation({ translation: value });
                    }}
                    class="share-btn"
                  >
                    <ShareIcon height={18} width={22} />
                  </button>
                </div>
              );
            })}
            <div class="language-separator" style={{ width: "100%" }}></div>
          </div>
        </>
      )}
    </>
  );
};

const CustomTranslation = (props: {
  handleTranslationAddition: (options: {
    type: string;
    value: string;
    setInputValue: (value: string) => void;
  }) => void;
}) => {
  const { handleTranslationAddition } = props;
  const [currentMode, setCurrentMode] = useState("id");
  const [inputValue, setInputValue] = useState("");

  return (
    <div class="custom-translation-container">
      <div class="selectionsection">
        <div>
          <input
            checked={currentMode === "id"}
            onClick={(e) => setCurrentMode(e.target.value)}
            class="radioinput"
            type="radio"
            id="translationId"
            name="translation"
            value="id"
          />
          <span>From ID</span>
        </div>
        <div>
          <input
            checked={currentMode === "url"}
            onClick={(e) => setCurrentMode(e.target.value)}
            class="radioinput"
            type="radio"
            id="translationURL"
            name="translation"
            value="url"
          />
          <span>From URL</span>
        </div>
      </div>
      <div class="custom-tr-api">
        <div class="custom-tr-in-con">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            class="custom-tr-in"
            placeholder={currentMode === "id" ? "Enter ID" : "Enter URL"}
          />
          <button
            onClick={() =>
              handleTranslationAddition({
                type: currentMode,
                value: inputValue,
                setInputValue: setInputValue,
              })
            }
            class="import-btn"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
};

const TranslationSettings = (props: {
  showIncompleteTranslations: boolean;
  setShowIncompleteTranslations: (value: boolean) => void;
  showAllLanguages: boolean;
  setShowAllLanguages: (value: boolean) => void;
}) => {
  const {
    showIncompleteTranslations,
    setShowIncompleteTranslations,
    showAllLanguages,
    setShowAllLanguages,
  } = props;
  return (
    <div className="modal translationSettingsModal">
      <div
        class="translation-option"
        onClick={() => {
          setShowAllLanguages((prev) => !prev);
        }}
      >
        <span class="translation-title">
          <span class="translation-description">Show All Translations</span>
          {showAllLanguages ? (
            <TickIcon height={15} width={15} />
          ) : (
            <span class="emptyCircle"></span>
          )}
        </span>
      </div>
      <div
        class="translation-option"
        onClick={() => {
          setShowIncompleteTranslations((prev) => !prev);
        }}
      >
        <span class="translation-title">
          <span class="translation-description">
            Show Incomplete Translations
          </span>
          {showIncompleteTranslations ? (
            <TickIcon height={15} width={15} />
          ) : (
            <span class="emptyCircle"></span>
          )}
        </span>
      </div>
    </div>
  );
};

export default TranslationModal;
