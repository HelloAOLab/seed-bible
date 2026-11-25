import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistStepPage } from "@packages/seed-bible/seed-bible/components/PlaylistStepPage/PlaylistStepPage";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) =>
        (options?.defaultValue as string | undefined) ?? key,
      language: "en",
    }),
  };
});

describe("PlaylistStepPage", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function heading() {
    return container.querySelector(".sb-playlist-step-page-title")?.textContent;
  }

  it('heads a question without its own title "Question"', () => {
    act(() => {
      render(
        <PlaylistStepPage
          item={{ type: "html", html: "<p>A or B?</p>", question: {} }}
          showTitle
        />,
        container
      );
    });

    expect(heading()).toBe("Question");
  });

  it("heads a question with its own title by that title", () => {
    act(() => {
      render(
        <PlaylistStepPage
          item={{
            type: "html",
            title: "Pick one",
            html: "<p>A or B?</p>",
            question: {},
          }}
          showTitle
        />,
        container
      );
    });

    expect(heading()).toBe("Pick one");
  });

  it("shows no heading for a note without a title", () => {
    act(() => {
      render(
        <PlaylistStepPage
          item={{ type: "html", html: "<p>Hi</p>" }}
          showTitle
        />,
        container
      );
    });

    expect(heading()).toBeUndefined();
  });

  // On a phone the header floats over the page, and only the title's margin
  // clears it, so a step with no title has to keep that gap another way.
  it("keeps the gap under the header for a video with no title", () => {
    act(() => {
      render(
        <PlaylistStepPage
          item={{ type: "link", url: "https://example.com/flower.mp4" }}
          showTitle
        />,
        container
      );
    });

    expect(heading()).toBeUndefined();
    expect(
      container.querySelector(".sb-playlist-step-page.is-untitled")
    ).not.toBeNull();
  });

  it("leaves the gap to the title when the video has one", () => {
    act(() => {
      render(
        <PlaylistStepPage
          item={{
            type: "link",
            url: "https://example.com/flower.mp4",
            title: "Flower",
          }}
          showTitle
        />,
        container
      );
    });

    expect(heading()).toBe("Flower");
    expect(container.querySelector(".is-untitled")).toBeNull();
  });

  it("adds no gap where the reader's own header carries the title", () => {
    act(() => {
      render(
        <PlaylistStepPage
          item={{ type: "link", url: "https://example.com/flower.mp4" }}
          showTitle={false}
        />,
        container
      );
    });

    expect(container.querySelector(".is-untitled")).toBeNull();
  });
});
