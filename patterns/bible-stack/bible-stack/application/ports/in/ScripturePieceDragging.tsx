import type {
  Piece,
  DraggingEvent as DomainDraggingEvent,
} from "../../../domain/models/canvas";

export interface TestamentDraggingServicePort {
  handlePieceDragging: (
    piece: Piece<"StackTestament">,
    draggingEvent: DomainDraggingEvent
  ) => void;
}

export interface SectionDraggingServicePort {
  handlePieceDragging: (
    piece: Piece<"StackSection">,
    draggingEvent: DomainDraggingEvent
  ) => void;
}

export interface ChapterDraggingServicePort {
  handlePieceDragging: (
    piece: Piece<"StackChapter">,
    draggingEvent: DomainDraggingEvent
  ) => void;
}
