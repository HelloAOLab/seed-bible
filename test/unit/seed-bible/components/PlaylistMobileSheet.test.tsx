import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistMobileSheet } from "@packages/seed-bible/seed-bible/components/PlaylistMobileSheet/PlaylistMobileSheet";
import {
  createPlayingState,
  type PlaylistItemData,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const state = {} as SeedBibleState;
const resolveBookName = (id: string) => ({ GEN: "Genesis" })[id] ?? id;

describe("PlaylistMobileSheet", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderSheet(items: PlaylistItemData[], canListen = true) {
    const playing = createPlayingState([
      { id: "p1", title: "Angel of the LORD", description: null, items },
    ]);
    act(() => {
      render(
        <PlaylistMobileSheet
          playing={playing}
          state={state}
          resolveBookName={resolveBookName}
          canListen={canListen}
        />,
        container
      );
    });
    return playing;
  }

  it("opens on a step's note, with the step and its place in the bar beneath", async () => {
    renderSheet([
      {
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 16, verse: 7, endVerse: 13 },
        note: "<p>Observe who speaks.</p>",
        noteTitle: "Hagar and the Angel",
      },
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 22 } },
    ]);

    expect(
      container.querySelector(".sb-playlist-sheet-bar-title")?.textContent
    ).toBe("Hagar and the Angel");
    expect(
      container.querySelector(".sb-playlist-sheet-bar-meta")?.textContent
    ).toContain("Step 1 of 2 · Angel of the LORD");
    await vi.waitFor(() =>
      expect(
        container.querySelector(".sb-playlist-sheet-note")?.textContent
      ).toContain("Observe who speaks.")
    );
    expect(
      container.querySelector(".sb-playlist-sheet-up-next")?.textContent
    ).toBe("Up next · Scripture · Genesis 22 · 4 min");
    expect(
      container.querySelectorAll(".sb-playlist-sheet-segment--reached")
    ).toHaveLength(1);
  });

  it("is just the bar for a passage without a note, and opens from it", () => {
    renderSheet([{ type: "bible-verse", ref: { bookId: "GEN", chapter: 16 } }]);
    const handle = container.querySelector<HTMLButtonElement>(
      ".sb-playlist-sheet-handle"
    )!;
    expect(handle.getAttribute("aria-expanded")).toBe("false");
    expect(container.querySelector(".sb-playlist-sheet-body")).toBeNull();
    expect(
      container.querySelector(".sb-playlist-sheet-bar-title")?.textContent
    ).toBe("Genesis 16");

    act(() => handle.click());
    expect(container.querySelector(".sb-playlist-sheet-body")).not.toBeNull();
    act(() => handle.click());
    expect(container.querySelector(".sb-playlist-sheet-body")).toBeNull();
  });

  it("keeps Previous and Next in reach whether open or folded", async () => {
    const playing = renderSheet([
      {
        type: "bible-verse",
        ref: { bookId: "GEN", chapter: 16 },
        note: "<p>Look.</p>",
      },
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 22 } },
    ]);
    const step = (label: string) =>
      container.querySelector<HTMLButtonElement>(
        `.sb-playlist-sheet-step[aria-label="${label}"]`
      )!;
    expect(step("Previous").disabled).toBe(true);

    // Folded away, the bar still steps.
    act(() =>
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-sheet-handle")!
        .click()
    );
    expect(container.querySelector(".sb-playlist-sheet-body")).toBeNull();
    await act(async () => {
      step("Next step").click();
      await Promise.resolve();
    });

    expect(playing.currentIndex.value).toBe(1);
    expect(
      container.querySelector(".sb-playlist-sheet-bar-title")?.textContent
    ).toBe("Genesis 22");
    expect(step("Finish")).not.toBeNull();
    expect(step("Previous").disabled).toBe(false);
  });

  it("Listen asks for the playlist to be read aloud, and is left out when it can't be", () => {
    const playing = renderSheet([
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 16 } },
    ]);
    const listen = container.querySelector<HTMLButtonElement>(
      ".sb-playlist-sheet-listen"
    )!;
    expect(listen.getAttribute("aria-label")).toBe("Listen");

    act(() => listen.click());
    expect(playing.listenAlong.value).toBe(true);
    expect(
      container
        .querySelector(".sb-playlist-sheet-listen")
        ?.getAttribute("aria-label")
    ).toBe("Listening");

    render(null, container);
    renderSheet(
      [{ type: "bible-verse", ref: { bookId: "GEN", chapter: 16 } }],
      false
    );
    expect(container.querySelector(".sb-playlist-sheet-listen")).toBeNull();
  });

  it("leaves text, link, question and compare steps to the step screen", () => {
    renderSheet([{ type: "html", html: "<p>Think.</p>", title: "A pause" }]);
    expect(container.querySelector(".sb-playlist-sheet")).toBeNull();
  });
});
