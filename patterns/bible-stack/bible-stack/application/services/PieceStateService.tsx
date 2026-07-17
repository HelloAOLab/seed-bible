import type { Piece, PieceState } from "../../domain/models/canvas";
import type { PieceLabelServicePort } from "../ports/in/PieceLabel";
import type {
  ActivityIndicatorsAdapterPort,
  ActivityNotificationAdapterPort,
  PieceDataRepositoryPort,
} from "../ports/out/PieceState";
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
    | "StackSectionShadow"
  >;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  bookChaptersManagementServicePort: BookChaptersManagementServicePort;
  activityIndicatorsAdapterPort: ActivityIndicatorsAdapterPort;
  activityNotificationAdapterPort: ActivityNotificationAdapterPort;
}

export class PieceStateService {
  #labelPositionUpdaterPort: ServiceParams["labelPositionUpdaterPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #bookChaptersManagementServicePort: ServiceParams["bookChaptersManagementServicePort"];
  #activityIndicatorsAdapterPort: ServiceParams["activityIndicatorsAdapterPort"];
  #activityNotificationAdapterPort: ServiceParams["activityNotificationAdapterPort"];

  constructor({
    labelPositionUpdaterPort,
    pieceDataRepositoryPort,
    bookChaptersManagementServicePort,
    activityIndicatorsAdapterPort,
    activityNotificationAdapterPort,
  }: ServiceParams) {
    this.#labelPositionUpdaterPort = labelPositionUpdaterPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#bookChaptersManagementServicePort = bookChaptersManagementServicePort;
    this.#activityIndicatorsAdapterPort = activityIndicatorsAdapterPort;
    this.#activityNotificationAdapterPort = activityNotificationAdapterPort;
  }

  /**
   * Switchboard: reacts to a piece's domain-state change by delegating to the
   * per-type handler. Each handler owns the business rules for its piece type.
   */
  handlePieceStateChanged({
    piece,
    changedProperties,
  }: {
    piece: Piece;
    changedProperties: Array<keyof PieceState>;
  }) {
    switch (piece.type) {
      case "StackTestament":
        this.#handleTestamentStateChanged(
          piece as Piece<"StackTestament">,
          changedProperties
        );
        break;
      case "StackSection":
        this.#handleSectionStateChanged(
          piece as Piece<"StackSection">,
          changedProperties
        );
        break;
      case "StackBook":
      case "StackSectionBook":
        this.#handleBookStateChanged(
          piece as Piece<"StackBook" | "StackSectionBook">,
          changedProperties
        );
        break;
      case "StackChapter":
        this.#handleChapterStateChanged(
          piece as Piece<"StackChapter">,
          changedProperties
        );
        break;
      case "StackSectionShadow":
        this.#handleSectionShadowStateChanged(
          piece as Piece<"StackSectionShadow">,
          changedProperties
        );
        break;
      default:
        break;
    }
  }

  #handleTestamentStateChanged(
    piece: Piece<"StackTestament">,
    changedProperties: Array<keyof PieceState>
  ) {
    if (!hasTransformChanged(changedProperties)) return;
    this.#labelPositionUpdaterPort.updateLabelPosition(piece);
  }

  #handleSectionStateChanged(
    piece: Piece<"StackSection">,
    changedProperties: Array<keyof PieceState>
  ) {
    if (!hasTransformChanged(changedProperties)) return;
    this.#labelPositionUpdaterPort.updateLabelPosition(piece);
  }

  #handleBookStateChanged(
    piece: Piece<"StackBook" | "StackSectionBook">,
    changedProperties: Array<keyof PieceState>
  ) {
    if (!hasTransformChanged(changedProperties)) return;

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

  // NOTE: chapters intentionally do NOT reposition their label on transform
  // changes (design decision); only their activity indicators/notification.
  #handleChapterStateChanged(
    piece: Piece<"StackChapter">,
    changedProperties: Array<keyof PieceState>
  ) {
    if (!hasTransformChanged(changedProperties)) return;

    const data = this.#pieceDataRepositoryPort.getPieceData(piece);
    if (!data) {
      throw new Error(
        "PieceStateService: data not found at handleChapterStateChanged"
      );
    }

    if (data.activityIndicators.length > 0) {
      this.#activityIndicatorsAdapterPort.updateIndicatorsPosition(data);
    }
    if (data.activityNotification) {
      this.#activityNotificationAdapterPort.updateNotificationPosition(data);
    }
  }

  #handleSectionShadowStateChanged(
    piece: Piece<"StackSectionShadow">,
    changedProperties: Array<keyof PieceState>
  ) {
    if (!hasTransformChanged(changedProperties)) return;
    this.#labelPositionUpdaterPort.updateLabelPosition(piece);
  }
}
