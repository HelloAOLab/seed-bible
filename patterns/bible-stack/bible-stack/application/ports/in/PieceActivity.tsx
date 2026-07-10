import type { ActivityIndicator } from "../../../domain/models/canvas";
import type { ActivityContainer } from "../../../domain/models/activity";

export interface IndicatorsDeleterPort {
  tryHideIndicators(container: ActivityContainer): boolean;
}

export interface NotificationDeleterPort {
  tryHideNotification(container: ActivityContainer): boolean;
}

export interface IndicatorsUpdaterPort {
  updateIndicators: (container: ActivityContainer) => ActivityIndicator[];
}
