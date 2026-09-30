import type { HexString } from "../../../domain/models/commonTypes";
import type { ActivityIndicatorData } from "../../../domain/entities/ActivityIndicatorData";
import type { ActivityContainer } from "../../../domain/models/activity";
import { type ActivityIndicatorType } from "../../../domain/models/canvas";

export interface BaseShowIndicatorCommand<T extends ActivityIndicatorType> {
  type: T;
  index: number;
  indicator: ActivityIndicatorData;
}

export interface ShowRegularIndicatorCommand extends BaseShowIndicatorCommand<"regular"> {
  isSelected: boolean;
  isOwnUser: boolean;
  color: HexString;
  pictureUrl?: string | null | undefined;
  icon: string;
}

export interface ShowExtraContentIndicatorCommand extends BaseShowIndicatorCommand<"extraContent"> {
  extraUsers: number;
}

export type AnyShowIndicatorCommand =
  | ShowRegularIndicatorCommand
  | ShowExtraContentIndicatorCommand;

export interface ShowIndicatorsCommand {
  container: ActivityContainer;
  command: AnyShowIndicatorCommand | AnyShowIndicatorCommand[];
}

export interface ActivityIndicatorsPort {
  showIndicators: (command: ShowIndicatorsCommand) => void;
  hideIndicators: (indicators: ActivityIndicatorData[]) => void;
  hideIndicator: (indicator: ActivityIndicatorData) => void;
  updateIndicatorsPosition: (container: ActivityContainer) => void;
  updateIndicatorPosition(
    indicator: ActivityIndicatorData,
    container: ActivityContainer
  ): void;
}
