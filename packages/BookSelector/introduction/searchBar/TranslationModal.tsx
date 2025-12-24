import { ShareIcon, TickIcon } from "introduction.searchBar.Icons";

const { useState, useEffect, useMemo } = os.appHooks;

const ModalCSS = thisBot.tags["TranslationModal.css"];

const TranslationModal = ({
  languageQuery,
  setLanguageQuery,
  filteredApiTranslations,
  selectedTranslation,
  setSelectedTranslation,
  setSelectingTranslation,
  handleTranslationAddition,
  showCustomTranslation,
  setShowCustomTranslation,
}) => {
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
        }}
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div
            className="searchbar"
            style={{ marginBottom: "5px", width: "100%", height: "30px" }}
          >
            <span className="search-icon material-symbols-outlined">
              Search
            </span>
            <input
              type="text"
              placeholder="Seach Translation..."
              value={languageQuery}
              onChange={(e) => setLanguageQuery(e.target.value)}
            />
          </div>
          {LanguageList}
          <div className="footer">
            <div
              class="custom-translation-header"
              onClick={() => {
                setShowCustomTranslation(!showCustomTranslation);
              }}
            >
              <span>Custom Translations</span>
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
    </>
  );
};

const LanguageComponent = ({
  language,
  translationArray,
  selectedTranslation,
  setSelectedTranslation,
  setSelectingTranslation,
  filteredApiTranslations,
}) => {
  const [show, setShow] = useState(false);

  const shareTranslatation = async ({ translation }) => {
    let translationUrl = `https://ao.bot/?pattern=${configBot.tags.pattern}&bios=local%20inst&translationId=${translation.id}`;
    os.setClipboard(translationUrl);
    os.toast("Copied translation share code");
  };

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
            : "",
          marginBottom: show ? "0px" : "10px",
        }}
      >
        <span style={{ textTransform: "capitalize" }}>{language}</span>
        <span
          style={{ transition: "transform 0.3s", opacity: 0.3 }}
          class={`material-symbols-outlined ${show ? "upside-down" : ""}`}
        >
          expand_more
        </span>
      </div>
      {show && (
        <>
          <div style={{ margin: "5px 5px" }}>
            {Object.entries(translationArray).map(([key, value]) => {
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
                        : "",
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

const CustomTranslation = ({ handleTranslationAddition }) => {
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

export default TranslationModal;
