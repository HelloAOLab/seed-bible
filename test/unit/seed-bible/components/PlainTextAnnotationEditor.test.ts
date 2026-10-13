import {
  htmlToPlainText,
  isPlainTextHtml,
  plainTextToHtml,
} from "@packages/seed-bible/seed-bible/components/CreateAnnotationForm/PlainTextAnnotationEditor";

describe("htmlToPlainText", () => {
  it("puts each paragraph on its own line, keeping blank paragraphs", () => {
    expect(htmlToPlainText("<p>One</p><p></p><p>Two</p>")).toBe("One\n\nTwo");
  });

  it("turns <br> into a line break instead of joining the words", () => {
    expect(htmlToPlainText("<p>Line one<br>Line two</p>")).toBe(
      "Line one\nLine two"
    );
  });

  it("puts list items on separate lines with a bullet", () => {
    expect(
      htmlToPlainText(
        "<ul><li><p>First</p></li><li><p>Second</p></li></ul><p>After</p>"
      )
    ).toBe("- First\n- Second\nAfter");
  });

  it("indents nested list items", () => {
    expect(
      htmlToPlainText(
        "<ul><li><p>Outer</p><ul><li><p>Inner</p></li></ul></li></ul>"
      )
    ).toBe("- Outer\n  - Inner");
  });

  it("splits blockquote paragraphs and headings into lines", () => {
    expect(
      htmlToPlainText("<h2>Title</h2><blockquote><p>A</p><p>B</p></blockquote>")
    ).toBe("Title\nA\nB");
  });

  it("keeps inline formatting's text in place", () => {
    expect(
      htmlToPlainText("<p>Read <strong>this</strong> <a href='#'>verse</a></p>")
    ).toBe("Read this verse");
  });

  it("returns an empty string for no content", () => {
    expect(htmlToPlainText(undefined)).toBe("");
    expect(htmlToPlainText("")).toBe("");
  });
});

describe("plainTextToHtml", () => {
  it("escapes markup and writes one paragraph per line", () => {
    expect(plainTextToHtml('A <b> & "q"\nB')).toBe(
      '<p>A &lt;b&gt; &amp; "q"</p><p>B</p>'
    );
  });
});

describe("isPlainTextHtml", () => {
  it("accepts plain paragraphs, including quotes and escaped characters", () => {
    expect(isPlainTextHtml("")).toBe(true);
    expect(isPlainTextHtml('<p>He said "hi" &amp; left</p><p></p>')).toBe(true);
  });

  it.each([
    ["a list", "<ul><li><p>First</p></li><li><p>Second</p></li></ul>"],
    ["a line break", "<p>Line one<br>Line two</p>"],
    ["a blockquote", "<blockquote><p>A</p></blockquote>"],
    ["bold text", "<p>Some <strong>bold</strong></p>"],
    ["alignment", '<p style="text-align: center">Centered</p>'],
    ["a link", '<p><a href="https://example.com">link</a></p>'],
  ])("rejects a note with %s", (_label, html) => {
    expect(isPlainTextHtml(html)).toBe(false);
  });
});
