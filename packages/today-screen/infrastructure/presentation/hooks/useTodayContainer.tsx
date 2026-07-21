import type { CSSProperties } from "preact";
import { TodayContent } from "../components/containers/TodayContent";
import { Welcome } from "../components/containers/Welcome";
import { useTodayContext } from "../contexts/today/TodayContext";
import { useMemo } from "preact/hooks";

type UseTodayContainer = () => {
  Component: () => preact.JSX.Element;
  style: CSSProperties;
};

export const useTodayContainer: UseTodayContainer = () => {
  const { readingHistory } = useTodayContext();
  const status = readingHistory.value.status;
  const { Component, style } = useMemo(() => {
    // Welcome is a definite state — shown only when the user is known to have
    // no history (`empty`). `loading` and `ready` both render the personalized
    // layout, so a returning user never sees Welcome while history loads.
    if (status === "empty") {
      return {
        Component: Welcome,
        style: { alignItems: "safe center" },
      };
    }
    return {
      Component: TodayContent,
      style: { alignItems: "flex-start" },
    };
  }, [status]);

  return {
    Component,
    style,
  };
};
