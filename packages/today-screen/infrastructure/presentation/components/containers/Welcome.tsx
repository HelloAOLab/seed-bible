import { useWelcome } from "../../hooks/useWelcome";
import { SpinnerIcon } from "../ui/SpinnerIcon";
import { SeedBibleIcon } from "../ui/SeedBibleIcon";

export const Welcome = () => {
  const {
    greeting,
    book,
    welcomeVerse,
    openBookSelector,
    selectorText,
    MaterialIcon,
    startButtonText,
    startButtonIcon,
    handleStartButtonClick,
    footerTitle,
    footerContent,
    seedBibleIconStyle,
  } = useWelcome();

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
          onClick={openBookSelector}
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
      <div className={"welcome-screen-footer"}>
        {<SpinnerIcon style={{ width: "2.25rem", height: "2.25rem" }} />}
        <h3 className={"welcome-screen-footer-title"}>{footerTitle}</h3>
        <span className={"welcome-screen-footer-content"}>{footerContent}</span>
      </div>
    </div>
  );
};
