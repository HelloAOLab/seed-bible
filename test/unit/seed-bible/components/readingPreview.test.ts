import {
  htmlExcerpt,
  linkHost,
  readingPreviewText,
} from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/readingPreview";
import { describe, expect, it } from "vitest";

// The helpers only ever call `t` for the "Video" word, so a pass-through of the
// default value is enough to exercise them.
const t = ((_key: string, options?: { defaultValue?: string }) =>
  options?.defaultValue ?? "") as never;

describe("htmlExcerpt", () => {
  it("strips tags and collapses whitespace onto one line", () => {
    expect(
      htmlExcerpt("<h1>Title</h1>\n<p>First line.</p>\n<p>Second line.</p>")
    ).toBe("Title First line. Second line.");
  });

  it("keeps words either side of a tag boundary apart", () => {
    expect(htmlExcerpt("<p>one</p><p>two</p>")).toBe("one two");
  });

  it("drops script and style contents entirely", () => {
    expect(
      htmlExcerpt(
        "<style>p{color:red}</style><p>Visible</p><script>x()</script>"
      )
    ).toBe("Visible");
  });

  it("decodes entities without double-decoding an escaped entity", () => {
    expect(htmlExcerpt("<p>Bread &amp; wine</p>")).toBe("Bread & wine");
    expect(htmlExcerpt("<p>&quot;peace&quot; &#39;be&#39; still</p>")).toBe(
      "\"peace\" 'be' still"
    );
    // "&amp;lt;" is a literal "&lt;", not a "<".
    expect(htmlExcerpt("<p>&amp;lt;</p>")).toBe("&lt;");
  });

  it("leaves a short snippet untouched", () => {
    expect(htmlExcerpt("<p>Short enough.</p>")).toBe("Short enough.");
  });

  it("truncates a long snippet at a word boundary with an ellipsis", () => {
    const long = `<p>${"word ".repeat(60).trim()}</p>`;
    const excerpt = htmlExcerpt(long, 40);

    expect(excerpt.length).toBeLessThanOrEqual(41); // 40 + the ellipsis
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).not.toMatch(/ …$/); // no space left before the ellipsis
    const words = excerpt.slice(0, -1).trim().split(" ");
    expect(words.every((w) => w === "word")).toBe(true);
  });

  it("hard-cuts when there is no usable word boundary", () => {
    const excerpt = htmlExcerpt(`<p>${"x".repeat(200)}</p>`, 20);

    expect(excerpt).toBe(`${"x".repeat(20)}…`);
  });

  it("returns an empty string for markup with no text", () => {
    expect(htmlExcerpt("<br /><hr />")).toBe("");
  });
});

describe("linkHost", () => {
  it("drops the www prefix", () => {
    expect(linkHost("https://www.example.com/a/b?c=d")).toBe("example.com");
  });

  it("keeps other subdomains", () => {
    expect(linkHost("https://docs.example.com/page")).toBe("docs.example.com");
  });

  it("falls back to the raw value when it doesn't parse", () => {
    expect(linkHost("not a url")).toBe("not a url");
  });
});

describe("readingPreviewText", () => {
  it("summarizes a text reading with its excerpt", () => {
    expect(
      readingPreviewText(
        { type: "html", title: "Intro", html: "<p>Grace and peace.</p>" },
        t
      )
    ).toBe("Grace and peace.");
  });

  it("summarizes a plain link with its host", () => {
    expect(
      readingPreviewText(
        { type: "link", url: "https://www.example.com/study" },
        t
      )
    ).toBe("example.com");
  });

  it("flags a video link", () => {
    expect(
      readingPreviewText(
        { type: "link", url: "https://www.youtube.com/watch?v=abc123" },
        t
      )
    ).toBe("Video · youtube.com");
  });

  it("has nothing to add for scripture — the title is the reference", () => {
    expect(
      readingPreviewText(
        { type: "bible-verse", ref: { bookId: "GEN", chapter: 1 } },
        t
      )
    ).toBeNull();
  });

  it("returns null rather than an empty line for an empty snippet", () => {
    expect(readingPreviewText({ type: "html", html: "<br />" }, t)).toBeNull();
  });
});
