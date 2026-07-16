import type { StackUpdatePacing } from "@packages/Bible Stack/bibleStack/domain/models/stacks";
import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";
import type { CrossPositionType } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";
import type {
  StackCover,
  StackCrossLine,
} from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/pieces";

export interface UpdateCommand {
  pacing: StackUpdatePacing;
  lowerCover: StackCover;
  upperCover: StackCover;
  crossVerticalLine: StackCrossLine;
  crossHorizontalLine: StackCrossLine;
  isBibleEmpty: boolean;
  shouldCrossGoInMiddle: boolean;
  activeTestaments: StackTestamentData[];
  currentCrossPosition: CrossPositionType;
}

export type UpdateReturnValue = Promise<{
  targetCrossPosition: CrossPositionType;
}>;

export interface BibleStackUpdaterAdapterPort {
  update(command: UpdateCommand): UpdateReturnValue;
}
