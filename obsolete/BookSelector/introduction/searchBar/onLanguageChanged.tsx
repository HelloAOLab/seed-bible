import type { TranslationInterface } from "introduction.searchBar.Interfaces";
import { getStyleOf } from "app.styles.styler";

import { availableLanguages, t } from "app.hooks.i18n";

const { useState, useEffect, useCallback } = os.appHooks;
const thePage = getBot("system", "app.components");

const languageCode = that.lng;

const language = availableLanguages.find(
  (l: { code: string }) => l.code === languageCode
);

const position = {
  x: window.innerWidth / 2 - 185,
  y: window.innerHeight / 2 - 75,
};

if (language) {
  openPopupSettings(
    <SelectLanguage language={language} />,
    null,
    true,
    position
  );
}

function SelectLanguage(props: {
  language: { code: string; name: string; nativeName: string };
}) {
  const [languageData, setLanguageData] = useState<TranslationInterface | null>(
    null
  );

  const selectLanguage = useCallback(async () => {
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
  }, [languageData]);

  const openLanguageSelector = useCallback(
    async (props: { language: string }) => {
      globalThis.setOpenSidebar(true);
      await os.sleep(500);
      globalThis.setSelectingTranslation(true);
      await os.sleep(200);
      globalThis.setLanguageQuery(props.language);
    },
    []
  );

  useEffect(() => {
    if (thePage.masks?.allTranslations) {
      let found = false;
      for (const translation of thePage.masks.allTranslations) {
        if (
          translation?.languageEnglishName.toLowerCase() ===
          props.language.name.toLowerCase()
        ) {
          setLanguageData(translation);
          found = true;
          console.log(
            "Found translation data for language:",
            props.language,
            translation
          );
          break;
        }
      }
      if (!found) {
        closePopupSettings();
      }
    } else {
      closePopupSettings();
    }
  }, [props.language]);
  if (!languageData) {
    return null;
  }
  return (
    <>
      <style>{getStyleOf("sidebar.css")}</style>
      <div
        style={{
          display: "flex",
          height: "150px",
          width: "350px",
          alignItems: "center",
          justifyContent: "space-around",
          background: "white",
          padding: "10px",
          flexDirection: "column",
          boxShadow:
            "color-mix(in srgb, var(--tabSelection) 20%, transparent) 0px 3px 8px",
        }}
      >
        <h4 style={{ margin: "0 0 0 20px" }}>
          {t("translationSwitchOption", { translationName: languageData.name })}
        </h4>
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "center",
            gap: "10px",
          }}
        >
          <button
            onClick={() => {
              selectLanguage();
              closePopupSettings();
            }}
            className="option-btn"
          >
            {t("yes") || "Yes"}
          </button>
          <button
            onClick={() => {
              closePopupSettings();
            }}
            className="option-btn"
          >
            {t("no") || "No"}
          </button>
          <button
            onClick={() => {
              openLanguageSelector({ language: props.language.name });
              closePopupSettings();
            }}
            className="option-btn"
          >
            {t("chooseAnother") || "Choose another"}
          </button>
        </div>
      </div>
    </>
  );
}
