import type { Piece, SelectionModality } from "../../../domain/models/canvas";

export interface BookInteractionServicePort {
  handleBookSelection: ({
    book,
    interaction,
  }: {
    book: Piece<"StackBook" | "StackSectionBook">;
    interaction: SelectionModality;
  }) => void;
  handleBookFocusBegin: (book: Piece<"StackBook" | "StackSectionBook">) => void;
  handleBookFocusEnd(book: Piece<"StackBook" | "StackSectionBook">): void;
}
