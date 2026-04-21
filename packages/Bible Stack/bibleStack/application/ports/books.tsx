import type {
  Piece,
  PieceSelectionSource,
  SelectionModality,
} from "bibleVizUtils.domain.models.canvas";
import type { PieceDataRepositoryPort } from "bibleStack.application.ports.pieces";
import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";

export interface BookInteractionServicePort {
  handleBookClick: ({
    book,
    interaction,
  }: {
    book: Piece<"StackBook" | "StackSectionBook">;
    interaction: SelectionModality;
  }) => void;
}

export type BookDataRepositoryPort = Pick<
  PieceDataRepositoryPort,
  "getPieceData"
>;

export interface BookSelectionServicePort {
  selectBook: (
    data: StackBookData | StackSectionBookData,
    source: PieceSelectionSource
  ) => void;
  deselectBook: (data: StackBookData | StackSectionBookData) => void;
}
