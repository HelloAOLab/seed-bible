import {
  ShareIcon,
  TickIcon,
  SettingsIcon,
  SelectedIcon,
  AddIcon,
  MinusIcon,
} from "introduction.searchBar.Icons";
import type { TranslationInterface } from "introduction.searchBar.Interfaces";
import { getTranslations } from "app.hooks.i18n";

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
  allowedTranslationLimit: number;
  setAllowedTranslationLimit: (value: number) => void;
  apiTranslations: Record<string, TranslationInterface>;
  defaultTranslations: Array<string>;
  windowSize: number;
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
    allowedTranslationLimit,
    setAllowedTranslationLimit,
    apiTranslations,
    defaultTranslations,
    windowSize,
  } = props;
  const systemTranslation: { [key: string]: string } = getTranslations();
  const [showAllLanguages, setShowAllLanguages] = useState(
    thisBot.masks?.showAllLanguages || "complete"
  );
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [showTranslationInfo, setShowTranslationInfo] = useState<{
    translation: TranslationInterface;
    position: { x: number; y: number };
  } | null>(null);
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

      if (showAllLanguages === "complete") {
        Object.entries(translations).forEach(([key, value]) => {
          for (const subKey in value) {
            const translation = value[subKey] as TranslationInterface;
            if (
              !translation?.origin &&
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
      } else if (showAllLanguages === "popular") {
        Object.entries(translations).forEach(([englishName]) => {
          if (!defaultTranslations.includes(englishName)) {
            delete translations[englishName];
          }
        });
      }

      return Object.entries(translations)
        .slice(0, allowedTranslationLimit)
        .sort(([a], [b]) => {
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

      if (showAllLanguages === "complete") {
        Object.entries(translations).forEach(([key, value]) => {
          for (const subKey in value) {
            const translation = value[subKey] as TranslationInterface;
            if (
              !translation?.origin &&
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
      } else if (showAllLanguages === "popular") {
        Object.entries(translations).forEach(([englishName]) => {
          if (!defaultTranslations.includes(englishName)) {
            delete translations[englishName];
          }
        });
      }

      return Object.entries(translations)
        .sort(([a], [b]) => {
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
    showAllLanguages,
    defaultTranslations,
  ]);
  const LanguageList = useMemo(() => {
    if (
      filteredApiTranslations.length === 0 &&
      (showAllLanguages === "complete" || showAllLanguages === "popular")
    ) {
      return (
        <div
          className="language-list"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            textAlign: "center",
          }}
        >
          <span>
            {systemTranslation["noLanguageResultsFound"] ||
              "No results found. Would you like to expand your search to include partial and incomplete languages as well?"}
          </span>
          <button
            onClick={() => {
              setShowAllLanguages("all");
            }}
            style={{
              display: "flex",
              background: "var(--secondaryColor)",
              padding: "5px",
              borderRadius: "5px",
              border: "none",
              outline: "none",
              color: "var(--text1)",
              width: "max-content",
            }}
          >
            {systemTranslation["showAllLanguages"] || "Show all languages"}
          </button>
        </div>
      );
    } else if (
      filteredApiTranslations.length === 0 &&
      showAllLanguages === "all"
    ) {
      return (
        <div className="language-list">
          <span>No results found.</span>
        </div>
      );
    }
    return (
      <div
        className="language-list"
        onScroll={() => {
          setShowTranslationInfo(null);
          setShowTranslationSettings(false);
        }}
      >
        {filteredApiTranslations.map(([language, value]) => {
          return (
            <LanguageComponent
              language={language}
              translationArray={value}
              selectedTranslation={selectedTranslation}
              setSelectedTranslation={setSelectedTranslation}
              setSelectingTranslation={setSelectingTranslation}
              filteredApiTranslations={filteredApiTranslations}
              showAllLanguages={showAllLanguages}
              languageQuery={languageQuery}
              setShowTranslationInfo={setShowTranslationInfo}
              showTranslationInfo={showTranslationInfo}
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
                className={`material-symbols-outlined`}
              >
                expand_more
              </span>
            </div>
          )}
      </div>
    );
  }, [
    filteredApiTranslations,
    selectedTranslation,
    showAllLanguages,
    languageQuery,
    showTranslationInfo,
  ]);

  useEffect(() => {
    setTagMask(thisBot, "showAllLanguages", showAllLanguages, "local");
  }, [showAllLanguages]);
  return (
    <>
      <style>{ModalCSS}</style>
      <div
        className="modal-overlay"
        onClick={() => {
          setSelectingTranslation(false);
          setShowTranslationSettings(false);
          setShowTranslationInfo(null);
        }}
      >
        <div
          className="modal"
          onClick={(e) => {
            e.stopPropagation();
            setShowTranslationSettings(false);
            setShowTranslationInfo(null);
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
                id="translation-search-input"
              />
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setShowTranslationSettings((prev) => !prev);
                setShowTranslationInfo(null);
              }}
              className="settingsIcon"
            >
              <SettingsIcon />
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
                  cursor: "pointer",
                }}
              >
                {!showCustomTranslation ? (
                  <AddIcon height={20} width={20} />
                ) : (
                  <MinusIcon height={20} width={20} />
                )}
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
          showAllLanguages={showAllLanguages}
          setShowAllLanguages={setShowAllLanguages}
          setShowTranslationSettings={setShowTranslationSettings}
        />
      )}
      {showTranslationInfo && (
        <TranslationInfo
          translation={showTranslationInfo.translation}
          position={showTranslationInfo.position}
          windowSize={windowSize}
        />
      )}
    </>
  );
};

const LanguageComponent = (props: {
  language: string;
  translationArray: Record<string, TranslationInterface>;
  selectedTranslation: TranslationInterface;
  setSelectedTranslation: (translation: TranslationInterface) => void;
  setSelectingTranslation: (value: boolean) => void;
  filteredApiTranslations: Array<
    [string, Record<string, TranslationInterface>]
  >;
  showAllLanguages: "all" | "completed" | "popular";
  languageQuery: string;
  showTranslationInfo: {
    translation: TranslationInterface;
    position: { x: number; y: number };
  } | null;
  setShowTranslationInfo: (
    value: {
      translation: TranslationInterface;
      position: { x: number; y: number };
    } | null
  ) => void;
}) => {
  const {
    language,
    translationArray,
    selectedTranslation,
    setSelectedTranslation,
    setSelectingTranslation,
    filteredApiTranslations,
    showAllLanguages,
    languageQuery,
    setShowTranslationInfo,
    showTranslationInfo,
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
    console.log(translation, "translation");
    let translationUrl = "";
    if (translation?.origin) {
      const translationOrigin = `${translation.listOfBooksApiLink}`.replace(
        `${translation.id}/books.json`,
        "available_translations.json"
      );
      translationUrl = `https://ao.bot/?pattern=${configBot.tags.pattern || "SeedBible"}&bios=local%20inst&translation=${translationOrigin}`;
    } else {
      translationUrl = `https://ao.bot/?pattern=${configBot.tags.pattern || "SeedBible"}&bios=local%20inst&translation=${translation.id}`;
    }
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
    if (languageQuery.length > 0) {
      setShow(true);
    } else if (filteredApiTranslations.length === 1) {
      setShow(true);
    } else if (
      selectedTranslation.languageEnglishName.toLowerCase() ===
      language.toLowerCase()
    ) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [languageQuery, selectedTranslation, filteredApiTranslations, language]);

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
              const completionPercentage = Math.ceil(
                (value.numberOfBooks / 66) * 100
              );
              const rotation = (completionPercentage / 100) * 360;
              return (
                <div
                  onClick={async () => {
                    setSelectedTranslation(value);
                    setSelectingTranslation(false);
                    if (value?.listOfBooksApiLink?.includes("https")) {
                      web
                        .get(`${value.listOfBooksApiLink}`)
                        .then((e) => {
                          ChangeTranslation(
                            value.id,
                            e.data.books,
                            value.origin
                          );
                          setOpenSidebar(false);
                          // if (translationMap[value.language]) {
                          //   changeLanguage(translationMap[value.language]);
                          // }
                        })
                        .catch((e) => {
                          console.log(e);
                        });
                    } else {
                      web
                        .get(
                          `https://vmfnri.helloao.org/api/${value.id}/books.json`
                        )
                        .then((e) => {
                          ChangeTranslation(
                            value.id,
                            e.data.books,
                            "https://vmfnri.helloao.org"
                          );
                          setOpenSidebar(false);
                          // if (translationMap[value.language]) {
                          //   changeLanguage(translationMap[value.language]);
                          // }
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
                    ) : showAllLanguages === "all" ||
                      showAllLanguages === "popular" ? (
                      <span
                        class="emptyCircle"
                        style={{
                          background: `linear-gradient(white, white) padding-box, conic-gradient(from -${rotation}deg, var(--secondaryColor) ${completionPercentage}%, #eee 0) border-box`,
                        }}
                      ></span>
                    ) : (
                      <span class="emptyCircle"></span>
                    )}
                    <span class="translation-description">{`${value.name} (${value.shortName})`}</span>
                    {value?.licenseNotice && (
                      <span
                        style={{ display: "flex" }}
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          console.log(value, "showTranslationInfo");
                          if (showTranslationInfo) {
                            if (
                              showTranslationInfo.translation.id === value.id
                            ) {
                              setShowTranslationInfo(null);
                              return;
                            } else {
                              setShowTranslationInfo({
                                translation: value,
                                position: { x: e.clientX, y: e.clientY },
                              });
                              return;
                            }
                          }
                          setShowTranslationInfo({
                            translation: value,
                            position: { x: e.clientX, y: e.clientY },
                          });
                        }}
                        title="Information about this translation"
                      >
                        <span
                          style={{ fontSize: "18px" }}
                          class="material-symbols-outlined"
                        >
                          info
                        </span>
                      </span>
                    )}
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
        <div style={{ display: "flex", alignItems: "center" }}>
          <label>
            <input
              checked={currentMode === "id"}
              onClick={(e) => setCurrentMode(e.target.value)}
              class="radioinput"
              type="radio"
              id="translationId"
              name="translation"
              value="id"
            />
          </label>
          <span>From ID</span>
        </div>
        <div>
          <label>
            <input
              checked={currentMode === "url"}
              onClick={(e) => setCurrentMode(e.target.value)}
              class="radioinput"
              type="radio"
              id="translationURL"
              name="translation"
              value="url"
            />
          </label>
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
  showAllLanguages: "complete" | "all" | "popular";
  setShowAllLanguages: (value: "complete" | "all" | "popular") => void;
  setShowTranslationSettings: (value: boolean) => void;
}) => {
  const { showAllLanguages, setShowAllLanguages, setShowTranslationSettings } =
    props;
  return (
    <div className="modal translationSettingsModal">
      <div
        class="translation-option"
        onClick={() => {
          setShowAllLanguages(() => {
            setShowTranslationSettings(false);
            return "complete";
          });
        }}
      >
        <span
          class="translation-title"
          style={{
            color:
              showAllLanguages === "complete"
                ? "var(--secondaryColor)"
                : "var(--text3)",
          }}
        >
          {showAllLanguages === "complete" ? (
            <SelectedIcon height={17} width={17} />
          ) : (
            <span
              class="emptyCircle"
              style={{ border: "1px solid #ccc" }}
            ></span>
          )}
          <span class="translation-description">Complete languages</span>
        </span>
      </div>
      <div
        class="translation-option"
        onClick={() => {
          setShowAllLanguages(() => {
            setShowTranslationSettings(false);
            return "all";
          });
        }}
      >
        <span
          class="translation-title"
          style={{
            color:
              showAllLanguages === "all"
                ? "var(--secondaryColor)"
                : "var(--text3)",
          }}
        >
          {showAllLanguages === "all" ? (
            <SelectedIcon height={17} width={17} />
          ) : (
            <span
              class="emptyCircle"
              style={{ border: "1px solid #ccc" }}
            ></span>
          )}
          <span class="translation-description">All languages</span>
        </span>
      </div>
      <div
        class="translation-option"
        onClick={() => {
          setShowAllLanguages(() => {
            setShowTranslationSettings(false);
            return "popular";
          });
        }}
      >
        <span
          class="translation-title"
          style={{
            color:
              showAllLanguages === "popular"
                ? "var(--secondaryColor)"
                : "var(--text3)",
          }}
        >
          {showAllLanguages === "popular" ? (
            <SelectedIcon height={17} width={17} />
          ) : (
            <span
              class="emptyCircle"
              style={{ border: "1px solid #ccc" }}
            ></span>
          )}
          <span class="translation-description">Popular languages</span>
        </span>
      </div>
    </div>
  );
};

const TranslationInfo = (props: {
  translation: TranslationInterface;
  position: { x: number; y: number };
  windowSize: number;
}) => {
  const { translation, position, windowSize } = props;
  const [textArray, setTextArray] = useState<string[]>([]);

  useEffect(() => {
    if (translation.licenseNotice) {
      const regex = /(https?:\/\/[^\s]+|\n)/g;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = translation.licenseNotice.split(regex);
      const formattedParts = [];
      for (const part of parts) {
        if (part !== "\n" && part.trim() !== "") {
          if (urlRegex.test(part)) {
            formattedParts.push(
              `<a href="${part}" target="_blank" style="color: var(--secondaryColor)">${part}</a>`
            );
          } else {
            formattedParts.push(part);
          }
        }
      }
      setTextArray(formattedParts);
    }
  }, [translation]);
  return (
    <div
      style={
        windowSize > 768
          ? {
              top: `calc(${position.y}px - 35px - 10dvh)`,
              left: `calc(${position.x}px - (50dvw - 565px))`,
            }
          : {
              top: `calc(${position.y}px)`,
              left: `calc(${position.x}px - 265px)`,
            }
      }
      className="modal translationInfoModal"
    >
      {textArray.map((part, index) => (
        <span
          style={{ display: "block" }}
          key={index}
          dangerouslySetInnerHTML={{ __html: part }}
        ></span>
      ))}
    </div>
  );
};

export default TranslationModal;
