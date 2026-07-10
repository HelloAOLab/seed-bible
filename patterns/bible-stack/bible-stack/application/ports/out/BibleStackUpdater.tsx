import type { StackUpdatePacing } from "../../../domain/models/stacks";
import type { StackTestamentData } from "../../../domain/entities/StackTestamentData";
import type { CrossPosition } from "../../../domain/models/canvas";
import type { StackCover, StackCrossLine } from "../../../domain/models/pieces";

export interface UpdateCommand {
  pacing: StackUpdatePacing;
  lowerCover: StackCover;
  upperCover: StackCover;
  crossVerticalLine: StackCrossLine;
  crossHorizontalLine: StackCrossLine;
  isBibleEmpty: boolean;
  shouldCrossGoInMiddle: boolean;
  activeTestaments: StackTestamentData[];
  currentCrossPosition: CrossPosition;
}

export type UpdateReturnValue = Promise<{
  targetCrossPosition: CrossPosition;
}>;

export interface BibleStackUpdaterAdapterPort {
  update(command: UpdateCommand): UpdateReturnValue;
}
