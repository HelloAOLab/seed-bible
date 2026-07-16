import { BiblePiece } from "bibleVizUtils.domain.models.canvas";
export type StackLabelableBiblePiece = keyof Pick<
  typeof BiblePiece,
  | "StackTestament"
  | "StackSection"
  | "StackBook"
  | "StackChapter"
  | "StackSectionBook"
  | "StackSectionShadow"
>;
