import {
  Signal,
  useComputed,
  useSignal,
  type ReadonlySignal,
} from "@preact/signals";
import { useTodayContext } from "../contexts/today/TodayContext";

import { useMemo, useEffect, useCallback } from "preact/hooks";

type UseWelcome = () => {
  greeting: string;
  book: ReadonlySignal<string>;
  welcomeVerse: Signal<string>;
  openBookSelector: () => void;
  selectorText: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
  startButtonText: string;
  startButtonIcon: string;
  handleStartButtonClick: () => void;
  footerTitle: string;
  footerContent: string;
  seedBibleIconStyle: React.CSSProperties;
};

const STRAT_BUTTON_ICON = "arrow_right_alt";

export const useWelcome: UseWelcome = () => {
  const {
    translate,
    username,
    bookNames,
    getVerseText,
    lastTranslationId,
    getDefaultTranslation,
    getHighlightedWelcomeVerse,
    openBookSelector,
    MaterialIcon,
    addTab,
    theme,
  } = useTodayContext();

  const greeting = useMemo(() => {
    return username
      ? translate("personal-greeting", { name: username })
      : translate("anonymous-greeting");
  }, [username, translate]);

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

  const { selectorText, startButtonText, footerTitle, footerContent } =
    useMemo(() => {
      return {
        selectorText: translate("open-bible"),
        startButtonText: translate("read-first-chapter"),
        footerTitle: translate("everything-begins-small"),
        footerContent: translate("no-rush"),
      };
    }, [translate]);

  const handleStartButtonClick = useCallback(() => {
    const defaultTranslation = getDefaultTranslation();
    const translationId = lastTranslationId.value ?? defaultTranslation ?? "";
    addTab("GEN", 1, translationId);
  }, [addTab, getDefaultTranslation, lastTranslationId.value]);

  const seedBibleIconStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: "20px",
      height: "20px",
      backgroundColor: theme.variables.readerFontColor,
    };
  }, [theme]);

  return {
    greeting,
    book,
    welcomeVerse,
    openBookSelector,
    selectorText,
    MaterialIcon,
    startButtonText,
    startButtonIcon: STRAT_BUTTON_ICON,
    handleStartButtonClick,
    footerTitle,
    footerContent,
    seedBibleIconStyle,
  };
};
