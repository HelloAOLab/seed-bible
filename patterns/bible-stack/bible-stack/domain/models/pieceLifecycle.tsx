import { BiblePieces } from "./canvas";
export type StackLabelableBiblePiece = keyof Pick<
  typeof BiblePieces,
  | "StackTestament"
  | "StackSection"
  | "StackBook"
  | "StackChapter"
  | "StackSectionBook"
  | "StackSectionShadow"
>;
