import type { StackBibleData } from "../../domain/entities/StackBibleData";
import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import { BibleTypes, type Piece } from "../../domain/models/canvas";
import type {
  InteractabilityBlockerPort,
  InteractabilityUnlockerPort,
} from "../ports/in/PieceInteractability";
import type { ScripturePiecesStateServicePort } from "../ports/in/ScripturePiecesState";
import type {
  BibleDataRepositoryPort,
  PieceDataRepositoryPort,
  PieceAdapterPort,
} from "../ports/out/PieceInteractability";
import type { StackPieceDataMap } from "../ports/pieces";

interface ServiceParams {
  bibleDataRepositoryPort: BibleDataRepositoryPort;
  pieceDataRepositoryPort: PieceDataRepositoryPort;
  pieceAdapterPort: PieceAdapterPort;
  scripturePiecesStateServicePort: ScripturePiecesStateServicePort;
}

export class PieceInteractabilityService
  implements InteractabilityBlockerPort, InteractabilityUnlockerPort
{
  #bibleDataRepositoryPort: ServiceParams["bibleDataRepositoryPort"];
  #pieceDataRepositoryPort: ServiceParams["pieceDataRepositoryPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #scripturePiecesStateServicePort: ServiceParams["scripturePiecesStateServicePort"];

  constructor({
    bibleDataRepositoryPort,
    pieceDataRepositoryPort,
    pieceAdapterPort,
    scripturePiecesStateServicePort,
  }: ServiceParams) {
    this.#bibleDataRepositoryPort = bibleDataRepositoryPort;
    this.#pieceDataRepositoryPort = pieceDataRepositoryPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#scripturePiecesStateServicePort = scripturePiecesStateServicePort;
  }

  blockAll(): void {
    this.#setBiblePiecesInteractable(false);
  }

  unlockAll(): void {
    this.#setBiblePiecesInteractable(true);
  }

  #setBiblePiecesInteractable(value = true) {
    this.#bibleDataRepositoryPort
      .getAllBiblesData()
      .forEach((bibleData: StackBibleData) => {
        // Pieces inside a platformer-game bible are never interactable.
        const actualValue =
          bibleData.bibleType === BibleTypes.PlatformerGame ? false : value;
        this.#setTestamentsInteractable(bibleData.childrenData, actualValue);
      });

    this.#setTestamentsInteractable(
      this.#pieceDataRepositoryPort.getStandaloneTestaments(),
      value
    );
  }

  #setTestamentsInteractable(testaments: StackTestamentData[], value: boolean) {
    testaments.forEach((testamentData) => {
      if (
        testamentData.isActive &&
        !testamentData.isBeingDragged &&
        !testamentData.isSplitIntoSections
      ) {
        if (!testamentData.piece) {
          throw new Error(
            "PieceInteractabilityService: testamentData.piece not defined at setTestamentsInteractable"
          );
        }
        this.#setPieceInteractable({ piece: testamentData.piece, value });
      }
      if (testamentData.isSplitIntoSections) {
        testamentData.childrenData.forEach((sectionData) => {
          if (
            !(
              sectionData.type === "StackSectionBook" &&
              sectionData.selectionState === "Selected"
            ) &&
            sectionData.isActive &&
            !sectionData.isBeingDragged &&
            sectionData.selectionState !== "Selected"
          ) {
            if (!sectionData.piece) {
              throw new Error(
                "PieceInteractabilityService: sectionData.piece not defined at setTestamentsInteractable"
              );
            }
            this.#setPieceInteractable({ piece: sectionData.piece, value });
          }
          if (
            sectionData.type === "StackSection" &&
            sectionData.isSplitIntoBooks
          ) {
            sectionData.childrenData.flat().forEach((bookData) => {
              if (
                bookData.selectionState !== "Selected" &&
                bookData.isActive &&
                !bookData.isBeingDragged
              ) {
                if (!bookData.piece) {
                  throw new Error(
                    "PieceInteractabilityService: bookData.piece not defined at setTestamentsInteractable"
                  );
                }
                this.#setPieceInteractable({ piece: bookData.piece, value });
              }
            });
          }
        });
      }
    });
  }

  #setPieceInteractable({ piece, value }: { piece: Piece; value: boolean }) {
    const shouldBeDraggable = this.#scripturePiecesStateServicePort
      .arePiecesDraggable
      ? value
      : false;
    if (shouldBeDraggable) {
      this.#pieceAdapterPort.unanchorPiece(piece);
    } else {
      this.#pieceAdapterPort.anchorPiece(piece);
    }

    if (value) {
      this.#pieceAdapterPort.makeInteractable(piece);
    } else {
      this.#pieceAdapterPort.makeNonInteractable(piece);
    }

    switch (piece.type) {
      case "StackTestament":
      case "StackSection":
      case "StackSectionBook":
      case "StackBook":
      case "StackChapter": {
        const data = this.#pieceDataRepositoryPort.getPieceData(
          piece as Piece<keyof StackPieceDataMap>
        );
        if (data) {
          if (value) {
            data.becomeHighlightable();
          } else {
            data.becomeNonHighlightable();
          }
        }
        break;
      }
      default:
        break;
    }
  }
}
