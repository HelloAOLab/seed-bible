import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistLinkContent } from "@packages/seed-bible/seed-bible/components/PlaylistLinkContent/PlaylistLinkContent";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

describe("PlaylistLinkContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("shows a link's preview image, site, title, and description above the Open button", () => {
    act(() => {
      render(
        <PlaylistLinkContent
          url="https://example.com/page"
          preview={{
            title: "Page title",
            description: "What the page is about.",
            imageUrl: "https://example.com/og.png",
            imageAlt: "A cover",
            siteName: "Example",
          }}
        />,
        container
      );
    });

    const image = container.querySelector("img")!;
    expect(image.getAttribute("src")).toBe("https://example.com/og.png");
    expect(image.getAttribute("alt")).toBe("A cover");
    expect(container.textContent).toContain("Example");
    expect(container.textContent).toContain("Page title");
    expect(container.textContent).toContain("What the page is about.");
    expect(
      container
        .querySelector(".sb-play-playlist-open-button")!
        .getAttribute("href")
    ).toBe("https://example.com/page");
  });

  it("shows just the URL and Open button when there is no preview", () => {
    act(() => {
      render(<PlaylistLinkContent url="https://example.com/page" />, container);
    });

    expect(container.querySelector("img")).toBeNull();
    expect(
      container.querySelector(".sb-play-playlist-link-preview")
    ).toBeNull();
    expect(container.textContent).toContain("https://example.com/page");
  });

  it("leaves out a stored image URL that isn't http(s)", () => {
    act(() => {
      render(
        <PlaylistLinkContent
          url="https://example.com/page"
          preview={{ title: "Page title", imageUrl: "javascript:alert(1)" }}
        />,
        container
      );
    });

    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Page title");
  });

  it("embeds a video link without a preview card", () => {
    act(() => {
      render(
        <PlaylistLinkContent
          url="https://www.youtube.com/watch?v=abc123"
          preview={{ title: "A video" }}
        />,
        container
      );
    });

    expect(container.querySelector("iframe")).not.toBeNull();
    expect(
      container.querySelector(".sb-play-playlist-link-preview")
    ).toBeNull();
  });

  it("shows a video's transcript, folded away, under the video", () => {
    act(() => {
      render(
        <PlaylistLinkContent
          url="https://www.youtube.com/watch?v=abc123"
          transcript={"Hagar ran.\nThe angel found her."}
        />,
        container
      );
    });

    const transcript = container.querySelector<HTMLDetailsElement>(
      ".sb-play-playlist-transcript"
    );
    expect(transcript?.open).toBe(false);
    expect(transcript?.querySelector("summary")?.textContent).toBe(
      "Transcript"
    );
    expect(transcript?.querySelector("p")?.textContent).toBe(
      "Hagar ran.\nThe angel found her."
    );
  });

  it("has no transcript section when the author wrote none", () => {
    act(() => {
      render(
        <PlaylistLinkContent
          url="https://www.youtube.com/watch?v=abc123"
          transcript="  "
        />,
        container
      );
    });

    expect(container.querySelector(".sb-play-playlist-transcript")).toBeNull();
  });

  it("frames a video site at 16:9 but lets an embedded page fill the space", () => {
    act(() => {
      render(
        <PlaylistLinkContent url="https://www.youtube.com/watch?v=abc123" />,
        container
      );
    });
    expect(
      container.querySelector(".sb-play-playlist-content-embed--video iframe")
    ).not.toBeNull();

    act(() => {
      render(
        <PlaylistLinkContent url="https://example.com/page" embed />,
        container
      );
    });
    expect(container.querySelector("iframe")).not.toBeNull();
    expect(
      container.querySelector(".sb-play-playlist-content-embed--video")
    ).toBeNull();
  });
});
