import type { HexString } from "../../../domain/models/commonTypes";
import { type ActivityNotification } from "../../../domain/models/canvas";
import type { NotifiableContainer } from "../../../domain/models/activity";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";

export interface ShowNotificationCommand {
  isOwnUserInPiece: boolean;
  activityCount: number;
  color: HexString;
  notification?: ActivityNotification | undefined;
  container: NotifiableContainer;
  offset?: number;
  scales?: { x: number; y: number };
}

export interface ActivityNotificationPort {
  hideNotification(notification: ActivityNotification): void;
  showNotification(command: ShowNotificationCommand): ActivityNotification;
  updateNotificationPosition(container: StackChapterData): void;
  updateNotificationDirection(container: StackChapterData): void;
}
