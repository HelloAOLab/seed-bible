import type { ActivityIndicator, Piece } from "../../../domain/models/canvas";
import type { ActivityContainer } from "../../../domain/models/activity";
import type { StackChapterData } from "../../../domain/entities/StackChapterData";
import type { UserReadingInstance } from "../../../domain/models/reading";

export interface PieceActivityServicePort {
  getPieceActivity(params: { piece: Piece }): UserReadingInstance[];

  getActivityIndicatorsForPiece(piece: Piece): ActivityIndicator[];
  getActivityIndicatorByType(
    piece: Piece,
    type: ActivityIndicator["indicatorType"]
  ): Piece | undefined;
  getExtraActivityIndicatorsForPiece(piece: Piece): {
    extraIndicatorContent: Piece | undefined;
    extraIndicatorBackground: Piece | undefined;
  };
  getPieceIndicatorByActivityIndex(
    piece: Piece,
    activityIndex: number
  ): ActivityIndicator | undefined;

  getDataActivityIndicatorByType(
    data: ActivityContainer,
    type: ActivityIndicator["indicatorType"]
  ): ActivityIndicator | undefined;
  getDataExtraActivityIndicators(data: ActivityContainer): {
    extraIndicatorContent: ActivityIndicator | undefined;
    extraIndicatorBackground: ActivityIndicator | undefined;
  };
  getDataIndicatorByActivityIndex(
    data: ActivityContainer,
    activityIndex: ActivityIndicator["index"]
  ): ActivityIndicator | undefined;

  tryHideIndicators(container: ActivityContainer): boolean;
  updateIndicators: (container: ActivityContainer) => ActivityIndicator[];
  updateAllIndicators(): void;

  tryHideNotification(container: StackChapterData): boolean;
  updateNotification(container: StackChapterData): void;
  updateAllNotifications(): void;
}
