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
  const { translate, openBookSelector, MaterialIcon, theme } =
    useTodayContext();

  const { title, selectorText } = useMemo(() => {
    return {
      title: translate("go-somewhere-new"),
      selectorText: translate("books"),
    };
  }, [translate]);

  const seedBibleIconStyle = useMemo<React.CSSProperties>(() => {
    return {
      width: "24px",
      height: "24px",
      backgroundColor: theme.variables.secondaryFontColor,
    };
  }, [theme]);

  return {
    title,
    openBookSelector,
    selectorText,
    MaterialIcon,
    seedBibleIconStyle,
  };
};
