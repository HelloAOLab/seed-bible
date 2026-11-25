import { parseDefinition } from "@packages/word-study-extension/ext_WordStudy/definition";
import {
  orderSenses,
  parseStrongsId,
} from "@packages/word-study-extension/ext_WordStudy/strongs";
import { H0430 } from "./fixtures";

describe("parseDefinition", () => {
  it("splits paragraphs on blank lines", () => {
    expect(parseDefinition("First line\n\nSecond line")).toEqual([
      { type: "paragraph", text: "First line" },
      { type: "paragraph", text: "Second line" },
    ]);
  });

  it("nests outline headings by kind, without their underscores", () => {
    const blocks = parseDefinition(
      [
        "λόγος, -ου, ὁ",
        "__I. Of speech.",
        "__1. a word: Mat.8:8",
        "__(a) regard",
        "__(b) reckoning",
        "__2. a saying",
        "__II. Of reason.",
      ].join("\n\n")
    );

    expect(blocks).toEqual([
      { type: "paragraph", text: "λόγος, -ου, ὁ" },
      {
        type: "outline",
        items: [
          {
            marker: "I.",
            text: "Of speech.",
            children: [
              {
                marker: "1.",
                text: "a word: Mat.8:8",
                children: [
                  { marker: "(a)", text: "regard", children: [] },
                  { marker: "(b)", text: "reckoning", children: [] },
                ],
              },
              { marker: "2.", text: "a saying", children: [] },
            ],
          },
          { marker: "II.", text: "Of reason.", children: [] },
        ],
      },
    ]);
  });

  it("starts a new outline after a plain paragraph", () => {
    const blocks = parseDefinition("__1. one\n\nA note.\n\n__2. two");

    expect(blocks.map((block) => block.type)).toEqual([
      "outline",
      "paragraph",
      "outline",
    ]);
  });

  it("drops stray heading underscores mid-line", () => {
    expect(parseDefinition("{ __(b) aor.: Mat.4:9 }")).toEqual([
      { type: "paragraph", text: "{ (b) aor.: Mat.4:9 }" },
    ]);
  });

  it("never turns markup in the data into anything but text", () => {
    expect(parseDefinition("<b>bold</b>")).toEqual([
      { type: "paragraph", text: "<b>bold</b>" },
    ]);
  });
});

describe("parseStrongsId", () => {
  it.each([
    ["G3056", "G3056", "G3056"],
    ["H430", "H0430", "H0430"],
    ["h0430g", "H0430", "H0430G"],
    ["H0430G", "H0430", "H0430G"],
  ])("reads %s as entry %s, sense %s", (input, entryId, fullId) => {
    expect(parseStrongsId(input)).toEqual({ entryId, fullId });
  });

  it.each(["", "X1234", "G12345", "G30 56"])("rejects %j", (input) => {
    expect(parseStrongsId(input)).toBeNull();
  });
});

describe("orderSenses", () => {
  const senses = H0430.entry.senses;

  it("puts the sense an extended id names first", () => {
    expect(orderSenses(senses, "H0430I").map((sense) => sense.id)).toEqual([
      "H0430I",
      "H0430G",
      "H0430H",
    ]);
  });

  it("keeps the lexicon's order when nothing matches", () => {
    expect(orderSenses(senses, "H0430").map((sense) => sense.id)).toEqual([
      "H0430G",
      "H0430H",
      "H0430I",
    ]);
  });
});
