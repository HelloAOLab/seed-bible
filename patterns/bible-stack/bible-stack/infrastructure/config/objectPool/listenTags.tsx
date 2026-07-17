import type { BiblePiece } from "../../../domain/models/canvas";
import type { BotListenerParametersMap } from "../../models/casualos";
import type { BotTypeMap } from "../../models/stack";

export const LISTEN_TAGS: {
  [P in BiblePiece]?: (keyof BotListenerParametersMap<BotTypeMap[P]>)[];
} = {
  StackTestament: [
    "onBotChanged",
    "onClick",
    "onDrag",
    "onDragging",
    "onDrop",
    "onPointerEnter",
    "onPointerUp",
  ],
  StackSection: [
    "onBotChanged",
    "onClick",
    "onDrag",
    "onDragging",
    "onDrop",
    "onPointerEnter",
    "onPointerExit",
    "onPointerUp",
  ],
  StackBook: [
    "onBotChanged",
    "onClick",
    "onDrag",
    "onDragging",
    "onDrop",
    "onPointerEnter",
    "onPointerExit",
    "onPointerUp",
  ],
  StackSectionBook: [
    "onBotChanged",
    "onClick",
    "onDrag",
    "onDragging",
    "onDrop",
    "onPointerEnter",
    "onPointerExit",
    "onPointerUp",
  ],
  StackChapter: [
    "onBotChanged",
    "onClick",
    "onDrag",
    "onDragging",
    "onDrop",
    "onPointerEnter",
    "onPointerExit",
    "onPointerUp",
  ],
  StackSectionShadow: ["onBotChanged"],
  StackCrossLine: ["onPointerDown", "onPointerUp"],
  VersesBundle: ["onClick", "onPointerEnter", "onPointerExit"],
  Verse: ["onClick"],
  StackCover: ["onClick"],
};
