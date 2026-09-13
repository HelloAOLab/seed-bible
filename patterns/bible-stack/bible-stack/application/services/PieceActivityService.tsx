import {
  BiblePieces,
  type BiblePiece,
  type PieceInfo,
  type Piece,
  type ActivityIndicatorType,
  type ActivityContainerPieceType,
} from "../../domain/models/canvas";
import { ActivityIndicatorData } from "../../domain/entities/ActivityIndicatorData";
import { HighlightStates } from "../../domain/models/highlight";
import type { LabelDataStorePort } from "../ports/out/PieceActivity";
import type {
  DataRegistryPort,
  ActivityIndicatorsAdapterPort,
  ActivityIndicatorLifecyclePort,
  ActivityNotificationAdapterPort,
  ActivityContainer,
  AnyShowIndicatorCommand,
  ActivityContainerType,
  IdGeneratorPort,
  NotifiableContainer,
} from "../ports/out/PieceActivity";
import { InfoLabelData } from "../../domain/entities/InfoLabelData";
import type { LoggerPort } from "../ports/in/Logger";
import type { PieceActivityServicePort } from "../ports/in/PieceActivity";
import type { PieceTypeMap } from "../../domain/models/pieces";
import type { ArrangementServicePort } from "../ports/in/Arrangement";
import type { UserPresencePort } from "../ports/in/UserPresence";
import type { ReadingInstance } from "../../domain/models/userPresence";
import type { UserIdentityPort } from "../ports/out/UserIdentity";
import type { BaseEventManager } from "./BaseEventManager";
import type { BibleStackEvents } from "../../domain/models/events";

interface ServiceParams {
  dataRegistryPort: DataRegistryPort;
  arrangementServicePort: ArrangementServicePort;
  labelDataStorePort: LabelDataStorePort;
  maxIndicators?: number;
  userPresenceServicePort: UserPresencePort;
  // readingInstanceProviderPort: ReadingInstanceProviderPort;
  activityIndicatorsAdapterPort: ActivityIndicatorsAdapterPort;
  activityIndicatorLifecyclePort: ActivityIndicatorLifecyclePort;
  activityNotificationAdapterPort: ActivityNotificationAdapterPort;
  userIdentityStorePort: UserIdentityPort;
  idGeneratorPort: IdGeneratorPort;
  loggerPort: LoggerPort;
  eventBus: BaseEventManager<BibleStackEvents>;
}

type ActivityStrategyType<T extends BiblePiece = BiblePiece> = (
  piece: PieceTypeMap[T],
  dataRegistryPort: DataRegistryPort
) => {
  key: string;
  typeOfPiece: BiblePiece;
};

const testamentActivityStrategy: ActivityStrategyType<"StackTestament"> = (
  piece,
  dataRegistryPort
) => {
  const data = dataRegistryPort.getPieceData(piece);
  if (!data) {
    throw new Error(
      "PieceActvityService: data not found at testamentActivityStrategy"
    );
  }
  const key = data.getPieceInfoProperty("name");
  const typeOfPiece = BiblePieces.StackTestament;

  return { key, typeOfPiece };
};

const sectionActivityStrategy: ActivityStrategyType<
  "StackSection" | "StackSectionShadow"
> = (piece, dataRegistryPort) => {
  const data =
    piece.type === "StackSection"
      ? dataRegistryPort.getPieceData(piece)
      : dataRegistryPort.getDataById({
          type: "StackSection",
          id: piece.sectionDataId,
        });

  if (!data) {
    throw new Error(
      "PieceActivityService: data not found at sectionActivityStrategy"
    );
  }
  const key = data.getPieceInfoProperty("name");
  const typeOfPiece = BiblePieces.StackSection;

  return { key, typeOfPiece };
};

const bookActivityStrategy: ActivityStrategyType<"StackBook"> = (
  piece,
  dataRegistryPort
) => {
  const data = dataRegistryPort.getPieceData(piece);

  if (!data) {
    throw new Error(
      "PieceActivityService: data not found at bookActivityStrategy"
    );
  }
  const key = data.getPieceInfoProperty("bookId");
  const typeOfPiece = BiblePieces.StackBook;

  return { key, typeOfPiece };
};

const sectionBookActivityStrategy: ActivityStrategyType<"StackSectionBook"> = (
  piece,
  dataRegistryPort
) => {
  const data = dataRegistryPort.getPieceData(piece);

  if (!data) {
    throw new Error(
      "PieceActivityService: data not found at sectionBookActivityStrategy"
    );
  }
  const key = data.getPieceBookInfoProperty("bookId");
  const typeOfPiece = BiblePieces.StackBook;

  return { key, typeOfPiece };
};

