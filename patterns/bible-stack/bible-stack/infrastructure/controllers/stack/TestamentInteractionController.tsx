/**
 * This tag is called whenever a testament is interacted by clicking or hovering it
 * It is in charge of managing whether to highlight or select a testament
 * @param {Object} that - Object that contains important data for the function
 * @param {String} that.typeOfInteraction - Represents the type of interaction. Possible values can be found on interactiveBible.managers.StackManager.DefineGlobals on CanvasInteractions
 * @param {Object} that.dragEvent? - Is optional and is the information received when the type of interaction is a drag
 * @param {Object} that.dropEvent? - Is optional and is the information received when the type of interaction is a drop
 * @example
 * thisBot.HandleTestamentInteraction({testament: someTestament, typeOfInteraction: CanvasInteractions.Drag, dragEvent: someDragInfo});
 */

import type { TestamentBot } from "../../models/stack";
import type { TestamentInteractionServicePort } from "../../../application/ports/in/TestamentInteraction";
import type { TestamentDragServicePort } from "../../../application/ports/in/ScripturePieceDrag";
import type { TestamentDraggingServicePort } from "../../../application/ports/in/ScripturePieceDragging";
import type { TestamentDropServicePort } from "../../../application/ports/in/ScripturePieceDrop";
import type { TestamentSelectionReleaseServicePort } from "../../../application/ports/in/ScripturePieceSelectionRelease";
import type {
  BaseRelocationEvent,
  BotListenerParametersMap,
} from "../../models/casualos";
import type { PieceMapper } from "../../mappers/PieceMapper";
import type { RelocationEventMapper } from "../../mappers/RelocationEventMapper";

interface ControllerParams {
  testamentInteractionServicePort: TestamentInteractionServicePort;
  pieceMapperPort: PieceMapper;
  dragServicePort: TestamentDragServicePort;
  draggingServicePort: TestamentDraggingServicePort;
  relocationEventMapper: RelocationEventMapper;
  selectionReleaseServicePort: TestamentSelectionReleaseServicePort;
  dropServicePort: TestamentDropServicePort;
}

export class TestamentInteractionController {
  #testamentInteractionServicePort: ControllerParams["testamentInteractionServicePort"];
  #pieceMapperPort: ControllerParams["pieceMapperPort"];
  #dragServicePort: ControllerParams["dragServicePort"];
  #draggingServicePort: ControllerParams["draggingServicePort"];
  #relocationEventMapper: ControllerParams["relocationEventMapper"];
  #selectionReleaseServicePort: ControllerParams["selectionReleaseServicePort"];
  #dropServicePort: ControllerParams["dropServicePort"];

  constructor({
    testamentInteractionServicePort,
    pieceMapperPort,
    dragServicePort,
    draggingServicePort,
    relocationEventMapper,
    selectionReleaseServicePort,
    dropServicePort,
  }: ControllerParams) {
    this.#testamentInteractionServicePort = testamentInteractionServicePort;
    this.#pieceMapperPort = pieceMapperPort;
    this.#dragServicePort = dragServicePort;
    this.#draggingServicePort = draggingServicePort;
    this.#relocationEventMapper = relocationEventMapper;
    this.#selectionReleaseServicePort = selectionReleaseServicePort;
    this.#dropServicePort = dropServicePort;
  }

  handleTestamentClick({
    testament,
    interaction,
  }: {
    testament: TestamentBot;
    interaction: BotListenerParametersMap<TestamentBot>["onClick"]["modality"];
  }) {
    const piece = this.#pieceMapperPort.toDomain(testament);
    this.#testamentInteractionServicePort.handleTestamentSelection({
      testament: piece,
      interaction: interaction === "mouse" ? "Precise" : "Coarse",
    });
  }

  handleTestamentPointerEnter(testament: TestamentBot) {
    const piece = this.#pieceMapperPort.toDomain(testament);
    this.#testamentInteractionServicePort.handleTestamentFocusBegin(piece);
  }

  handleTestamentPointerExit(testament: TestamentBot) {
    const piece = this.#pieceMapperPort.toDomain(testament);
    this.#testamentInteractionServicePort.handleTestamentFocusEnd(piece);
  }

  handleTestamentDrag(testament: TestamentBot) {
    const piece = this.#pieceMapperPort.toDomain(testament);
    this.#dragServicePort.handlePieceDrag(piece);
  }

  handleTestamentDragging({
    testament,
    draggingEvent,
  }: {
    testament: TestamentBot;
    draggingEvent: BaseRelocationEvent;
  }) {
    const piece = this.#pieceMapperPort.toDomain(testament);
    const domainDraggingEvent =
      this.#relocationEventMapper.toDomain(draggingEvent);
    this.#draggingServicePort.handlePieceDragging(piece, domainDraggingEvent);
  }

  handleTestamentPointerUp({ testament }: { testament: TestamentBot }) {
    const piece = this.#pieceMapperPort.toDomain(testament);
    this.#selectionReleaseServicePort.handlePieceSelectionRelease(piece);
  }

  handleTestamentDrop({
    testament,
    dropEvent,
  }: {
    testament: TestamentBot;
    dropEvent: BaseRelocationEvent;
  }) {
    const piece = this.#pieceMapperPort.toDomain(testament);
    const domainDropEvent = this.#relocationEventMapper.toDomain(dropEvent);
    this.#dropServicePort.handlePieceDrop(piece, domainDropEvent);
  }
}
