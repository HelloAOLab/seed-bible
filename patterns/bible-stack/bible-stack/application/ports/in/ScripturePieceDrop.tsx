import type {
  Piece,
  DropEvent as DomainDropEvent,
} from "../../../domain/models/canvas";

export interface BookDropServicePort {
  handlePieceDrop(
    piece: Piece<"StackSectionBook"> | Piece<"StackBook">,
    dropEvent: DomainDropEvent
  ): void;
}

export interface TestamentDropServicePort {
  handlePieceDrop: (
    piece: Piece<"StackTestament">,
    dropEvent: DomainDropEvent
  ) => void;
}

export interface SectionDropServicePort {
  handlePieceDrop: (
    piece: Piece<"StackSection">,
    dropEvent: DomainDropEvent
  ) => void;
}

export interface ChapterDropServicePort {
  handlePieceDrop: (
    piece: Piece<"StackChapter">,
    dropEvent: DomainDropEvent
  ) => void;
}
