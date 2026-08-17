import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { todayStub } from "../../testUtils/todayStubs";
import { ResumeReadingSection } from "@packages/seed-bible/seed-bible/components/TodayPane/ResumeReadingSection";
import { useResumeReadingSection } from "@packages/seed-bible/seed-bible/components/TodayPane/useResumeReadingSection";

vi.mock(
  "@packages/seed-bible/seed-bible/components/TodayPane/useResumeReadingSection",
  () => ({
    useResumeReadingSection: vi.fn(),
  })
);

type Result = ReturnType<typeof useResumeReadingSection>;

function makeResult(
  cardData: Partial<Result["cardData"]> = {},
  handleButtonClick = vi.fn()
): Result {
  return {
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
    vi.clearAllMocks();
  });

  function setup(
    cardData: Partial<Result["cardData"]> = {},
    handleButtonClick = vi.fn()
  ) {
    (useResumeReadingSection as Mock).mockReturnValue(
      makeResult(cardData, handleButtonClick)
    );
    act(() =>
      render(
        <ResumeReadingSection today={todayStub({})} onOpenPassage={vi.fn()} />,
        container
      )
    );
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
    expect(
      q(".today-resume-card button .material-symbols-outlined")!.textContent
    ).toBe("bookmark");
  });

  it("calls handleButtonClick when the button is clicked", () => {
    const handleButtonClick = vi.fn();
    setup({}, handleButtonClick);
    act(() =>
      container
        .querySelector<HTMLButtonElement>(".today-resume-card button")!
        .click()
    );
    expect(handleButtonClick).toHaveBeenCalledTimes(1);
  });
});
