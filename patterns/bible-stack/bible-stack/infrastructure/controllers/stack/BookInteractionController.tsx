import type { BookBot } from "bibleStack.models.stack";
import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import type {
  BookInteractionServicePort,
  DraggingEventMapperPort,
  DraggingServicePort,
  DragServicePort,
  DropEventMapperPort,
  DropServicePort,
  PieceMapperPort,
  SelectionReleaseServicePort,
} from "bibleStack.application.ports.books";
import type {
  DraggingEvent,
  DropEvent,
} from "bibleVizUtils.infrastructure.models.casualos";

interface ControllerParams {
  bookInteractionServicePort: BookInteractionServicePort;
  dragServicePort: DragServicePort;
  draggingServicePort: DraggingServicePort;
  draggingEventMapperPort: DraggingEventMapperPort;
  selectionReleaseServicePort: SelectionReleaseServicePort;
  dropEventMapperPort: DropEventMapperPort;
  dropServicePort: DropServicePort;
  pieceMapperPort: PieceMapperPort;
}

export class BookInteractionController {
  #bookInteractionServicePort: ControllerParams["bookInteractionServicePort"];
  #dragServicePort: ControllerParams["dragServicePort"];
  #draggingServicePort: ControllerParams["draggingServicePort"];
  #draggingEventMapperPort: ControllerParams["draggingEventMapperPort"];
  #selectionReleaseServicePort: ControllerParams["selectionReleaseServicePort"];
  #dropEventMapperPort: ControllerParams["dropEventMapperPort"];
  #dropServicePort: ControllerParams["dropServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];

  constructor({
    bookInteractionServicePort,
    dragServicePort,
    draggingServicePort,
    draggingEventMapperPort,
    selectionReleaseServicePort,
    dropEventMapperPort,
    dropServicePort,
    pieceMapperPort,
  }: ControllerParams) {
    this.#bookInteractionServicePort = bookInteractionServicePort;
    this.#dragServicePort = dragServicePort;
    this.#draggingServicePort = draggingServicePort;
    this.#draggingEventMapperPort = draggingEventMapperPort;
    this.#selectionReleaseServicePort = selectionReleaseServicePort;
    this.#dropEventMapperPort = dropEventMapperPort;
    this.#dropServicePort = dropServicePort;
    this.#pieceMapperPort = pieceMapperPort;
  }

  handleBookClick({
    book,
    interaction,
  }: {
    book: BookBot;
    interaction:
      | (typeof CanvasInteractions)["Tap"]
      | (typeof CanvasInteractions)["Click"];
  }) {
    const piece = this.#pieceMapperPort.toDomain(book);
    this.#bookInteractionServicePort.handleBookSelection({
      book: piece,
      interaction: interaction === "mouse" ? "Precise" : "Coarse",
    });
  }

  handleBookDrag({ book }: { book: BookBot }) {
    const piece = this.#pieceMapperPort.toDomain(book);
    this.#dragServicePort.handlePieceDrag(piece);
  }

  handleBookDragging({
    book,
    draggingEvent,
  }: {
    book: BookBot;
    draggingEvent: DraggingEvent;
  }) {
    const piece = this.#pieceMapperPort.toDomain(book);
    const domainDraggingEvent =
      this.#draggingEventMapperPort.toDomain(draggingEvent);
    this.#draggingServicePort.handlePieceDragging(piece, domainDraggingEvent);
  }

  handleBookPointerEnter(book: BookBot) {
    const piece = this.#pieceMapperPort.toDomain(book);
    this.#bookInteractionServicePort.handleBookFocusBegin(piece);
  }

  handleBookPointerExit(book: BookBot) {
    const piece = this.#pieceMapperPort.toDomain(book);
    this.#bookInteractionServicePort.handleBookFocusEnd(piece);
  }

  handleBookPointerUp(book: BookBot) {
    const piece = this.#pieceMapperPort.toDomain(book);
    this.#selectionReleaseServicePort.handlePieceSelectionRelease(piece);
  }

  handleBookDrop({ book, dropEvent }: { book: BookBot; dropEvent: DropEvent }) {
    const piece = this.#pieceMapperPort.toDomain(book);
    const domainDropEvent = this.#dropEventMapperPort.toDomain(dropEvent);
    this.#dropServicePort.handlePieceDrop(piece, domainDropEvent);
  }
}
