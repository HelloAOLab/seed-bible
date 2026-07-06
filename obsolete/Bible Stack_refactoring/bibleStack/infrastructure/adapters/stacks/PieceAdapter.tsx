import type { Piece } from "bibleVizUtils.domain.models.canvas";
import type { PieceAdapterPort as BooksPieceAdapterPort } from "bibleStack.application.ports.books";
import type { PieceAdapterPort as DragPieceAdapterPort } from "bibleStack.application.ports.scripturePieceDrag";
import type { PieceAdapterPort as DraggingPieceAdapterPort } from "bibleStack.application.ports.scripturePieceDragging";
import type { PieceAdapterPort as SelectionReleasePieceAdapterPort } from "bibleStack.application.ports.scripturePieceSelectionRelease";
import type { PieceAdapterPort as StructurePieceAdapterPort } from "bibleStack.application.ports.stackStructure";
import type { PieceAdapterParams } from "bibleStack.infrastructure.ports.pieceAdapter";
import type { PieceAdapterPort as DropPieceAdapterPort } from "bibleStack.application.ports.scripturePieceDrop";
import type { PieceAdapterPort as NavigationPieceAdapterPort } from "bibleStack.application.ports.userPresence";
import type { PieceBot } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/models/casualos";
import { SetStrictTag } from "@packages/Bible Visualization Utils/bibleVizUtils/infrastructure/functions/casualos";

export class PieceAdapter
  implements
    BooksPieceAdapterPort,
    DragPieceAdapterPort,
    DraggingPieceAdapterPort,
    SelectionReleasePieceAdapterPort,
    StructurePieceAdapterPort,
    DropPieceAdapterPort,
    NavigationPieceAdapterPort
{
  #pieceMapperPort: PieceAdapterParams["pieceMapperPort"];
  #dimensionProviderPort: PieceAdapterParams["dimensionProviderPort"];

  constructor({ pieceMapperPort, dimensionProviderPort }: PieceAdapterParams) {
    this.#pieceMapperPort = pieceMapperPort;
    this.#dimensionProviderPort = dimensionProviderPort;
  }

  isPieceAnchored: (piece: Piece) => boolean = (piece) => {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    return !!pieceBot?.tags.draggable;
  };
  makePieceErasable: (piece: Piece) => void = (piece) => {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error(`PieceAdapter: pieceBot not found at makePieceErasable`);
    }
    pieceBot.tags.toErase = true;
  };
  releaseSelectionOnPiece: (piece: Piece) => void = (piece) => {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error(
        `PieceAdapter: pieceBot not found at releaseSelectionOnPiece`
      );
    }
    setTag(pieceBot, "cursor", "pointer");
  };
  updatePosition: (
    piece: Piece,
    position: { x: number; y: number; z: number }
  ) => void = (piece, position) => {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error(`PieceAdapter: pieceBot not found at updatePosition`);
    }
    const dimension = this.#dimensionProviderPort.getDimension();
    setTagMask(pieceBot, dimension + "X", position.x);
    setTagMask(pieceBot, dimension + "Y", position.y);
    setTagMask(pieceBot, dimension + "Z", position.z);
  };

  isPieceBeingUsed(piece: Piece): boolean {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) return false;
    const dimension = this.#dimensionProviderPort.getDimension();
    return !!pieceBot.tags.isInUse && pieceBot.tags[dimension] === true;
  }

  hasTransformer(piece: Piece): boolean {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error(`PieceAdapter: pieceBot not found at hasTransformer.`);
    }
    return !!pieceBot.tags.transformer;
  }

  releaseTransformer({
    piece,
    updatePosition = false,
  }: {
    piece: Piece;
    updatePosition?: boolean;
  }): void {
    if (this.hasTransformer(piece)) {
      const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
      if (!pieceBot) {
        throw new Error(
          `PieceAdapter: pieceBot not found at releaseTransformer.`
        );
      }
      const transformer = getBot(
        byID(pieceBot.tags.transformer as string)
      ) as PieceBot;
      SetStrictTag(pieceBot, "transformer", undefined);

      if (updatePosition) {
        const dimension = this.#dimensionProviderPort.getDimension();
        const piecePosition = getBotPosition(pieceBot, dimension);
        const transformerPosition = getBotPosition(transformer, dimension);
        const newPosition = piecePosition.add(transformerPosition);
        this.updatePosition(piece, newPosition);
      }
    }
  }

  isInteractable(piece: Piece): boolean {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    return !!pieceBot?.tags.pointable;
  }

  makeInteractable(piece: Piece) {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (pieceBot) {
      SetStrictTag(pieceBot, "pointable", true);
    }
  }

  makeNonInteractable(piece: Piece) {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (pieceBot) {
      SetStrictTag(pieceBot, "pointable", false);
    }
  }

  hide(piece: Piece) {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (pieceBot) {
      const dimension = this.#dimensionProviderPort.getDimension();
      clearAnimations(bot);
      clearTagMasks(bot);
      setTag(bot, dimension, false);
    }
  }
}
