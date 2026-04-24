import type { StackStructureServicePort } from "bibleStack.application.ports.scripturePieceDrag";
import { StackTestamentData } from "bibleVizUtils.domain.entities.StackTestamentData";
import { StackSectionData } from "bibleVizUtils.domain.entities.StackSectionData";
import { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import { StackBibleData } from "bibleVizUtils.domain.entities.StackBibleData";
import type { PieceAdapterPort } from "bibleStack.application.ports.stackStructure";
import type { StackPieceDataMap } from "bibleStack.application.ports.pieces";

interface ServiceParams {
  pieceAdapterPort: PieceAdapterPort;
}

type CopyStrategy<T extends StackPieceDataMap[keyof StackPieceDataMap]> = (
  data: T
) => T;

const copyTestamentStrategy: CopyStrategy<
  StackPieceDataMap["StackTestament"]
> = () => {};

const copyStrategiesMap: {
  [T in keyof StackPieceDataMap]: CopyStrategy<StackPieceDataMap[T]>;
} = {};

export class StackStructureService implements StackStructureServicePort {
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];

  constructor({ pieceAdapterPort }: ServiceParams) {
    this.#pieceAdapterPort = pieceAdapterPort;
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

    const copyStrategy = copyStrategiesMap[pieceData.piece?.type];

    switch (true) {
      case pieceData instanceof StackTestamentData:
        {
          const testamentCopy = await CreateDataCopy(pieceData);
          pieceData.clearParentIds(["stackBibleId"]);
          bibleData.tryReplaceChild(pieceData, testamentCopy);
        }
        break;
      case pieceData instanceof StackSectionBookData:
      case pieceData instanceof StackSectionData:
        {
          const sectionCopy = await CreateDataCopy(pieceData);
          pieceData.clearParentIds(["stackBibleId", "stackTestamentId"]);
          testamentData?.tryReplaceChild(pieceData, sectionCopy);
        }
        break;
      case pieceData instanceof StackBookData:
        {
          const bookCopy = await CreateDataCopy(pieceData);
          pieceData.clearParentIds([
            "stackBibleId",
            "stackTestamentId",
            "stackSectionId",
          ]);
          sectionData?.tryReplaceBook(pieceData, bookCopy);
        }
        break;
      case pieceData instanceof StackChapterData:
        {
          const chapterCopy = await CreateDataCopy(pieceData);
          const actualParentData = sectionBookData ?? bookData;
          pieceData.clearParentIds([
            "stackBibleId",
            "stackTestamentId",
            "stackSectionId",
            "stackSectionBookId",
            "stackBookId",
          ]);

          if (actualParentData) {
            actualParentData.tryReplaceChild(pieceData, chapterCopy);
          }
        }
        break;
      default:
        break;
    }

    return Promise.all(shout("OnStackPiecePulledOut"));
  };

  async createDataCopy<
    K extends
      | StackTestamentData
      | StackSectionData
      | StackSectionBookData
      | StackBookData
      | StackChapterData,
  >(data: K): Promise<K> {
    if (data instanceof StackTestamentData) {
      return (await thisBot.CreateTestament({
        arrangementIndex: data.getArrangementIndex(),
        testamentIndex: data.getTestamentIndex(),
        bibleData,
        isHidden: true,
      })) as K;
    }

    if (
      data instanceof StackSectionData ||
      data instanceof StackSectionBookData
    ) {
      return (await thisBot.CreateSection({
        arrangementIndex: data.getArrangementIndex(),
        testamentIndex: data.getTestamentIndex(),
        sectionIndex: data.getSectionIndex(),
        isInsideBible: true,
        isInsideTestament: true,
        bibleData,
        testamentData,
      })) as K;
    }

    if (data instanceof StackBookData) {
      return (await thisBot.CreateBook({
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
        bibleData,
        testamentData,
        sectionData,
      })) as K;
    }

    if (data instanceof StackChapterData) {
      return (await thisBot.CreateChapter({
        chapterInfo: data.pieceInfo,
        isInsideBible: true,
        isInsideBook: true,
        bibleData,
        testamentData,
        sectionData,
        sectionBookData,
        bookData,
        isHidden: true,
      })) as K;
    }

    throw new Error(`CreateDataCopy: Data type not supported or unknown`);
  }
}
