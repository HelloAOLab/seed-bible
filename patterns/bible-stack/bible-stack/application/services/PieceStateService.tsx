import type { Piece, PieceState } from "../../domain/models/canvas";
import type { PieceLabelServicePort } from "../ports/in/PieceLabel";
import type { PieceDataRepositoryPort } from "../ports/out/PieceState";
import type { BookChaptersManagementServicePort } from "../ports/in/BookChaptersManagement";

function hasTransformChanged(changedProperties: Array<keyof PieceState>) {
  return changedProperties.some((property) => {
    return (
      property === "positionX" ||
      property === "positionY" ||
      property === "positionZ" ||
      property === "sizeX" ||
      property === "sizeY" ||
      property === "sizeZ"
    );
  });
}

interface ServiceParams {
  labelPositionUpdaterPort: PieceLabelServicePort<
    | "StackTestament"
    | "StackSection"
    | "StackBook"
    | "StackSectionBook"
    | "StackChapter"
  >;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  bookChaptersManagementServicePort: BookChaptersManagementServicePort;
}

export class PieceStateService {
  #labelPositionUpdaterPort: ServiceParams["labelPositionUpdaterPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #bookChaptersManagementServicePort: ServiceParams["bookChaptersManagementServicePort"];

  constructor({
    labelPositionUpdaterPort,
    pieceDataRepositoryPort,
    bookChaptersManagementServicePort,
  }: ServiceParams) {
    this.#labelPositionUpdaterPort = labelPositionUpdaterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#bookChaptersManagementServicePort = bookChaptersManagementServicePort;
  }
  handleTestamentStateChanged({
    piece,
    changedProperties,
  }: {
    piece: Piece<"StackTestament">;
    changedProperties: Array<keyof PieceState>;
  }) {
    const shouldUpdate = hasTransformChanged(changedProperties);
    if (shouldUpdate) {
      this.#labelPositionUpdaterPort.updateLabelPosition(piece);
    }
  }
  handleSectionStateChanged({
    piece,
    changedProperties,
  }: {
    piece: Piece<"StackSection">;
    changedProperties: Array<keyof PieceState>;
  }) {
    const shouldUpdate = hasTransformChanged(changedProperties);
    if (shouldUpdate) {
      this.#labelPositionUpdaterPort.updateLabelPosition(piece);
    }
  }
  handleBookStateChanged({
    piece,
    changedProperties,
  }: {
    piece: Piece<"StackBook" | "StackSectionBook">;
    changedProperties: Array<keyof PieceState>;
  }) {
    const shouldUpdate = hasTransformChanged(changedProperties);
    if (shouldUpdate) {
      const data = this.#pieceDataRepositoryPort.getPieceData(piece);
      if (!data) {
        throw new Error(
          "PieceStateService: data not found at handleBookStateChanged"
        );
      }
      this.#labelPositionUpdaterPort.updateLabelPosition(piece);
      if (
        data.selectionState === "Selected" &&
        data.currentShape === "Selected" &&
        data.isShowingChapters
      ) {
        this.#bookChaptersManagementServicePort.updateChaptersPosition(data);
      }
    }
  }
  handlechapterStateChanged({
    piece,
    changedProperties,
  }: {
    piece: Piece<"StackChapter">;
    changedProperties: Array<keyof PieceState>;
  }) {
    //update activity notification position.
    // update activity indicators position.
  }
}
