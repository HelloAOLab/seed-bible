import { BiblePieces } from "../../../domain/models/canvas";
import type { VisualStateMap } from "../../models/visualState";
import { INITIAL_CONFIG_MAP } from "./InitialConfig";

export const INITIAL_VISUAL_STATE_MAP: {
  [K in keyof VisualStateMap]: Partial<VisualStateMap[K]>; ///Partial<BotTypeMap[K]["tags"]>;
} = {
  [BiblePieces.StackTestament]: {},
  [BiblePieces.StackSection]: {
    hoveredFormOpacity: 1,
    unhoveredFormOpacity: 0.7,
  },
  [BiblePieces.StackBook]: {
    increasedIntensityStrokeColor: "#ffffff",
  },
  [BiblePieces.StackSectionBook]: {
    hoveredFormOpacity: 1,
    unhoveredFormOpacity: 0.7,
  },
  [BiblePieces.StackChapter]: {
    selectedColor: "#f8c471",
    highlightedColor: "#ffffff",
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
  [BiblePieces.InfoLabelDate]: {},
  [BiblePieces.InfoLabelTail]: {},
  [BiblePieces.InfoLabelText]: {},
  [BiblePieces.InfoLabelTransformer]: {},
  [BiblePieces.ActivityIndicator]: {},
} as const;
