import { useTodayContext } from "../contexts/today/TodayContext";
const { useMemo } = os.appHooks;

type UseSearchSection = () => {
  title: string;
  openBookSelector: () => void;
  SeedBibleIcon(params?: {
    // eslint-disable-next-line
    [key: string]: any;
    size?: number | undefined;
  }): preact.JSX.Element;
  selectorText: string;
  MaterialIcon: (props: {
    children: string;
    className?: string | undefined;
  }) => preact.JSX.Element;
};

export const useSearchSection: UseSearchSection = () => {
  const { translate, openBookSelector, SeedBibleIcon, MaterialIcon } =
    useTodayContext();

  const { title, selectorText } = useMemo(() => {
    return {
      title: translate("go-somewhere-new"),
      selectorText: translate("books"),
    };
  }, [translate]);

  return {
    title,
    openBookSelector,
    SeedBibleIcon,
    selectorText,
    MaterialIcon,
  };
};
