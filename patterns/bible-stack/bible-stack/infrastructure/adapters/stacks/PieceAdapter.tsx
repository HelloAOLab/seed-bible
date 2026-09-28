import type { Piece } from "../../../domain/models/canvas";
import type { PieceAdapterPort as BooksPieceAdapterPort } from "../../../application/ports/books";
import type { PieceAdapterPort as DragPieceAdapterPort } from "../../../application/ports/scripturePieceDrag";
import type { PieceAdapterPort as DraggingPieceAdapterPort } from "../../../application/ports/scripturePieceDragging";
import type { PieceAdapterPort as SelectionReleasePieceAdapterPort } from "../../../application/ports/scripturePieceSelectionRelease";
import type { PieceAdapterPort as StructurePieceAdapterPort } from "../../../application/ports/stackStructure";
import type { PieceAdapterPort as DropPieceAdapterPort } from "../../../application/ports/scripturePieceDrop";
import type { PieceAdapterPort as NavigationPieceAdapterPort } from "../../../application/ports/userPresence";
import type { PieceAdapterPort as InteractabilityPieceAdapterPort } from "../../../application/ports/out/PieceInteractability";
import type { PieceBot, PieceBotTags } from "../../models/casualos";
import { SetStrictTag } from "../../functions/casualos";
import type { PieceMapper } from "../../mappers/PieceMapper";

export interface PieceAdapterParams {
  pieceMapperPort: PieceMapper;
  dimensionProviderPort: {
    getDimension: () => string;
  };
}

// prettier-ignore
export class PieceAdapter implements BooksPieceAdapterPort, DragPieceAdapterPort, DraggingPieceAdapterPort, SelectionReleasePieceAdapterPort, StructurePieceAdapterPort, DropPieceAdapterPort, NavigationPieceAdapterPort, InteractabilityPieceAdapterPort {
  #pieceMapperPort: PieceAdapterParams["pieceMapperPort"];
  #dimensionProviderPort: PieceAdapterParams["dimensionProviderPort"];

  constructor({ pieceMapperPort, dimensionProviderPort }: PieceAdapterParams) {
    this.#pieceMapperPort = pieceMapperPort;
    this.#dimensionProviderPort = dimensionProviderPort;
  }

  isPieceAnchored: (piece: Piece) => boolean = (piece) => {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if(!pieceBot) {
      throw new Error("PieceAdapter: pieceBot not found at isPieceAnchored.");
    }
    return !pieceBot.tags.draggable;
  };
  anchorPiece(piece: Piece) {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error("PieceAdapter: pieceBot not found at anchorPiece");
    }
    SetStrictTag(pieceBot, "draggable", false);
  }
  unanchorPiece(piece: Piece) {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) {
      throw new Error("PieceAdapter: pieceBot not found at anchorPiece");
    }
    SetStrictTag(pieceBot, "draggable", true);
  }
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
    SetStrictTag(pieceBot, dimension + "X" as keyof PieceBotTags, position.x);
    SetStrictTag(pieceBot, dimension + "Y" as keyof PieceBotTags, position.y);
    SetStrictTag(pieceBot, dimension + "Z" as keyof PieceBotTags, position.z);
  };

  isPieceBeingUsed(piece: Piece): boolean {
    const pieceBot = this.#pieceMapperPort.toInfrastructure(piece);
    if (!pieceBot) return false;
    const dimension = this.#dimensionProviderPort.getDimension();
    return (
      !!pieceBot.tags.isInUse &&
      pieceBot.tags[dimension as keyof PieceBotTags] === true
    );
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
