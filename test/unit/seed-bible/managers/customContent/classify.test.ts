import {
  applyClassification,
  buildClassificationRequest,
  isConfidentlyClassified,
  MAX_SUGGESTED_PASSAGES,
  parseContentClassification,
} from "@packages/seed-bible/seed-bible/managers/customContent/classify";
import { findExplicitReferences } from "@packages/seed-bible/seed-bible/managers/customContent/explicitReferences";
import { ContentLibraryError } from "@packages/seed-bible/seed-bible/managers/customContent/publish";
import type {
  ContentCategory,
  ContentItem,
  ContentReference,
} from "@packages/seed-bible/seed-bible/managers/customContent/schema";

const categories: ContentCategory[] = [
  { id: "sermons", name: "Sermons" },
  { id: "kids", name: "Kids", description: "For children" },
];

function item(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: "item-1",
    url: "https://example.org/good-shepherd",
    status: "needs_review",
    title: "The Good Shepherd",
    description: "Pastor Dana on John 10:1-18.",
    categoryIds: [],
    references: [],
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  };
}

const owner = (
  reference: Omit<ContentReference, "source" | "confidence">
): ContentReference => ({ ...reference, source: "owner", confidence: 1 });

describe("findExplicitReferences", () => {
  it("finds the passages the title and description name, once each", () => {
    expect(
      findExplicitReferences(
        item({
          title: "Psalm 23 and the shepherd",
          description: "We read John 10:1-18, then John 10:1-18 again.",
        })
      )
    ).toEqual([
      { book: "PSA", chapter: 23, source: "explicit", confidence: 1 },
      {
        book: "JHN",
        chapter: 10,
        verse: 1,
        endVerse: 18,
        source: "explicit",
        confidence: 1,
      },
    ]);
  });

  it("finds nothing in text that names no passage", () => {
    expect(
      findExplicitReferences(
        item({ title: "Easter service times", description: "" })
      )
    ).toEqual([]);
  });
});

describe("buildClassificationRequest", () => {
  it("gives a provider both the fields and a ready-made prompt", () => {
    const request = buildClassificationRequest(item(), categories, [
      "John 10:1-18",
    ]);
    expect(request.categories).toEqual([
      { id: "sermons", name: "Sermons" },
      { id: "kids", name: "Kids", description: "For children" },
    ]);
    expect(request.instructions).toContain("ONLY a JSON object");
    expect(JSON.parse(request.input)).toMatchObject({
      title: "The Good Shepherd",
      knownPassages: ["John 10:1-18"],
    });
  });
});

describe("parseContentClassification", () => {
  it("reads JSON wrapped in prose or code fences", () => {
    expect(
      parseContentClassification(
        'Here you go:\n```json\n{"categoryIds":["sermons"],"passages":[{"reference":"John 10","confidence":0.9}]}\n```'
      )
    ).toEqual({
      categoryIds: ["sermons"],
      passages: [{ reference: "John 10", confidence: 0.9 }],
    });
  });

  it("accepts passages given as bare strings, as fairly (not fully) sure", () => {
    expect(
      parseContentClassification('{"passages": ["Psalm 23"]}').passages
    ).toEqual([{ reference: "Psalm 23", confidence: 0.8 }]);
  });

  it("rejects an answer with no JSON in it", () => {
    expect(() => parseContentClassification("I'm not sure.")).toThrow(
      ContentLibraryError
    );
  });
});