const chapterActivityStrategy: ActivityStrategyType<"StackChapter"> = (
  piece,
  dataRegistryPort
) => {
  const data = dataRegistryPort.getPieceData(piece);

  if (!data) {
    throw new Error(
      "PieceActivityService: data not found at chapterActivityStrategy"
    );
  }
  const key = `${data.getCreationParam("bookId")} ${data.getPieceInfoProperty("number")}`;
  const typeOfPiece = BiblePieces.StackChapter;

  return { key, typeOfPiece };
};

const activityStrategiesMap: {
  [K in BiblePiece]?: ActivityStrategyType<K>;
} = {
  [BiblePieces.StackTestament]: testamentActivityStrategy,
  [BiblePieces.StackSection]: sectionActivityStrategy,
  [BiblePieces.StackSectionShadow]: sectionActivityStrategy,
  [BiblePieces.StackSectionBook]: sectionBookActivityStrategy,
  [BiblePieces.StackBook]: bookActivityStrategy,
  [BiblePieces.StackChapter]: chapterActivityStrategy,
};

interface IndicatorsStrategyParams<T extends BiblePiece> {
  piece: Piece<T>;
  dataRegistryPort: DataRegistryPort;
  labelDataStorePort: LabelDataStorePort;
}

type IndicatorsStrategyType<T extends BiblePiece = BiblePiece> = (
  params: IndicatorsStrategyParams<T>
) => ActivityIndicatorData[];

const labelTransformerIndicatorsStrategy: IndicatorsStrategyType<
  "InfoLabelTransformer"
> = ({ piece, labelDataStorePort }) => {
  const labelData = labelDataStorePort.getDataByTransformerId(piece.id);

  if (!labelData) {
    throw new Error("PieceActivityService: labelData not found");
  }

  return labelData.activityIndicators;
};

const pieceIndicatorsStrategy: IndicatorsStrategyType<"StackChapter"> = ({
  piece,
  dataRegistryPort,
}) => {
  const pieceData = dataRegistryPort.getPieceData(piece);

  if (!pieceData) return [];

  return pieceData.activityIndicators;
};

const indicatorsStrategiesMap: {
  [K in BiblePiece]?: IndicatorsStrategyType<K>;
} = {
  [BiblePieces.InfoLabelTransformer]: labelTransformerIndicatorsStrategy,
  [BiblePieces.StackChapter]: pieceIndicatorsStrategy,
};

export class PieceActivityService implements PieceActivityServicePort {
  #dataRegistryPort: DataRegistryPort;
  #arrangementServicePort: ArrangementServicePort;
  #labelDataStorePort: LabelDataStorePort;
  #maxIndicators: NonNullable<ServiceParams["maxIndicators"]>;
  #userPresenceServicePort: ServiceParams["userPresenceServicePort"];
  #activityIndicatorsAdapterPort: ServiceParams["activityIndicatorsAdapterPort"];
  #activityIndicatorLifecyclePort: ServiceParams["activityIndicatorLifecyclePort"];
  #activityNotificationAdapterPort: ServiceParams["activityNotificationAdapterPort"];
  #userColorStorePort: ServiceParams["userIdentityStorePort"];
  #idGeneratorPort: ServiceParams["idGeneratorPort"];
  #loggerPort: LoggerPort;
  #eventBus: ServiceParams["eventBus"];

