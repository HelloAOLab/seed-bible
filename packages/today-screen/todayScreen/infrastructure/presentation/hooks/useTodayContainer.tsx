import { TodayContent } from "../components/containers/TodayContent";
import { Welcome } from "../components/containers/Welcome";
import { useTodayContext } from "../contexts/today/TodayContext";
const { useMemo } = os.appHooks;

type UseTodayContainer = () => {
  Component: () => preact.JSX.Element;
};

export const useTodayContainer: UseTodayContainer = () => {
  const { userId, userLastReading } = useTodayContext();
  const Component = useMemo(() => {
    if (!userId || !userLastReading.value) {
      return Welcome;
    }
    return TodayContent;
  }, [userId, userLastReading.value]);

  return {
    Component,
  };
};
