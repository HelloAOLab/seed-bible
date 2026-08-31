import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { ChapterNavigationService } from "../../.././../../../patterns/bible-stack/bible-stack/application/services/ChapterNavigationService";
import type { ReaderNavigationPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/ReaderNavigation";
import type {
  ChapterCreationParams,
  Piece,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/canvas";
import type { StackChapterData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackChapterData";
import type { PieceDataRepositoryPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/PieceDataRepository";
import type {
  BookInfo,
  BookPathIndices,
  ChapterInfo,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/arrangement";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";
import type { ArrangementServicePort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/in/Arrangement";

const getMockedChapterData = (
  pieceInfo: ChapterInfo,
  creationParams: ChapterCreationParams
): Mocked<StackChapterData> => {
  return {
    getPieceInfoProperty: vi.fn(
      (property: keyof ChapterInfo) => pieceInfo[property]
    ),
    getCreationParam: vi.fn(
      (param: keyof ChapterCreationParams) => creationParams[param]
    ),
  } as unknown as Mocked<StackChapterData>;
};

const mockedGetPieceDataFactory = (
  chapter: Piece<"StackChapter">,
  chapterData: StackChapterData
) => {
  return (
    piece: Piece<
      | "StackChapter"
      | "StackTestament"
      | "StackSection"
      | "StackSectionBook"
      | "StackBook"
    >
  ) => {
    if (piece.id === chapter.id && piece.type === chapter.type)
      return chapterData;

    return undefined;
  };
};

interface Command {
  type: "complete" | "subset";
}

interface CompleteCommand extends Command {
  creationParams: ChapterCreationParams;
  path: BookPathIndices;
  type: "complete";
}

interface SubsetCommand extends Command {
  creationParams: ChapterCreationParams;
  path: BookPathIndices;
  type: "subset";
  completeBookId: string;
  startIndex: number;
}

const mockedGetBookInfoByIndicesFactory = (
  command: CompleteCommand | SubsetCommand
) => {
  return (params: BookPathIndices) => {
    if (
      Object.keys(params).every((key) => {
        return (
          params[key as keyof BookPathIndices] ===
          command.path[key as keyof BookPathIndices]
        );
      })
    ) {
      return {
        bookId: command.creationParams.bookId,
        type: command.type,
        explodedViewPosition: { x: 0, y: 0, z: 0.75 },
        path: {
          ...command.path,
          arrangementName: `${command.creationParams.bookId}-arr-name`,
        },
        author: `${command.creationParams.bookId}-author`,
        chaptersVerseCount: [10, 20],
        relativeDateRange: { min: 1000, max: 2000 },
        numberOfChapters: 10,
        completeBookId:
          command.type === "subset" ? command.completeBookId : undefined,
        startIndex: command.type === "subset" ? command.startIndex : undefined,
        endIndex: 20,
      } as BookInfo;
    }
    return undefined;
  };
};

const mockedGetBookInfoPathByIdFactory = (
  creationParams: ChapterCreationParams,
  path: BookPathIndices
) => {
  return ({ id }: { id: string }) => {
    if (id === creationParams.bookId) {
      return {
        found: true,
        ...path,
      };
    }
    return {
      found: false,
      arrangementIndex: 0,
    };
  };
};

describe("bible-stack.application.services.ChapterNavigationService", () => {
  let service: ChapterNavigationService;
  let readerNavigationPort: Mocked<ReaderNavigationPort>;
  let pieceDataRepositoryPort: Mocked<PieceDataRepositoryPort>;
  let arrangementPort: Mocked<ArrangementServicePort>;
  const chapter: Piece<"StackChapter"> = {
    id: "chapter-id",
    type: "StackChapter",
  };
  const pieceInfo: ChapterInfo = {
    amountOfVerses: 10,
    number: 10,
  };
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    readerNavigationPort = {
      open: vi.fn(),
    };
    pieceDataRepositoryPort = {
      getPieceData: vi.fn(),
    } as unknown as Mocked<PieceDataRepositoryPort>;
    loggerPort = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    arrangementPort = {
      getBookInfoPathById: vi.fn(),
      getBookByIndices: vi.fn(),
    } as unknown as Mocked<ArrangementServicePort>;
    service = new ChapterNavigationService({
      readerNavigationPort,
      pieceDataRepositoryPort,
      loggerPort,
      arrangementPort,
    });
  });

  it("requests navigation to the infrastructure layer with navigation path from the found StackChapterData", () => {
    const creationParams: ChapterCreationParams = {
      bookId: "EXO",
    };
    const chapterData = getMockedChapterData(pieceInfo, creationParams);
    const path: BookPathIndices = {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      bookIndex: 2,
    };
    arrangementPort.getBookInfoPathById.mockImplementation(
      mockedGetBookInfoPathByIdFactory(creationParams, path)
    );
    arrangementPort.getBookByIndices.mockImplementation(
      mockedGetBookInfoByIndicesFactory({
        path,
        type: "complete",
        creationParams,
      })
    );
    pieceDataRepositoryPort.getPieceData.mockImplementation(
      mockedGetPieceDataFactory(chapter, chapterData)
    );

    service.openChapter(chapter);
    expect(arrangementPort.getBookInfoPathById).toHaveBeenCalledExactlyOnceWith(
      { id: creationParams.bookId }
    );
    expect(arrangementPort.getBookByIndices).toHaveBeenCalledExactlyOnceWith(
      path
    );
    expect(readerNavigationPort.open).toHaveBeenCalledExactlyOnceWith(
      creationParams.bookId,
      pieceInfo.number
    );
  });

  it("navigates with the complete bookId and chapter when the book is a subset", () => {
    const completeBookId = "PSA";
    const creationParams: ChapterCreationParams = {
      bookId: "2PS",
    };
    const path: BookPathIndices = {
      arrangementIndex: 0,
      testamentIndex: 1,
      sectionIndex: 2,
      bookIndex: 3,
    };
    const chapterData = getMockedChapterData(pieceInfo, creationParams);
    const startIndex = 10;

    pieceDataRepositoryPort.getPieceData.mockImplementation(
      mockedGetPieceDataFactory(chapter, chapterData)
    );
    arrangementPort.getBookInfoPathById.mockImplementation(
      mockedGetBookInfoPathByIdFactory(creationParams, path)
    );
    arrangementPort.getBookByIndices.mockImplementation(
      mockedGetBookInfoByIndicesFactory({
        creationParams,
        path,
        type: "subset",
        completeBookId,
        startIndex,
      })
    );

    service.openChapter(chapter);
    expect(readerNavigationPort.open).toHaveBeenCalledExactlyOnceWith(
      completeBookId,
      pieceInfo.number + startIndex
    );
  });

  it("no-op and logs if no StackChapterData found", () => {
    service.openChapter(chapter);
    expect(loggerPort.error).toHaveBeenCalledOnce();
    expect(readerNavigationPort.open).not.toHaveBeenCalled();
  });

  it("no-op and logs if no book info path found", () => {
    const creationParams: ChapterCreationParams = {
      bookId: "2PS",
    };
    const chapterData = getMockedChapterData(pieceInfo, creationParams);
    pieceDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
    arrangementPort.getBookInfoPathById.mockReturnValue({
      found: false,
      arrangementIndex: 0,
    });

    service.openChapter(chapter);
    expect(arrangementPort.getBookInfoPathById).toHaveBeenCalledOnce();
    expect(arrangementPort.getBookByIndices).not.toHaveBeenCalled();
    expect(loggerPort.error).toHaveBeenCalledOnce();
    expect(readerNavigationPort.open).not.toHaveBeenCalled();
  });

  it("no-op and logs if no book info found", () => {
    const creationParams: ChapterCreationParams = {
      bookId: "2PS",
    };
    const chapterData = getMockedChapterData(pieceInfo, creationParams);
    pieceDataRepositoryPort.getPieceData.mockReturnValue(chapterData);
    arrangementPort.getBookInfoPathById.mockReturnValue({
      found: true,
      arrangementIndex: 0,
      testamentIndex: 1,
      sectionIndex: 2,
      bookIndex: 3,
    });
    arrangementPort.getBookByIndices.mockReturnValue(undefined);

    service.openChapter(chapter);
    expect(arrangementPort.getBookInfoPathById).toHaveBeenCalledOnce();
    expect(arrangementPort.getBookByIndices).toHaveBeenCalledOnce();
    expect(loggerPort.error).toHaveBeenCalledOnce();
    expect(readerNavigationPort.open).not.toHaveBeenCalled();
  });
});
