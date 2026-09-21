import type {
  NavMenuContainerProps,
  UseNavMenuContainerType,
} from "../components/containers/NavMenuContainer";
import { getStyles } from "../styles/stylesProvider";

const { useState, useMemo, useCallback, useEffect } = os.appHooks;

type UseNavMenuContainerProps = Pick<
  NavMenuContainerProps,
  "environment" | "getThemeCss" | "themeEventBus"
>;

type UseNavMenuContainer = (
  props: UseNavMenuContainerProps
) => UseNavMenuContainerType;

export const useNavMenuContainer: UseNavMenuContainer = ({
  environment,
  getThemeCss,
  themeEventBus,
}) => {
  const [themeCss, setThemeCss] = useState<string>(getThemeCss());
  const styles = useMemo(() => getStyles(), []);

  const handlePointerEnter = useCallback(() => {
    environment.setZoomable(false);
  }, [environment]);

  const handlePointerLeave = useCallback(() => {
    environment.setZoomable(true);
  }, [environment]);

  useEffect(() => {
    const unsubscribe = themeEventBus.subscribe("OnThemeChanged", ({ css }) => {
      setThemeCss(css);
    });

    return () => unsubscribe();
  }, []);

  return {
    themeCss,
    styles,
    handlePointerEnter,
    handlePointerLeave,
  };
};
