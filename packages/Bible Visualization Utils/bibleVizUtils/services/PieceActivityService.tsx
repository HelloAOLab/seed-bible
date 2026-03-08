import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import type { Tab } from "bibleVizUtils.models.seedBible.models";
import type { PieceInfo } from "bibleVizUtils.models.canvas.models";
import {
  BiblePiece,
  type BiblePieceType,
} from "bibleVizUtils.models.canvas.models";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas.models";
import type {
  ArrangementInfo,
  TestamentInfo,
  SectionInfo,
} from "bibleVizUtils.data.BibleVizDataRepository";
import type { DividedPsalm } from "bibleVizUtils.services.ScriptureService";
import type {
  TestamentPathIndices,
  SectionPathIndices,
} from "bibleVizUtils.services.ArrangementService";

interface DataRegistry {
  getPieceData: (piece: Bot) => { id: string };
}

interface IndicatorsRepository {
  getIndicatorsByPieceId: (pieceDataId: string) => Bot[];
}

interface ArrangementService {
  getCurrentArrangementIndex: () => number;
  getArrangementByIndex: (index: number) => ArrangementInfo | undefined;
  getTestamentByIndices: (
    path: TestamentPathIndices
  ) => TestamentInfo | undefined;
  getSectionByIndices: (path: SectionPathIndices) => SectionInfo | undefined;
  getBookInfoPathByName: (params: {
    name: string;
    arrangementIndex?: number | undefined;
  }) => {
    found: boolean;
    arrangementIndex: number;
    testamentIndex: number | undefined;
    sectionIndex: number | undefined;
    bookIndex: number | undefined;
  };
}

interface ScriptureService {
  convertCompletePsalmsToDivided: (params: { chapter: number }) => DividedPsalm;
}

interface ServiceParams {
  dataRegistry: DataRegistry;
  indicatorsRepository: IndicatorsRepository;
  arrangementService: ArrangementService;
  scriptureService: ScriptureService;
}

type ActivityStrategyType = (piece: Bot) => {
  key: string;
  typeOfPiece: BiblePieceType;
};

const testamentActivityStrategy: ActivityStrategyType = (piece) => {
  const key = piece.tags.testamentName;
  const typeOfPiece = BiblePiece.StackTestament;

  return { key, typeOfPiece };
};

const sectionActivityStrategy: ActivityStrategyType = (piece) => {
  const key = piece.tags.sectionName;
  const typeOfPiece = BiblePiece.StackSection;

  return { key, typeOfPiece };
};

const bookActivityStrategy: ActivityStrategyType = (piece) => {
  const key = piece.tags.bookName;
  const typeOfPiece = BiblePiece.StackBook;

  return { key, typeOfPiece };
};

const chapterActivityStrategy: ActivityStrategyType = (piece) => {
  const key = `${piece.tags.parentBookName} ${piece.tags.chapterNumber}`;
  const typeOfPiece = BiblePiece.StackChapter;

  return { key, typeOfPiece };
};

const activityStrategiesMap: Record<string, ActivityStrategyType> = {
  [BiblePiece.StackTestament]: testamentActivityStrategy,
  [BiblePiece.StackSection]: sectionActivityStrategy,
  [BiblePiece.StackSectionShadow]: sectionActivityStrategy,
  [BiblePiece.StackSectionBook]: bookActivityStrategy,
  [BiblePiece.StackBook]: bookActivityStrategy,
  [BiblePiece.LayoutBook]: bookActivityStrategy,
  [BiblePiece.StackChapter]: chapterActivityStrategy,
  [BiblePiece.LayoutChapter]: chapterActivityStrategy,
};

interface IndicatorsStrategyParams {
  piece: Bot;
  dataRegistry: DataRegistry;
  indicatorsRepository: IndicatorsRepository;
}

type IndicatorsStrategyType = (params: IndicatorsStrategyParams) => Bot[];

const labelTransformerIndicatorsStrategy: IndicatorsStrategyType = ({
  piece,
}) => {
  const indicators = piece.GetLabelElements().infoLabelUsersColor as Bot[];

  return indicators;
};

const pieceIndicatorsStrategy: IndicatorsStrategyType = ({
  piece,
  dataRegistry,
  indicatorsRepository,
}) => {
  const pieceData = dataRegistry.getPieceData(piece);

  if (!pieceData) return [];

  return indicatorsRepository.getIndicatorsByPieceId(pieceData.id);
};

const indicatorsStrategiesMap: Record<string, IndicatorsStrategyType> = {
  [ObjectPoolTags.InfoLabelTransformer]: labelTransformerIndicatorsStrategy,
  [ObjectPoolTags.StackChapter]: pieceIndicatorsStrategy,
  [ObjectPoolTags.LayoutBook]: pieceIndicatorsStrategy,
  [ObjectPoolTags.LayoutChapter]: pieceIndicatorsStrategy,
};

export class PieceActivityService {
  #dataRegistry: DataRegistry;
  #indicatorsRepository: IndicatorsRepository;
  #arrangementService: ArrangementService;
  #scriptureService: ScriptureService;

