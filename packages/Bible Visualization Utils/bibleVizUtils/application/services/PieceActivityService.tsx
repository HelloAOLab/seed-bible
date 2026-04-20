import type { Tab } from "bibleVizUtils.domain.models.seedBible";
import {
  BiblePiece,
  type BiblePieceType,
  type PieceInfo,
  type Piece,
  type ActivityIndicator,
} from "bibleVizUtils.domain.models.canvas";
import type { LabelDataStorePort } from "bibleVizUtils.domain.ports.piece";
import type {
  DataRegistryPort,
  IndicatorsRepositoryPort,
  ArrangementServicePort,
  ScriptureServicePort,
  UserPresenceServicePort,
  ActivityIndicatorsAdapterPort,
  ActivityNotificationAdapterPort,
  ActivityContainer,
  AnyShowIndicatorCommand,
  ActivityContainerType,
  UserColorStorePort,
  NotifiableContainer,
} from "bibleVizUtils.domain.ports.pieceActivity";
import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import type { PieceActivityServicePort } from "bibleVizUtils.domain.ports.label";

interface ServiceParams {
  dataRegistryPort: DataRegistryPort;
  indicatorsRepositoryPort: IndicatorsRepositoryPort;
  arrangementServicePort: ArrangementServicePort;
  scriptureServicePort: ScriptureServicePort;
  labelDataStorePort: LabelDataStorePort;
  maxIndicators?: number;
  userPresenceServicePort: UserPresenceServicePort;
  activityIndicatorsAdapterPort: ActivityIndicatorsAdapterPort;
  activityNotificationAdapterPort: ActivityNotificationAdapterPort;
  userColorStorePort: UserColorStorePort;
}

type ActivityStrategyType<T extends BiblePieceType = BiblePieceType> = (
  piece: Piece<T>,
  dataRegistryPort: DataRegistryPort
) => {
  key: string;
  typeOfPiece: BiblePieceType;
};

const testamentActivityStrategy: ActivityStrategyType<"StackTestament"> = (
  piece,
  dataRegistryPort
) => {
  const data = dataRegistryPort.getPieceData({
    pieceId: piece.id,
    pieceType: piece.type,
  });
  const key = data.getPieceInfoProperty("name");
  const typeOfPiece = BiblePiece.StackTestament;

  return { key, typeOfPiece };
};

const sectionActivityStrategy: ActivityStrategyType<
  "StackSection" | "StackSectionShadow"
> = (piece, dataRegistryPort) => {
  const data = dataRegistryPort.getPieceData({
    pieceId: piece.id,
    pieceType: piece.type,
  });
  const key = data.getPieceInfoProperty("name");
  const typeOfPiece = BiblePiece.StackSection;

  return { key, typeOfPiece };
};

const bookActivityStrategy: ActivityStrategyType<"StackBook" | "LayoutBook"> = (
  piece,
  dataRegistryPort
) => {
  const data = dataRegistryPort.getPieceData({
    pieceId: piece.id,
    pieceType: piece.type,
  });
  const key = data.getPieceInfoProperty("commonName");
  const typeOfPiece = BiblePiece.StackBook;

  return { key, typeOfPiece };
};

const sectionBookActivityStrategy: ActivityStrategyType<"StackSectionBook"> = (
  piece,
  dataRegistryPort
) => {
  const data = dataRegistryPort.getPieceData({
    pieceId: piece.id,
    pieceType: piece.type,
  });
  const key = data.getPieceBookInfoProperty("commonName");
  const typeOfPiece = BiblePiece.StackBook;

  return { key, typeOfPiece };
};

const chapterActivityStrategy: ActivityStrategyType<
  "StackChapter" | "LayoutChapter"
> = (piece, dataRegistryPort) => {
  const data = dataRegistryPort.getPieceData({
    pieceId: piece.id,
    pieceType: piece.type,
  });
  const key = `${data.getCreationParam("bookName")} ${data.getPieceInfoProperty("number")}`;
  const typeOfPiece = BiblePiece.StackChapter;

  return { key, typeOfPiece };
};

