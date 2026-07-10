import type { StackStructureServicePort as PieceDragStackStructureServicePort } from "../ports/scripturePieceDrag";
import type { StackStructureServicePort as PieceLifecycleStackStructureServicePort } from "../ports/pieceLifecycle";
import { StackTestamentData } from "../../domain/entities/StackTestamentData";
import { StackSectionData } from "../../domain/entities/StackSectionData";
import { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import { StackBookData } from "../../domain/entities/StackBookData";
import { StackChapterData } from "../../domain/entities/StackChapterData";
import { StackBibleData } from "../../domain/entities/StackBibleData";
import type {
  PieceAdapterPort,
  PieceLifecycleServicePort,
  StackStructureEventPort,
} from "../ports/stackStructure";
import type { StackPieceDataMap } from "../ports/pieces";
import type { BookInfo } from "../../domain/models/arrangement";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  stackStructureEventPort: StackStructureEventPort;
}

type StrategyContext = {
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  bibleData: StackBibleData | undefined;
  testamentData: StackTestamentData | undefined;
  sectionData: StackSectionData | undefined;
  sectionBookData: StackSectionBookData | undefined;
  bookData: StackBookData | undefined;
};

type CopyStrategy<T extends StackPieceDataMap[keyof StackPieceDataMap]> = (
  params: { data: T } & StrategyContext
) => T;

type PieceStrategy<T extends StackPieceDataMap[keyof StackPieceDataMap]> = {
  copy: CopyStrategy<T>;
  replaceInParent: (params: { original: T; copy: T } & StrategyContext) => void;
};

const copyTestamentStrategy: CopyStrategy<
  StackPieceDataMap["StackTestament"]
> = ({ data, pieceLifecycleServicePort, bibleData }) => {
  return pieceLifecycleServicePort.createTestament({
    arrangementIndex: data.getArrangementIndex(),
    testamentIndex: data.getTestamentIndex(),
    bibleDataId: bibleData?.id,
    isHidden: true,
  });
};

const rawCopySectionStrategy: CopyStrategy<
  StackPieceDataMap["StackSection" | "StackSectionBook"]
> = ({ data, pieceLifecycleServicePort, bibleData, testamentData }) => {
  return pieceLifecycleServicePort.createSection({
    arrangementIndex: data.getArrangementIndex(),
    testamentIndex: data.getTestamentIndex(),
    sectionIndex: data.getSectionIndex(),
    isInsideBible: true,
    isInsideTestament: true,
    bibleDataId: bibleData?.id,
    testamentDataId: testamentData?.id,
  });
};

const copySectionStrategy: CopyStrategy<StackPieceDataMap["StackSection"]> = (
  params
) => {
  return rawCopySectionStrategy(params) as StackSectionData;
};

const copySectionBookStrategy: CopyStrategy<
  StackPieceDataMap["StackSectionBook"]
> = (params) => {
  return rawCopySectionStrategy(params) as StackSectionBookData;
};

const copyBookStrategy: CopyStrategy<StackPieceDataMap["StackBook"]> = ({
  data,
  pieceLifecycleServicePort,
  bibleData,
  testamentData,
  sectionData,
}) => {
  return pieceLifecycleServicePort.createBook({
    arrangementIndex: data.getArrangementIndex(),
    testamentIndex: data.getTestamentIndex(),
    sectionIndex: data.getSectionIndex(),
    levelIndex: data.getLevelIndex(),
    bookIndex: data.getBookIndex(),
    bookLevelIndex: data.getBookLevelIndex(),
    levelsLenght: data.getLevelsLength(),
    isInsideBible: true,
    isInsideTestament: true,
    isInsideSection: true,
    bibleDataId: bibleData?.id,
    testamentDataId: testamentData?.id,
    sectionDataId: sectionData?.id,
  });
};

