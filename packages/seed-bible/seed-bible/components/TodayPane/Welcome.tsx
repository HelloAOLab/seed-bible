import type { ReadonlySignal } from "@preact/signals";
import { useWelcome } from "./useWelcome";
import { SeedBibleIcon } from "./SeedBibleIcon";
import { MaterialIcon } from "../icons";
import type { LoginManager } from "../../managers/LoginManager";
import type { BibleTheme } from "../../managers/ThemeManager";
import type {
  TodayManager,
  TodayPassageTarget,
} from "../../managers/TodayManager";

export const Welcome = (props: {
  today: TodayManager;
  login: LoginManager;
  theme: ReadonlySignal<BibleTheme>;
  onOpenBookSelector: () => void;
  onOpenPassage: (target: TodayPassageTarget) => void;
}) => {
  const {
    greeting,
    book,
    welcomeVerse,
    selectorText,
    startButtonText,
    startButtonIcon,
    handleStartButtonClick,
    seedBibleIconStyle,
  } = useWelcome(props);

  return (
    <div className={"welcome-screen"}>
      <h1 className={"welcome-screen-greeting"}>{greeting}</h1>
      <span className={"welcome-screen-book"}>{book}</span>
      <div
        className="welcome-screen-verse"
        dangerouslySetInnerHTML={{ __html: welcomeVerse.value }}
      />
      <div className={"welcome-screen-navigation"}>
        <button
          className="book-selector-button clickable"
          type="button"
          onClick={props.onOpenBookSelector}
        >
          <SeedBibleIcon style={seedBibleIconStyle} />
          {selectorText}
        </button>
        <button
          className={"welcome-screen-start-button clickable"}
          onClick={handleStartButtonClick}
        >
          {startButtonText}
          <MaterialIcon>{startButtonIcon}</MaterialIcon>
        </button>
      </div>
    </div>
  );
};
