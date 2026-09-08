import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import VerseReferenceMark from "@packages/seed-bible/seed-bible/components/TipTapEditor/VerseReferenceMark";

function createEditor(): Editor {
  return new Editor({
    extensions: [StarterKit, VerseReferenceMark],
    content: "<p></p>",
  });
}

/** Parses rendered HTML and returns its verse-reference-link anchors. */
function getReferenceLinks(html: string): HTMLAnchorElement[] {
  const container = document.createElement("div");
  container.innerHTML = html;
  return Array.from(container.querySelectorAll("a.sb-verse-reference-link"));
}

describe("VerseReferenceMark", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
    jsdom.reconfigure({ url: "https://example.test/" });
  });

  it("links a verse reference as it's typed", () => {
    editor = createEditor();

    editor.commands.insertContent("See John 3:16 for more");

    const html = editor.getHTML();
    const links = getReferenceLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("John 3:16");
    expect(links[0]?.getAttribute("href")).toBeTruthy();
    // Surrounding text stays outside the link.
    expect(html).toContain("See ");
    expect(html).toContain("for more");
  });

  it("links multiple references in the same paragraph with distinct hrefs", () => {
    editor = createEditor();

    editor.commands.insertContent("John 3:16 and Romans 8:28");

    const links = getReferenceLinks(editor.getHTML());
    expect(links).toHaveLength(2);
    expect(links[0]?.textContent).toBe("John 3:16");
    expect(links[1]?.textContent).toBe("Romans 8:28");
    expect(links[0]?.getAttribute("href")).not.toBe(
      links[1]?.getAttribute("href")
    );
  });

  it("un-links a reference once an edit makes it stop matching", () => {
    editor = createEditor();
    editor.commands.insertContent("See John 3:16 today");

    expect(getReferenceLinks(editor.getHTML())).toHaveLength(1);

    // Replace the "3:16" chapter/verse with non-numeric text, so nothing in
    // the sentence parses as a reference anymore (not even the bare
    // "John 3" chapter-only shorthand). Doc position 1 is the first
    // character of the paragraph's text content, so a string index maps to
    // doc position `1 + index`.
    const text = editor.state.doc.textContent;
    const refIndex = text.indexOf("3:16");
    const from = 1 + refIndex;
    const to = from + "3:16".length;
    editor.commands.insertContentAt({ from, to }, "nowhere");

    const html = editor.getHTML();
    expect(getReferenceLinks(html)).toHaveLength(0);
    expect(html).toContain("John nowhere today");
  });

  it("does not link plain text with no verse reference", () => {
    editor = createEditor();

    editor.commands.insertContent("Just a regular note, nothing special.");

    expect(getReferenceLinks(editor.getHTML())).toHaveLength(0);
  });

  // Same bug as annotating John 3:9 and typing "Jonah 2" in the note: the
  // page URL already has `?verse=9`, which used to be copied onto the
  // chapter-only link.
  it("does not copy the current page's verse onto a chapter-only reference", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });
    editor = createEditor();

    editor.commands.insertContent("Jonah 2");

    const links = getReferenceLinks(editor.getHTML());
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("Jonah 2");
    expect(links[0]?.getAttribute("href")).toBe(
      "https://example.test/en/AAB/jonah/2"
    );
  });

  it("does not copy the current page's verse onto a chapter range", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });
    editor = createEditor();

    editor.commands.insertContent("Jonah 2-3");

    const links = getReferenceLinks(editor.getHTML());
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("Jonah 2-3");
    expect(links[0]?.getAttribute("href")).toBe(
      "https://example.test/en/AAB/jonah/2"
    );
  });

  it("keeps each reference's own verse when a chapter-only and a verse sit in the same note", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });
    editor = createEditor();

    editor.commands.insertContent("Jonah 2 and John 3:16");

    const links = getReferenceLinks(editor.getHTML());
    expect(links).toHaveLength(2);
    expect(links[0]?.textContent).toBe("Jonah 2");
    expect(links[0]?.getAttribute("href")).toBe(
      "https://example.test/en/AAB/jonah/2"
    );
    expect(links[1]?.textContent).toBe("John 3:16");
    expect(links[1]?.getAttribute("href")).toBe(
      "https://example.test/en/AAB/john/3?verse=16"
    );
  });

  it("drops the page's verse after a linked reference is edited down to a chapter", () => {
    jsdom.reconfigure({ url: "https://example.test/en/AAB/john/3?verse=9" });
    editor = createEditor();
    editor.commands.insertContent("John 3:16");

    expect(getReferenceLinks(editor.getHTML())[0]?.getAttribute("href")).toBe(
      "https://example.test/en/AAB/john/3?verse=16"
    );

    const text = editor.state.doc.textContent;
    const verseIndex = text.indexOf(":16");
    const from = 1 + verseIndex;
    const to = from + ":16".length;
    editor.commands.deleteRange({ from, to });

    const links = getReferenceLinks(editor.getHTML());
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("John 3");
    expect(links[0]?.getAttribute("href")).toBe(
      "https://example.test/en/AAB/john/3"
    );
  });
});
