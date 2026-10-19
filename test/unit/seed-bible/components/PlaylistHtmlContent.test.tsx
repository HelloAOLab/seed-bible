import { render } from "preact";
import { act } from "preact/test-utils";
import { PlaylistHtmlContent } from "@packages/seed-bible/seed-bible/components/PlaylistHtmlContent/PlaylistHtmlContent";
import type { TranslationBookChapter } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

const chapterWith = (verses: Record<number, string>) =>
  ({
    chapter: {
      number: 16,
      footnotes: [],
      content: Object.entries(verses).map(([number, text]) => ({
        type: "verse",
        number: Number(number),
        content: [text],
      })),
    },
  }) as unknown as TranslationBookChapter;

describe("PlaylistHtmlContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const content = () =>
    container.querySelector<HTMLDivElement>(".sb-play-playlist-content-html")!;

  it("hands a step link to onStepLink instead of following it", async () => {
    const onStepLink = vi.fn();
    act(() => {
      render(
        <PlaylistHtmlContent
          html='<p>See <a class="sb-step-link" href="#step-3">Step 3</a> and <a href="https://example.com">a page</a>.</p>'
          onStepLink={onStepLink}
        />,
        container
      );
    });
    await vi.waitFor(() =>
      expect(content().querySelector("a.sb-step-link")).not.toBeNull()
    );

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    content().querySelector("a.sb-step-link")!.dispatchEvent(event);
    expect(onStepLink).toHaveBeenCalledWith(3);
    expect(event.defaultPrevented).toBe(true);

    const other = new MouseEvent("click", { bubbles: true, cancelable: true });
    content()
      .querySelector('a[href="https://example.com"]')!
      .dispatchEvent(other);
    expect(onStepLink).toHaveBeenCalledTimes(1);
    expect(other.defaultPrevented).toBe(false);
  });

  it("fills an embedded passage with its verses once they load", async () => {
    const loadChapter = vi.fn(async () =>
      chapterWith({
        7: "The angel found her.",
        8: "He said, Hagar.",
        9: "Return.",
      })
    );
    act(() => {
      render(
        <PlaylistHtmlContent
          html='<p>Read this:</p><blockquote class="sb-scripture-embed"><p class="sb-scripture-embed-ref">Genesis 16:7-8</p></blockquote>'
          loadChapter={loadChapter}
        />,
        container
      );
    });

    await vi.waitFor(() =>
      expect(
        content().querySelector(".sb-scripture-embed-text")?.textContent
      ).toBe("7The angel found her. 8He said, Hagar. ")
    );
    expect(loadChapter).toHaveBeenCalledWith(undefined, "GEN", 16);
    expect(
      content().querySelector(".sb-scripture-embed-ref")?.textContent
    ).toBe("Genesis 16:7-8");
  });

  it("leaves an embedded passage as its reference when nothing can load it", async () => {
    act(() => {
      render(
        <PlaylistHtmlContent html='<blockquote class="sb-scripture-embed"><p class="sb-scripture-embed-ref">Genesis 16:7-8</p></blockquote>' />,
        container
      );
    });
    await vi.waitFor(() =>
      expect(content().querySelector(".sb-scripture-embed-ref")).not.toBeNull()
    );
    expect(content().querySelector(".sb-scripture-embed-text")).toBeNull();
  });

  it("hands a verse link to onVerseLink instead of following it", async () => {
    const onVerseLink = vi.fn();
    act(() => {
      render(
        <PlaylistHtmlContent
          html='<p>She <a class="sb-verse-link" href="#verse-13">names</a> him.</p>'
          onVerseLink={onVerseLink}
        />,
        container
      );
    });
    await vi.waitFor(() =>
      expect(content().querySelector("a.sb-verse-link")).not.toBeNull()
    );

    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    content().querySelector("a.sb-verse-link")!.dispatchEvent(event);
    expect(onVerseLink).toHaveBeenCalledWith(13);
    expect(event.defaultPrevented).toBe(true);
  });
});
