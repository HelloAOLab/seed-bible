import { render } from "preact";
import { act } from "preact/test-utils";
import { ResumeReadingSection } from "todayScreen.infrastructure.presentation.components.containers.ResumeReadingSection";
import { useResumeReadingSection } from "todayScreen.infrastructure.presentation.hooks.useResumeReadingSection";

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.useResumeReadingSection",
  () => ({
    useResumeReadingSection: jest.fn(),
  })
);

type Result = ReturnType<typeof useResumeReadingSection>;

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

function makeResult(
  cardData: Partial<Result["cardData"]> = {},
  handleButtonClick = jest.fn()
): Result {
  return {
    MaterialIcon,
    cardData: {
      title: "CONTINUE WHERE YOU LEFT",
      book: "Genesis",
      chapter: 3,
      buttonIcon: "play_arrow",
      ...cardData,
    },
    handleButtonClick,
  } as unknown as Result;
}

describe("ResumeReadingSection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(
    cardData: Partial<Result["cardData"]> = {},
    handleButtonClick = jest.fn()
  ) {
    (useResumeReadingSection as jest.Mock).mockReturnValue(
      makeResult(cardData, handleButtonClick)
    );
    act(() => render(<ResumeReadingSection />, container));
    return handleButtonClick;
  }

  const q = (sel: string) => container.querySelector(sel);

  it("renders the card title", () => {
    setup({ title: "RESUME" });
    expect(q(".today-resume-card > span")!.textContent).toBe("RESUME");
  });

  it("renders the book and chapter in the heading", () => {
    setup({ book: "John", chapter: 3 });
    expect(q(".today-resume-card h1")!.textContent).toBe("John 3");
  });

  it("renders the button icon through MaterialIcon", () => {
    setup({ buttonIcon: "bookmark" });
    expect(q(".today-resume-card button .material-icon")!.textContent).toBe(
      "bookmark"
    );
  });

  it("calls handleButtonClick when the button is clicked", () => {
    const handleButtonClick = jest.fn();
    setup({}, handleButtonClick);
    act(() =>
      container
        .querySelector<HTMLButtonElement>(".today-resume-card button")!
        .click()
    );
    expect(handleButtonClick).toHaveBeenCalledTimes(1);
  });
});
