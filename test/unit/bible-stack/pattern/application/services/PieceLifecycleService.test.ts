import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { PieceLifecycleService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/PieceLifecycleService";
import type { DomainEventManager } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/EventManager";
import type {
  PieceLifecycleConfigProviderPort,
  VerseDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceLifecycle";
import type {
  ArrangementServicePort,
  IdGeneratorPort,
  PieceDataRepositoryPort,
  PieceHighlightServicePort,
  PieceLabelServicePort,
  PieceLifecycleEventPort,
  ScriptureServicePort,
  StackPieceLifecycleAdapterPort,
  VersesBundleDataRepositoryPort,
} from "../../../../../../patterns/bible-stack/bible-stack/application/ports/pieceLifecycle";
import { StackBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackBookData";
import { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import { StackSectionBookData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionBookData";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";
import { StackTestamentData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackTestamentData";
import { VersesBundleData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VersesBundleData";
import { VerseData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/VerseData";
import type {
  CompleteBookInfo,
  SectionInfo,
  TestamentInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type { SectionShadow } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";

const ARRANGEMENT_NAME = "arrangement";
const ARRANGEMENT_INDEX = 2;
const TESTAMENT_INDEX = 1;
const BIBLE_ID = "bible-id";
const TESTAMENT_DATA_ID = "testament-data-id";
const SECTION_DATA_ID = "section-data-id";

const makeBookInfo = (
  bookId: string,
  chaptersVerseCount: number[],
  group?: number
): CompleteBookInfo => ({
  type: "complete",
  bookId,
  author: "author",
  chaptersVerseCount,
  relativeDateRange: { min: 0, max: 1 },
  numberOfChapters: chaptersVerseCount.length,
  ...(group ? { group } : {}),
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: TESTAMENT_INDEX,
    sectionIndex: 0,
    bookIndex: 0,
  },
});

const makeSectionInfo = (
  name: string,
  sectionIndex: number,
  books: CompleteBookInfo[]
): SectionInfo => ({
  name,
  color: "#ffffff",
  books,
  path: {
    arrangementName: ARRANGEMENT_NAME,
    testamentIndex: TESTAMENT_INDEX,
    sectionIndex,
  },
});

const firstSamuelInfo = makeBookInfo("1SA", [2], 1);
const ruthInfo = makeBookInfo("RUT", [3, 1]);
const secondSamuelInfo = makeBookInfo("2SA", [1], 1);
const jobInfo = makeBookInfo("JOB", [2]);
const genesisInfo = makeBookInfo("GEN", [3, 2]);

const groupedSectionInfo = makeSectionInfo("History", 0, [
  firstSamuelInfo,
  ruthInfo,
  secondSamuelInfo,
  jobInfo,
]);
const singleBookSectionInfo = makeSectionInfo("Law", 1, [genesisInfo]);
const emptySectionInfo = makeSectionInfo("Empty", 2, []);

const testamentInfo: TestamentInfo = {
  name: "Old Testament",
  sections: [groupedSectionInfo, singleBookSectionInfo],
};
const otherTestamentInfo: TestamentInfo = {
  name: "New Testament",
  sections: [emptySectionInfo],
};

const arrangementsTestaments = new Map<number, TestamentInfo[]>([
  [ARRANGEMENT_INDEX, [otherTestamentInfo, testamentInfo]],
]);

const verseCreationParams = {
  bookId: "GEN",
  chapter: 1,
  start: 1,
  count: 1,
  verseIndex: 0,
};

const makeVerseData = (id: string, { withPiece = true } = {}) =>
  new VerseData({
    id,
    piece: withPiece ? { id: `${id}-piece`, type: "Verse" } : undefined,
    creationParams: verseCreationParams,
  });

const makeVersesBundleData = (
  id: string,
  {
    verses = [],
    withPiece = true,
  }: { verses?: VerseData[]; withPiece?: boolean } = {}
) =>
  new VersesBundleData({
    id,
    verses,
    piece: withPiece ? { id: `${id}-piece`, type: "VersesBundle" } : undefined,
    creationParams: { bookId: "GEN", chapter: 1, start: 1, count: 1 },
  });

const makeChapterData = (
  id: string,
  {
    childrenData = [],
    withPiece = true,
  }: { childrenData?: VersesBundleData[]; withPiece?: boolean } = {}
) =>
  new StackChapterData({
    id,
    piece: withPiece ? { id: `${id}-piece`, type: "StackChapter" } : undefined,
    pieceInfo: { amountOfVerses: 1, number: 1 },
    parentDataIds: {},
    isInsideBible: true,
    creationParams: { bookId: "GEN" },
    childrenData,
  });

const makeBookData = (
  id: string,
  {
    childrenData = [],
    withPiece = true,
  }: { childrenData?: StackChapterData[]; withPiece?: boolean } = {}
) =>
  new StackBookData({
    id,
    piece: withPiece ? { id: `${id}-piece`, type: "StackBook" } : undefined,
    pieceInfo: genesisInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: ARRANGEMENT_INDEX,
      testamentIndex: TESTAMENT_INDEX,
      sectionIndex: 0,
      levelIndex: 0,
      bookIndex: 0,
      bookLevelIndex: 0,
      levelsLenght: 1,
    },
    childrenData,
  });

const makeSectionBookData = (
  id: string,
  {
    childrenData = [],
    withPiece = true,
  }: { childrenData?: StackChapterData[]; withPiece?: boolean } = {}
) =>
  new StackSectionBookData({
    id,
    piece: withPiece
      ? { id: `${id}-piece`, type: "StackSectionBook" }
      : undefined,
    pieceInfo: singleBookSectionInfo,
    pieceBookInfo: genesisInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: ARRANGEMENT_INDEX,
      testamentIndex: TESTAMENT_INDEX,
      sectionIndex: 1,
      amountOfChaptersInSection: 2,
    },
    childrenData,
  });

const makeSectionData = (
  id: string,
  {
    childrenData = [],
    withPiece = true,
    withShadow = false,
  }: {
    childrenData?: StackBookData[][];
    withPiece?: boolean;
    withShadow?: boolean;
  } = {}
) => {
  const data = new StackSectionData({
    id,
    piece: withPiece ? { id: `${id}-piece`, type: "StackSection" } : undefined,
    pieceInfo: groupedSectionInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: ARRANGEMENT_INDEX,
      testamentIndex: TESTAMENT_INDEX,
      sectionIndex: 0,
      amountOfChaptersInSection: 6,
    },
    childrenData,
  });
  if (withShadow) {
    const shadow: SectionShadow = {
      id: `${id}-shadow`,
      type: "StackSectionShadow",
      sectionDataId: id,
    };
    data.attachShadow(shadow);
  }
  return data;
};

const makeTestamentData = (
  id: string,
  {
    childrenData = [],
    withPiece = true,
  }: {
    childrenData?: (StackSectionData | StackSectionBookData)[];
    withPiece?: boolean;
  } = {}
) =>
  new StackTestamentData({
    id,
    piece: withPiece
      ? { id: `${id}-piece`, type: "StackTestament" }
      : undefined,
    pieceInfo: testamentInfo,
    parentDataIds: {},
    creationParams: {
      arrangementIndex: ARRANGEMENT_INDEX,
      testamentIndex: TESTAMENT_INDEX,
    },
    childrenData,
  });

const collectHierarchy = (testament: StackTestamentData) => {
  const sections = testament.childrenData;
  const books = sections.flatMap((section) =>
    section instanceof StackSectionData ? section.childrenData.flat() : []
  );
  const chapters = [
    ...sections.flatMap((section) =>
      section instanceof StackSectionBookData ? section.childrenData : []
    ),
    ...books.flatMap((book) => book.childrenData),
  ];
  const bundles = chapters.flatMap((chapter) => chapter.childrenData);
  const verses = bundles.flatMap((bundle) => bundle.verses);
  return { sections, books, chapters, bundles, verses };
};

const getBundleRanges = (chapter: StackChapterData) =>
  chapter.childrenData.map((bundle) => ({
    start: bundle.getCreationParam("start"),
    count: bundle.getCreationParam("count"),
  }));

describe("pattern.bible-stack.application.services.PieceLifecycleService", () => {
  let service: PieceLifecycleService;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let pieceLabelServicePort: Mocked<PieceLabelServicePort>;
  let stackPieceLifecycleAdapterPort: Mocked<StackPieceLifecycleAdapterPort>;
  let pieceLifecycleEventPort: Mocked<PieceLifecycleEventPort>;
  let arrangementServicePort: Mocked<ArrangementServicePort>;
  let idGenerator: Mocked<IdGeneratorPort>;
  let scriptureServicePort: Mocked<ScriptureServicePort>;
  let versesBundleDataRepositoryPort: Mocked<VersesBundleDataRepositoryPort>;
  let verseDataRepositoryPort: Mocked<VerseDataRepositoryPort>;
  let configProviderPort: Mocked<PieceLifecycleConfigProviderPort>;
  let pieceHighlightServicePort: Mocked<PieceHighlightServicePort>;
  let eventManger: Mocked<DomainEventManager>;

  beforeEach(() => {
    let generatedIdsCount = 0;

    pieceDataRepositoryPort = {
      removeTestamentData: vi.fn(),
      removeSectionData: vi.fn(),
      removeSectionBookData: vi.fn(),
      removeBookData: vi.fn(),
      removeChapterData: vi.fn(),
      addChapterData: vi.fn(),
      addBookData: vi.fn(),
      addSectionBookData: vi.fn(),
      addSectionData: vi.fn(),
      addTestamentData: vi.fn(),
    };

    pieceLabelServicePort = {
      hideLabel: vi.fn().mockResolvedValue(undefined),
      showLabel: vi.fn(),
    };

    stackPieceLifecycleAdapterPort = {
      spawnTestament: vi.fn(),
      despawnTestament: vi.fn(),
      spawnSection: vi.fn(),
      despawnSection: vi.fn(),
      spawnBook: vi.fn(),
      despawnBook: vi.fn(),
      spawnChapter: vi.fn(),
      despawnChapter: vi.fn(),
      spawnSectionShadow: vi.fn(),
      spawnSectionShadowDomain: vi.fn(),
      despawnSectionShadow: vi.fn(),
      despawnSectionBook: vi.fn(),
      spawnVersesBundle: vi.fn(),
      despawnVersesBundle: vi.fn(),
      spawnVerse: vi.fn(),
      despawnVerse: vi.fn(),
      despawn: vi.fn(),
    };

    pieceLifecycleEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<PieceLifecycleEventPort>;

    arrangementServicePort = {
      getTestamentByIndices: vi.fn(({ arrangementIndex, testamentIndex }) =>
        arrangementsTestaments.get(arrangementIndex)?.at(testamentIndex)
      ),
      getSectionByIndices: vi.fn(
        ({ arrangementIndex, testamentIndex, sectionIndex }) =>
          arrangementsTestaments
            .get(arrangementIndex)
            ?.at(testamentIndex)
            ?.sections.at(sectionIndex)
      ),
      getBookByIndices: vi.fn(
        ({ arrangementIndex, testamentIndex, sectionIndex, bookIndex }) =>
          arrangementsTestaments
            .get(arrangementIndex)
            ?.at(testamentIndex)
            ?.sections.at(sectionIndex)
            ?.books.at(bookIndex)
      ),
    };

    idGenerator = {
      getId: vi.fn(() => `generated-id-${generatedIdsCount++}`),
    };

    scriptureServicePort = {
      getSectionChapterCount: vi.fn((books) =>
        books.reduce((total, book) => total + book.numberOfChapters, 0)
      ),
    };

    versesBundleDataRepositoryPort = {
      addBundleData: vi.fn(),
      removeBundleData: vi.fn(),
    };

    verseDataRepositoryPort = {
      addVerseData: vi.fn(),
      removeVerseData: vi.fn(),
    };

    configProviderPort = {
      getVersesPerBundle: vi.fn(() => 2),
    };

    pieceHighlightServicePort = {
      forgetPiece: vi.fn(),
    };

    eventManger = {
      subscribe: vi.fn(),
      emit: vi.fn(),
      removeAllListeners: vi.fn(),
    } as unknown as Mocked<DomainEventManager>;

    service = new PieceLifecycleService({
      pieceDataRepositoryPort,
      pieceLabelServicePort,
      stackPieceLifecycleAdapterPort,
      pieceLifecycleEventPort,
      arrangementServicePort,
      idGenerator,
      scriptureServicePort,
      versesBundleDataRepositoryPort,
      verseDataRepositoryPort,
      configProviderPort,
      pieceHighlightServicePort,
      eventManger,
    });
  });

  describe("createTestament", () => {
    it("throws and registers nothing if no testament info is found for the provided indices", () => {
      expect(() =>
        service.createTestament({
          arrangementIndex: ARRANGEMENT_INDEX + 1,
          testamentIndex: TESTAMENT_INDEX,
        })
      ).toThrow(
        "PieceLifecycleService: testamentInfo not found at createTestament"
      );
      expect(pieceDataRepositoryPort.addTestamentData).not.toHaveBeenCalled();
      expect(pieceDataRepositoryPort.addSectionData).not.toHaveBeenCalled();
      expect(pieceDataRepositoryPort.addSectionBookData).not.toHaveBeenCalled();
    });

    it("registers and returns a testament data built from the testament info, inside the bible", () => {
      const testament = service.createTestament({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
        bibleDataId: BIBLE_ID,
      });

      expect(testament).toBeInstanceOf(StackTestamentData);
      expect(testament.pieceInfo).toBe(testamentInfo);
      expect(testament.isInsideBible).toBe(true);
      expect(testament.parentDataIds).toEqual({ stackBibleId: BIBLE_ID });
      expect(testament.creationParams).toEqual({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
      });
      expect(
        pieceDataRepositoryPort.addTestamentData
      ).toHaveBeenCalledExactlyOnceWith(testament);
    });

    it("creates one section per testament section, in order, inside the bible and the testament", () => {
      const testament = service.createTestament({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
        bibleDataId: BIBLE_ID,
      });

      expect(
        testament.childrenData.map((section) => ({
          pieceInfo: section.pieceInfo,
          sectionIndex: section.getSectionIndex(),
          parentDataIds: section.parentDataIds,
          isInsideBible: section.isInsideBible,
          isInsideTestament: section.isInsideTestament,
        }))
      ).toEqual(
        testamentInfo.sections.map((sectionInfo, sectionIndex) => ({
          pieceInfo: sectionInfo,
          sectionIndex,
          parentDataIds: {
            stackBibleId: BIBLE_ID,
            stackTestamentId: testament.id,
          },
          isInsideBible: true,
          isInsideTestament: true,
        }))
      );
    });

    it("gives every data in the created hierarchy its own generated id", () => {
      const testament = service.createTestament({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
      });
      const { sections, books, chapters, bundles, verses } =
        collectHierarchy(testament);

      const ids = [testament, ...sections, ...books, ...chapters]
        .map((data) => data.id)
        .concat(bundles.map((bundle) => bundle.id))
        .concat(verses.map((verse) => verse.id));
      const generatedIds = idGenerator.getId.mock.results.map(
        ({ value }) => value as string
      );

      expect(ids.toSorted()).toEqual(generatedIds.toSorted());
    });

    it("hides every chapter of the hierarchy only when requested", () => {
      const hiddenTestament = service.createTestament({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
        isHidden: true,
      });
      const visibleTestament = service.createTestament({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
      });

      const hiddenChapters = collectHierarchy(hiddenTestament).chapters;
      const visibleChapters = collectHierarchy(visibleTestament).chapters;

      expect(hiddenChapters.length).toBeGreaterThan(0);
      expect(hiddenChapters.every((chapter) => chapter.isHidden)).toBe(true);
      expect(visibleChapters.length).toBe(hiddenChapters.length);
      expect(visibleChapters.every((chapter) => !chapter.isHidden)).toBe(true);
    });
  });

  describe("createSection", () => {
    const createSection = (
      params: Partial<Parameters<PieceLifecycleService["createSection"]>[0]>
    ) =>
      service.createSection({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
        sectionIndex: 0,
        isInsideBible: true,
        isInsideTestament: true,
        bibleDataId: BIBLE_ID,
        testamentDataId: TESTAMENT_DATA_ID,
        ...params,
      });

    it("throws and registers nothing if no section info is found for the provided indices", () => {
      expect(() => createSection({ sectionIndex: 7 })).toThrow(
        "PieceLifecycleService: sectionInfo not found at createSection"
      );
      expect(pieceDataRepositoryPort.addSectionData).not.toHaveBeenCalled();
      expect(pieceDataRepositoryPort.addSectionBookData).not.toHaveBeenCalled();
      expect(pieceDataRepositoryPort.addBookData).not.toHaveBeenCalled();
    });

    it("keeps the chapter count the scripture service reports for the section books", () => {
      scriptureServicePort.getSectionChapterCount.mockReturnValue(42);

      const section = createSection({ sectionIndex: 0 });

      expect(
        scriptureServicePort.getSectionChapterCount
      ).toHaveBeenCalledExactlyOnceWith(groupedSectionInfo.books);
      expect(section.creationParams).toEqual({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
        sectionIndex: 0,
        amountOfChaptersInSection: 42,
      });
    });

    describe("with more than one book", () => {
      it("registers and returns a section data built from the section info, carrying the provided flags and parent ids", () => {
        const section = createSection({
          sectionIndex: 0,
          isInsideBible: false,
          isInsideTestament: false,
        });

        expect(section).toBeInstanceOf(StackSectionData);
        expect(section.pieceInfo).toBe(groupedSectionInfo);
        expect(section.isInsideBible).toBe(false);
        expect(section.isInsideTestament).toBe(false);
        expect(section.parentDataIds).toEqual({
          stackBibleId: BIBLE_ID,
          stackTestamentId: TESTAMENT_DATA_ID,
        });
        expect(
          pieceDataRepositoryPort.addSectionData
        ).toHaveBeenCalledExactlyOnceWith(section);
        expect(
          pieceDataRepositoryPort.addSectionBookData
        ).not.toHaveBeenCalled();
      });

      it("groups its books by level, keeping books of the same group together in one level", () => {
        const section = createSection({ sectionIndex: 0 }) as StackSectionData;

        expect(
          section.childrenData.map((level) =>
            level.map((book) => book.pieceInfo)
          )
        ).toEqual([[firstSamuelInfo, secondSamuelInfo], [ruthInfo], [jobInfo]]);
      });

      it("creates each book with its position in the section, its level and its place within that level", () => {
        const section = createSection({ sectionIndex: 0 }) as StackSectionData;

        expect(
          section.childrenData.flat().map((book) => book.creationParams)
        ).toEqual(
          [
            { bookIndex: 0, levelIndex: 0, bookLevelIndex: 0 },
            { bookIndex: 2, levelIndex: 0, bookLevelIndex: 1 },
            { bookIndex: 1, levelIndex: 1, bookLevelIndex: 0 },
            { bookIndex: 3, levelIndex: 2, bookLevelIndex: 0 },
          ].map((indices) => ({
            arrangementIndex: ARRANGEMENT_INDEX,
            testamentIndex: TESTAMENT_INDEX,
            sectionIndex: 0,
            levelsLenght: 3,
            ...indices,
          }))
        );
      });

      it("creates each book inside the section, carrying the section flags and parent ids", () => {
        const section = createSection({
          sectionIndex: 0,
          isInsideBible: false,
          isInsideTestament: true,
        }) as StackSectionData;
        const books = section.childrenData.flat();

        expect(
          books.map((book) => ({
            parentDataIds: book.parentDataIds,
            isInsideBible: book.isInsideBible,
            isInsideTestament: book.isInsideTestament,
            isInsideSection: book.isInsideSection,
          }))
        ).toEqual(
          books.map(() => ({
            parentDataIds: {
              stackBibleId: BIBLE_ID,
              stackTestamentId: TESTAMENT_DATA_ID,
              stackSectionId: section.id,
            },
            isInsideBible: false,
            isInsideTestament: true,
            isInsideSection: true,
          }))
        );
        expect(pieceDataRepositoryPort.addBookData.mock.calls).toEqual(
          books.map((book) => [book])
        );
      });

      it("hides the chapters of its books only when requested", () => {
        const hiddenSection = createSection({
          sectionIndex: 0,
          isHidden: true,
        }) as StackSectionData;
        const visibleSection = createSection({
          sectionIndex: 0,
        }) as StackSectionData;

        const getChapters = (section: StackSectionData) =>
          section.childrenData.flat().flatMap((book) => book.childrenData);

        expect(
          getChapters(hiddenSection).every((chapter) => chapter.isHidden)
        ).toBe(true);
        expect(
          getChapters(visibleSection).every((chapter) => !chapter.isHidden)
        ).toBe(true);
      });
    });

    describe("with a single book", () => {
      it("registers and returns a section book data built from the section info and its book, carrying the provided flags and parent ids", () => {
        const sectionBook = createSection({
          sectionIndex: 1,
          isInsideBible: false,
          isInsideTestament: false,
        });

        expect(sectionBook).toBeInstanceOf(StackSectionBookData);
        expect(sectionBook.pieceInfo).toBe(singleBookSectionInfo);
        expect((sectionBook as StackSectionBookData).pieceBookInfo).toBe(
          genesisInfo
        );
        expect(sectionBook.isInsideBible).toBe(false);
        expect(sectionBook.isInsideTestament).toBe(false);
        expect(sectionBook.parentDataIds).toEqual({
          stackBibleId: BIBLE_ID,
          stackTestamentId: TESTAMENT_DATA_ID,
        });
        expect(
          pieceDataRepositoryPort.addSectionBookData
        ).toHaveBeenCalledExactlyOnceWith(sectionBook);
        expect(pieceDataRepositoryPort.addSectionData).not.toHaveBeenCalled();
        expect(pieceDataRepositoryPort.addBookData).not.toHaveBeenCalled();
      });

      it("creates one chapter per book chapter, numbered from 1, belonging to the section book", () => {
        const sectionBook = createSection({
          sectionIndex: 1,
        }) as StackSectionBookData;

        expect(
          sectionBook.childrenData.map((chapter) => ({
            pieceInfo: chapter.pieceInfo,
            creationParams: chapter.creationParams,
            parentDataIds: chapter.parentDataIds,
          }))
        ).toEqual(
          [
            { amountOfVerses: 3, number: 1 },
            { amountOfVerses: 2, number: 2 },
          ].map((pieceInfo) => ({
            pieceInfo,
            creationParams: { bookId: genesisInfo.bookId },
            parentDataIds: {
              stackBibleId: BIBLE_ID,
              stackTestamentId: TESTAMENT_DATA_ID,
              stackSectionBookId: sectionBook.id,
            },
          }))
        );
        expect(pieceDataRepositoryPort.addChapterData.mock.calls).toEqual(
          sectionBook.childrenData.map((chapter) => [chapter])
        );
      });

      it("hides its chapters only when requested", () => {
        const hiddenSectionBook = createSection({
          sectionIndex: 1,
          isHidden: true,
        }) as StackSectionBookData;
        const visibleSectionBook = createSection({
          sectionIndex: 1,
        }) as StackSectionBookData;

        expect(
          hiddenSectionBook.childrenData.every((chapter) => chapter.isHidden)
        ).toBe(true);
        expect(
          visibleSectionBook.childrenData.every((chapter) => !chapter.isHidden)
        ).toBe(true);
      });
    });

    it("throws and registers nothing if the section has no books", () => {
      arrangementServicePort.getSectionByIndices.mockReturnValue(
        emptySectionInfo
      );

      expect(() => createSection({ sectionIndex: 2 })).toThrow(
        "PieceLifecycleService: data not defined at createSection"
      );
      expect(pieceDataRepositoryPort.addSectionData).not.toHaveBeenCalled();
      expect(pieceDataRepositoryPort.addSectionBookData).not.toHaveBeenCalled();
    });
  });

  describe("createBook", () => {
    const createBook = (
      params: Partial<Parameters<PieceLifecycleService["createBook"]>[0]>
    ) =>
      service.createBook({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
        sectionIndex: 0,
        levelIndex: 1,
        bookIndex: 1,
        bookLevelIndex: 0,
        levelsLenght: 3,
        isInsideBible: true,
        isInsideTestament: true,
        isInsideSection: true,
        bibleDataId: BIBLE_ID,
        testamentDataId: TESTAMENT_DATA_ID,
        sectionDataId: SECTION_DATA_ID,
        ...params,
      });

    it("throws and registers nothing if no book info is found for the provided indices", () => {
      expect(() => createBook({ bookIndex: 9 })).toThrow(
        "PieceLifecycleService: bookInfo not found at createBook."
      );
      expect(pieceDataRepositoryPort.addBookData).not.toHaveBeenCalled();
      expect(pieceDataRepositoryPort.addChapterData).not.toHaveBeenCalled();
    });

    it("registers and returns a book data built from the book info, carrying the provided flags, indices and parent ids", () => {
      const book = createBook({
        isInsideBible: false,
        isInsideTestament: true,
        isInsideSection: false,
      });

      expect(book).toBeInstanceOf(StackBookData);
      expect(book.pieceInfo).toBe(ruthInfo);
      expect(book.isInsideBible).toBe(false);
      expect(book.isInsideTestament).toBe(true);
      expect(book.isInsideSection).toBe(false);
      expect(book.parentDataIds).toEqual({
        stackBibleId: BIBLE_ID,
        stackTestamentId: TESTAMENT_DATA_ID,
        stackSectionId: SECTION_DATA_ID,
      });
      expect(book.creationParams).toEqual({
        arrangementIndex: ARRANGEMENT_INDEX,
        testamentIndex: TESTAMENT_INDEX,
        sectionIndex: 0,
        levelIndex: 1,
        bookIndex: 1,
        bookLevelIndex: 0,
        levelsLenght: 3,
      });
      expect(
        pieceDataRepositoryPort.addBookData
      ).toHaveBeenCalledExactlyOnceWith(book);
    });

    it("creates one chapter per book chapter, numbered from 1, belonging to the book", () => {
      const book = createBook({});

      expect(
        book.childrenData.map((chapter) => ({
          pieceInfo: chapter.pieceInfo,
          creationParams: chapter.creationParams,
          parentDataIds: chapter.parentDataIds,
        }))
      ).toEqual(
        [
          { amountOfVerses: 3, number: 1 },
          { amountOfVerses: 1, number: 2 },
        ].map((pieceInfo) => ({
          pieceInfo,
          creationParams: { bookId: ruthInfo.bookId },
          parentDataIds: {
            stackBibleId: BIBLE_ID,
            stackTestamentId: TESTAMENT_DATA_ID,
            stackSectionId: SECTION_DATA_ID,
            stackBookId: book.id,
          },
        }))
      );
      expect(pieceDataRepositoryPort.addChapterData.mock.calls).toEqual(
        book.childrenData.map((chapter) => [chapter])
      );
    });

    it("hides its chapters only when requested", () => {
      const hiddenBook = createBook({ isHidden: true });
      const visibleBook = createBook({});

      expect(hiddenBook.childrenData.every((chapter) => chapter.isHidden)).toBe(
        true
      );
      expect(
        visibleBook.childrenData.every((chapter) => !chapter.isHidden)
      ).toBe(true);
    });
  });

  describe("createChapter", () => {
    const createChapter = (
      params: Partial<Parameters<PieceLifecycleService["createChapter"]>[0]>
    ) =>
      service.createChapter({
        chapterInfo: { amountOfVerses: 5, number: 3 },
        isInsideBible: true,
        isInsideBook: true,
        bookId: "GEN",
        ...params,
      });

    it("registers and returns an unselected chapter data carrying the provided info, flags and parent ids", () => {
      const chapterInfo = { amountOfVerses: 5, number: 3 };

      const chapter = createChapter({
        chapterInfo,
        isInsideBible: false,
        isInsideBook: false,
        isHidden: true,
        bibleDataId: BIBLE_ID,
        testamentDataId: TESTAMENT_DATA_ID,
        sectionDataId: SECTION_DATA_ID,
        sectionBookDataId: "section-book-data-id",
        bookDataId: "book-data-id",
        bookId: "EXO",
      });

      expect(chapter).toBeInstanceOf(StackChapterData);
      expect(chapter.pieceInfo).toBe(chapterInfo);
      expect(chapter.creationParams).toEqual({ bookId: "EXO" });
      expect(chapter.parentDataIds).toEqual({
        stackBibleId: BIBLE_ID,
        stackTestamentId: TESTAMENT_DATA_ID,
        stackSectionId: SECTION_DATA_ID,
        stackSectionBookId: "section-book-data-id",
        stackBookId: "book-data-id",
      });
      expect(chapter.isInsideBible).toBe(false);
      expect(chapter.isInsideBook).toBe(false);
      expect(chapter.isHidden).toBe(true);
      expect(chapter.isSelected).toBe(false);
      expect(
        pieceDataRepositoryPort.addChapterData
      ).toHaveBeenCalledExactlyOnceWith(chapter);
    });

    it("leaves the chapter visible if not requested otherwise", () => {
      expect(createChapter({}).isHidden).toBe(false);
    });

    it("splits its verses into bundles of the configured size, the last one holding the remainder", () => {
      configProviderPort.getVersesPerBundle.mockReturnValue(4);

      const chapter = createChapter({
        chapterInfo: { amountOfVerses: 10, number: 3 },
        bookId: "EXO",
      });

      expect(getBundleRanges(chapter)).toEqual([
        { start: 1, count: 4 },
        { start: 5, count: 4 },
        { start: 9, count: 2 },
      ]);
      expect(
        chapter.childrenData.map((bundle) => ({
          bookId: bundle.getCreationParam("bookId"),
          chapter: bundle.getCreationParam("chapter"),
        }))
      ).toEqual(
        chapter.childrenData.map(() => ({ bookId: "EXO", chapter: 3 }))
      );
      expect(versesBundleDataRepositoryPort.addBundleData.mock.calls).toEqual(
        chapter.childrenData.map((bundle) => [bundle])
      );
    });

    it("fills every bundle when the verses are a multiple of the configured size", () => {
      configProviderPort.getVersesPerBundle.mockReturnValue(4);

      const chapter = createChapter({
        chapterInfo: { amountOfVerses: 8, number: 1 },
      });

      expect(getBundleRanges(chapter)).toEqual([
        { start: 1, count: 4 },
        { start: 5, count: 4 },
      ]);
    });

    it("creates no bundles if the chapter has no verses", () => {
      const chapter = createChapter({
        chapterInfo: { amountOfVerses: 0, number: 1 },
      });

      expect(chapter.childrenData).toEqual([]);
      expect(
        versesBundleDataRepositoryPort.addBundleData
      ).not.toHaveBeenCalled();
    });
  });

  describe("createVerseBundle", () => {
    it("registers and returns a bundle data with a generated id, holding the provided creation params", () => {
      idGenerator.getId.mockReturnValue("bundle-id");

      const bundle = service.createVerseBundle({
        start: 5,
        count: 0,
        bookId: "EXO",
        chapter: 3,
      });

      expect(bundle).toBeInstanceOf(VersesBundleData);
      expect(bundle.id).toBe("bundle-id");
      expect({
        start: bundle.getCreationParam("start"),
        count: bundle.getCreationParam("count"),
        bookId: bundle.getCreationParam("bookId"),
        chapter: bundle.getCreationParam("chapter"),
      }).toEqual({ start: 5, count: 0, bookId: "EXO", chapter: 3 });
      expect(
        versesBundleDataRepositoryPort.addBundleData
      ).toHaveBeenCalledExactlyOnceWith(bundle);
    });

    it("creates and registers one verse per counted verse, indexed from 0, sharing the bundle creation params", () => {
      const bundle = service.createVerseBundle({
        start: 5,
        count: 3,
        bookId: "EXO",
        chapter: 3,
      });

      expect(
        bundle.verses.map((verse) => ({
          start: verse.getCreationParam("start"),
          count: verse.getCreationParam("count"),
          bookId: verse.getCreationParam("bookId"),
          chapter: verse.getCreationParam("chapter"),
          verseIndex: verse.getCreationParam("verseIndex"),
        }))
      ).toEqual(
        [0, 1, 2].map((verseIndex) => ({
          start: 5,
          count: 3,
          bookId: "EXO",
          chapter: 3,
          verseIndex,
        }))
      );
      expect(verseDataRepositoryPort.addVerseData.mock.calls).toEqual(
        bundle.verses.map((verse) => [verse])
      );
    });
  });

  describe("createVerse", () => {
    it("registers and returns a verse data with a generated id, holding the provided creation params", () => {
      idGenerator.getId.mockReturnValue("verse-id");

      const verse = service.createVerse({
        start: 5,
        count: 3,
        bookId: "EXO",
        chapter: 3,
        verseIndex: 2,
      });

      expect(verse).toBeInstanceOf(VerseData);
      expect(verse.id).toBe("verse-id");
      expect({
        start: verse.getCreationParam("start"),
        count: verse.getCreationParam("count"),
        bookId: verse.getCreationParam("bookId"),
        chapter: verse.getCreationParam("chapter"),
        verseIndex: verse.getCreationParam("verseIndex"),
      }).toEqual({
        start: 5,
        count: 3,
        bookId: "EXO",
        chapter: 3,
        verseIndex: 2,
      });
      expect(
        verseDataRepositoryPort.addVerseData
      ).toHaveBeenCalledExactlyOnceWith(verse);
    });
  });

  describe("deleteTestament", () => {
    it("removes the testament data from the repository and emits its deletion, even without piece", () => {
      const testament = makeTestamentData("testament", { withPiece: false });

      service.deleteTestament(testament);

      expect(
        pieceDataRepositoryPort.removeTestamentData
      ).toHaveBeenCalledExactlyOnceWith(testament);
      expect(pieceLifecycleEventPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnTestamentDelete",
        { dataId: testament.id }
      );
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(pieceHighlightServicePort.forgetPiece).not.toHaveBeenCalled();
      expect(stackPieceLifecycleAdapterPort.despawn).not.toHaveBeenCalled();
    });

    it("clears its piece, hiding its label instantly, forgetting and despawning it", () => {
      const testament = makeTestamentData("testament");
      const piece = testament.piece;

      service.deleteTestament(testament);

      expect(testament.piece).toBeUndefined();
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        piece,
        "Instant"
      );
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
    });

    it("deletes every child, as a section or as a section book according to its type", () => {
      const book = makeBookData("book");
      const section = makeSectionData("section", { childrenData: [[book]] });
      const chapter = makeChapterData("chapter");
      const sectionBook = makeSectionBookData("section-book", {
        childrenData: [chapter],
      });
      const testament = makeTestamentData("testament", {
        childrenData: [section, sectionBook],
      });

      service.deleteTestament(testament);

      expect(testament.childrenData).toEqual([]);
      expect(
        pieceDataRepositoryPort.removeSectionData
      ).toHaveBeenCalledExactlyOnceWith(section);
      expect(
        pieceDataRepositoryPort.removeBookData
      ).toHaveBeenCalledExactlyOnceWith(book);
      expect(
        pieceDataRepositoryPort.removeSectionBookData
      ).toHaveBeenCalledExactlyOnceWith(sectionBook);
      expect(
        pieceDataRepositoryPort.removeChapterData
      ).toHaveBeenCalledExactlyOnceWith(chapter);
      expect(eventManger.emit.mock.calls).toEqual([
        ["OnBookDelete", { dataId: book.id }],
        ["OnSectionDelete", { dataId: section.id }],
        ["OnSectionBookDelete", { dataId: sectionBook.id }],
      ]);
      expect(
        [section, book, sectionBook, chapter].map((data) => data.piece)
      ).toEqual([undefined, undefined, undefined, undefined]);
    });

    it("emits its deletion after deleting its children", () => {
      const section = makeSectionData("section");
      const sectionBook = makeSectionBookData("section-book");
      const testament = makeTestamentData("testament", {
        childrenData: [section, sectionBook],
      });

      service.deleteTestament(testament);

      const lastChildEmissionOrder = Math.max(
        ...eventManger.emit.mock.invocationCallOrder
      );
      expect(eventManger.emit).toHaveBeenCalledTimes(2);
      expect(
        pieceLifecycleEventPort.emit.mock.invocationCallOrder[0]
      ).toBeGreaterThan(lastChildEmissionOrder);
    });
  });

  describe("deleteTestaments", () => {
    it("deletes every testament in the batch, in order", () => {
      const testaments = [
        makeTestamentData("testament-1"),
        makeTestamentData("testament-2"),
        makeTestamentData("testament-3"),
      ];

      service.deleteTestaments(testaments);

      expect(pieceDataRepositoryPort.removeTestamentData.mock.calls).toEqual(
        testaments.map((testament) => [testament])
      );
      expect(pieceLifecycleEventPort.emit.mock.calls).toEqual(
        testaments.map((testament) => [
          "OnTestamentDelete",
          { dataId: testament.id },
        ])
      );
    });
  });

  describe("deleteSection", () => {
    it("removes the section data from the repository and emits its deletion, even without piece nor shadow", () => {
      const section = makeSectionData("section", { withPiece: false });

      service.deleteSection(section);

      expect(
        pieceDataRepositoryPort.removeSectionData
      ).toHaveBeenCalledExactlyOnceWith(section);
      expect(eventManger.emit).toHaveBeenCalledExactlyOnceWith(
        "OnSectionDelete",
        { dataId: section.id }
      );
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(stackPieceLifecycleAdapterPort.despawn).not.toHaveBeenCalled();
    });

    it("deletes every book across all of its levels", () => {
      const books = [
        makeBookData("book-1"),
        makeBookData("book-2"),
        makeBookData("book-3"),
      ];
      const [firstBook, secondBook, thirdBook] = books;
      const section = makeSectionData("section", {
        withPiece: false,
        childrenData: [[firstBook!], [secondBook!, thirdBook!]],
      });

      service.deleteSection(section);

      expect(section.childrenData).toEqual([]);
      expect(pieceDataRepositoryPort.removeBookData.mock.calls).toEqual(
        books.map((book) => [book])
      );
      expect(books.map((book) => book.piece)).toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });

    it("clears its piece, hiding its label instantly, forgetting and despawning it", () => {
      const section = makeSectionData("section");
      const piece = section.piece;

      service.deleteSection(section);

      expect(section.piece).toBeUndefined();
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        piece,
        "Instant"
      );
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
    });

    it("detaches its shadow, hiding its label instantly, forgetting and despawning it", () => {
      const section = makeSectionData("section", {
        withPiece: false,
        withShadow: true,
      });
      const shadow = section.shadow;

      service.deleteSection(section);

      expect(section.shadow).toBeUndefined();
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        shadow,
        "Instant"
      );
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(shadow);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(shadow);
    });

    it("despawns its books before its own piece and its shadow", () => {
      const book = makeBookData("book");
      const section = makeSectionData("section", {
        withShadow: true,
        childrenData: [[book]],
      });
      const bookPiece = book.piece;
      const sectionPiece = section.piece;
      const shadow = section.shadow;

      service.deleteSection(section);

      expect(stackPieceLifecycleAdapterPort.despawn.mock.calls).toEqual([
        [bookPiece],
        [sectionPiece],
        [shadow],
      ]);
    });
  });

  describe("deleteSections", () => {
    it("deletes every section in the batch, in order", () => {
      const sections = [
        makeSectionData("section-1"),
        makeSectionData("section-2"),
        makeSectionData("section-3"),
      ];

      service.deleteSections(sections);

      expect(pieceDataRepositoryPort.removeSectionData.mock.calls).toEqual(
        sections.map((section) => [section])
      );
      expect(eventManger.emit.mock.calls).toEqual(
        sections.map((section) => ["OnSectionDelete", { dataId: section.id }])
      );
    });
  });

  describe("deleteSectionBook", () => {
    it("removes the section book data from the repository and emits its deletion, even without piece", () => {
      const sectionBook = makeSectionBookData("section-book", {
        withPiece: false,
      });

      service.deleteSectionBook(sectionBook);

      expect(
        pieceDataRepositoryPort.removeSectionBookData
      ).toHaveBeenCalledExactlyOnceWith(sectionBook);
      expect(eventManger.emit).toHaveBeenCalledExactlyOnceWith(
        "OnSectionBookDelete",
        { dataId: sectionBook.id }
      );
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(stackPieceLifecycleAdapterPort.despawn).not.toHaveBeenCalled();
    });

    it("deletes every chapter", () => {
      const chapters = [
        makeChapterData("chapter-1"),
        makeChapterData("chapter-2"),
      ];
      const sectionBook = makeSectionBookData("section-book", {
        withPiece: false,
        childrenData: chapters,
      });

      service.deleteSectionBook(sectionBook);

      expect(sectionBook.childrenData).toEqual([]);
      expect(pieceDataRepositoryPort.removeChapterData.mock.calls).toEqual(
        chapters.map((chapter) => [chapter])
      );
      expect(chapters.map((chapter) => chapter.piece)).toEqual([
        undefined,
        undefined,
      ]);
    });

    it("clears its piece, hiding its label instantly, forgetting and despawning it", () => {
      const sectionBook = makeSectionBookData("section-book");
      const piece = sectionBook.piece;

      service.deleteSectionBook(sectionBook);

      expect(sectionBook.piece).toBeUndefined();
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        piece,
        "Instant"
      );
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
    });
  });

  describe("deleteSectionBooks", () => {
    it("deletes every section book in the batch, in order", () => {
      const sectionBooks = [
        makeSectionBookData("section-book-1"),
        makeSectionBookData("section-book-2"),
        makeSectionBookData("section-book-3"),
      ];

      service.deleteSectionBooks(sectionBooks);

      expect(pieceDataRepositoryPort.removeSectionBookData.mock.calls).toEqual(
        sectionBooks.map((sectionBook) => [sectionBook])
      );
      expect(eventManger.emit.mock.calls).toEqual(
        sectionBooks.map((sectionBook) => [
          "OnSectionBookDelete",
          { dataId: sectionBook.id },
        ])
      );
    });
  });

  describe("deleteBook", () => {
    it("removes the book data from the repository and emits its deletion, even without piece", () => {
      const book = makeBookData("book", { withPiece: false });

      service.deleteBook(book);

      expect(
        pieceDataRepositoryPort.removeBookData
      ).toHaveBeenCalledExactlyOnceWith(book);
      expect(eventManger.emit).toHaveBeenCalledExactlyOnceWith("OnBookDelete", {
        dataId: book.id,
      });
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(stackPieceLifecycleAdapterPort.despawn).not.toHaveBeenCalled();
    });

    it("deletes every chapter", () => {
      const chapters = [
        makeChapterData("chapter-1"),
        makeChapterData("chapter-2"),
      ];
      const book = makeBookData("book", {
        withPiece: false,
        childrenData: chapters,
      });

      service.deleteBook(book);

      expect(book.childrenData).toEqual([]);
      expect(pieceDataRepositoryPort.removeChapterData.mock.calls).toEqual(
        chapters.map((chapter) => [chapter])
      );
      expect(chapters.map((chapter) => chapter.piece)).toEqual([
        undefined,
        undefined,
      ]);
    });

    it("clears its piece, hiding its label instantly, forgetting and despawning it", () => {
      const book = makeBookData("book");
      const piece = book.piece;

      service.deleteBook(book);

      expect(book.piece).toBeUndefined();
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        piece,
        "Instant"
      );
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
    });
  });

  describe("deleteBooks", () => {
    it("deletes every book in the batch, in order", () => {
      const books = [
        makeBookData("book-1"),
        makeBookData("book-2"),
        makeBookData("book-3"),
      ];

      service.deleteBooks(books);

      expect(pieceDataRepositoryPort.removeBookData.mock.calls).toEqual(
        books.map((book) => [book])
      );
      expect(eventManger.emit.mock.calls).toEqual(
        books.map((book) => ["OnBookDelete", { dataId: book.id }])
      );
    });
  });

  describe("deleteChapter", () => {
    it("removes the chapter data from the repository without emitting any event", () => {
      const chapter = makeChapterData("chapter");

      service.deleteChapter(chapter);

      expect(
        pieceDataRepositoryPort.removeChapterData
      ).toHaveBeenCalledExactlyOnceWith(chapter);
      expect(eventManger.emit).not.toHaveBeenCalled();
      expect(pieceLifecycleEventPort.emit).not.toHaveBeenCalled();
    });

    it("deletes every verses bundle", () => {
      const bundles = [
        makeVersesBundleData("bundle-1"),
        makeVersesBundleData("bundle-2"),
      ];
      const chapter = makeChapterData("chapter", {
        withPiece: false,
        childrenData: bundles,
      });

      service.deleteChapter(chapter);

      expect(chapter.childrenData).toEqual([]);
      expect(
        versesBundleDataRepositoryPort.removeBundleData.mock.calls
      ).toEqual(bundles.map((bundle) => [bundle]));
      expect(bundles.map((bundle) => bundle.piece)).toEqual([
        undefined,
        undefined,
      ]);
    });

    it("clears its piece, hiding its label instantly, forgetting and despawning it", () => {
      const chapter = makeChapterData("chapter");
      const piece = chapter.piece;

      service.deleteChapter(chapter);

      expect(chapter.piece).toBeUndefined();
      expect(pieceLabelServicePort.hideLabel).toHaveBeenCalledExactlyOnceWith(
        piece,
        "Instant"
      );
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
    });

    it("skips the label hiding and the despawn if it has no piece", () => {
      const chapter = makeChapterData("chapter", { withPiece: false });

      service.deleteChapter(chapter);

      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
      expect(pieceHighlightServicePort.forgetPiece).not.toHaveBeenCalled();
      expect(stackPieceLifecycleAdapterPort.despawn).not.toHaveBeenCalled();
    });
  });

  describe("deleteChapters", () => {
    it("deletes every chapter in the batch, in order", () => {
      const chapters = [
        makeChapterData("chapter-1"),
        makeChapterData("chapter-2"),
        makeChapterData("chapter-3"),
      ];

      service.deleteChapters(chapters);

      expect(pieceDataRepositoryPort.removeChapterData.mock.calls).toEqual(
        chapters.map((chapter) => [chapter])
      );
      expect(stackPieceLifecycleAdapterPort.despawn.mock.calls).toEqual(
        chapters.map((chapter) => [
          { id: `${chapter.id}-piece`, type: "StackChapter" },
        ])
      );
    });
  });

  describe("deleteVersesBundle", () => {
    it("removes the bundle data from the repository and deletes every verse", () => {
      const verses = [makeVerseData("verse-1"), makeVerseData("verse-2")];
      const bundle = makeVersesBundleData("bundle", {
        verses,
        withPiece: false,
      });

      service.deleteVersesBundle(bundle);

      expect(
        versesBundleDataRepositoryPort.removeBundleData
      ).toHaveBeenCalledExactlyOnceWith(bundle);
      expect(bundle.verses).toEqual([]);
      expect(verseDataRepositoryPort.removeVerseData.mock.calls).toEqual(
        verses.map((verse) => [verse])
      );
      expect(verses.map((verse) => verse.piece)).toEqual([
        undefined,
        undefined,
      ]);
    });

    it("clears its piece, forgetting and despawning it without hiding any label", () => {
      const bundle = makeVersesBundleData("bundle");
      const piece = bundle.piece;

      service.deleteVersesBundle(bundle);

      expect(bundle.piece).toBeUndefined();
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
    });

    it("skips the despawn if it has no piece", () => {
      const bundle = makeVersesBundleData("bundle", { withPiece: false });

      service.deleteVersesBundle(bundle);

      expect(pieceHighlightServicePort.forgetPiece).not.toHaveBeenCalled();
      expect(stackPieceLifecycleAdapterPort.despawn).not.toHaveBeenCalled();
    });
  });

  describe("deleteVerse", () => {
    it("removes the verse data from the repository and clears its piece, forgetting and despawning it without hiding any label", () => {
      const verse = makeVerseData("verse");
      const piece = verse.piece;

      service.deleteVerse(verse);

      expect(
        verseDataRepositoryPort.removeVerseData
      ).toHaveBeenCalledExactlyOnceWith(verse);
      expect(verse.piece).toBeUndefined();
      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(pieceLabelServicePort.hideLabel).not.toHaveBeenCalled();
    });

    it("only removes the verse data if it has no piece", () => {
      const verse = makeVerseData("verse", { withPiece: false });

      service.deleteVerse(verse);

      expect(
        verseDataRepositoryPort.removeVerseData
      ).toHaveBeenCalledExactlyOnceWith(verse);
      expect(pieceHighlightServicePort.forgetPiece).not.toHaveBeenCalled();
      expect(stackPieceLifecycleAdapterPort.despawn).not.toHaveBeenCalled();
    });
  });

  describe("clearPiece", () => {
    it("forgets the piece highlight before despawning it", async () => {
      const piece = { id: "piece", type: "StackBook" as const };

      await expect(service.clearPiece(piece)).resolves.toBeUndefined();

      expect(
        pieceHighlightServicePort.forgetPiece
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        stackPieceLifecycleAdapterPort.despawn
      ).toHaveBeenCalledExactlyOnceWith(piece);
      expect(
        pieceHighlightServicePort.forgetPiece.mock.invocationCallOrder[0]
      ).toBeLessThan(
        stackPieceLifecycleAdapterPort.despawn.mock.invocationCallOrder[0]!
      );
    });
  });
});
