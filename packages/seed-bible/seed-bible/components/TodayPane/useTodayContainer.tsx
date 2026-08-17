import type { CSSProperties } from "preact";
import type { TodayManager } from "../../managers/TodayManager";

type UseTodayContainer = (today: TodayManager) => {
  /** Whether to render Welcome instead of the personalized layout. */
  showWelcome: boolean;
  style: CSSProperties;
};

export const useTodayContainer: UseTodayContainer = (today) => {
  // Welcome is a definite state — shown only when the user is known to have no
  // history (`empty`). `loading` and `ready` both render the personalized
  // layout, so a returning user never sees Welcome while history loads.
  const showWelcome = today.readingHistory.value.status === "empty";

  return {
    showWelcome,
    style: { alignItems: showWelcome ? "safe center" : "flex-start" },
  };
};