const copyChapterStrategy: CopyStrategy<StackPieceDataMap["StackChapter"]> = ({
  data,
  pieceLifecycleServicePort,
  bibleData,
  testamentData,
  sectionData,
  sectionBookData,
  bookData,
}) => {
  return pieceLifecycleServicePort.createChapter({
    chapterInfo: data.pieceInfo,
    isInsideBible: true,
    isInsideBook: true,
    bibleDataId: bibleData?.id,
    testamentDataId: testamentData?.id,
    sectionDataId: sectionData?.id,
    sectionBookDataId: sectionBookData?.id,
    bookDataId: bookData?.id,
    isHidden: true,
    bookId: data.getCreationParam("bookId"),
  });
};

const pieceStrategiesMap: {
  [T in keyof StackPieceDataMap]: PieceStrategy<StackPieceDataMap[T]>;
} = {
  StackTestament: {
    copy: copyTestamentStrategy,
    replaceInParent: ({ original, copy, bibleData }) => {
      bibleData?.tryReplaceChild(original, copy);
    },
  },
  StackSection: {
    copy: copySectionStrategy,
    replaceInParent: ({ original, copy, testamentData }) => {
      testamentData?.tryReplaceChild(original, copy);
    },
  },
  StackSectionBook: {
    copy: copySectionBookStrategy,
    replaceInParent: ({ original, copy, testamentData }) => {
      testamentData?.tryReplaceChild(original, copy);
    },
  },
  StackBook: {
    copy: copyBookStrategy,
    replaceInParent: ({ original, copy, sectionData }) => {
      sectionData?.tryReplaceBook(original, copy);
    },
  },
  StackChapter: {
    copy: copyChapterStrategy,
    replaceInParent: ({ original, copy, sectionBookData, bookData }) => {
      (sectionBookData ?? bookData)?.tryReplaceChild(original, copy);
    },
  },
};

function runPieceStrategy<K extends keyof StackPieceDataMap>(
  key: K,
  data: StackPieceDataMap[K],
  context: StrategyContext
): StackPieceDataMap[K] {
  const strategy = pieceStrategiesMap[key] as PieceStrategy<
    StackPieceDataMap[K]
  >;
  const copy = strategy.copy({ data, ...context });
  strategy.replaceInParent({ original: data, copy, ...context });
  return copy;
}

export class StackStructureService
  implements
    PieceDragStackStructureServicePort,
    PieceLifecycleStackStructureServicePort
{
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];
  #stackStructureEventPort: ServiceParams["stackStructureEventPort"];

  constructor({
    pieceAdapterPort,
    pieceLifecycleServicePort,
    stackStructureEventPort,
  }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
    this.#stackStructureEventPort = stackStructureEventPort;
  }

  pullOutPieceFromParent: (params: {
    pieceData:
      | StackTestamentData
      | StackSectionData
      | StackSectionBookData
      | StackBookData
      | StackChapterData;
    bibleData: StackBibleData | undefined;
    testamentData: StackTestamentData | undefined;
    sectionData: StackSectionData | undefined;
    sectionBookData: StackSectionBookData | undefined;
    bookData: StackBookData | undefined;
  }) => void = ({
    pieceData,
    bibleData,
    testamentData,
    sectionData,
    sectionBookData,
    bookData,
  }) => {
    if (pieceData.piece) {
      this.#pieceAdapterPort.makePieceErasable(pieceData.piece);
    }

    runPieceStrategy(pieceData.type, pieceData, {
      pieceLifecycleServicePort: this.#pieceLifecycleServicePort,
      bibleData,
      testamentData,
      sectionData,
      sectionBookData,
      bookData,
    });
    pieceData.clearAllParentIds();

    this.#stackStructureEventPort.emit("OnStackPiecePulledOut");
  };

  getSectionLevels = (books: readonly BookInfo[]) => {
    const levels: BookInfo[][] = [];
    const groupsIncluded: number[] = [];
    for (const book of books) {
      if (book.group) {
        if (groupsIncluded.includes(book.group)) continue;

        const group: BookInfo[] = books.filter((currBook) => {
          return currBook.group === book.group;
        });
        levels.push(group);
        groupsIncluded.push(book.group);
      } else {
        levels.push([book]);
      }
    }
    return levels;
  };
}
