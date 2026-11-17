import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistPagePane } from "@packages/seed-bible/seed-bible/components/PlaylistPagePane/PlaylistPagePane";
import {
  PlaylistSchema,
  type Playlist,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

const i18nDirection = vi.hoisted(() => ({ isRtl: false }));

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager({
    get isRtl() {
      return i18nDirection.isRtl;
    },
  });
});

function makePlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return PlaylistSchema.parse({
    id: "playlist_1",
    recordName: "owner",
    authorUserId: "author-1",
    title: "Exodus Stories",
    description: "Stories from the first half of Exodus.",
    heroImageUrl: "https://example.com/cover.jpg",
    items: [
      { type: "bible-verse", ref: { bookId: "EXO", chapter: 2 } },
      { type: "html", html: "<p>Reflect</p>" },
      {
        type: "bible-verse",
        ref: { bookId: "EXO", chapter: 3, verse: 1, endVerse: 6 },
      },
    ],
    createdAtMs: 1,
    updatedAtMs: 1,
    ...overrides,
  });
}

describe("PlaylistPagePane", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    i18nDirection.isRtl = false;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(
    playlist: Playlist,
    authorName: string | null = null,
    owner?: { onEdit: () => void; onDelete: () => void }
  ) {
    const onStart = vi.fn();
    const onBack = vi.fn();
    const onShare = vi.fn();
    act(() => {
      render(
        <PlaylistPagePane
          playlist={playlist}
          authorName={authorName}
          resolveBookName={(bookId) => (bookId === "EXO" ? "Exodus" : bookId)}
          onStart={onStart}
          onBack={onBack}
          onShare={onShare}
          {...owner}
        />,
        container
      );
    });
    const click = (selector: string) =>
      act(() => {
        container
          .querySelector(selector)!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    return { onStart, onBack, onShare, click };
  }

  describe("its header's actions", () => {
    const menuButton = () =>
      container.querySelector<HTMLButtonElement>(
        '.sb-playlist-page-header [aria-label="Playlist options"]'
      );
    const menuItem = (label: string) =>
      Array.from(
        document.querySelectorAll<HTMLElement>(".sb-context-menu-item")
      ).find((item) => item.textContent?.includes(label));

    it("offers Share, which opens the playlist's share sheet", () => {
      const { onShare, click } = renderPane(makePlaylist());

      click('.sb-playlist-page-header [aria-label="Share"]');

      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it("has no menu for someone who doesn't own the playlist", () => {
      renderPane(makePlaylist());

      expect(menuButton()).toBeNull();
    });

    it("gives the playlist's owner a menu to edit or delete it", () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      renderPane(makePlaylist(), null, { onEdit, onDelete });

      act(() => menuButton()!.click());
      act(() => menuItem("Edit")!.click());
      expect(onEdit).toHaveBeenCalledTimes(1);

      act(() => menuButton()!.click());
      act(() => menuItem("Delete")!.click());
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it("shows the playlist's title, cover, author, description and items", () => {
    renderPane(makePlaylist(), "Ruth");

    expect(
      container.querySelector(".sb-playlist-page-title")?.textContent
    ).toBe("Exodus Stories");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/cover.jpg"
    );
    expect(container.textContent).toContain("By Ruth");
    expect(container.textContent).toContain(
      "Stories from the first half of Exodus."
    );
    expect(container.textContent).toContain("3 items");
    expect(
      [...container.querySelectorAll(".sb-playlist-page-item")].map(
        (item) => item.querySelector(".sb-discover-item-title")?.textContent
      )
    ).toEqual(["Exodus 2", "HTML snippet", "Exodus 3:1-6"]);
  });

  it("shows the total time beside the item count, and each item's time", () => {
    renderPane(
      makePlaylist({
        items: [
          {
            type: "bible-verse",
            ref: { bookId: "EXO", chapter: 2 },
            minutes: 5,
          },
          { type: "html", html: "<p>Reflect</p>" },
        ],
      })
    );

    // A step with no estimate counts as a minute.
    expect(
      container.querySelector(".sb-playlist-page-count")?.textContent
    ).toBe("2 items · ~6 min");
    expect(
      [...container.querySelectorAll(".sb-playlist-page-item")].map(
        (item) =>
          item.querySelector(".sb-playlist-page-item-minutes")?.textContent ??
          null
      )
    ).toEqual(["5 min", "1 min"]);
  });

  it("keeps the Start button outside the scrolling item list", () => {
    renderPane(makePlaylist());

    const start = container.querySelector(".sb-playlist-page-start");
    expect(start?.textContent).toBe("Start Reading");
    expect(start?.closest(".sb-playlist-page-body")).toBeNull();
    expect(
      container.querySelector(".sb-playlist-page-body .sb-playlist-page-item")
    ).not.toBeNull();
  });

  it("starts the playlist from Start, and leaves from Back", () => {
    const { onStart, onBack, click } = renderPane(makePlaylist());

    click(".sb-playlist-page-start");
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onBack).not.toHaveBeenCalled();

    click(".sb-playlist-page-back");
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("can't be started when it has no items", () => {
    renderPane(makePlaylist({ items: [] }));

    const start = container.querySelector<HTMLButtonElement>(
      ".sb-playlist-page-start"
    );
    expect(start?.disabled).toBe(true);
    expect(container.textContent).toContain("0 items");
  });

  it("leaves out the cover, author and description when it has none", () => {
    renderPane(makePlaylist({ heroImageUrl: null, description: "  " }));

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".sb-playlist-page-author")).toBeNull();
    expect(container.querySelector(".sb-playlist-page-description")).toBeNull();
  });

  it("names an untitled playlist", () => {
    renderPane(makePlaylist({ title: null }));

    expect(
      container.querySelector(".sb-playlist-page-title")?.textContent
    ).toBe("Untitled playlist");
  });

  // The header is mirrored in RTL, putting Back on the right, so it points
  // right.
  it("points Back the other way in RTL languages", () => {
    i18nDirection.isRtl = true;

    renderPane(makePlaylist());

    expect(container.querySelector(".sb-playlist-page-back")?.textContent).toBe(
      "arrow_forward"
    );
  });
});
