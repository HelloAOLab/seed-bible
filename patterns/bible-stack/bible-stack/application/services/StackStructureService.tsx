import type { StackStructureServicePort as PieceDragStackStructureServicePort } from "../ports/in/StackStructure";
import { StackTestamentData } from "../../domain/entities/StackTestamentData";
import { StackSectionData } from "../../domain/entities/StackSectionData";
import { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import { StackBookData } from "../../domain/entities/StackBookData";
import { StackChapterData } from "../../domain/entities/StackChapterData";
import { StackBibleData } from "../../domain/entities/StackBibleData";
import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import type { PieceDataMap } from "../../domain/models/canvas";
import type { PiecePort } from "../ports/out/Piece";

interface ServiceParams {
  pieceAdapterPort: PiecePort;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  eventManagerPort: EventManagerPort<BibleStackEvents>;
}

type StrategyContext = {
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  bibleData: StackBibleData | undefined;
  testamentData: StackTestamentData | undefined;
  sectionData: StackSectionData | undefined;
  sectionBookData: StackSectionBookData | undefined;
  bookData: StackBookData | undefined;
};

type CopyStrategy<T extends PieceDataMap[keyof PieceDataMap]> = (
  params: { data: T } & StrategyContext
) => T;

type PieceStrategy<T extends PieceDataMap[keyof PieceDataMap]> = {
  copy: CopyStrategy<T>;
  replaceInParent: (params: { original: T; copy: T } & StrategyContext) => void;
};

const copyTestamentStrategy: CopyStrategy<PieceDataMap["StackTestament"]> = ({
  data,
  pieceLifecycleServicePort,
  bibleData,
}) => {
  return pieceLifecycleServicePort.createTestament({
    arrangementIndex: data.getArrangementIndex(),
    testamentIndex: data.getTestamentIndex(),
    bibleDataId: bibleData?.id,
    isHidden: true,
  });
};

const rawCopySectionStrategy: CopyStrategy<
  PieceDataMap["StackSection" | "StackSectionBook"]
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

const copySectionStrategy: CopyStrategy<PieceDataMap["StackSection"]> = (
  params
) => {
  return rawCopySectionStrategy(params) as StackSectionData;
};

const copySectionBookStrategy: CopyStrategy<
  PieceDataMap["StackSectionBook"]
> = (params) => {
  return rawCopySectionStrategy(params) as StackSectionBookData;
};

const copyBookStrategy: CopyStrategy<PieceDataMap["StackBook"]> = ({
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

const copyChapterStrategy: CopyStrategy<PieceDataMap["StackChapter"]> = ({
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
  [T in keyof PieceDataMap]: PieceStrategy<PieceDataMap[T]>;
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

function runPieceStrategy<K extends keyof PieceDataMap>(
  key: K,
  data: PieceDataMap[K],
  context: StrategyContext
): PieceDataMap[K] {
  const strategy = pieceStrategiesMap[key] as PieceStrategy<PieceDataMap[K]>;
  const copy = strategy.copy({ data, ...context });
  strategy.replaceInParent({ original: data, copy, ...context });
  return copy;
}

export class StackStructureService implements PieceDragStackStructureServicePort {
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];
  #eventManagerPort: ServiceParams["eventManagerPort"];

  constructor({
    pieceAdapterPort,
    pieceLifecycleServicePort,
    eventManagerPort,
  }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
    this.#eventManagerPort = eventManagerPort;
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

    this.#eventManagerPort.emit("OnStackPiecePulledOut");
  };
}
