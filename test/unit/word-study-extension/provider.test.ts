import { createInMemoryRecordStore } from "@packages/word-study-extension/ext_WordStudy/cache";
import {
  WORD_STUDY_CACHE_TTL_MS,
  WORD_STUDY_NOT_FOUND_TTL_MS,
} from "@packages/word-study-extension/ext_WordStudy/provider";
import { G3056, GEN_1, H0430, INTERLINEAR_BOOKS, JHN_1 } from "./fixtures";
import {
  createProvider,
  goOffline as goOfflineWith,
  serve as serveWith,
  useFetchMock,
} from "./harness";

const DAY_MS = 24 * 60 * 60 * 1000;
const getFetchMock = useFetchMock();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const serve = (files: Record<string, unknown>) =>
  serveWith(getFetchMock(), files);
const goOffline = () => goOfflineWith(getFetchMock());

function requestedPaths(): string[] {
  return getFetchMock().mock.calls.map(
    (call) => new URL(String(call[0])).pathname
  );
}

describe("createWordStudyProvider", () => {
  describe("getVerseWords", () => {
    it("answers every verse of a chapter from one download", async () => {
      serve({ "api/d/bsb-interlinear/JHN/1.json": JHN_1 });
      const provider = createProvider(createInMemoryRecordStore());

      const first = await provider.getVerseWords("JHN", 1, 1);
      const second = await provider.getVerseWords("JHN", 1, 2);

      expect(first.status === "ok" && first.words[4]?.text).toBe("Λόγος");
      expect(second.status === "ok" && second.words[0]?.text).toBe("Οὗτος");
      expect(requestedPaths()).toEqual(["/api/d/bsb-interlinear/JHN/1.json"]);
    });

    it("answers a later visit from the device without asking the network", async () => {
      serve({ "api/d/bsb-interlinear/JHN/1.json": JHN_1 });
      const store = createInMemoryRecordStore();
      await createProvider(store).getVerseWords("JHN", 1, 1);
      getFetchMock().mockClear();

      const result = await createProvider(store).getVerseWords("JHN", 1, 1);

      expect(result.status).toBe("ok");
      expect(getFetchMock()).not.toHaveBeenCalled();
    });

    it("downloads a chapter again once the stored copy has expired", async () => {
      serve({ "api/d/bsb-interlinear/JHN/1.json": JHN_1 });
      const store = createInMemoryRecordStore();
      await createProvider(store).getVerseWords("JHN", 1, 1);

      vi.setSystemTime(Date.now() + WORD_STUDY_CACHE_TTL_MS + DAY_MS);
      const corrected = structuredClone(JHN_1);
      corrected.chapter.content[0]!.words[0]!.gloss = "Corrected";
      serve({ "api/d/bsb-interlinear/JHN/1.json": corrected });
      getFetchMock().mockClear();

      const result = await createProvider(store).getVerseWords("JHN", 1, 1);

      expect(result.status === "ok" && result.words[0]?.gloss).toBe(
        "Corrected"
      );
      expect(getFetchMock()).toHaveBeenCalledTimes(1);
    });

    it("keeps working offline from a stored copy, even an expired one", async () => {
      serve({ "api/d/bsb-interlinear/JHN/1.json": JHN_1 });
      const store = createInMemoryRecordStore();
      await createProvider(store).getVerseWords("JHN", 1, 1);

      vi.setSystemTime(Date.now() + WORD_STUDY_CACHE_TTL_MS + DAY_MS);
      goOffline();

      const result = await createProvider(store).getVerseWords("JHN", 1, 1);

      expect(result.status).toBe("ok");
      expect(result.status === "ok" && result.words[0]?.text).toBe("Ἐν");
    });

    it("reports an error when offline with nothing stored", async () => {
      goOffline();

      const result = await createProvider(
        createInMemoryRecordStore()
      ).getVerseWords("JHN", 1, 1);

      expect(result.status).toBe("error");
    });

    it("works with no device store at all", async () => {
      serve({ "api/d/bsb-interlinear/GEN/1.json": GEN_1 });

      const result = await createProvider(null).getVerseWords("GEN", 1, 1);

      expect(result.status === "ok" && result.words[0]?.strongs).toBe("H7225");
    });

    it("says a book the interlinear doesn't cover isn't available", async () => {
      serve({ "api/d/bsb-interlinear/books.json": INTERLINEAR_BOOKS });

      const result = await createProvider(
        createInMemoryRecordStore()
      ).getVerseWords("TOB", 1, 1);

      expect(result).toEqual({ status: "book-unavailable" });
    });

    it("says a verse the interlinear numbers differently isn't available", async () => {
      serve({
        "api/d/bsb-interlinear/books.json": INTERLINEAR_BOOKS,
        "api/d/bsb-interlinear/GEN/1.json": GEN_1,
      });
      const provider = createProvider(createInMemoryRecordStore());

      // A verse missing from a chapter the interlinear has...
      expect(await provider.getVerseWords("GEN", 1, 40)).toEqual({
        status: "verse-unavailable",
      });
      // ...and a chapter missing from a book it has.
      expect(await provider.getVerseWords("GEN", 51, 1)).toEqual({
        status: "verse-unavailable",
      });
    });

    it("remembers a missing chapter for a day", async () => {
      serve({ "api/d/bsb-interlinear/books.json": INTERLINEAR_BOOKS });
      const store = createInMemoryRecordStore();
      await createProvider(store).getVerseWords("TOB", 1, 1);
      getFetchMock().mockClear();

      expect(await createProvider(store).getVerseWords("TOB", 1, 1)).toEqual({
        status: "book-unavailable",
      });
      expect(getFetchMock()).not.toHaveBeenCalled();

      vi.setSystemTime(Date.now() + WORD_STUDY_NOT_FOUND_TTL_MS + 1000);
      await createProvider(store).getVerseWords("TOB", 1, 1);
      expect(requestedPaths()).toContain("/api/d/bsb-interlinear/TOB/1.json");
    });
  });

  describe("getLexiconEntry", () => {
    it("reads one entry, never the whole lexicon index", async () => {
      serve({ "api/d/stepbible-lexicon/lexicon/G3056.json": G3056 });

      const result = await createProvider(
        createInMemoryRecordStore()
      ).getLexiconEntry("G3056");

      expect(result.status === "ok" && result.entry.senses[0]?.gloss).toBe(
        "word"
      );
      expect(requestedPaths()).toEqual([
        "/api/d/stepbible-lexicon/lexicon/G3056.json",
      ]);
    });

    it("reads an extended id from the entry it belongs to", async () => {
      serve({ "api/d/stepbible-lexicon/lexicon/H0430.json": H0430 });

      const result = await createProvider(
        createInMemoryRecordStore()
      ).getLexiconEntry("H0430G");

      expect(result.status === "ok" && result.entry.id).toBe("H0430");
      expect(requestedPaths()).toEqual([
        "/api/d/stepbible-lexicon/lexicon/H0430.json",
      ]);
    });

    it("remembers an entry that doesn't exist", async () => {
      serve({});
      const store = createInMemoryRecordStore();

      expect(await createProvider(store).getLexiconEntry("H9999")).toEqual({
        status: "not-found",
      });
      getFetchMock().mockClear();

      expect(await createProvider(store).getLexiconEntry("H9999")).toEqual({
        status: "not-found",
      });
      expect(getFetchMock()).not.toHaveBeenCalled();
    });

    it("reports an error, not a missing entry, when offline", async () => {
      goOffline();

      const result = await createProvider(
        createInMemoryRecordStore()
      ).getLexiconEntry("G3056");

      expect(result.status).toBe("error");
    });

    it("treats an id that isn't a Strong's number as missing, without a request", async () => {
      const result = await createProvider(
        createInMemoryRecordStore()
      ).getLexiconEntry("not-an-id");

      expect(result).toEqual({ status: "not-found" });
      expect(getFetchMock()).not.toHaveBeenCalled();
    });
  });
});
