import type { ReadonlySignal } from "@preact/signals";
import type { BibleTheme } from "../../managers/ThemeManager";
import { useI18n } from "../../i18n";
import { useMemo } from "preact/hooks";

type UseSearchSection = (props: {
  theme: ReadonlySignal<BibleTheme>;
  isMobile: ReadonlySignal<boolean>;
  onOpenBookSelector: () => void;
}) => {
  title: string;
  selectorText: string;
  seedBibleIconStyle: React.CSSProperties;
};

export const useSearchSection: UseSearchSection = ({ theme, isMobile }) => {
  const { t } = useI18n();
  // Unwrapped in the render body so this component subscribes to the theme; a
  // `.value` read inside the memo below would not (see useReadingHistoryTimeline).
  const currentTheme = theme.value;

  const { title, selectorText } = useMemo(() => {
    return {
      title: t("go-somewhere-new", { defaultValue: "GO SOMEWHERE NEW" }),
      selectorText: t("books", { defaultValue: "Books" }),
    };
  }, [t]);

  const seedBibleIconStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: isMobile.value ? "1.25rem" : "1.5rem",
      height: isMobile.value ? "1.25rem" : "1.5rem",
      backgroundColor: currentTheme.variables.secondaryFontColor,
    };
  }, [currentTheme, isMobile.value]);

  return {
    title,
    selectorText,
    seedBibleIconStyle,
  };
};
