import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistFinishedPane } from "@packages/seed-bible/seed-bible/components/PlaylistFinishedPane/PlaylistFinishedPane";
import {
  I18nProvider,
  createI18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers";

describe("PlaylistFinishedPane", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPane(heroImageUrl: string | null = null) {
    const onDone = vi.fn();
    const onShare = vi.fn();
    act(() => {
      render(
        <I18nProvider
          i18n={createI18nManager(createNavigationManager(), ["en"])}
        >
          <PlaylistFinishedPane
            playlist={{
              id: "p1",
              title: "Psalms of Ascent",
              description: null,
              heroImageUrl,
              items: [],
            }}
            authorName="Ruth"
            onDone={onDone}
            onShare={onShare}
          />
        </I18nProvider>,
        container
      );
    });
    return { onDone, onShare };
  }

  const button = (label: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent?.includes(label) || b.ariaLabel === label
    )!;

  it("says the playlist is finished, under its title and cover", () => {
    renderPane("https://example.com/cover.jpg");

    expect(
      container.querySelector(".sb-playlist-page-title")?.textContent
    ).toBe("Psalms of Ascent");
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://example.com/cover.jpg"
    );
    expect(container.textContent).toContain("Playlist finished");
    expect(container.textContent).toContain(
      "You've reached the end of Psalms of Ascent."
    );
    expect(container.textContent).toContain("By Ruth");
  });

  it("leaves from Done, and from its back button", () => {
    const { onDone } = renderPane();

    act(() => button("Done").click());
    act(() =>
      container
        .querySelector<HTMLButtonElement>(".sb-playlist-page-back")!
        .click()
    );

    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("offers to share the playlist", () => {
    const { onShare, onDone } = renderPane();

    act(() => button("Share playlist").click());

    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
  });
});
