import type { ChapterBot } from "../../models/stack";
import type { ChapterInteractionServicePort } from "../../../application/ports/in/ChapterInteraction";
import type { DraggingEvent, DropEvent } from "../../models/casualos";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { RelocationEventMapper } from "../../mappers/RelocationEventMapper";
import type { ScripturePieceDragServicePort } from "../../../application/ports/in/ScripturePieceDrag";
import type { ScripturePieceDraggingServicePort } from "../../../application/ports/in/ScripturePieceDragging";
import type { ScripturePieceDropServicePort } from "../../../application/ports/in/ScripturePieceDrop";
import type { ScripturePieceSelectionReleaseServicePort } from "../../../application/ports/in/ScripturePieceSelectionRelease";

interface ControllerParams {
  chapterInteractionServicePort: ChapterInteractionServicePort;
  pieceMapperPort: PieceMapper;
  dragServicePort: ScripturePieceDragServicePort;
  draggingServicePort: ScripturePieceDraggingServicePort;
  relocationEventMapper: RelocationEventMapper;
  selectionReleaseServicePort: ScripturePieceSelectionReleaseServicePort;
  dropServicePort: ScripturePieceDropServicePort;
}

export class ChapterInteractionController {
  #chapterInteractionServicePort: ControllerParams["chapterInteractionServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];
  #dragServicePort: ControllerParams["dragServicePort"];
  #draggingServicePort: ControllerParams["draggingServicePort"];
  #relocationEventMapper: ControllerParams["relocationEventMapper"];
  #selectionReleaseServicePort: ControllerParams["selectionReleaseServicePort"];
  #dropServicePort: ControllerParams["dropServicePort"];

  constructor({
    chapterInteractionServicePort,
    pieceMapperPort,
    dragServicePort,
    draggingServicePort,
    relocationEventMapper,
    selectionReleaseServicePort,
    dropServicePort,
  }: ControllerParams) {
    this.#chapterInteractionServicePort = chapterInteractionServicePort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#dragServicePort = dragServicePort;
    this.#draggingServicePort = draggingServicePort;
    this.#relocationEventMapper = relocationEventMapper;
    this.#selectionReleaseServicePort = selectionReleaseServicePort;
    this.#dropServicePort = dropServicePort;
  }

  handleChapterClick({ chapter }: { chapter: ChapterBot }) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    this.#chapterInteractionServicePort.handleChapterSelection({
      chapter: piece,
    });
  }

  handleChapterDrag(chapter: ChapterBot) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    this.#dragServicePort.handlePieceDrag(piece);
  }

  handleChapterDragging({
    chapter,
    draggingEvent,
  }: {
    chapter: ChapterBot;
    draggingEvent: DraggingEvent;
  }) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    const domainDraggingEvent =
      this.#relocationEventMapper.toDomain(draggingEvent);
    this.#draggingServicePort.handlePieceDragging(piece, domainDraggingEvent);
  }

  handleChapterPointerEnter(chapter: ChapterBot) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    this.#chapterInteractionServicePort.handleChapterFocusBegin(piece);
  }

  handleChapterPointerExit(chapter: ChapterBot) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    this.#chapterInteractionServicePort.handleChapterFocusEnd(piece);
  }

  handleChapterPointerUp(chapter: ChapterBot) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    this.#selectionReleaseServicePort.handlePieceSelectionRelease(piece);
  }

  handleChapterDrop({
    chapter,
    dropEvent,
  }: {
    chapter: ChapterBot;
    dropEvent: DropEvent;
  }) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    const domainDropEvent = this.#relocationEventMapper.toDomain(dropEvent);
    this.#dropServicePort.handlePieceDrop(piece, domainDropEvent);
  }
}
