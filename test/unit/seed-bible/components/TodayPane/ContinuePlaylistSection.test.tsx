import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  ContinuePlaylistSection,
  unfinishedPlaylistToContinue,
} from "@packages/seed-bible/seed-bible/components/TodayPane/ContinuePlaylistSection";
import type { PlaylistPlayHistory } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

function entry(
  overrides: Partial<PlaylistPlayHistory> = {}
): PlaylistPlayHistory {
  return {
    id: "hist-1",
    recordName: "user-1",
    userId: "user-1",
    playlistId: "playlist-1",
    playlistRecordName: "user-1",
    playlistTitle: "Angel of the LORD",
    playlistDescription: null,
    previousHistoryId: null,
    totalSteps: 8,
    currentStep: 2,
    lastItem: {
      type: "bible-verse",
      ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
    },
    startedAtMs: 1_000,
    endedAtMs: 66_000,
    durationMs: 65_000,
    createdAtMs: 1_000,
    updatedAtMs: 66_000,
    ...overrides,
  };
}

describe("unfinishedPlaylistToContinue", () => {
  it("picks the most recently played unfinished playlist", () => {
    const older = entry({ id: "old", updatedAtMs: 10 });
    const newer = entry({ id: "new", updatedAtMs: 20 });
    expect(unfinishedPlaylistToContinue([older, newer])).toBe(newer);
    expect(unfinishedPlaylistToContinue([newer, older])).toBe(newer);
  });

  it("skips playlists that were finished, never started, or empty", () => {
    expect(
      unfinishedPlaylistToContinue([
        entry({ id: "done", currentStep: 7, totalSteps: 8 }),
        entry({ id: "unstarted", currentStep: -1 }),
        entry({ id: "empty", totalSteps: 0, currentStep: 0 }),
      ])
    ).toBeNull();
  });
});

describe("ContinuePlaylistSection", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderSection(history: PlaylistPlayHistory[]) {
    const onResume = vi.fn();
    act(() => {
      render(
        <ContinuePlaylistSection
          playlists={{ userPlaylistHistory: signal(history) }}
          bookNames={signal(new Map([["GEN", "Genesis"]]))}
          onResume={onResume}
        />,
        container
      );
    });
    return onResume;
  }

  it("renders nothing when there is no unfinished playlist", () => {
    renderSection([entry({ currentStep: 7 })]);
    expect(container.querySelector(".sb-today-continue-card")).toBeNull();
  });

  it("shows the playlist, how far it got, and the step to pick up at", () => {
    renderSection([entry()]);

    expect(
      container.querySelector(".sb-today-continue-title")?.textContent
    ).toBe("Angel of the LORD");
    const segments = Array.from(
      container.querySelectorAll(".sb-today-continue-segment")
    ).map((el) => el.classList.contains("sb-today-continue-segment--reached"));
    expect(segments).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(
      container
        .querySelector(".sb-today-continue-progress")
        ?.getAttribute("aria-valuetext")
    ).toBe("Step 3 of 8");
    expect(
      container.querySelector(".sb-today-continue-step-title")?.textContent
    ).toBe("Genesis 16:7-13");
    expect(
      container.querySelector(".sb-today-continue-step-meta")?.textContent
    ).toBe("Step 3 of 8 · Scripture");
  });

  it("falls back to the untitled label and the raw book id", () => {
    renderSection([
      entry({
        playlistTitle: null,
        lastItem: { type: "bible-verse", ref: { bookId: "EXO", chapter: 3 } },
      }),
    ]);

    expect(
      container.querySelector(".sb-today-continue-title")?.textContent
    ).toBe("Untitled playlist");
    expect(
      container.querySelector(".sb-today-continue-step-title")?.textContent
    ).toBe("EXO 3");
  });

  it("Resume hands the entry back to be played", () => {
    const history = [entry()];
    const onResume = renderSection(history);

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-today-continue-resume")
        ?.click();
    });

    expect(onResume).toHaveBeenCalledWith(history[0]);
  });
});
