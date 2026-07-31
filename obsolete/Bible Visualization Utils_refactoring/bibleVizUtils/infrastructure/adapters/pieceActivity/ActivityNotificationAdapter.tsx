import { computeNotificationDirection } from "bibleVizUtils.infrastructure.functions.layout";
import type { StackChapterData } from "bibleVizUtils.domain.entities.StackChapterData";
import type { LayoutChapterData } from "bibleVizUtils.domain.entities.LayoutChapterData";
import type {
  ActivityNotificationAdapterPort,
  ShowNotificationCommand,
} from "bibleVizUtils.domain.ports.pieceActivity";
import type { ActivityNotification } from "bibleVizUtils.domain.models.canvas";
import { ActivityNotificationMapper } from "bibleVizUtils.infrastructure.mappers.ActivityNotificationMapper";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";
import type {
  ActivityNotificationBot,
  ActivityNotificationTags,
  BibleVizUtilsObjectPoolerMap,
} from "bibleVizUtils.infrastructure.models.casualos";
import { GetBotScales } from "bibleVizUtils.infrastructure.functions.casualos";
import type { PieceMapperPort } from "bibleVizUtils.infrastructure.mappers.PieceMapper";
import type { ObjectPooler } from "bibleVizUtils.infrastructure.adapters.casualos.ObjectPooler";

interface DimensionProviderPort {
  getDimension(): string;
}

interface AdapterParams {
  objectPooler: ObjectPooler<BibleVizUtilsObjectPoolerMap>;
  dimensionProviderPort: DimensionProviderPort;
  pieceMapperPort: PieceMapperPort;
}

export class ActivityNotificationAdapter implements ActivityNotificationAdapterPort {
  #objectPooler: AdapterParams["objectPooler"];
  #dimensionProviderPort: DimensionProviderPort;
  #pieceMapperPort: AdapterParams["pieceMapperPort"];
  constructor({
    objectPooler,
    dimensionProviderPort,
    pieceMapperPort,
  }: AdapterParams) {
    this.#objectPooler = objectPooler;
    this.#dimensionProviderPort = dimensionProviderPort;
    this.#pieceMapperPort = pieceMapperPort;
  }

