import type { SectionBot } from "../../models/stack";
import type { SectionInteractionServicePort } from "../../../application/ports/in/SectionInteraction";
import type { SectionDraggingServicePort } from "../../../application/ports/in/ScripturePieceDragging";
import type { SectionDropServicePort } from "../../../application/ports/in/ScripturePieceDrop";
import type { SectionSelectionReleaseServicePort } from "../../../application/ports/in/ScripturePieceSelectionRelease";
import type {
  BotListenerParametersMap,
  DraggingEvent,
  DropEvent,
} from "../../models/casualos";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { DragServicePort } from "../../../application/ports/sections";
import type { RelocationEventMapper } from "../../mappers/RelocationEventMapper";

interface ControllerParams {
  sectionInteractionServicePort: SectionInteractionServicePort;
  pieceMapperPort: PieceMapper;
  dragServicePort: DragServicePort;
  draggingServicePort: SectionDraggingServicePort;
  relocationEventMapperPort: RelocationEventMapper;
  selectionReleaseServicePort: SectionSelectionReleaseServicePort;
  dropServicePort: SectionDropServicePort;
}

export class SectionInteractionController {
  #sectionInteractionServicePort: ControllerParams["sectionInteractionServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];
  #dragServicePort: ControllerParams["dragServicePort"];
  #draggingServicePort: ControllerParams["draggingServicePort"];
  #relocationEventMapperPort: ControllerParams["relocationEventMapperPort"];
  #selectionReleaseServicePort: ControllerParams["selectionReleaseServicePort"];
  #dropServicePort: ControllerParams["dropServicePort"];

  constructor({
    sectionInteractionServicePort,
    pieceMapperPort,
    dragServicePort,
    draggingServicePort,
    relocationEventMapperPort,
    selectionReleaseServicePort,
    dropServicePort,
  }: ControllerParams) {
    this.#sectionInteractionServicePort = sectionInteractionServicePort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#dragServicePort = dragServicePort;
    this.#draggingServicePort = draggingServicePort;
    this.#relocationEventMapperPort = relocationEventMapperPort;
    this.#selectionReleaseServicePort = selectionReleaseServicePort;
    this.#dropServicePort = dropServicePort;
  }

  handleSectionClick({
    section,
    typeOfInteraction,
  }: {
    section: SectionBot;
    typeOfInteraction: BotListenerParametersMap<SectionBot>["onClick"]["modality"];
  }) {
    const piece = this.#pieceMapperPort.toDomain(section);
    this.#sectionInteractionServicePort.handleSectionSelection({
      section: piece,
      interaction: typeOfInteraction === "mouse" ? "Precise" : "Coarse",
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
      this.#relocationEventMapperPort.toDomain(draggingEvent);
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
    const domainDropEvent = this.#relocationEventMapperPort.toDomain(dropEvent);
    this.#dropServicePort.handlePieceDrop(piece, domainDropEvent);
  }
}
