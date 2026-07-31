import { CanvasInteractions } from "bibleVizUtils.infrastructure.models.canvas";
import type { SectionBot } from "bibleStack.models.stack";
import type {
  DragServicePort,
  DraggingEventMapperPort,
  DraggingServicePort,
  DropEventMapperPort,
  DropServicePort,
  PieceMapperPort,
  SectionInteractionServicePort,
  SelectionReleaseServicePort,
} from "bibleStack.application.ports.sections";

import type {
  DraggingEvent,
  DropEvent,
} from "bibleVizUtils.infrastructure.models.casualos";

interface ControllerParams {
  sectionInteractionServicePort: SectionInteractionServicePort;
  pieceMapperPort: PieceMapperPort;
  dragServicePort: DragServicePort;
  draggingServicePort: DraggingServicePort;
  draggingEventMapperPort: DraggingEventMapperPort;
  selectionReleaseServicePort: SelectionReleaseServicePort;
  dropEventMapperPort: DropEventMapperPort;
  dropServicePort: DropServicePort;
}

export class SectionInteractionController {
  #sectionInteractionServicePort: ControllerParams["sectionInteractionServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];
  #dragServicePort: ControllerParams["dragServicePort"];
  #draggingServicePort: ControllerParams["draggingServicePort"];
  #draggingEventMapperPort: ControllerParams["draggingEventMapperPort"];
  #selectionReleaseServicePort: ControllerParams["selectionReleaseServicePort"];
  #dropEventMapperPort: ControllerParams["dropEventMapperPort"];
  #dropServicePort: ControllerParams["dropServicePort"];

  constructor({
    sectionInteractionServicePort,
    pieceMapperPort,
    dragServicePort,
    draggingServicePort,
    draggingEventMapperPort,
    selectionReleaseServicePort,
    dropEventMapperPort,
    dropServicePort,
  }: ControllerParams) {
    this.#sectionInteractionServicePort = sectionInteractionServicePort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#dragServicePort = dragServicePort;
    this.#draggingServicePort = draggingServicePort;
    this.#draggingEventMapperPort = draggingEventMapperPort;
    this.#selectionReleaseServicePort = selectionReleaseServicePort;
    this.#dropEventMapperPort = dropEventMapperPort;
    this.#dropServicePort = dropServicePort;
  }

  handleSectionClick({
    section,
    typeOfInteraction,
  }: {
    section: SectionBot;
    typeOfInteraction:
      | (typeof CanvasInteractions)["Tap"]
      | (typeof CanvasInteractions)["Click"];
  }) {
    const piece = this.#pieceMapperPort.toDomain(section);
    this.#sectionInteractionServicePort.handleSectionSelection({
      section: piece,
      interaction:
        typeOfInteraction === CanvasInteractions.Click ? "Precise" : "Coarse",
    });
  }

  handleSectionDrag(section: SectionBot) {
    const piece = this.#pieceMapperPort.toDomain(section);
    this.#dragServicePort.handlePieceDrag(piece);
  }

  handleSectionDragging({
    section,
    draggingEvent,
  }: {
    section: SectionBot;
    draggingEvent: DraggingEvent;
  }) {
    const piece = this.#pieceMapperPort.toDomain(section);
    const domainDraggingEvent =
      this.#draggingEventMapperPort.toDomain(draggingEvent);
    this.#draggingServicePort.handlePieceDragging(piece, domainDraggingEvent);
  }

  handleSectionPointerEnter(section: SectionBot) {
    const piece = this.#pieceMapperPort.toDomain(section);
    this.#sectionInteractionServicePort.handleSectionFocusBegin(piece);
  }

  handleSectionPointerExit(section: SectionBot) {
    const piece = this.#pieceMapperPort.toDomain(section);
    this.#sectionInteractionServicePort.handleSectionFocusEnd(piece);
  }

  handleSectionPointerUp(section: SectionBot) {
    const piece = this.#pieceMapperPort.toDomain(section);
    this.#selectionReleaseServicePort.handlePieceSelectionRelease(piece);
  }

  handleSectionDrop({
    section,
    dropEvent,
  }: {
    section: SectionBot;
    dropEvent: DropEvent;
  }) {
    const piece = this.#pieceMapperPort.toDomain(section);
    const domainDropEvent = this.#dropEventMapperPort.toDomain(dropEvent);
    this.#dropServicePort.handlePieceDrop(piece, domainDropEvent);
  }
}