  hideNotification(notification: ActivityNotification) {
    const notificationBot =
      ActivityNotificationMapper.toInfrastructure(notification);
    if (!notificationBot) {
      throw new Error(
        `ActivityNotificationAdapter: notificationBot not found at hideNotification.`
      );
    }
    this.#objectPooler.releaseObject(
      notificationBot,
      BiblePiece.ActivityNotification
    );
  }
  showNotification(command: ShowNotificationCommand) {
    const {
      isOwnUserInPiece,
      activityCount,
      color,
      direction,
      notification,
      container,
      offset = 0,
      scales = { x: 1, y: 1 },
    } = command;

    let notificationBot: ActivityNotificationBot | undefined;
    if (notification) {
      notificationBot =
        ActivityNotificationMapper.toInfrastructure(notification);
    } else {
      notificationBot = this.#objectPooler.getObject(
        BiblePiece.ActivityNotification
      );
    }

    if (!notificationBot) {
      throw new Error(
        `ActivityNotificationAdapter: notificationBot not found at showNotification.`
      );
    }

    if (!container.piece) {
      throw new Error(
        `ActivityNotificationAdapter: container.piece not defined at showNotification`
      );
    }

    const formOpacity = isOwnUserInPiece ? 1 : 0.5;
    const label = activityCount > 1 ? `${activityCount}` : "";
    const dimension = this.#dimensionProviderPort.getDimension();

    const mod: Partial<ActivityNotificationTags> = {
      [dimension]: true,
      label,
      ownerDataId: container.id,
      ownerBotId: container.piece.id,
      formOpacity,
      direction,
      color,
      offset,
      scaleX: scales.x,
      scaleY: scales.y,
      type: "ActivityNotification",
    };

    applyMod(notificationBot, mod);
    return ActivityNotificationMapper.toDomain(notificationBot);
  }
  updateNotificationPosition(container: StackChapterData | LayoutChapterData) {
    if (!container.activityNotification) {
      throw new Error(
        `ActivityNotificationAdapter: container.activityNotification not defined at updateNotificationPosition`
      );
    }
    const notificationBot = ActivityNotificationMapper.toInfrastructure(
      container.activityNotification
    );
    if (!notificationBot) {
      throw new Error(
        `ActivityNotificationAdapter: notificationBot not defined at updateNotificationPosition`
      );
    }
    if (!notificationBot.tags.direction) {
      throw new Error(
        `ActivityNotificationAdapter: notificationBot.tags.direction not defined at updateNotificationPosition`
      );
    }
    if (notificationBot.tags.offset === undefined) {
      throw new Error(
        `ActivityNotificationAdapter: notificationBot.tags.offset not defined at updateNotificationPosition`
      );
    }
    if (!container.piece) {
      throw new Error(
        `ActivityNotificationAdapter: container.piece is not defined.`
      );
    }
    const dimension = this.#dimensionProviderPort.getDimension();
    const ownerBot = this.#pieceMapperPort.toInfrastructure(container.piece);

    if (!ownerBot) {
      throw new Error(
        `ActivityNotificationAdapter: ownerBot not found at updateNotificationPosition`
      );
    }

    const transformer = ownerBot.tags.transformer
      ? getBot(byID(ownerBot.tags.transformer))
      : undefined;
    const ownerBotPosition = getBotPosition(ownerBot, dimension);
    const ownerBotScales = GetBotScales(ownerBot);
    const transformerOffset = 1;
    const transformerPosition = transformer
      ? getBotPosition(transformer, dimension).add(
          new Vector3(0, 0, transformerOffset)
        )
      : new Vector3(0, 0, 0);
    const activityNotificationDesiredPosition = new Vector3(
      ownerBotPosition.x +
        notificationBot.tags.direction.x *
          (ownerBotScales.x / 2 + notificationBot.tags.offset),
      ownerBotPosition.y +
        notificationBot.tags.direction.y *
          (ownerBotScales.y / 2 + notificationBot.tags.offset),
      ownerBotPosition.z + ownerBotScales.z + notificationBot.tags.offset
    ).add(transformerPosition);

    setTagMask(
      notificationBot,
      dimension + "X",
      activityNotificationDesiredPosition.x
    );
    setTagMask(
      notificationBot,
      dimension + "Y",
      activityNotificationDesiredPosition.y
    );
    setTagMask(
      notificationBot,
      dimension + "Z",
      activityNotificationDesiredPosition.z
    );
  }
  updateNotificationDirection(container: StackChapterData | LayoutChapterData) {
    if (!container.piece) {
      throw new Error(
        `ActivityNotificatioNAdapter: container.piece not defined at updateNotificationDirection`
      );
    }
    const pieceBot = this.#pieceMapperPort.toInfrastructure(container.piece);
    const isValid = pieceBot?.tags.isInUse && container.activityNotification;

    if (!isValid) return;
    const notificationBot = ActivityNotificationMapper.toInfrastructure(
      container.activityNotification
    );

    if (!notificationBot) {
      throw new Error(
        `ActivityNotificatioNAdapter: notificationBot not found at updateNotificationDirection`
      );
    }

    const direction = computeNotificationDirection(
      gridPortalBot.tags.cameraRotationZ
    );

    const currDirection = notificationBot.tags.direction;

    if (!currDirection) {
      throw new Error(
        `ActivityNotificationAdapter: currDirection not defined at updateNotificationPosition`
      );
    }

    if (currDirection.x != direction.x || currDirection.y != direction.y) {
      notificationBot.tags.direction = direction;
      this.updateNotificationPosition(container);
    }
  }
}
