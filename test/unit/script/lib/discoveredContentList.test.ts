import {
  buildDiscoveredContentList,
  parseCsv,
} from "../../../../script/lib/discoveredContentList";

describe("parseCsv", () => {
  it("splits simple rows on commas", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('a,"b, c",d')).toEqual([["a", "b, c", "d"]]);
  });

  it("unescapes doubled quotes inside quoted fields", () => {
    expect(parseCsv('a,"say ""hi""",c')).toEqual([["a", 'say "hi"', "c"]]);
  });

  it("keeps newlines inside quoted fields as part of the field", () => {
    expect(parseCsv('a,"line one\nline two",c')).toEqual([
      ["a", "line one\nline two", "c"],
    ]);
  });

  it("handles CRLF row endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("does not produce a trailing empty row for a final newline", () => {
    expect(parseCsv("a,b\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("buildDiscoveredContentList", () => {
  const header = "Name,Author,Bible Reference,URL,Description";

  it("parses a row with a single chapter reference", () => {
    const csv = [
      header,
      'BETHEL: Where Jacob Met God,Expedition Bible,Genesis 28,https://example.com/bethel,"Join Joel at the ancient site of Bethel."',
    ].join("\n");

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(warnings).toEqual([]);
    expect(items).toEqual([
      {
        id: "bethel-where-jacob-met-god",
        title: "BETHEL: Where Jacob Met God",
        author: "Expedition Bible",
        description: "Join Joel at the ancient site of Bethel.",
        url: "https://example.com/bethel",
        references: [{ book: "GEN", chapter: 28 }],
      },
    ]);
  });

  it("parses a chapter:verse reference", () => {
    const csv = [
      header,
      "Great Witness Stone,Expedition Bible,Joshua 9:26,https://example.com/stone,Description here",
    ].join("\n");

    const { items } = buildDiscoveredContentList(csv);

    expect(items[0]?.references).toEqual([
      { book: "JOS", chapter: 9, verse: 26 },
    ]);
  });

  it("splits multiple comma-separated references in one cell", () => {
    const csv = [
      header,
      '"Problem of Ai",Expedition Bible,"Joshua 7:1-15, Joshua 8:1-29",https://example.com/ai,Description here',
    ].join("\n");

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(warnings).toEqual([]);
    expect(items[0]?.references).toEqual([
      { book: "JOS", chapter: 7, verse: 1, endVerse: 15 },
      { book: "JOS", chapter: 8, verse: 1, endVerse: 29 },
    ]);
  });

  it("dedupes generated ids for rows with the same title", () => {
    const csv = [
      header,
      "Same Title,Author One,Genesis 1,https://example.com/1,First",
      "Same Title,Author Two,Genesis 2,https://example.com/2,Second",
    ].join("\n");

    const { items } = buildDiscoveredContentList(csv);

    expect(items.map((item) => item.id)).toEqual([
      "same-title",
      "same-title-2",
    ]);
  });

  it("skips rows missing a Name and reports a warning", () => {
    const csv = [
      header,
      ",Author,Genesis 1,https://example.com,Description",
    ].join("\n");

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(items).toEqual([]);
    expect(warnings).toEqual(["Row 2: missing Name; skipped."]);
  });

  it("skips rows with an unparseable Bible reference and reports a warning", () => {
    const csv = [
      header,
      "Some Title,Author,Not A Real Book 1,https://example.com,Description",
    ].join("\n");

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(items).toEqual([]);
    expect(warnings).toEqual([
      'Row 2 ("Some Title"): could not parse Bible reference "Not A Real Book 1".',
      'Row 2 ("Some Title"): no Bible references could be parsed; skipped.',
    ]);
  });

  it("keeps references that do parse when only some in the cell fail", () => {
    const csv = [
      header,
      '"Mixed refs",Author,"Genesis 1, Not A Real Book 1",https://example.com,Description',
    ].join("\n");

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(items[0]?.references).toEqual([{ book: "GEN", chapter: 1 }]);
    expect(warnings).toEqual([
      'Row 2 ("Mixed refs"): could not parse Bible reference "Not A Real Book 1".',
    ]);
  });

  it("ignores blank rows", () => {
    const csv = [
      header,
      "",
      "Some Title,Author,Genesis 1,https://example.com,Description",
      "",
    ].join("\n");

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(warnings).toEqual([]);
    expect(items).toHaveLength(1);
  });

  it("strips a leading UTF-8 BOM before parsing", () => {
    const csv =
      "﻿" +
      [
        header,
        "Some Title,Author,Genesis 1,https://example.com,Description",
      ].join("\n");

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(warnings).toEqual([]);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toBe("Some Title");
  });

  it("reports a warning and produces no items when a required column is missing", () => {
    const csv = "Name,Author,URL,Description\nTitle,Author,https://x,Desc";

    const { items, warnings } = buildDiscoveredContentList(csv);

    expect(items).toEqual([]);
    expect(warnings).toEqual([
      'Missing required column "Bible Reference"; no items produced.',
    ]);
  });
});
