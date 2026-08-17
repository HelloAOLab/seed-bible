import {
  Signal,
  useComputed,
  useSignal,
  type ReadonlySignal,
} from "@preact/signals";
import { useTodayContext } from "./TodayContext";
import { useI18n } from "../../i18n";
import { getHighlightedWelcomeVerse } from "./welcomeVerseMap";

import { useMemo, useEffect, useCallback } from "preact/hooks";

type UseWelcome = () => {
  greeting: string;
  book: ReadonlySignal<string>;
  welcomeVerse: Signal<string>;
  openBookSelector: () => void;
  selectorText: string;
  startButtonText: string;
  startButtonIcon: string;
  handleStartButtonClick: () => void;
  seedBibleIconStyle: React.CSSProperties;
};

const STRAT_BUTTON_ICON = "arrow_right_alt";

export const useWelcome: UseWelcome = () => {
  const {
    username,
    bookNames,
    getVerseText,
    lastTranslationId,
    getDefaultTranslation,
    openBookSelector,
    openPassage,
    theme,
  } = useTodayContext();
  const { t } = useI18n();

  const greeting = useMemo(() => {
    return username
      ? t("personal-greeting", {
          name: username,
          defaultValue: "Welcome, {{name}}!",
        })
      : t("anonymous-greeting", { defaultValue: "Welcome!" });
  }, [username, t]);

  const book = useComputed(() => {
    return `${bookNames.value.get("JHN")?.toUpperCase()} 1:1`;
  });
  const welcomeVerse = useSignal("");

  useEffect(() => {
    let isActive = true;

    const fetchWelcomeVerse = async () => {
      const defaultTranslation = getDefaultTranslation();
      const translationId = lastTranslationId.value ?? defaultTranslation ?? "";

      const rawVerseText = await getVerseText(translationId, "JHN", 1, 1);
      const computedVerse = getHighlightedWelcomeVerse(
        translationId,
        rawVerseText ?? ""
      );

      if (isActive) {
        welcomeVerse.value = `"${computedVerse}"`;
      }
    };

    fetchWelcomeVerse();

    return () => {
      isActive = false;
    };
  }, [lastTranslationId.value]);

  const { selectorText, startButtonText } = useMemo(() => {
    return {
      selectorText: t("open-bible", { defaultValue: "Open Bible" }),
      startButtonText: t("read-first-chapter", {
        defaultValue: "Read the first chapter",
      }),
    };
  }, [t]);

  const handleStartButtonClick = useCallback(() => {
    // `openPassage` falls back to the default translation when this is unset.
    openPassage({
      bookId: "GEN",
      chapter: 1,
      translationId: lastTranslationId.value,
    });
  }, [openPassage, lastTranslationId.value]);

  const seedBibleIconStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: "1.25rem",
      height: "1.25rem",
      backgroundColor: theme.variables.readerFontColor,
    };
  }, [theme]);

  return {
    greeting,
    book,
    welcomeVerse,
    openBookSelector,
    selectorText,
    startButtonText,
    startButtonIcon: STRAT_BUTTON_ICON,
    handleStartButtonClick,
    seedBibleIconStyle,
  };
};
