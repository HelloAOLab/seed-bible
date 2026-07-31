import { BibleVizDataRepository } from "bibleVizUtils.infrastructure.data.BibleVizDataRepository";
import { BooksStaticInfo } from "../../../../../packages/seed-bible-utils/infrastructure/data/booksStaticInfo";
import { TestamentNames } from "../../../../../packages/seed-bible-utils/infrastructure/data/testamentNames";

const makeRepo = () => new BibleVizDataRepository();

// ─── getBooksStaticInfo ───────────────────────────────────────────────────────

describe("getBooksStaticInfo", () => {
  it("returns the BooksStaticInfo object", () => {
    expect(makeRepo().getBooksStaticInfo()).toBe(BooksStaticInfo);
  });

  it("returns the same reference on successive calls", () => {
    const repo = makeRepo();
    expect(repo.getBooksStaticInfo()).toBe(repo.getBooksStaticInfo());
  });

  it("returns a non-empty object", () => {
    expect(Object.keys(makeRepo().getBooksStaticInfo()).length).toBeGreaterThan(
      0
    );
  });

  it("contains a REV entry", () => {
    expect(makeRepo().getBooksStaticInfo()["REV"]).toBeDefined();
  });

  it("contains a GEN entry", () => {
    expect(makeRepo().getBooksStaticInfo()["GEN"]).toBeDefined();
  });
});

// ─── getBookStaticInfo ────────────────────────────────────────────────────────

describe("getBookStaticInfo", () => {
  it("returns the REV entry", () => {
    expect(makeRepo().getBookStaticInfo("REV")).toBe(BooksStaticInfo["REV"]);
  });

  it("returns an object with author, chaptersVerseCount, relativeDateRange, numberOfChapters", () => {
    const info = makeRepo().getBookStaticInfo("REV")!;
    expect(info).toHaveProperty("author");
    expect(info).toHaveProperty("chaptersVerseCount");
    expect(info).toHaveProperty("relativeDateRange");
    expect(info).toHaveProperty("numberOfChapters");
  });

  it("REV has numberOfChapters 22", () => {
    expect(makeRepo().getBookStaticInfo("REV")!.numberOfChapters).toBe(22);
  });

  it("returns undefined for an unknown book id", () => {
    expect(makeRepo().getBookStaticInfo("UNKNOWN")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(makeRepo().getBookStaticInfo("")).toBeUndefined();
  });

  it("returns the same reference on successive calls for the same key", () => {
    const repo = makeRepo();
    expect(repo.getBookStaticInfo("REV")).toBe(repo.getBookStaticInfo("REV"));
  });

  it("returns distinct objects for different books", () => {
    const repo = makeRepo();
    expect(repo.getBookStaticInfo("REV")).not.toBe(
      repo.getBookStaticInfo("GEN")
    );
  });
});

// ─── getTestamentNames ────────────────────────────────────────────────────────

describe("getTestamentNames", () => {
  it("returns the TestamentNames object", () => {
    expect(makeRepo().getTestamentNames()).toBe(TestamentNames);
  });

  it("returns the same reference on successive calls", () => {
    const repo = makeRepo();
    expect(repo.getTestamentNames()).toBe(repo.getTestamentNames());
  });

  it("contains NewTestament and OldTestament keys", () => {
    const names = makeRepo().getTestamentNames();
    expect(names).toHaveProperty("NewTestament");
    expect(names).toHaveProperty("OldTestament");
  });
});

// ─── getTestamentName ─────────────────────────────────────────────────────────

describe("getTestamentName", () => {
  it("returns 'New Testament' for the NewTestament key", () => {
    expect(makeRepo().getTestamentName("NewTestament")).toBe("New Testament");
  });

  it("returns 'Old Testament' for the OldTestament key", () => {
    expect(makeRepo().getTestamentName("OldTestament")).toBe("Old Testament");
  });

  it("returns the exact value from TestamentNames for every key", () => {
    const repo = makeRepo();
    for (const key of Object.keys(TestamentNames) as Array<
      keyof typeof TestamentNames
    >) {
      expect(repo.getTestamentName(key)).toBe(TestamentNames[key]);
    }
  });

  it("returns the same value on successive calls for the same key", () => {
    const repo = makeRepo();
    expect(repo.getTestamentName("NewTestament")).toBe(
      repo.getTestamentName("NewTestament")
    );
  });

  it("covers all keys defined in TestamentNames", () => {
    const repo = makeRepo();
    const keys = Object.keys(TestamentNames) as Array<
      keyof typeof TestamentNames
    >;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(repo.getTestamentName(key)).toBeDefined();
    }
  });
});
