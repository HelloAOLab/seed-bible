import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import type { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import type {
  PieceDataRepositoryPort,
  PieceLabelServicePort,
  StackPieceLifecycleAdapter,
  PieceLifecycleEventPort,
  ArrangementServicePort,
  IdGeneratorPort,
  ScriptureServicePort,
} from "bibleStack.application.ports.pieceLifecycle";
import type {
  ParentDataIds,
  Piece,
  StackSectionCreationParams,
  StackTestamentCreationParams,
} from "bibleVizUtils.domain.models.canvas";
import type { StackBibleData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBibleData";

interface PieceLifecycleServiceProps {
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  pieceLabelServicePort: PieceLabelServicePort;
  stackPieceLifecycleAdapter: StackPieceLifecycleAdapter;
  pieceLifecycleEventPort: PieceLifecycleEventPort;
  arrangementServicePort: ArrangementServicePort;
  idGenerator: IdGeneratorPort;
  scriptureServicePort: ScriptureServicePort;
}

export class PieceManagementService {
  #pieceDataRepositoryPort: PieceLifecycleServiceProps["pieceDataRepositoryPort"];
  #pieceLabelServicePort: PieceLifecycleServiceProps["pieceLabelServicePort"];
  #stackPieceLifecycleAdapter: PieceLifecycleServiceProps["stackPieceLifecycleAdapter"];
  #pieceLifecycleEventPort: PieceLifecycleServiceProps["pieceLifecycleEventPort"];
  #arrangementServicePort: PieceLifecycleServiceProps["arrangementServicePort"];
  #idGenerator: PieceLifecycleServiceProps["idGenerator"];
  #scriptureServicePort: PieceLifecycleServiceProps["scriptureServicePort"];

  constructor({
    pieceDataRepositoryPort,
    pieceLabelServicePort,
    stackPieceLifecycleAdapter,
    pieceLifecycleEventPort,
    arrangementServicePort,
    idGenerator,
    scriptureServicePort,
  }: PieceLifecycleServiceProps) {
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#stackPieceLifecycleAdapter = stackPieceLifecycleAdapter;
    this.#pieceLifecycleEventPort = pieceLifecycleEventPort;
    this.#arrangementServicePort = arrangementServicePort;
    this.#idGenerator = idGenerator;
    this.#scriptureServicePort = scriptureServicePort;
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
    // Spawn the piece
    // Create the data
    // Add the data to the data repository

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
    const parentDataIds: ParentDataIds = { stackBibleId: bibleDataId };
    const testamentDataId = this.#idGenerator.getId();
    const sectionsData: StackSectionData[] = [];
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

    thisBot.vars.stackTestamentsData.push(testamentData);
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
  }): StackSectionData {
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
    const parentDataIds: ParentDataIds = {
      stackBibleId: bibleDataId,
      stackTestamentId: testamentDataId,
    };

    const sectionDataId = this.#idGenerator.getId();

    if (sectionInfo.books.length > 1) {
      const levels = stackService.getSectionLevels(sectionInfo.books);
      const levelsLenght = levels.length;
      const booksDataArray: StackBookData[][] = [];
      for (const level of levels) {
        const booksData: StackBookData[] = [];
        const levelIndex = levels.indexOf(level);
        for (const bookInfo of level) {
          const bookIndex = sectionInfo.books.indexOf(bookInfo);
          const bookLevelIndex = level.indexOf(bookInfo);
          const bookData: StackBookData = await thisBot.CreateBook({
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
      thisBot.vars.stackSectionsData.push(data);
    } else {
      const pieceBookInfo = sectionInfo.books[0];
      if (pieceBookInfo) {
        const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
          pieceBookInfo.commonName
        );
        if (!bookStaticInfo) {
          console.error("bookStaticInfo not found at CreateSection");
          return;
        }
        const chaptersData: StackChapterData[] = await Promise.all(
          bookStaticInfo.chaptersInfo.map((chapterInfo) => {
            return thisBot.CreateChapter({
              chapterInfo,
              isInsideBible: true,
              isInsideBook: true,
              bibleDataId,
              testamentDataId,
              sectionBookDataId: sectionDataId,
              isHidden,
              bookName: pieceBookInfo.commonName,
            });
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
        thisBot.vars.stackSectionBooksData.push(data);
      }
    }

    return data;
  }

  deleteTestament(testament: StackTestamentData) {
    this.#pieceDataRepositoryPort.removeTestamentData(testament);

    const children = testament.clearChildren();
    const piece = testament.clearPiece();

    if (piece) {
      this.clearPiece(piece, this.#stackPieceLifecycleAdapter.despawnTestament);
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
      this.clearPiece(piece);
    }

    if (shadow) {
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
    if (piece) {
      // TODO: Move every non casualos's built-in tag and mask to the chapter data
      if (piece.masks.isOnTheGround) {
        if (chapter.isSelected && piece.vars.chunksOfVerses?.length > 0) {
          piece.vars.chunksOfVerses.forEach((chunk) => {
            if (chunk.masks.isSelected && chunk.vars.verses?.length > 0) {
              chunk.vars.verses.flat().forEach((verse) => {
                this.#objectPoolerService.releaseObject({
                  obj: verse,
                  tag: verse.tags.poolTag,
                  dimension: thisBot.tags.desiredDimension,
                });
              });
              chunk.vars.verses = [];
            }
            this.#objectPoolerService.releaseObject({
              obj: chunk,
              tag: chunk.tags.poolTag,
              dimension: thisBot.tags.desiredDimension,
            });
          });
          piece.vars.chunksOfVerses = [];
        }
      }
      this.clearPiece(piece);
    }
  }

  deleteChapters(chapters: StackChapterData[]) {
    for (const chapter of chapters) {
      this.deleteChapter(chapter);
    }
  }

  async clearPiece(
    piece: Piece,
    despawnMethod:
      | StackPieceLifecycleAdapter["despawnBook"]
      | StackPieceLifecycleAdapter["despawnChapter"]
      | StackPieceLifecycleAdapter["despawnSection"]
      | StackPieceLifecycleAdapter["despawnTestament"]
  ) {
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

    this.#pieceLabelServicePort.despawnPieceLabel(piece);
    this.#objectPoolerService.releaseObject({
      obj: piece,
      tag: piece.tags.poolTag,
      dimension: thisBot.tags.desiredDimension,
    });
  }
}
