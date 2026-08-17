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
      backgroundColor: theme.value.variables.secondaryFontColor,
    };
  }, [theme.value, isMobile.value]);

  return {
    title,
    selectorText,
    seedBibleIconStyle,
  };
};
