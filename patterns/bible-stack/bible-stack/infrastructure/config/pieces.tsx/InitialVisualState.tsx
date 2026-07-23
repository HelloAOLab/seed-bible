import { BiblePieces } from "../../../domain/models/canvas";
import type { VisualStateMap } from "../../models/visualState";
import { INITIAL_CONFIG_MAP } from "./InitialConfig";

export const INITIAL_VISUAL_STATE_MAP: {
  [K in keyof VisualStateMap]: Partial<VisualStateMap[K]>; ///Partial<BotTypeMap[K]["tags"]>;
} = {
  [BiblePieces.StackTestament]: {},
  [BiblePieces.StackSection]: {},
  [BiblePieces.StackBook]: {},
  [BiblePieces.StackSectionBook]: {},
  [BiblePieces.StackChapter]: {
    selectedColor: "#f8c471",
  },
  [BiblePieces.StackSectionShadow]: {},
  [BiblePieces.VersesBundle]: {
    desiredScaleZ: 0.25,
    initialColor: INITIAL_CONFIG_MAP.VersesBundle.color,
  },
  [BiblePieces.Verse]: {
    initialColor: INITIAL_CONFIG_MAP.Verse.color,
  },
  [BiblePieces.StackTransformer]: {},
} as const;