  constructor({
    dataRegistryPort,
    arrangementServicePort,
    labelDataStorePort,
    userPresenceServicePort,
    maxIndicators = 4,
    activityIndicatorsAdapterPort,
    activityIndicatorLifecyclePort,
    activityNotificationAdapterPort,
    userIdentityStorePort,
    idGeneratorPort,
    loggerPort,
    eventBus,
  }: ServiceParams) {
    this.#dataRegistryPort = dataRegistryPort;
    this.#arrangementServicePort = arrangementServicePort;
    this.#labelDataStorePort = labelDataStorePort;
    this.#maxIndicators = maxIndicators;
    this.#userPresenceServicePort = userPresenceServicePort;
    this.#activityIndicatorsAdapterPort = activityIndicatorsAdapterPort;
    this.#activityIndicatorLifecyclePort = activityIndicatorLifecyclePort;
    this.#activityNotificationAdapterPort = activityNotificationAdapterPort;
    this.#userColorStorePort = userIdentityStorePort;
    this.#idGeneratorPort = idGeneratorPort;
    this.#loggerPort = loggerPort;
    this.#eventBus = eventBus;

    this.#eventBus.subscribe("OnUserPresenceUpdated", () => {
      this.updateAllIndicators();
      this.updateAllNotifications();
    });
  }

  getPieceActivity({ piece }: { piece: Piece }) {
    const readingInstances: ReadingInstance[] =
      this.#userPresenceServicePort.getOwnUserPresence() ?? [];
    const remoteReadingInstances =
      this.#userPresenceServicePort.getRemotesUserPresnece();
    const allReadingInstances: ReadingInstance[] = [
      ...readingInstances,
      ...[...remoteReadingInstances.values()].flat(),
    ];
    const instancePathMap: Map<
      ReadingInstance,
      [PieceInfo, PieceInfo, PieceInfo, PieceInfo]
    > = new Map();

    for (const readingInstance of allReadingInstances) {
      const { bookId, chapter } = readingInstance;

      let pathBookId = bookId;
      let pathChapter = chapter;
      let { found, testamentIndex, sectionIndex, arrangementIndex } =
        this.#arrangementServicePort.getBookInfoPathById({
          id: bookId,
        });
      if (!found) {
        const bookSubset =
          this.#arrangementServicePort.getBookSubsetByCompleteId({
            id: bookId,
            chapterNumber: chapter,
          });
        if (bookSubset) {
          ({ found, testamentIndex, sectionIndex, arrangementIndex } =
            this.#arrangementServicePort.getBookInfoPathById({
              id: bookSubset.bookId,
            }));
          pathBookId = bookSubset.bookId;
          pathChapter = chapter - bookSubset.startIndex;
        }
      }
      if (found) {
        const testament = this.#arrangementServicePort.getTestamentByIndices({
          testamentIndex: testamentIndex as number,
          arrangementIndex: arrangementIndex as number,
        });
        if (!testament) {
          throw new Error(
            "PieceActivityService: testament not found at getPieceActivity"
          );
        }
        const testamentName = testament.name;
        const section = this.#arrangementServicePort.getSectionByIndices({
          arrangementIndex: arrangementIndex as number,
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
            typeOfPiece: BiblePieces.StackTestament,
            key: testamentName,
          },
          {
            typeOfPiece: BiblePieces.StackSection,
            key: sectionName,
          },
          {
            typeOfPiece: BiblePieces.StackBook,
            key: pathBookId,
          },
          {
            typeOfPiece: BiblePieces.StackChapter,
            key: `${pathBookId} ${pathChapter}`,
          },
        ];

        instancePathMap.set(readingInstance, path);
      }
    }

    const strategy = activityStrategiesMap[piece.type] as
      | ActivityStrategyType<BiblePiece>
      | undefined;

    if (!strategy) {
      this.#loggerPort.error(
        `PieceActivityService: strategy not found at getPieceActivity`
      );
      return [];
    }

    // `strategy` was looked up by `piece.type`, so it matches this piece at runtime.
    const { key, typeOfPiece } = strategy(
      piece as PieceTypeMap[keyof PieceTypeMap],
      this.#dataRegistryPort
    );

    const activity = allReadingInstances.filter((readingInstance) => {
      const instancePath = instancePathMap.get(readingInstance);

      return instancePath?.some((pieceInfo) => {
        return (
          typeOfPiece &&
          pieceInfo.typeOfPiece === typeOfPiece &&
          key &&
          pieceInfo.key === key
        );
      });
    });

    const dedupedActivity: Map<string, ReadingInstance> = new Map();

    for (const entry of activity) {
      const existent = dedupedActivity.get(entry.connectionId);
      if (!existent || (!existent.selected && entry.selected)) {
        dedupedActivity.set(entry.connectionId, entry);
      }
    }

    return [...dedupedActivity.values()];
  }

  getActivityIndicatorsForPiece(piece: Piece): ActivityIndicatorData[] {
    const strategy = indicatorsStrategiesMap[piece.type] as
      | IndicatorsStrategyType<BiblePiece>
      | undefined;

    if (!strategy) {
      this.#loggerPort.error(
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
    type: ActivityIndicatorType
  ): ActivityIndicatorData | undefined {
    const indicators = this.getActivityIndicatorsForPiece(piece);
    return indicators.find((indicator) => indicator.indicatorType === type);
  }

  getExtraActivityIndicatorsForPiece(piece: Piece): {
    extraIndicatorContent: ActivityIndicatorData | undefined;
  } {
    const extraIndicatorContent = this.getActivityIndicatorByType(
      piece,
      "extraContent"
    );

    return { extraIndicatorContent };
  }

  getPieceIndicatorByActivityIndex(
    piece: Piece,
    activityIndex: number
  ): ActivityIndicatorData | undefined {
    const indicators = this.getActivityIndicatorsForPiece(piece).filter(
      (indicator) => indicator.indicatorType === "regular"
    );
    return indicators.find((indicator) => indicator.index === activityIndex);
  }

  getDataActivityIndicatorByType(
    data: ActivityContainer,
    type: ActivityIndicatorType
  ): ActivityIndicatorData | undefined {
    const indicators = data.activityIndicators;
    return indicators.find((indicator) => indicator.indicatorType === type);
  }

  getDataExtraActivityIndicators(data: ActivityContainer): {
    extraIndicatorContent: ActivityIndicatorData | undefined;
  } {
    const extraIndicatorContent = this.getDataActivityIndicatorByType(
      data,
      "extraContent"
    );

    return { extraIndicatorContent };
  }

  getDataIndicatorByActivityIndex(
    data: ActivityContainer,
    activityIndex: number
  ): ActivityIndicatorData | undefined {
    const indicators = data.activityIndicators.filter(
      (indicator) => indicator.indicatorType === "regular"
    );
    return indicators.find((indicator) => indicator.index === activityIndex);
  }

  tryHideIndicators(container: ActivityContainer): boolean {
    const indicatorsToDelete = container.clearActivityIndicators();
    if (indicatorsToDelete) {
      this.#activityIndicatorsAdapterPort.hideIndicators(indicatorsToDelete);
      return true;
    }
    return false;
  }

  #getContainerAnchor(container: ActivityContainer): {
    pieceId: string;
    type: ActivityContainerPieceType;
  } {
    if (container instanceof InfoLabelData) {
      return {
        pieceId: container.transformer.id,
        type: BiblePieces.InfoLabelTransformer,
      };
    }
    if (!container.piece) {
      throw new Error(
        "PieceActivityService: chapter piece not defined at #getContainerAnchor"
      );
    }
    return { pieceId: container.piece.id, type: BiblePieces.StackChapter };
  }

  #createIndicatorData(
    container: ActivityContainer,
    index: number,
    indicatorType: ActivityIndicatorType
  ): ActivityIndicatorData {
    const dataId = this.#idGeneratorPort.getId();
    const piece =
      this.#activityIndicatorLifecyclePort.spawnActivityIndicatorDomain(dataId);
    const backgroundDataId = this.#idGeneratorPort.getId();
    const background =
      this.#activityIndicatorLifecyclePort.spawnActivityIndicatorDomain(
        backgroundDataId
      );
    const anchor = this.#getContainerAnchor(container);
    const data = new ActivityIndicatorData({
      id: dataId,
      index,
      indicatorType,
      piece,
      background,
      containerPieceId: anchor.pieceId,
      containerDataId: container.id,
      containerType: anchor.type,
    });
    container.addActivityIndicator(data);
    return data;
  }

  updateIndicators: (container: ActivityContainer) => ActivityIndicatorData[] =
    (container) => {
      let activityPiece: Piece | undefined;
      let containerType: ActivityContainerType | undefined = undefined;
      let shouldShowIndicators = true;
      if (container instanceof InfoLabelData) {
        activityPiece = container.owner;
        containerType = "label";
      } else if (container.piece) {
        shouldShowIndicators = container.shouldShowActivityIndicators();
        activityPiece = container.piece;
        containerType = "piece";
      }

      if (!activityPiece || !containerType) {
        return [];
      }

      const pieceActivity = this.getPieceActivity({
        piece: activityPiece,
      });

      if (pieceActivity.length === 0 || !shouldShowIndicators) {
        this.tryHideIndicators(container);
        return [];
      }

      let currIndicators = container.activityIndicators;
      const limit = Math.min(pieceActivity.length, this.#maxIndicators);
      for (const indicator of currIndicators) {
        if (indicator.indicatorType === "regular" && indicator.index >= limit) {
          this.#activityIndicatorsAdapterPort.hideIndicator(indicator);
          container.removeActivityIndicator(indicator.id);
        }
      }

      currIndicators = container.activityIndicators;

      if (pieceActivity.length <= this.#maxIndicators) {
        const { extraIndicatorContent } =
          this.getDataExtraActivityIndicators(container);
        if (extraIndicatorContent) {
          this.#activityIndicatorsAdapterPort.hideIndicator(
            extraIndicatorContent
          );
          container.removeActivityIndicator(extraIndicatorContent.id);
        }
      }

      const showIndicatorCommands: AnyShowIndicatorCommand[] = [];
      const ownUserId = this.#userPresenceServicePort.getOwnConnectionId();

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
          const { extraIndicatorContent } =
            this.getDataExtraActivityIndicators(container);

          const contentIndicator =
            extraIndicatorContent ??
            this.#createIndicatorData(container, activityIndex, "extraContent");
          contentIndicator.index = activityIndex;

          showIndicatorCommands.push({
            type: "extraContent",
            extraUsers: extraCount,
            index: activityIndex,
            indicator: contentIndicator,
          });
          break;
        } else {
          const indicator =
            this.getDataIndicatorByActivityIndex(container, activityIndex) ??
            this.#createIndicatorData(container, activityIndex, "regular");

          const identity = this.#userColorStorePort.getUserDataByIds({
            connectionId: activity.connectionId,
          });

          showIndicatorCommands.push({
            type: "regular",
            index: activityIndex,
            indicator,
            isSelected: activity.selected,
            isOwnUser: activity.connectionId === ownUserId,
            color: identity?.visual.color ?? "#ffffff",
            icon: identity?.visual.defaultIcon ?? "",
            pictureUrl: identity?.profile?.pictureUrl,
          });
        }
      }

      this.#activityIndicatorsAdapterPort.showIndicators({
        container,
        command: showIndicatorCommands,
      });

      this.#activityIndicatorsAdapterPort.updateIndicatorsPosition(container);

      return container.activityIndicators;
    };

  updateAllIndicators() {
    const labelsData = this.#labelDataStorePort
      .getAllLabelsData()
      .filter((data) => !data.isHiding);
    const stackChaptersData =
      this.#dataRegistryPort.getAllPiecesDataByType("StackChapter");

    const containers: ActivityContainer[] = [
      ...labelsData,
      ...stackChaptersData,
    ];

    for (const container of containers) {
      this.updateIndicators(container);
    }
  }

  tryHideNotification(container: NotifiableContainer): boolean {
    const currNotification = container.detachActivityNotification();

    if (currNotification) {
      this.#activityNotificationAdapterPort.hideNotification(currNotification);
      return true;
    }
    return false;
  }

  updateNotification(container: NotifiableContainer) {
    if (!container.piece || !container.isActive) return;

    const ownUserSelectedInstance =
      this.#userPresenceServicePort.getOwnUserSelectedInstance();

    if (!ownUserSelectedInstance) return;

    const { id: ownUserSelectedInstanceId } = ownUserSelectedInstance;

    const pieceActivity = this.getPieceActivity({
      piece: container.piece,
    }).filter((activity) => activity.selected);
    const isPieceSelected = container.getIsSelectedForNotification();

    const shouldHide =
      pieceActivity.length === 0 ||
      isPieceSelected ||
      !container.isActive ||
      container.highlightState === HighlightStates.Highlighting ||
      (container.highlightState === HighlightStates.Highlighted &&
        !container.isSelected);

    if (shouldHide) {
      this.tryHideNotification(container);
      return;
    }

    const isOwnUserInPiece =
      !!ownUserSelectedInstanceId &&
      pieceActivity.some((activity) => {
        return ownUserSelectedInstanceId === activity.id;
      });
    const activityCount = pieceActivity.length;

    const firstUserConnectionId = pieceActivity[0]?.connectionId;
    const identity = this.#userColorStorePort.getUserDataByIds({
      connectionId: firstUserConnectionId,
    });

    const newNotification =
      this.#activityNotificationAdapterPort.showNotification({
        isOwnUserInPiece,
        activityCount,
        color: identity?.visual.color ?? "#ffffff",
        container,
        notification: container.activityNotification,
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

    const containers: NotifiableContainer[] = [...stackChaptersData];

    for (const container of containers) {
      this.updateNotification(container);
    }
  }

  updateAllNotificationsDirection() {
    const stackChaptersData =
      this.#dataRegistryPort.getAllPiecesDataByType("StackChapter");

    const containers: NotifiableContainer[] = [...stackChaptersData];

    for (const container of containers) {
      if (!container.activityNotification) continue;
      this.#activityNotificationAdapterPort.updateNotificationDirection(
        container
      );
    }
  }
}
