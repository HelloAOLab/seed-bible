import type { Bot } from "../../../../../typings/AuxLibraryDefinitions";
import { computeNotificationDirection } from "bibleVizUtils.functions.index";
import { pieceActivityService } from "bibleVizUtils.services.index";
import { userPresenceService } from "bibleVizUtils.services.index";
import { userColorStore } from "bibleVizUtils.services.index";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas";
import { seedBiblePresenceProvider } from "bibleVizUtils.services.index";
import type { StackChapterData } from "bibleVizUtils.models.entities.StackChapterData";
import type { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";

type AnyNotifiablePieceData = StackChapterData | LayoutChapterData;

export const tryHideNotification: (piece: Bot) => void = (piece) => {
  const notification = piece.links.activityNotification;
  if (notification) {
    ObjectPooler.ReleaseObject({
      obj: notification,
      tag: ObjectPoolTags.ActivityNotification,
    });
    piece.tags.activityNotification = null;
  }
};

export const tryUpdateNotificationDirection: (bot: Bot) => void = (bot) => {
  // TODO: Respect the LoD by implementing a getter in the bot for the activityNotification
  const notification = bot.links.activityNotification;
  const isValid =
    !bot.tags.isBaseStackBook &&
    !bot.tags.isBaseStackSection &&
    !bot.tags.isBaseStackTestament &&
    bot.tags.isInUse &&
    notification;

  if (!isValid) return;

  const notifications = Array.isArray(notification)
    ? notification
    : [notification];

  const direction = computeNotificationDirection(
    gridPortalBot.tags.cameraRotationZ
  );

  notifications.forEach((currNotification) => {
    // TODO: Respect the LoD by implementing a getter in the notification for the direction
    const currDirection = currNotification.tags.direction;

    if (currDirection.x != direction.x || currDirection.y != direction.y) {
      setTag(currNotification, "direction", direction);
      currNotification.SetPosition({
        setX: true,
        setY: true,
        setZ: true,
      });
    }
  });
};

export const updateNotification: (
  data: AnyNotifiablePieceData | AnyNotifiablePieceData[],
  offset: unknown,
  scales: { x: number; y: number }
) => void = (data, offset, scales) => {
  const dimension = os.getCurrentDimension();
  const fixedData = Array.isArray(data) ? data : [data];
  const filteredData = fixedData.filter((currData) => {
    return currData.piece && currData.piece.tags[dimension] == true;
  });
  const userPresence = userPresenceService.getUserPresence();

  const activeTab = seedBiblePresenceProvider.getActiveTab();

  for (const pieceData of filteredData) {
    const piece = pieceData.piece;
    if (!piece) continue;
    const pieceActivity = pieceActivityService.getPieceActivity({
      piece,
    });
    const isPieceSelected = pieceData.getIsSelectedForNotification();
    const direction = pieceData.getNotificationDirection();
    const currNotification = piece.links.activityNotification;

    const shouldHide =
      pieceActivity.length === 0 ||
      isPieceSelected ||
      !piece.tags.isInUse ||
      piece.masks.isHighlighting ||
      (piece.masks.isHighlighted && !pieceData.isSelected);

    if (shouldHide) {
      tryHideNotification(piece);
      continue;
    }

    const formOpacity =
      activeTab &&
      pieceActivity.some((activity) => {
        return activeTab.id === activity.id;
      })
        ? 1
        : 0.5;
    const label = pieceActivity.length > 1 ? pieceActivity.length : "";
    const matchingPresence = Array.from(userPresence).find(
      ([, presenceData]) => {
        return pieceActivity[0]?.id === presenceData.tabId;
      }
    );
    const color = userColorStore.getUserColor({
      configId: matchingPresence?.[0] ?? configBot.id,
    });

    if (currNotification) {
      setTag(currNotification, "label", label);
      setTag(currNotification, "formOpacity", formOpacity);
      setTag(currNotification, "color", color);
    } else if (!piece.masks.isHighlighting && !piece.masks.isHighlighted) {
      const activityNotification = ObjectPooler.GetObjectFromPool({
        tag: ObjectPoolTags.ActivityNotification,
      });
      const activityNotificationMod = {
        [dimension]: true,
        label,
        ownerBotId: piece.id,
        formOpacity,
        direction,
        color,
        notificationOffset: offset,
        scaleX: scales.x,
        scaleY: scales.y,
      };
      activityNotification.OnSpawned({ mod: activityNotificationMod });
      activityNotification.SetPosition({ setX: true, setY: true, setZ: true });
      piece.tags.activityNotification = `🔗${activityNotification.id}`;
    }
  }
};
