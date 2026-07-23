import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import type { ChapterBot } from "bibleStack.models.stack";
import type {
  DraggingEventMapperPort,
  DropEventMapperPort,
  PieceMapperPort,
} from "bibleStack.application.ports.chapters";
import type { ChapterInteractionServicePort } from "bibleStack.application.ports.in.ChapterInteraction";
import type { ChapterDragServicePort } from "bibleStack.application.ports.in.ScripturePieceDrag";
import type { ChapterDraggingServicePort } from "bibleStack.application.ports.in.ScripturePieceDragging";
import type { ChapterDropServicePort } from "bibleStack.application.ports.in.ScripturePieceDrop";
import type { ChapterSelectionReleaseServicePort } from "bibleStack.application.ports.in.ScripturePieceSelectionRelease";
import type {
  DraggingEvent,
  DropEvent,
} from "bibleVizUtils.infrastructure.models.casualos";

interface ControllerParams {
  chapterInteractionServicePort: ChapterInteractionServicePort;
  pieceMapperPort: PieceMapperPort;
  dragServicePort: ChapterDragServicePort;
  draggingServicePort: ChapterDraggingServicePort;
  draggingEventMapperPort: DraggingEventMapperPort;
  selectionReleaseServicePort: ChapterSelectionReleaseServicePort;
  dropEventMapperPort: DropEventMapperPort;
  dropServicePort: ChapterDropServicePort;
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
      interaction: interaction === "mouse" ? "Precise" : "Coarse",
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
