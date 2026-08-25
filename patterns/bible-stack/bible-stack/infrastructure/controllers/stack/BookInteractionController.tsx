import type { BookBot } from "../../models/stack";
import type {
  SelectionReleaseServicePort,
  DraggingServicePort,
} from "../../../application/ports/books";
import type { BookInteractionServicePort } from "../../../application/ports/in/BookInteraction";
import type { BookDragServicePort } from "../../../application/ports/in/ScripturePieceDrag";
import type { BookDropServicePort } from "../../../application/ports/in/ScripturePieceDrop";
import type { DraggingEvent, DropEvent } from "../../models/casualos";
import type { BotListenerParametersMap } from "../../models/casualos";
import type { RelocationEventMapper } from "../../mappers/RelocationEventMapper";
import type { PieceMapper } from "../../mappers/PieceMapper";

interface ControllerParams {
  bookInteractionServicePort: BookInteractionServicePort;
  dragServicePort: BookDragServicePort;
  draggingServicePort: DraggingServicePort;
  relocationEventMapper: RelocationEventMapper;
  selectionReleaseServicePort: SelectionReleaseServicePort;
  dropServicePort: BookDropServicePort;
  pieceMapperPort: PieceMapper;
}

export class BookInteractionController {
  #bookInteractionServicePort: ControllerParams["bookInteractionServicePort"];
  #dragServicePort: ControllerParams["dragServicePort"];
  #draggingServicePort: ControllerParams["draggingServicePort"];
  #selectionReleaseServicePort: ControllerParams["selectionReleaseServicePort"];
  #relocationEventMapper: ControllerParams["relocationEventMapper"];
  #dropServicePort: ControllerParams["dropServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];

  constructor({
    bookInteractionServicePort,
    dragServicePort,
    draggingServicePort,
    relocationEventMapper,
    selectionReleaseServicePort,
    dropServicePort,
    pieceMapperPort,
  }: ControllerParams) {
    this.#bookInteractionServicePort = bookInteractionServicePort;
    this.#dragServicePort = dragServicePort;
    this.#draggingServicePort = draggingServicePort;
    this.#relocationEventMapper = relocationEventMapper;
    this.#selectionReleaseServicePort = selectionReleaseServicePort;
    this.#dropServicePort = dropServicePort;
    this.#pieceMapperPort = pieceMapperPort;
  }

  handleBookClick({
    book,
    interaction,
  }: {
    book: BookBot;
    interaction: BotListenerParametersMap<BookBot>["onClick"]["modality"];
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
      this.#relocationEventMapper.toDomain(draggingEvent);
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
    const domainDropEvent = this.#relocationEventMapper.toDomain(dropEvent);
    this.#dropServicePort.handlePieceDrop(piece, domainDropEvent);
  }
}