const activityStrategiesMap: {
  [K in BiblePieceType]?: ActivityStrategyType<K>;
} = {
  [BiblePiece.StackTestament]: testamentActivityStrategy,
  [BiblePiece.StackSection]: sectionActivityStrategy,
  [BiblePiece.StackSectionShadow]: sectionActivityStrategy,
  [BiblePiece.StackSectionBook]: sectionBookActivityStrategy,
  [BiblePiece.StackBook]: bookActivityStrategy,
  [BiblePiece.LayoutBook]: bookActivityStrategy,
  [BiblePiece.StackChapter]: chapterActivityStrategy,
  [BiblePiece.LayoutChapter]: chapterActivityStrategy,
};

interface IndicatorsStrategyParams<T extends BiblePieceType> {
  piece: Piece<T>;
  dataRegistryPort: DataRegistryPort;
  labelDataStorePort: LabelDataStorePort;
}

type IndicatorsStrategyType<T extends BiblePieceType = BiblePieceType> = (
  params: IndicatorsStrategyParams<T>
) => ActivityIndicator[];

const labelTransformerIndicatorsStrategy: IndicatorsStrategyType<
  "InfoLabelTransformer"
> = ({ piece, labelDataStorePort }) => {
  const labelData = labelDataStorePort.getDataByTransformerId(piece.id);

  if (!labelData) {
    throw new Error("PieceActivityService: labelData not found");
  }

  return labelData.activityIndicators;
};

const pieceIndicatorsStrategy: IndicatorsStrategyType<
  "StackChapter" | "LayoutBook" | "LayoutChapter"
> = ({ piece, dataRegistryPort }) => {
  const pieceData = dataRegistryPort.getPieceData({
    pieceType: piece.type,
    pieceId: piece.id,
  });

  if (!pieceData) return [];

  return pieceData.activityIndicators;
};

const indicatorsStrategiesMap: {
  [K in BiblePieceType]?: IndicatorsStrategyType<K>;
} = {
  [BiblePiece.InfoLabelTransformer]: labelTransformerIndicatorsStrategy,
  [BiblePiece.StackChapter]: pieceIndicatorsStrategy,
  [BiblePiece.LayoutBook]: pieceIndicatorsStrategy,
  [BiblePiece.LayoutChapter]: pieceIndicatorsStrategy,
};

export class PieceActivityService implements PieceActivityServicePort {
  #dataRegistryPort: DataRegistryPort;
  #arrangementServicePort: ArrangementServicePort;
  #scriptureServicePort: ScriptureServicePort;
  #labelDataStorePort: LabelDataStorePort;
  #maxIndicators: NonNullable<ServiceParams["maxIndicators"]>;
  #userPresenceServicePort: ServiceParams["userPresenceServicePort"];
  #activityIndicatorsAdapterPort: ServiceParams["activityIndicatorsAdapterPort"];
  #activityNotificationAdapterPort: ServiceParams["activityNotificationAdapterPort"];
  #userColorStorePort: ServiceParams["userColorStorePort"];

  constructor({
    dataRegistryPort,
    arrangementServicePort,
    scriptureServicePort,
    labelDataStorePort,
    userPresenceServicePort,
    maxIndicators = 4,
    activityIndicatorsAdapterPort,
    activityNotificationAdapterPort,
    userColorStorePort,
  }: ServiceParams) {
    this.#dataRegistryPort = dataRegistryPort;
    this.#arrangementServicePort = arrangementServicePort;
    this.#scriptureServicePort = scriptureServicePort;
    this.#labelDataStorePort = labelDataStorePort;
    this.#maxIndicators = maxIndicators;
    this.#userPresenceServicePort = userPresenceServicePort;
    this.#activityIndicatorsAdapterPort = activityIndicatorsAdapterPort;
    this.#activityNotificationAdapterPort = activityNotificationAdapterPort;
    this.#userColorStorePort = userColorStorePort;
  }

