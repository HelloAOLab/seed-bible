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

  it("opens on the step with its kind, the playlist, its note and what's next", async () => {
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
      container.querySelector(".sb-playlist-sheet-eyebrow-text")?.textContent
    ).toBe("Note + Scripture · Angel of the LORD");
    expect(
      container.querySelector(".sb-playlist-sheet-title")?.textContent
    ).toBe("Hagar and the Angel");
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

  it("folds to one line from its handle and opens again", () => {
    renderSheet([{ type: "bible-verse", ref: { bookId: "GEN", chapter: 16 } }]);
    const handle = container.querySelector<HTMLButtonElement>(
      ".sb-playlist-sheet-handle"
    )!;
    expect(handle.getAttribute("aria-expanded")).toBe("true");

    act(() => handle.click());
    expect(container.querySelector(".sb-playlist-sheet-body")).toBeNull();
    expect(
      container.querySelector(".sb-playlist-sheet-collapsed-title")?.textContent
    ).toBe("Genesis 16");

    act(() => handle.click());
    expect(container.querySelector(".sb-playlist-sheet-body")).not.toBeNull();
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

  it("Next step moves the playlist on", async () => {
    const playing = renderSheet([
      { type: "bible-verse", ref: { bookId: "GEN", chapter: 16 } },
      { type: "html", html: "<p>Think.</p>", title: "A pause" },
    ]);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-item-nav-next")!
        .click();
      await Promise.resolve();
    });

    expect(playing.currentIndex.value).toBe(1);
    expect(
      container.querySelector(".sb-playlist-sheet-title")?.textContent
    ).toBe("A pause");
    expect(
      container.querySelector(".sb-playlist-sheet-detail")?.textContent
    ).toBe("Note · Think.");
  });
});
