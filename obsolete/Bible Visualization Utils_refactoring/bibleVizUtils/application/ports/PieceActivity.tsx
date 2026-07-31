import type { ActivityIndicator } from "../../domain/models/canvas";
import type {
  ActivityContainer,
  NotifiableContainer,
} from "../../domain/ports/pieceActivity";

export interface IndicatorsDeleterPort {
  tryHideIndicators(container: ActivityContainer): boolean;
}

export interface NotificationDeleterPort {
  tryHideNotification(container: NotifiableContainer): boolean;
}

export interface IndicatorsUpdaterPort {
  updateIndicators: (container: ActivityContainer) => ActivityIndicator[];
}