  getPieceActivity({
    piece,
    desiredArrangementIndex = this.#arrangementServicePort.getCurrentArrangementIndex(),
  }: {
    piece: Piece;
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
          this.#scriptureServicePort.convertCompletePsalmsToDivided({
            chapter,
          }));

      const { found, arrangementIndex, testamentIndex, sectionIndex } =
        this.#arrangementServicePort.getBookInfoPathByName({
          name: book,
          arrangementIndex: desiredArrangementIndex,
        });
      if (found) {
        const arrangement =
          this.#arrangementServicePort.getArrangementByIndex(arrangementIndex);
        if (!arrangement) {
          throw new Error(
            "PieceActivityService: arrangement not found at getPieceActivity"
          );
        }
        const testament = this.#arrangementServicePort.getTestamentByIndices({
          arrangementIndex,
          testamentIndex: testamentIndex as number,
        });
        if (!testament) {
          throw new Error(
            "PieceActivityService: testament not found at getPieceActivity"
          );
        }
        const testamentName = testament.name;
        const section = this.#arrangementServicePort.getSectionByIndices({
          arrangementIndex,
          testamentIndex: testamentIndex as number,
          sectionIndex: sectionIndex as number,
        });

        if (!section) {
          throw new Error(
            "PieceActivityService: section not found at getPieceActivity"
          );
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

    const strategy = activityStrategiesMap[piece.type] as
      | ActivityStrategyType<BiblePieceType>
      | undefined;

    if (!strategy) {
      console.error(
        // TODO: Create and implement a proper Logger port
        `PieceActivityService: strategy not found at getPieceActivity`
      );
      return [];
    }

    const { key, typeOfPiece } = strategy(piece, this.#dataRegistryPort);

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

  getActivityIndicatorsForPiece(piece: Piece): ActivityIndicator[] {
    const strategy = indicatorsStrategiesMap[piece.type] as
      | IndicatorsStrategyType<BiblePieceType>
      | undefined;

    if (!strategy) {
      console.error(
        // TODO: Create and implement a proper Logger port
        `PieceActivityService: strategy not found at getActivityIndicatorsForPiece`
      );
      return [];
    }

    const indicators = strategy({
      piece,
      dataRegistryPort: this.#dataRegistryPort,
      labelDataStorePort: this.#labelDataStorePort,
    });

    return indicators;
  }

  getActivityIndicatorByType(
    piece: Piece,
    type: ActivityIndicator["indicatorType"]
  ): Piece | undefined {
    const indicators = this.getActivityIndicatorsForPiece(piece);
    return indicators.find((indicator) => indicator.indicatorType === type);
  }

  getExtraActivityIndicatorsForPiece(piece: Piece): {
    extraIndicatorContent: Piece | undefined;
    extraIndicatorBackground: Piece | undefined;
  } {
    const extraIndicatorContent = this.getActivityIndicatorByType(
      piece,
      "extraContent"
    );
    const extraIndicatorBackground = this.getActivityIndicatorByType(
      piece,
      "extraBackground"
    );

    return { extraIndicatorContent, extraIndicatorBackground };
  }

  getPieceIndicatorByActivityIndex(
    piece: Piece,
    activityIndex: number
  ): ActivityIndicator | undefined {
    const indicators = this.getActivityIndicatorsForPiece(piece).filter(
      (indicator) => indicator.indicatorType === "regular"
    );
    return indicators.find((indicator) => indicator.index === activityIndex);
  }

  getDataActivityIndicatorByType(
    data: ActivityContainer,
    type: ActivityIndicator["indicatorType"]
  ): ActivityIndicator | undefined {
    const indicators = data.activityIndicators;
    return indicators.find((indicator) => indicator.indicatorType === type);
  }

  getDataExtraActivityIndicators(data: ActivityContainer): {
    extraIndicatorContent: ActivityIndicator | undefined;
    extraIndicatorBackground: ActivityIndicator | undefined;
  } {
    const extraIndicatorContent = this.getDataActivityIndicatorByType(
      data,
      "extraContent"
    );
    const extraIndicatorBackground = this.getDataActivityIndicatorByType(
      data,
      "extraBackground"
    );

    return { extraIndicatorContent, extraIndicatorBackground };
  }

  getDataIndicatorByActivityIndex(
    data: ActivityContainer,
    activityIndex: ActivityIndicator["index"]
  ): ActivityIndicator | undefined {
    const indicators = data.activityIndicators.filter(
      (indicator) => indicator.indicatorType === "regular"
    );
    return indicators.find((indicator) => indicator.index === activityIndex);
  }

  updateIndicators: (container: ActivityContainer) => ActivityIndicator[] = (
    container
  ) => {
    const userPresence = this.#userPresenceServicePort.getUserPresence();

    let activityPiece: Piece | undefined;
    let containerType: ActivityContainerType | undefined = undefined;
    if (container instanceof InfoLabelData) {
      activityPiece = container.owner;
      containerType = "label";
    } else if (container.piece) {
      activityPiece = container.piece;
      containerType = "piece";
    }

    if (!activityPiece || !containerType) {
      return [];
    }

    const pieceActivity = this.getPieceActivity({
      piece: activityPiece,
    });

    if (pieceActivity.length === 0) {
      const indicatorsToDelete = container.clearActivityIndicators();
      if (indicatorsToDelete) {
        this.#activityIndicatorsAdapterPort.hideIndicators(indicatorsToDelete);
      }
      return [];
    }

    let currIndicators = container.activityIndicators;
    const limit = Math.min(pieceActivity.length, this.#maxIndicators);
    for (const indicator of currIndicators) {
      if (indicator.index >= limit) {
        this.#activityIndicatorsAdapterPort.hideIndicator(indicator);
        container.removeActivityIndicator(indicator.id);
      }
    }

    currIndicators = container.activityIndicators;

    if (pieceActivity.length <= this.#maxIndicators) {
      const { extraIndicatorContent, extraIndicatorBackground } =
        this.getDataExtraActivityIndicators(container);
      if (extraIndicatorContent) {
        this.#activityIndicatorsAdapterPort.hideIndicator(
          extraIndicatorContent
        );
        container.removeActivityIndicator(extraIndicatorContent.id);
      }
      if (extraIndicatorBackground) {
        this.#activityIndicatorsAdapterPort.hideIndicator(
          extraIndicatorBackground
        );
        container.removeActivityIndicator(extraIndicatorBackground.id);
      }
    }

    const showIndicatorCommands: AnyShowIndicatorCommand[] = [];
    const ownUserPresence = this.#userPresenceServicePort.getOwnUserPresence();

    for (
      let activityIndex = 0;
      activityIndex < pieceActivity.length;
      activityIndex++
    ) {
      const activity = pieceActivity[activityIndex];
      if (!activity) {
        throw new Error(
          `PieceActivityService: activity not found at activityIndex: ${activityIndex}`
        );
      }
      if (activityIndex >= this.#maxIndicators) {
        const extraCount = pieceActivity.length - this.#maxIndicators;
        const { extraIndicatorContent, extraIndicatorBackground } =
          this.getDataExtraActivityIndicators(container);
        showIndicatorCommands.push({
          type: "extraContent",
          extraUsers: extraCount,
          index: activityIndex,
          indicator: extraIndicatorContent,
        });
        showIndicatorCommands.push({
          type: "extraBackground",
          index: activityIndex,
          indicator: extraIndicatorBackground,
        });
        break;
      } else {
        const isOwnUserActiveActivity =
          !!ownUserPresence && ownUserPresence.tabId === activity.id;

        const matchingPresence = Array.from(userPresence).find(
          ([, presenceData]) => {
            return activity.id === presenceData.tabId;
          }
        );
        const activityUserId = matchingPresence?.[0];

        const indicator = this.getDataIndicatorByActivityIndex(
          container,
          activityIndex
        );

        const color = this.#userColorStorePort.getUserColor({
          configId:
            activityUserId ??
            this.#userPresenceServicePort.getOwnUserConfigId(),
        });

        showIndicatorCommands.push({
          type: "regular",
          index: activityIndex,
          indicator,
          isOwnUserActiveActivity,
          color: color ?? "#ffffff",
        });
      }
    }

    const indicators = this.#activityIndicatorsAdapterPort.showIndicators({
      container,
      command: showIndicatorCommands,
    });
    for (const indicator of indicators) {
      container.addActivityIndicator(indicator);
    }

    this.#activityIndicatorsAdapterPort.updateIndicatorsPosition(container);

    return indicators;
  };

  updateAllIndicators() {
    const labelsData = this.#labelDataStorePort
      .getAllLabelsData()
      .filter((data) => !data.isHiding);
    const stackChaptersData =
      this.#dataRegistryPort.getAllPiecesDataByType("StackChapter");
    const layoutChaptersData =
      this.#dataRegistryPort.getAllPiecesDataByType("LayoutChapter");
    const layoutBooksData =
      this.#dataRegistryPort.getAllPiecesDataByType("LayoutBook");

    const containers: ActivityContainer[] = [
      ...labelsData,
      ...stackChaptersData,
      ...layoutChaptersData,
      ...layoutBooksData,
    ];

    for (const container of containers) {
      this.updateIndicators(container);
    }
  }

  updateNotification(container: NotifiableContainer) {
    if (!container.piece || !container.isActive) return;

    const userPresence = this.#userPresenceServicePort.getUserPresence();

    const ownUserPresence = this.#userPresenceServicePort.getOwnUserPresence();

    if (!ownUserPresence)
      throw new Error(
        `PieceActivityService: ownUserPresence not found at updateNotification`
      );

    const { tabId: ownUserCurrActivityId } = ownUserPresence;

    const pieceActivity = this.getPieceActivity({
      piece: container.piece,
    });
    const isPieceSelected = container.getIsSelectedForNotification();
    const direction = container.getNotificationDirection();
    const currNotification = container.detachActivityNotification();

    const shouldHide =
      pieceActivity.length === 0 ||
      isPieceSelected ||
      !container.isActive ||
      container.isPieceHighlighting() ||
      (container.isPieceHighlighted() && !container.isSelected);

    if (shouldHide && currNotification) {
      this.#activityNotificationAdapterPort.hideNotification(currNotification);
      return;
    }

    const isOwnUserInPiece =
      !!ownUserCurrActivityId &&
      pieceActivity.some((activity) => {
        return ownUserCurrActivityId === activity.id;
      });
    const activityCount = pieceActivity.length;

    const matchingPresence = Array.from(userPresence).find(
      ([, presenceData]) => {
        return pieceActivity[0]?.id === presenceData.tabId;
      }
    );
    const activityUserId = matchingPresence?.[0];
    const color = this.#userColorStorePort.getUserColor({
      configId:
        activityUserId ?? this.#userPresenceServicePort.getOwnUserConfigId(),
    });

    const newNotification =
      this.#activityNotificationAdapterPort.showNotification({
        isOwnUserInPiece,
        activityCount,
        color: color ?? "#ffffff",
        direction,
        notification: currNotification,
        container,
      });

    container.attachActivityNotification(newNotification);
    this.#activityNotificationAdapterPort.updateNotificationPosition(container);
    this.#activityNotificationAdapterPort.updateNotificationDirection(
      container
    );
  }

  updateAllNotifications() {
    const stackChaptersData =
      this.#dataRegistryPort.getAllPiecesDataByType("StackChapter");
    const layoutChaptersData =
      this.#dataRegistryPort.getAllPiecesDataByType("LayoutChapter");

    const containers: NotifiableContainer[] = [
      ...stackChaptersData,
      ...layoutChaptersData,
    ];

    for (const container of containers) {
      this.updateNotification(container);
    }
  }
}
