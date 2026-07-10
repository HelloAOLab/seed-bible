import { StackBookData } from "../../domain/entities/StackBookData";
import { StackChapterData } from "../../domain/entities/StackChapterData";
import { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import { StackSectionData } from "../../domain/entities/StackSectionData";
import { StackTestamentData } from "../../domain/entities/StackTestamentData";
import { StackBibleData } from "../../domain/entities/StackBibleData";
import type {
  PieceDataRepositoryPort,
  PieceLabelServicePort,
  StackPieceLifecycleAdapterPort,
  PieceLifecycleEventPort,
  ArrangementServicePort,
  IdGeneratorPort,
  ScriptureServicePort,
  StackStructureServicePort,
  VersesBundleDataRepositoryPort,
} from "../ports/pieceLifecycle";
import type {
  ChapterCreationParams,
  Piece,
  StackBookCreationParams,
  StackSectionCreationParams,
  StackTestamentCreationParams,
} from "../../domain/models/canvas";
import type { StackParentDataIds } from "../ports/pieces";
import type { BookInfo, ChapterInfo } from "../../domain/models/arrangement";
import { VersesBundleData } from "../../domain/entities/VersesBundleData";
import { VerseData } from "../../domain/entities/VerseData";
import { ShowSequencePacings } from "../../domain/models/label";
import type { PieceLifecycleServicePort as StackStructurePieceLifecycleServicePort } from "../ports/stackStructure";
import type { PieceLifecycleConfigProviderPort } from "../ports/out/PieceLifecycle";
import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";

interface PieceLifecycleServiceProps {
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  pieceLabelServicePort: PieceLabelServicePort;
  stackPieceLifecycleAdapterPort: StackPieceLifecycleAdapterPort;
  pieceLifecycleEventPort: PieceLifecycleEventPort;
  arrangementServicePort: ArrangementServicePort;
  idGenerator: IdGeneratorPort;
  scriptureServicePort: ScriptureServicePort;
  stackStructureServicePort: StackStructureServicePort;
  versesBundleDataRepositoryPort: VersesBundleDataRepositoryPort;
  configProviderPort: PieceLifecycleConfigProviderPort;
}

export class PieceLifecycleService
  implements StackStructurePieceLifecycleServicePort, PieceLifecycleServicePort
{
  #pieceDataRepositoryPort: PieceLifecycleServiceProps["pieceDataRepositoryPort"];
  #pieceLabelServicePort: PieceLifecycleServiceProps["pieceLabelServicePort"];
  #stackPieceLifecycleAdapterPort: PieceLifecycleServiceProps["stackPieceLifecycleAdapterPort"];
  #pieceLifecycleEventPort: PieceLifecycleServiceProps["pieceLifecycleEventPort"];
  #arrangementServicePort: PieceLifecycleServiceProps["arrangementServicePort"];
  #idGenerator: PieceLifecycleServiceProps["idGenerator"];
  #scriptureServicePort: PieceLifecycleServiceProps["scriptureServicePort"];
  #stackStructureServicePort: PieceLifecycleServiceProps["stackStructureServicePort"];
  #versesBundleDataRepositoryPort: PieceLifecycleServiceProps["versesBundleDataRepositoryPort"];
  #configProviderPort: PieceLifecycleServiceProps["configProviderPort"];

  constructor({
    pieceDataRepositoryPort,
    pieceLabelServicePort,
    stackPieceLifecycleAdapterPort,
    pieceLifecycleEventPort,
    arrangementServicePort,
    idGenerator,
    scriptureServicePort,
    stackStructureServicePort,
    versesBundleDataRepositoryPort,
    configProviderPort,
  }: PieceLifecycleServiceProps) {
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#stackPieceLifecycleAdapterPort = stackPieceLifecycleAdapterPort;
    this.#pieceLifecycleEventPort = pieceLifecycleEventPort;
    this.#arrangementServicePort = arrangementServicePort;
    this.#idGenerator = idGenerator;
    this.#scriptureServicePort = scriptureServicePort;
    this.#stackStructureServicePort = stackStructureServicePort;
    this.#versesBundleDataRepositoryPort = versesBundleDataRepositoryPort;
    this.#configProviderPort = configProviderPort;
  }

  createTestament({
    arrangementIndex,
    testamentIndex,
    bibleDataId,
    isHidden,
  }: {
    arrangementIndex: number;
    testamentIndex: number;
    bibleDataId?: StackBibleData["id"];
    isHidden?: boolean;
  }): StackTestamentData {
    const testamentInfo = this.#arrangementServicePort.getTestamentByIndices({
      arrangementIndex,
      testamentIndex,
    });

    if (!testamentInfo) {
      throw new Error(
        `PieceLifecycleService: testamentInfo not found at createTestament`
      );
    }

    const creationParams: StackTestamentCreationParams = {
      arrangementIndex,
      testamentIndex,
    };
    const parentDataIds: StackParentDataIds = { stackBibleId: bibleDataId };
    const testamentDataId = this.#idGenerator.getId();
    const sectionsData: (StackSectionData | StackSectionBookData)[] = [];
    for (
      let sectionIndex = 0;
      sectionIndex < testamentInfo.sections.length;
      sectionIndex++
    ) {
      const sectionData = this.createSection({
        arrangementIndex,
        testamentIndex,
        sectionIndex: Number(sectionIndex),
        isInsideBible: true,
        isInsideTestament: true,
        bibleDataId,
        testamentDataId,
        isHidden,
      });
      sectionsData.push(sectionData);
    }
    const testamentData = new StackTestamentData({
      pieceInfo: testamentInfo,
      id: testamentDataId,
      parentDataIds,
      isInsideBible: true,
      creationParams,
      childrenData: sectionsData,
    });

    this.#pieceDataRepositoryPort.addTestamentData(testamentData);
    return testamentData;
  }

  createSection({
    arrangementIndex,
    testamentIndex,
    sectionIndex,
    isInsideBible,
    isInsideTestament,
    bibleDataId,
    testamentDataId,
    isHidden = false,
  }: {
    arrangementIndex: number;
    testamentIndex: number;
    sectionIndex: number;
    isInsideBible: boolean;
    isInsideTestament: boolean;
    bibleDataId?: StackBibleData["id"];
    testamentDataId?: StackTestamentData["id"];
    isHidden?: boolean;
  }): StackSectionData | StackSectionBookData {
    const sectionInfo = this.#arrangementServicePort.getSectionByIndices({
      arrangementIndex,
      testamentIndex,
      sectionIndex,
    });

    if (!sectionInfo) {
      throw new Error(
        `PieceLifecycleService: sectionInfo not found at createSection`
      );
    }

    const amountOfChaptersInSection =
      this.#scriptureServicePort.getSectionChapterCount(sectionInfo.books);
    let data: StackSectionData | StackSectionBookData | undefined;
    const creationParams: StackSectionCreationParams = {
      arrangementIndex,
      testamentIndex,
      sectionIndex,
      amountOfChaptersInSection,
    };
    const parentDataIds: StackParentDataIds = {
      stackBibleId: bibleDataId,
      stackTestamentId: testamentDataId,
    };

    const sectionDataId = this.#idGenerator.getId();

    if (sectionInfo.books.length > 1) {
      const levels = this.#stackStructureServicePort.getSectionLevels(
        sectionInfo.books
      );
      const levelsLenght = levels.length;
      const booksDataArray: StackBookData[][] = [];
      const bookIndexMap = new Map(
        sectionInfo.books.map((book, i) => [book, i])
      );
      for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        const level = levels[levelIndex];
        if (!level) continue;
        const booksData: StackBookData[] = [];
        for (
          let bookLevelIndex = 0;
          bookLevelIndex < level.length;
          bookLevelIndex++
        ) {
          const bookInfo = level[bookLevelIndex];
          if (!bookInfo) continue;
          const bookIndex = bookIndexMap.get(bookInfo) ?? -1;
          const bookData = this.createBook({
            arrangementIndex,
            testamentIndex,
            sectionIndex,
            levelIndex,
            bookIndex,
            bookLevelIndex,
            levelsLenght,
            isInsideBible,
            isInsideTestament,
            isInsideSection: true,
            bibleDataId,
            testamentDataId,
            sectionDataId,
            isHidden,
          });
          booksData.push(bookData);
        }
        booksDataArray.push(booksData);
      }
      data = new StackSectionData({
        pieceInfo: sectionInfo,
        id: sectionDataId,
        parentDataIds,
        isInsideBible,
        isInsideTestament,
        creationParams,
        childrenData: booksDataArray,
      });
      this.#pieceDataRepositoryPort.addSectionData(data);
    } else {
      const pieceBookInfo = sectionInfo.books[0];
      if (pieceBookInfo) {
        const chaptersData = pieceBookInfo.chaptersVerseCount.map(
          (verseCount, index) =>
            this.createChapter({
              chapterInfo: { amountOfVerses: verseCount, number: index + 1 },
              isInsideBible: true,
              isInsideBook: true,
              bibleDataId,
              testamentDataId,
              sectionBookDataId: sectionDataId,
              isHidden,
              bookId: pieceBookInfo.bookId,
            })
        );
        data = new StackSectionBookData({
          pieceInfo: sectionInfo,
          pieceBookInfo,
          id: sectionDataId,
          parentDataIds,
          isInsideBible,
          isInsideTestament,
          creationParams,
          childrenData: chaptersData,
        });
        this.#pieceDataRepositoryPort.addSectionBookData(data);
      }
    }

    if (!data) {
      throw new Error(
        `PieceLifecycleService: data not defined at createSection`
      );
    }

    return data;
  }

  createBook({
    arrangementIndex,
    testamentIndex,
    sectionIndex,
    levelIndex,
    bookIndex,
    bookLevelIndex,
    levelsLenght,
    isInsideBible,
    isInsideTestament,
    isInsideSection,
    bibleDataId,
    testamentDataId,
    sectionDataId,
    isHidden = false,
  }: {
    arrangementIndex: number;
    testamentIndex: number;
    sectionIndex: number;
    levelIndex: number;
    bookIndex: number;
    bookLevelIndex: number;
    levelsLenght: number;
    isInsideBible: boolean;
    isInsideTestament: boolean;
    isInsideSection: boolean;
    bibleDataId?: string;
    testamentDataId?: string;
    sectionDataId?: string;
    isHidden?: boolean;
  }) {
    const bookInfo = this.#arrangementServicePort.getBookByIndices({
      arrangementIndex,
      testamentIndex,
      sectionIndex,
      bookIndex,
    });

    if (!bookInfo) {
      throw new Error(
        `PieceLifecycleService: bookInfo not found at createBook.`
      );
    }

    const parentDataIds: StackParentDataIds = {
      stackBibleId: bibleDataId,
      stackTestamentId: testamentDataId,
      stackSectionId: sectionDataId,
    };
    const creationParams: StackBookCreationParams = {
      arrangementIndex,
      testamentIndex,
      sectionIndex,
      levelIndex,
      bookIndex,
      bookLevelIndex,
      levelsLenght,
    };
    const bookDataId = this.#idGenerator.getId();

    const chaptersData = bookInfo.chaptersVerseCount.map(
      (amountOfVerses, index) =>
        this.createChapter({
          chapterInfo: { amountOfVerses, number: index + 1 },
          isInsideBible: true,
          isInsideBook: true,
          bibleDataId,
          testamentDataId,
          sectionDataId,
          bookDataId,
          isHidden,
          bookId: bookInfo.bookId,
        })
    );

    const bookData = new StackBookData({
      pieceInfo: bookInfo,
      id: bookDataId,
      isInsideBible,
      isInsideTestament,
      isInsideSection,
      parentDataIds,
      creationParams,
      childrenData: chaptersData,
    });
    this.#pieceDataRepositoryPort.addBookData(bookData);
    return bookData;
  }

  createChapter({
    chapterInfo,
    isInsideBible,
    isInsideBook,
    isHidden = false,
    bibleDataId,
    testamentDataId,
    sectionDataId,
    sectionBookDataId,
    bookDataId,
    bookId,
  }: {
    bibleDataId?: StackBibleData["id"];
    testamentDataId?: StackTestamentData["id"];
    sectionDataId?: StackSectionData["id"];
    sectionBookDataId?: StackSectionBookData["id"];
    bookDataId?: StackBookData["id"];
    isHidden?: boolean;
    isInsideBible: boolean;
    isInsideBook: boolean;
    chapterInfo: ChapterInfo;
    bookId: BookInfo["bookId"];
  }) {
    const parentDataIds: StackParentDataIds = {
      stackBibleId: bibleDataId,
      stackTestamentId: testamentDataId,
      stackSectionBookId: sectionBookDataId,
      stackSectionId: sectionDataId,
      stackBookId: bookDataId,
    };
    const creationParams: ChapterCreationParams = { bookId };

    const versesPerBundle = this.#configProviderPort.getVersesPerBundle();
    const bundlesCount = Math.ceil(
      chapterInfo.amountOfVerses / versesPerBundle
    );
    const childrenData: Array<VersesBundleData> = Array.from({
      length: bundlesCount,
    }).map((_, index) => {
      const start = versesPerBundle * index + 1;
      const versesCount = Math.min(
        chapterInfo.amountOfVerses - (start - 1),
        versesPerBundle
      );
      const bundle = this.createVerseBundle({
        start,
        count: versesCount,
        bookId,
        chapter: chapterInfo.number,
      });
      return bundle;
    });

    const chapterData = new StackChapterData({
      id: this.#idGenerator.getId(),
      pieceInfo: chapterInfo,
      parentDataIds,
      isInsideBible,
      isInsideBook,
      isHidden,
      creationParams,
      isSelected: false,
      childrenData,
    });
    this.#pieceDataRepositoryPort.addChapterData(chapterData);
    return chapterData;
  }

  createVerseBundle({
    start,
    count,
    bookId,
    chapter,
  }: {
    start: number;
    count: number;
    bookId: string;
    chapter: number;
  }): VersesBundleData {
    const bundleCreationParams = {
      start,
      count,
      bookId,
      chapter,
    };

    const verses: VerseData[] = Array.from({ length: count }).map(
      (_, index) => {
        return this.createVerse({
          ...bundleCreationParams,
          verseIndex: index,
        });
      }
    );

    const data = new VersesBundleData({
      creationParams: {
        start,
        count,
        bookId,
        chapter,
      },
      id: this.#idGenerator.getId(),
      verses,
    });

    this.#versesBundleDataRepositoryPort.addBundleData(data);

    return data;
  }

  createVerse({
    start,
    count,
    bookId,
    chapter,
    verseIndex,
  }: {
    start: number;
    count: number;
    bookId: string;
    chapter: number;
    verseIndex: number;
  }): VerseData {
    const data = new VerseData({
      id: this.#idGenerator.getId(),
      creationParams: {
        start,
        count,
        bookId,
        chapter,
        verseIndex,
      },
    });

    return data;
  }

  deleteTestament(testament: StackTestamentData) {
    this.#pieceDataRepositoryPort.removeTestamentData(testament);

    const children = testament.clearChildren();
    const piece = testament.clearPiece();

    if (piece) {
      this.#pieceLabelServicePort.hideLabel(piece, ShowSequencePacings.Instant);
      this.clearPiece(piece);
      this.#pieceLifecycleEventPort.emit("OnTestamentDelete", { piece }); // TODO: Wire this event to a StackInteractionManager to check if the deleted testament is the last interacted
    }

    for (const child of children) {
      if (child instanceof StackSectionData) this.deleteSection(child);
      else this.deleteSectionBook(child);
    }
  }

  deleteTestaments(testaments: StackTestamentData[]) {
    for (const testament of testaments) {
      this.deleteTestament(testament);
    }
  }

  deleteSection(section: StackSectionData) {
    this.#pieceDataRepositoryPort.removeSectionData(section);

    const children = section.clearChildren();
    const piece = section.clearPiece();
    const shadow = section.detachShadow();
    const flattenedChildren = children.flat();

    for (const child of flattenedChildren) {
      this.deleteBook(child);
    }

    if (piece) {
      this.#pieceLabelServicePort.hideLabel(piece, ShowSequencePacings.Instant);
      this.clearPiece(piece);
    }

    if (shadow) {
      this.#pieceLabelServicePort.hideLabel(
        shadow,
        ShowSequencePacings.Instant
      );
      this.clearPiece(shadow);
    }

    // TODO: Send OnSectionDelete event that will be listened by the StackInteractionManager to check if the deleted section is the last interacted
  }

  deleteSections(sections: StackSectionData[]) {
    for (const section of sections) {
      this.deleteSection(section);
    }
  }

  deleteSectionBook(sectionBook: StackSectionBookData) {
    this.#pieceDataRepositoryPort.removeSectionBookData(sectionBook);

    const children = sectionBook.clearChildren();
    const piece = sectionBook.clearPiece();

    for (const child of children) {
      this.deleteChapter(child);
    }

    if (piece) {
      this.#pieceLabelServicePort.hideLabel(piece, ShowSequencePacings.Instant);
      this.clearPiece(piece);
    }

    // TODO: Send OnSectionBookDelete event that will be listened by the StackInteractionManager to check if the deleted section book is the last interacted
  }

  deleteSectionBooks(sectionBooks: StackSectionBookData[]) {
    for (const sectionBook of sectionBooks) {
      this.deleteSectionBook(sectionBook);
    }
  }

  deleteBook(book: StackBookData) {
    this.#pieceDataRepositoryPort.removeBookData(book);

    const children = book.clearChildren();
    const piece = book.clearPiece();

    for (const child of children) {
      this.deleteChapter(child);
    }

    if (piece) {
      this.#pieceLabelServicePort.hideLabel(piece, ShowSequencePacings.Instant);
      this.clearPiece(piece);
    }

    // TODO: Send OnBookDelete event that will be listened by the StackInteractionManager to check if the deleted book is the last interacted
  }

  deleteBooks(books: StackBookData[]) {
    for (const book of books) {
      this.deleteBook(book);
    }
  }

  deleteChapter(chapter: StackChapterData) {
    this.#pieceDataRepositoryPort.removeChapterData(chapter);
    const piece = chapter.clearPiece();
    if (chapter.isOnTheGround && chapter.isSelected) {
      const bundles = chapter.clearChildren();
      for (const bundle of bundles) {
        this.deleteVersesBundle(bundle);
      }
    }
    if (piece) {
      this.#pieceLabelServicePort.hideLabel(piece, ShowSequencePacings.Instant);
      this.clearPiece(piece);
    }
  }

  deleteChapters(chapters: StackChapterData[]) {
    for (const chapter of chapters) {
      this.deleteChapter(chapter);
    }
  }

  deleteVersesBundle(bundle: VersesBundleData) {
    this.#versesBundleDataRepositoryPort.removeBundleData(bundle);
    const piece = bundle.clearPiece();
    const verses = bundle.clearVerses();
    for (const verse of verses) {
      this.deleteVerse(verse);
    }
    if (piece) {
      this.clearPiece(piece);
    }
  }

  deleteVerse(verse: VerseData) {
    const piece = verse.clearPiece();
    if (piece) {
      this.clearPiece(piece);
    }
  }

  async clearPiece(piece: Piece) {
    // TODO: Create a PieceHighlightService, add the logic for highlight and unhighlight delay store and management and replace the following references

    const { unhighlightDelayInfo } = await thisBot.GetUnhighlightDelayInfo({
      piece,
    });
    if (unhighlightDelayInfo) {
      await thisBot.ClearUnhighlightDelay({
        unhighlightDelayInfo,
      });
    }

    const isHighlighted = await thisBot.IsBiblePieceHighlighted({ piece });

    if (isHighlighted) {
      await thisBot.RemovePieceFromHighlightedList({ piece });
    }
    this.#stackPieceLifecycleAdapterPort.despawn(piece);
  }
}
