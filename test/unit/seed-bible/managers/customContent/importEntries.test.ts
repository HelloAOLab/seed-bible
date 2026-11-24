import {
  parseCsvRows,
  parseImportCsv,
  parsePastedLinks,
} from "@packages/seed-bible/seed-bible/managers/customContent/importEntries";
import { normalizeContentUrl } from "@packages/seed-bible/seed-bible/managers/customContent/normalizeUrl";

describe("normalizeContentUrl", () => {
  it("gives every form of a YouTube video link the same key", () => {
    const keys = [
      "https://youtu.be/1e5paRyGr0A",
      "https://www.youtube.com/watch?v=1e5paRyGr0A&t=30",
      "http://m.youtube.com/watch?v=1e5paRyGr0A",
      "https://youtube.com/shorts/1e5paRyGr0A",
    ].map(normalizeContentUrl);
    expect(new Set(keys)).toEqual(new Set(["youtube:1e5paRyGr0A"]));
  });

  it("ignores the scheme, www, a trailing slash, the fragment and tracking parameters", () => {
    expect(
      normalizeContentUrl(
        "https://www.Example.org/sermons/good-shepherd/?utm_source=x&fbclid=y#notes"
      )
    ).toBe(normalizeContentUrl("http://example.org/sermons/good-shepherd"));
  });

  it("keeps parameters that pick a different page", () => {
    expect(normalizeContentUrl("https://example.org/watch?id=1")).not.toBe(
      normalizeContentUrl("https://example.org/watch?id=2")
    );
  });

  it("rejects anything that isn't an http(s) link", () => {
    expect(normalizeContentUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeContentUrl("not a url")).toBeNull();
    expect(normalizeContentUrl("ftp://example.org/file")).toBeNull();
  });
});

describe("parsePastedLinks", () => {
  it("keeps one entry per page and reports what it couldn't read", () => {
    const parsed = parsePastedLinks(
      [
        "https://youtu.be/1e5paRyGr0A",
        "",
        "  https://www.youtube.com/watch?v=1e5paRyGr0A  ",
        "gracecommunity.org/sermons/x",
        "https://gracecommunity.org/sermons/y",
      ].join("\n")
    );
    expect(parsed.entries.map((e) => e.url)).toEqual([
      "https://youtu.be/1e5paRyGr0A",
      "https://gracecommunity.org/sermons/y",
    ]);
    expect(parsed.duplicates).toBe(1);
    expect(parsed.invalid).toEqual(["gracecommunity.org/sermons/x"]);
  });
});

describe("parseImportCsv", () => {
  it("reads the columns it knows, in any order and case", () => {
    const parsed = parseImportCsv(
      [
        "Passages,URL,Title,Categories,Speaker",
        '"John 10:1-18; Psalm 23",https://example.org/a,"The Good Shepherd, Part 1","Sermons; Kids",Pastor Dana',
        ",https://example.org/b,,,",
      ].join("\r\n")
    );
    expect(parsed?.entries).toEqual([
      {
        url: "https://example.org/a",
        title: "The Good Shepherd, Part 1",
        author: "Pastor Dana",
        categories: ["Sermons", "Kids"],
        passages: "John 10:1-18; Psalm 23",
      },
      { url: "https://example.org/b" },
    ]);
  });

  it("returns null without a link column", () => {
    expect(parseImportCsv("title,author\nA,B")).toBeNull();
  });

  it("handles quotes, escaped quotes and line breaks inside fields", () => {
    expect(parseCsvRows('a,"b ""quoted""","line\none"\nc,d,e')).toEqual([
      ["a", 'b "quoted"', "line\none"],
      ["c", "d", "e"],
    ]);
  });

  it("ignores a byte-order mark from spreadsheet exports", () => {
    expect(parseImportCsv("\uFEFFurl\nhttps://example.org/a")?.entries).toEqual(
      [{ url: "https://example.org/a" }]
    );
  });
});