describe("applyClassification", () => {
  it("only uses the library's own categories", () => {
    const classified = applyClassification(item(), {
      explicit: [],
      result: {
        categoryIds: ["sermons", "made-up", "sermons"],
        passages: [],
      },
      categories,
      now: 5,
    });
    expect(classified.categoryIds).toEqual(["sermons"]);
  });

  it("keeps categories the owner already gave", () => {
    const classified = applyClassification(item({ categoryIds: ["kids"] }), {
      explicit: [],
      result: { categoryIds: ["sermons"], passages: [] },
      categories,
      now: 5,
    });
    expect(classified.categoryIds).toEqual(["kids"]);
  });

  it("drops passages that don't exist, don't parse, or are too unsure", () => {
    const classified = applyClassification(item(), {
      explicit: [],
      result: {
        categoryIds: [],
        passages: [
          { reference: "John 30:1", confidence: 0.9 },
          { reference: "the whole Bible", confidence: 0.9 },
          { reference: "Ezekiel 34:11-16", confidence: 0.4 },
          { reference: "Psalm 23", confidence: 0.6 },
        ],
      },
      categories,
      now: 5,
    });
    expect(classified.references).toEqual([
      { book: "PSA", chapter: 23, source: "ai", confidence: 0.6 },
    ]);
  });

  it("lets a passage named in the text win over the AI's copy, and never touches the owner's", () => {
    const john10 = { book: "JHN", chapter: 10, verse: 1, endVerse: 18 };
    const classified = applyClassification(
      item({ references: [owner({ book: "LUK", chapter: 15 })] }),
      {
        explicit: [{ ...john10, source: "explicit", confidence: 1 }],
        result: {
          categoryIds: [],
          passages: [
            { reference: "John 10:1-18", confidence: 0.7 },
            { reference: "Luke 15", confidence: 0.9 },
          ],
        },
        categories,
        now: 5,
      }
    );
    expect(classified.references).toEqual([
      { book: "LUK", chapter: 15, source: "owner", confidence: 1 },
      { ...john10, source: "explicit", confidence: 1 },
    ]);
  });

  it("replaces earlier suggestions when run again", () => {
    const first = applyClassification(item(), {
      explicit: [],
      result: {
        categoryIds: [],
        passages: [{ reference: "Psalm 23", confidence: 0.9 }],
      },
      categories,
      now: 5,
    });
    const second = applyClassification(first, {
      explicit: [],
      result: {
        categoryIds: [],
        passages: [{ reference: "Psalm 46", confidence: 0.9 }],
      },
      categories,
      now: 6,
    });
    expect(second.references.map((r) => r.chapter)).toEqual([46]);
  });

  it("keeps at most ten suggestions, most confident first", () => {
    const classified = applyClassification(item(), {
      explicit: [],
      result: {
        categoryIds: [],
        passages: Array.from({ length: 15 }, (_, i) => ({
          reference: `Psalm ${i + 1}`,
          confidence: 0.5 + i / 100,
        })),
      },
      categories,
      now: 5,
    });
    expect(classified.references).toHaveLength(MAX_SUGGESTED_PASSAGES);
    expect(classified.references[0]).toMatchObject({ chapter: 15 });
  });

  it("keeps new category ideas the library doesn't already have", () => {
    const classified = applyClassification(item(), {
      explicit: [],
      result: {
        categoryIds: [],
        passages: [],
        suggestedCategories: ["Holy Week", "sermons", " Holy Week "],
      },
      categories,
      providerId: "apologist",
      now: 5,
    });
    expect(classified.classification).toEqual({
      status: "done",
      providerId: "apologist",
      suggestedCategories: ["Holy Week"],
      at: 5,
    });
  });

  it("still applies the passages named in the text when the AI failed", () => {
    const classified = applyClassification(item(), {
      explicit: findExplicitReferences(item()),
      error: "Chat completions request failed (500)",
      providerId: "apologist",
      categories,
      now: 5,
    });
    expect(classified.references).toHaveLength(1);
    expect(classified.classification).toMatchObject({
      status: "failed",
      error: "Chat completions request failed (500)",
    });
  });
});

describe("isConfidentlyClassified", () => {
  it("needs passages, all of them named, the owner's, or confident", () => {
    expect(isConfidentlyClassified(item())).toBe(false);
    expect(
      isConfidentlyClassified(
        item({
          references: [
            { book: "JHN", chapter: 10, source: "explicit", confidence: 1 },
            { book: "PSA", chapter: 23, source: "ai", confidence: 0.8 },
          ],
        })
      )
    ).toBe(true);
    expect(
      isConfidentlyClassified(
        item({
          references: [
            { book: "PSA", chapter: 23, source: "ai", confidence: 0.6 },
          ],
        })
      )
    ).toBe(false);
  });
});
