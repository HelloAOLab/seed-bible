import {
  Signal,
  useComputed,
  useSignal,
  type ReadonlySignal,
} from "@preact/signals";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";
import { useI18n } from "../../i18n";
import { getHighlightedWelcomeVerse } from "./welcomeVerseMap";

import { useMemo, useEffect, useCallback } from "preact/hooks";

type UseWelcome = (props: {
  today: TodayManager;
  login: LoginManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenBookSelector: () => void;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  greeting: string;
  book: ReadonlySignal<string>;
  welcomeVerse: Signal<string>;
  selectorText: string;
  startButtonText: string;
  startButtonIcon: string;
  handleStartButtonClick: () => void;
  seedBibleIconStyle: React.CSSProperties;
};

const STRAT_BUTTON_ICON = "arrow_right_alt";

export const useWelcome: UseWelcome = ({
  today,
  login,
  theme,
  onOpenPassage,
}) => {
  const { bookNames, getVerseText, lastTranslationId, getDefaultTranslation } =
    today;
  const username = login.profile.value?.name;
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
    // `onOpenPassage` falls back to the default translation when this is unset.
    onOpenPassage({
      bookId: "GEN",
      chapter: 1,
      translationId: lastTranslationId.value,
    });
  }, [onOpenPassage, lastTranslationId.value]);

  const seedBibleIconStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: "1.25rem",
      height: "1.25rem",
      backgroundColor: theme.value.variables.readerFontColor,
    };
  }, [theme.value]);

  return {
    greeting,
    book,
    welcomeVerse,
    selectorText,
    startButtonText,
    startButtonIcon: STRAT_BUTTON_ICON,
    handleStartButtonClick,
    seedBibleIconStyle,
  };
};
