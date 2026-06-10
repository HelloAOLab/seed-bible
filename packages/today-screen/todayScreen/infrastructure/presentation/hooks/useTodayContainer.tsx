import { TodayContent } from "../components/containers/TodayContent";
import { Welcome } from "../components/containers/Welcome";
import { useTodayContext } from "../contexts/today/TodayContext";
const { useMemo } = os.appHooks;

type UseTodayContainer = () => {
  Component: () => preact.JSX.Element;
  style: React.CSSProperties;
};

export const useTodayContainer: UseTodayContainer = () => {
  const { userId, userLastReading } = useTodayContext();
  const { Component, style } = useMemo(() => {
    if (!userId || !userLastReading.value) {
      return {
        Component: Welcome,
        style: { alignItems: "safe center" },
      };
    }
    return {
      Component: TodayContent,
      style: { alignItems: "flex-start" },
    };
  }, [userId, userLastReading.value]);

  return {
    Component,
    style,
  };
};