  constructor({
    dataRegistry,
    indicatorsRepository,
    arrangementService,
    scriptureService,
  }: ServiceParams) {
    this.#dataRegistry = dataRegistry;
    this.#indicatorsRepository = indicatorsRepository;
    this.#arrangementService = arrangementService;
    this.#scriptureService = scriptureService;
  }

  getPieceActivity({
    piece,
    desiredArrangementIndex = this.#arrangementService.getCurrentArrangementIndex(),
  }: {
    piece: Bot;
    desiredArrangementIndex?: number;
  }) {
    const tabs: Tab[] = []; // TODO: Obtain my tabs
    const remoteTabs: Tab[] = []; // TODO: Obtain remote users tabs
    const allTabs: Tab[] = [...tabs, ...remoteTabs];
    const tabsPathMap: Map<Tab, [PieceInfo, PieceInfo, PieceInfo, PieceInfo]> =
      new Map();

    for (const tab of allTabs) {
      let { book, chapter } = tab.data;

      if (book === "Psalms")
        ({ book, chapter } =
          this.#scriptureService.convertCompletePsalmsToDivided({
            chapter,
          }));

      const { found, arrangementIndex, testamentIndex, sectionIndex } =
        this.#arrangementService.getBookInfoPathByName({
          name: book,
          arrangementIndex: desiredArrangementIndex,
        });
      if (found) {
        const arrangement =
          this.#arrangementService.getArrangementByIndex(arrangementIndex);
        if (!arrangement) {
          console.error(
            `arrangement not found at PieceActivityService.getPieceActivity`
          );
          continue;
        }
        const testament = this.#arrangementService.getTestamentByIndices({
          arrangementIndex,
          testamentIndex: testamentIndex as number,
        });
        if (!testament) {
          console.error(
            `testament not found at PieceActivityService.getPieceActivity`
          );
          continue;
        }
        const testamentName = testament.name;
        const section = this.#arrangementService.getSectionByIndices({
          arrangementIndex,
          testamentIndex: testamentIndex as number,
          sectionIndex: sectionIndex as number,
        });

        if (!section) {
          console.error(
            `section not found at PieceActivityService.getPieceActivity`
          );
          continue;
        }

        const sectionName = section.name;
        const path: [PieceInfo, PieceInfo, PieceInfo, PieceInfo] = [
          {
            typeOfPiece: BiblePiece.StackTestament,
            key: testamentName,
          },
          {
            typeOfPiece: BiblePiece.StackSection,
            key: sectionName,
          },
          {
            typeOfPiece: BiblePiece.StackBook,
            key: book,
          },
          {
            typeOfPiece: BiblePiece.StackChapter,
            key: `${book} ${chapter}`,
          },
        ];

        tabsPathMap.set(tab, path);
      }
    }

    const strategy = activityStrategiesMap[piece.tags.typeOfPiece];

    if (!strategy) {
      console.error(
        `strategy not found at PieceActivityService.getPieceActivity`
      );
      return [];
    }

    const { key, typeOfPiece } = strategy(piece);

    const activity = allTabs.filter((tab) => {
      const tabPath = tabsPathMap.get(tab);

      return tabPath?.some((pieceInfo) => {
        return (
          typeOfPiece &&
          pieceInfo.typeOfPiece === typeOfPiece &&
          key &&
          pieceInfo.key === key
        );
      });
    });

    return activity;
  }

  getActivityIndicatorsForPiece(piece: Bot): Bot[] {
    const strategy = indicatorsStrategiesMap[piece.tags.poolTag];

    if (!strategy) {
      console.error(
        `strategy not found at PieceActivityService.getActivityIndicatorsForPiece`
      );
      return [];
    }

    const indicators = strategy({
      piece,
      dataRegistry: this.#dataRegistry,
      indicatorsRepository: this.#indicatorsRepository,
    });

    return indicators;
  }

  getActivityIndicatorByTag(
    piece: Bot,
    tag: string,
    value: any
  ): Bot | undefined {
    const indicators = this.getActivityIndicatorsForPiece(piece);
    return indicators.find((indicator) => indicator.tags[tag] === value);
  }

  getExtraActivityIndicatorsForPiece(piece: Bot): {
    extraIndicatorContent: Bot | undefined;
    extraIndicatorBackground: Bot | undefined;
  } {
    const extraIndicatorContent = this.getActivityIndicatorByTag(
      piece,
      "isExtraContent",
      true
    );
    const extraIndicatorBackground = this.getActivityIndicatorByTag(
      piece,
      "isExtraBackground",
      true
    );

    return { extraIndicatorContent, extraIndicatorBackground };
  }

  getPieceIndicatorByActivityIndex(
    piece: Bot,
    activityIndex: number
  ): Bot | undefined {
    const indicator = this.getActivityIndicatorByTag(
      piece,
      "activityIndex",
      activityIndex
    );
    return indicator;
  }
}
