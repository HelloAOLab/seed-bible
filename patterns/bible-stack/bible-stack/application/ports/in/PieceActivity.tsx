import type {
  ActivityIndicatorType,
  Piece,
} from "../../../domain/models/canvas";
import type { ActivityIndicatorData } from "../../../domain/entities/ActivityIndicatorData";
import type { ActivityContainer } from "../../../domain/models/activity";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { UserReadingInstance } from "../../../domain/models/reading";

export interface PieceActivityServicePort {
  getPieceActivity(params: { piece: Piece }): UserReadingInstance[];

  getActivityIndicatorsForPiece(piece: Piece): ActivityIndicatorData[];
  getActivityIndicatorByType(
    piece: Piece,
    type: ActivityIndicatorType
  ): ActivityIndicatorData | undefined;
  getExtraActivityIndicatorsForPiece(piece: Piece): {
    extraIndicatorContent: ActivityIndicatorData | undefined;
    extraIndicatorBackground: ActivityIndicatorData | undefined;
  };
  getPieceIndicatorByActivityIndex(
    piece: Piece,
    activityIndex: number
  ): ActivityIndicatorData | undefined;

  getDataActivityIndicatorByType(
    data: ActivityContainer,
    type: ActivityIndicatorType
  ): ActivityIndicatorData | undefined;
  getDataExtraActivityIndicators(data: ActivityContainer): {
    extraIndicatorContent: ActivityIndicatorData | undefined;
    extraIndicatorBackground: ActivityIndicatorData | undefined;
  };
  getDataIndicatorByActivityIndex(
    data: ActivityContainer,
    activityIndex: number
  ): ActivityIndicatorData | undefined;

  tryHideIndicators(container: ActivityContainer): boolean;
  updateIndicators: (container: ActivityContainer) => ActivityIndicatorData[];
  updateAllIndicators(): void;

  tryHideNotification(container: StackChapterData): boolean;
  updateNotification(container: StackChapterData): void;
  updateAllNotifications(): void;
}
