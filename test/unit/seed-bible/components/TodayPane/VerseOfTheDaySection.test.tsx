import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { VerseOfTheDaySection } from "@packages/seed-bible/seed-bible/components/TodayPane/VerseOfTheDaySection";
import { TimeProvider } from "@packages/seed-bible/seed-bible/components/TodayPane/TimeContext";
import type { TodayVerseOfTheDay } from "@packages/seed-bible/seed-bible/managers/TodayManager";
import { todayStub } from "../../testUtils/todayStubs";
import { waitFor } from "../../testUtils/createTestSeedBibleState";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

const JOHN_3_16: TodayVerseOfTheDay = {
  bookId: "JHN",
  chapter: 3,
  verse: 16,
  translationId: "BSB",
  text: "For God so loved the world…",
};

describe("VerseOfTheDaySection", () => {
  let container: HTMLDivElement;
  let getVerseOfTheDay: Mock;
  let onOpenPassage: Mock;
  let lastTranslationId: Signal<string | undefined>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    getVerseOfTheDay = vi.fn(async () => JOHN_3_16);
    onOpenPassage = vi.fn();
    lastTranslationId = signal<string | undefined>("BSB");
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function setup() {
    const today = todayStub({
      getVerseOfTheDay,
      lastTranslationId,
      getDefaultTranslation: () => "DEF",
      bookNames: signal(new Map([["JHN", "John"]])),
    });
    act(() =>
      render(
        <TimeProvider>
          <VerseOfTheDaySection today={today} onOpenPassage={onOpenPassage} />
        </TimeProvider>,
        container
      )
    );
  }

  const text = () =>
    container.querySelector(".sb-today-verse-of-the-day-text")?.textContent;
  const referenceButton = () =>
    container.querySelector<HTMLButtonElement>(
      ".sb-today-verse-of-the-day-reference"
    );

  it("shows the verse and its reference once it loads", async () => {
    setup();
    await waitFor(() => text() !== undefined);

    expect(text()).toBe("For God so loved the world…");
    expect(referenceButton()?.textContent).toContain("John 3:16");
  });

  it("shows a placeholder while the verse loads", () => {
    getVerseOfTheDay.mockReturnValue(new Promise(() => {}));
    setup();

    expect(container.querySelector(".sb-skeleton-status")).not.toBeNull();
    expect(text()).toBeUndefined();
  });

  it("asks for today's local date in the reader's translation", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 30, 23, 30));
    setup();
    await waitFor(() => text() !== undefined);

    expect(getVerseOfTheDay).toHaveBeenCalledWith("2026-10-30", "BSB");
  });

  it("falls back to the default translation when the reader has none loaded", async () => {
    lastTranslationId.value = undefined;
    setup();
    await waitFor(() => text() !== undefined);

    expect(getVerseOfTheDay).toHaveBeenCalledWith(expect.any(String), "DEF");
  });

  it("shows a passage's verse range", async () => {
    getVerseOfTheDay.mockResolvedValue({ ...JOHN_3_16, endVerse: 17 });
    setup();
    await waitFor(() => text() !== undefined);

    expect(referenceButton()?.textContent).toContain("John 3:16–17");
  });

  it("opens the passage in the verse's translation", async () => {
    setup();
    await waitFor(() => referenceButton() !== null);

    act(() => referenceButton()!.click());

    expect(onOpenPassage).toHaveBeenCalledWith({
      bookId: "JHN",
      chapter: 3,
      verse: 16,
      translationId: "BSB",
    });
  });

  it("renders nothing when there is no verse for the day", async () => {
    getVerseOfTheDay.mockResolvedValue(null);
    setup();
    await waitFor(() => container.innerHTML === "");

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when the verse can't be loaded", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    getVerseOfTheDay.mockRejectedValue(new Error("offline"));
    setup();
    await waitFor(() => container.innerHTML === "");

    expect(container.innerHTML).toBe("");
  });

  it("loads the new translation's text when the reader switches translation", async () => {
    setup();
    await waitFor(() => text() !== undefined);
    getVerseOfTheDay.mockResolvedValue({
      ...JOHN_3_16,
      translationId: "KJV",
      text: "For God so loved the world, that he gave…",
    });

    act(() => {
      lastTranslationId.value = "KJV";
    });
    await waitFor(() => text()?.includes("he gave") === true);

    expect(getVerseOfTheDay).toHaveBeenLastCalledWith(
      expect.any(String),
      "KJV"
    );
  });
});
