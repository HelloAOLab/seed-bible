import { useTodayContext } from "../contexts/today/TodayContext";
import { useMemo } from "preact/hooks";

type UseSearchSection = () => {
  title: string;
  openBookSelector: () => void;
  selectorText: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
  seedBibleIconStyle: React.CSSProperties;
};

export const useSearchSection: UseSearchSection = () => {
  const { translate, openBookSelector, MaterialIcon, theme, isMobile } =
    useTodayContext();

  const { title, selectorText } = useMemo(() => {
    return {
      title: translate("go-somewhere-new"),
      selectorText: translate("books"),
    };
  }, [translate]);

  const seedBibleIconStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: isMobile.value ? "1.25rem" : "1.5rem",
      height: isMobile.value ? "1.25rem" : "1.5rem",
      backgroundColor: theme.variables.secondaryFontColor,
    };
  }, [theme, isMobile.value]);

  return {
    title,
    openBookSelector,
    selectorText,
    MaterialIcon,
    seedBibleIconStyle,
  };
};
