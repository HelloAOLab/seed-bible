import type { TranslationInterface } from "introduction.searchBar.Interfaces";

import { availableLanguages } from "app.hooks.i18n";

const { useState, useEffect } = os.appHooks;
const thePage = getBot("system", "app.components");

const languageCode = that.lng;

const language = availableLanguages.find(
  (l: { code: string }) => l.code === languageCode
)?.name;

const position = {
  x: window.innerWidth / 2 - 100,
  y: window.innerHeight / 2 - 50,
};

if (language) {
  openPopupSettings(
    <SelectLanguage3 language={language} />,
    null,
    true,
    position
  );
}

function SelectLanguage(props: { language: string }) {
  const openLanguageSelector = async (props: { language: string }) => {
    globalThis.setOpenSidebar(true);
    await os.sleep(500);
    globalThis.setSelectingTranslation(true);
    await os.sleep(200);
    globalThis.setLanguageQuery(props.language);
  };
  return (
    <div
      style={{
        display: "flex",
        height: "100px",
        width: "300px",
        alignItems: "center",
        background: "white",
        padding: "10px",
        flexDirection: "column",
        boxShadow:
          "color-mix(in srgb, var(--tabSelection) 20%, transparent) 0px 3px 8px",
      }}
    >
      <h4 style={{ margin: "0 0 0 20px" }}>
        Would you like to switch to a {props.language} translation?
      </h4>
      <div
        style={{
          display: "flex",
          width: "50%",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => {
            openLanguageSelector({ language: props.language });
            closePopupSettings();
          }}
        >
          Yes
        </button>
        <button
          onClick={() => {
            closePopupSettings();
          }}
          style={{ marginLeft: "10px" }}
        >
          No
        </button>
      </div>
    </div>
  );
}

function SelectLanguage2(props: { language: string }) {
  const [languageData, setLanguageData] = useState<TranslationInterface | null>(
    null
  );

  const selectLanguage = async (props: { language: string }) => {
    if (languageData?.listOfBooksApiLink?.includes("https")) {
      web
        .get(`${languageData.listOfBooksApiLink}`)
        .then((e) => {
          ChangeTranslation(languageData.id, e.data.books, languageData.origin);
        })
        .catch((e) => {
          console.log(e);
        });
    } else {
      web
        .get(`https://bible.helloao.org/api/${languageData.id}/books.json`)
        .then((e) => {
          ChangeTranslation(
            languageData.id,
            e.data.books,
            "https://bible.helloao.org"
          );
        })
        .catch((e) => {
          console.log(e);
        });
    }
  };

  useEffect(() => {
    if (thePage.masks?.allTranslations) {
      for (const translation of thePage.masks.allTranslations) {
        if (
          translation?.languageEnglishName.toLowerCase() ===
          props.language.toLowerCase()
        ) {
          setLanguageData(translation);
          console.log(
            "Found translation data for language:",
            props.language,
            translation
          );
          break;
        }
      }
    } else {
      closePopupSettings();
    }
  }, [props.language]);
  return (
    <div
      style={{
        display: "flex",
        height: "100px",
        width: "300px",
        alignItems: "center",
        background: "white",
        padding: "10px",
        flexDirection: "column",
        boxShadow:
          "color-mix(in srgb, var(--tabSelection) 20%, transparent) 0px 3px 8px",
      }}
    >
      <h4 style={{ margin: "0 0 0 20px" }}>
        Would you like to switch to a {props.language} translation?
      </h4>
      <div
        style={{
          display: "flex",
          width: "50%",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => {
            selectLanguage({ language: props.language });
            closePopupSettings();
          }}
        >
          Yes
        </button>
        <button
          onClick={() => {
            closePopupSettings();
          }}
          style={{ marginLeft: "10px" }}
        >
          No
        </button>
      </div>
    </div>
  );
}

function SelectLanguage3(props: { language: string }) {
  const [languageData, setLanguageData] = useState<TranslationInterface | null>(
    null
  );

  const selectLanguage = async (props: { language: string }) => {
    if (languageData?.listOfBooksApiLink?.includes("https")) {
      web
        .get(`${languageData.listOfBooksApiLink}`)
        .then(async (e) => {
          await ChangeTranslation(
            languageData.id,
            e.data.books,
            languageData.origin
          );
          setSelectedTranslation(languageData);
          await os.sleep(100);
          whisper(thisBot, "initialize");
        })
        .catch((e) => {
          console.log(e);
        });
    } else {
      web
        .get(`https://bible.helloao.org/api/${languageData.id}/books.json`)
        .then(async (e) => {
          await ChangeTranslation(
            languageData.id,
            e.data.books,
            "https://bible.helloao.org"
          );
          setSelectedTranslation(languageData);
          await os.sleep(100);
          whisper(thisBot, "initialize");
        })
        .catch((e) => {
          console.log(e);
        });
    }
  };

  const openLanguageSelector = async (props: { language: string }) => {
    globalThis.setOpenSidebar(true);
    await os.sleep(500);
    globalThis.setSelectingTranslation(true);
    await os.sleep(200);
    globalThis.setLanguageQuery(props.language);
  };

  useEffect(() => {
    if (thePage.masks?.allTranslations) {
      for (const translation of thePage.masks.allTranslations) {
        if (
          translation?.languageEnglishName.toLowerCase() ===
          props.language.toLowerCase()
        ) {
          setLanguageData(translation);
          console.log(
            "Found translation data for language:",
            props.language,
            translation
          );
          break;
        }
      }
    } else {
      closePopupSettings();
    }
  }, [props.language]);
  return (
    <div
      style={{
        display: "flex",
        height: "100px",
        width: "300px",
        alignItems: "center",
        background: "white",
        padding: "10px",
        flexDirection: "column",
        boxShadow:
          "color-mix(in srgb, var(--tabSelection) 20%, transparent) 0px 3px 8px",
      }}
    >
      <h4 style={{ margin: "0 0 0 20px" }}>
        Would you like to switch to a {props.language} translation?
      </h4>
      <div
        style={{
          display: "flex",
          width: "50%",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => {
            selectLanguage({ language: props.language });
            closePopupSettings();
          }}
        >
          Yes
        </button>
        <button
          onClick={() => {
            closePopupSettings();
          }}
          style={{ marginLeft: "10px" }}
        >
          No
        </button>
        <button
          onClick={() => {
            openLanguageSelector({ language: props.language });
            closePopupSettings();
          }}
          style={{ marginLeft: "10px" }}
        >
          Choose
        </button>
      </div>
    </div>
  );
}
