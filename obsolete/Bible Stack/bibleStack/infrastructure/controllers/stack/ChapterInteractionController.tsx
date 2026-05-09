import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import type { ChapterBot } from "bibleStack.models.stack";
import type {
  ChapterInteractionServicePort,
  DragServicePort,
  DraggingEventMapperPort,
  DraggingServicePort,
  DropEventMapperPort,
  DropServicePort,
  PieceMapperPort,
  SelectionReleaseServicePort,
} from "bibleStack.application.ports.chapters";
import type {
  DraggingEvent,
  DropEvent,
} from "bibleVizUtils.infrastructure.models.casualos";

interface ControllerParams {
  chapterInteractionServicePort: ChapterInteractionServicePort;
  pieceMapperPort: PieceMapperPort;
  dragServicePort: DragServicePort;
  draggingServicePort: DraggingServicePort;
  draggingEventMapperPort: DraggingEventMapperPort;
  selectionReleaseServicePort: SelectionReleaseServicePort;
  dropEventMapperPort: DropEventMapperPort;
  dropServicePort: DropServicePort;
}

export class ChapterInteractionController {
  #chapterInteractionServicePort: ControllerParams["chapterInteractionServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];
  #dragServicePort: ControllerParams["dragServicePort"];
  #draggingServicePort: ControllerParams["draggingServicePort"];
  #draggingEventMapperPort: ControllerParams["draggingEventMapperPort"];
  #selectionReleaseServicePort: ControllerParams["selectionReleaseServicePort"];
  #dropEventMapperPort: ControllerParams["dropEventMapperPort"];
  #dropServicePort: ControllerParams["dropServicePort"];

  constructor({
    chapterInteractionServicePort,
    pieceMapperPort,
    dragServicePort,
    draggingServicePort,
    draggingEventMapperPort,
    selectionReleaseServicePort,
    dropEventMapperPort,
    dropServicePort,
  }: ControllerParams) {
    this.#chapterInteractionServicePort = chapterInteractionServicePort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#dragServicePort = dragServicePort;
    this.#draggingServicePort = draggingServicePort;
    this.#draggingEventMapperPort = draggingEventMapperPort;
    this.#selectionReleaseServicePort = selectionReleaseServicePort;
    this.#dropEventMapperPort = dropEventMapperPort;
    this.#dropServicePort = dropServicePort;
  }

  handleChapterClick({
    chapter,
    interaction,
  }: {
    chapter: ChapterBot;
    interaction:
      | (typeof CanvasInteractions)["Tap"]
      | (typeof CanvasInteractions)["Click"];
  }) {
    const piece = this.#pieceMapperPort.toDomain(chapter);
    this.#chapterInteractionServicePort.handleChapterSelection({
      chapter: piece,
      interaction:
        interaction === CanvasInteractions.Click ? "Precise" : "Coarse",
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
      this.#draggingEventMapperPort.toDomain(draggingEvent);
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
    const domainDropEvent = this.#dropEventMapperPort.toDomain(dropEvent);
    this.#dropServicePort.handlePieceDrop(piece, domainDropEvent);
  }
}
