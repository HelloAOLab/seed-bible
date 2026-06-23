import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
// import type { PieceSelectionSource } from "bibleVizUtils.domain.models.canvas";
import type { BookSelectionServicePort } from "bibleStack.application.ports.books";
import type {
  BookSelectionEventPort,
  PieceAdapterPort,
} from "../ports/out/BookSelection";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type { LoggerPort } from "../ports/in/Logger";
import type { StackUpdatePacing } from "../../domain/models/stacks";

interface ServiceParams {
  bookSelectionEventPort: BookSelectionEventPort;
  pieceAdapterPort: PieceAdapterPort;
  stackUpdateServicePort: StackUpdateServicePort;
  pieceHighlighterPort: PieceHighlighterPort;
  loggerPort: LoggerPort;
}

export class BookSelectionService implements BookSelectionServicePort {
  #bookSelectionEventPort: ServiceParams["bookSelectionEventPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];
  #pieceHighlighterPort: ServiceParams["pieceHighlighterPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    bookSelectionEventPort,
    pieceAdapterPort,
    stackUpdateServicePort,
    pieceHighlighterPort,
    loggerPort,
  }: ServiceParams) {
    this.#bookSelectionEventPort = bookSelectionEventPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#loggerPort = loggerPort;
  }

  async selectBook({
    data,
    pacing,
  }: {
    data: StackBookData | StackSectionBookData;
    pacing?: StackUpdatePacing;
  }): Promise<void> {
    if (!data.piece) {
      this.#loggerPort.error(
        "BookSelectionService: data.piece is not defined at selectBook"
      );
      return;
    }

    this.#bookSelectionEventPort.emit("OnBookBeginSelect", { data }); // TODO: Make the interaction registry listen to this and make this book the last interacted.
    await this.#pieceHighlighterPort.tryUnhighlightPiece({
      piece: data.piece,
      source: "Transition",
      pacing: pacing ?? "Regular",
    });

    const selecting = data.changeSelectionState("RequestSelect");
    if (!selecting) {
      this.#loggerPort.error("BookSelectionService: book should be selecting");
      return;
    }
    data.changeLastInteractionSource("UserSelection");

    // shout("OnBiblePieceSelected", { piece: book }); // Purpose?

    this.#pieceAdapterPort.makeNonInteractable(data.piece);
    data.becomeNonHighlightable();

    // TODO: Move this to a propper PieceFocusService or something like that. Wire it to the OnBookBeginSelect event at composition root.
    // const focusOnRotation = { x: 1.01229, y: 0.5 };
    // const cameraFocusDuration = 1 / speedMultiplier;
    // const bookPosition = getBotPosition(book, dimension);
    // const { selectedBookHeight }: { selectedBookHeight: number | undefined } =
    //   await thisBot.ComputeSelectedBookLayout({
    //     data: bookData,
    //   });

    // if (!selectedBookHeight) {
    //   console.error(`selectedBookHeight not found at SelectBook`);
    //   return;
    // }
    // let fixedPosition = new Vector3(
    //   bookPosition.x,
    //   bookPosition.y,
    //   bookPosition.z + selectedBookHeight / 2
    // );
    // if (
    //   bookData.getParentId("stackBibleId") &&
    //   bookData.piece &&
    //   bookData.piece.links.transformerLink &&
    //   !Array.isArray(bookData.piece.links.transformerLink)
    // ) {
    //   const transformerPosition = getBotPosition(
    //     bookData.piece.links.transformerLink,
    //     dimension
    //   );
    //   fixedPosition = fixedPosition.add(transformerPosition);
    // }
    // const desiredFocusOnPosition = GetCamRotationFocusPoint({
    //   theta: focusOnRotation.y,
    //   phi: focusOnRotation.x,
    //   botPosition: fixedPosition,
    // });

    // os.focusOn(
    //   { x: desiredFocusOnPosition.x, y: desiredFocusOnPosition.y },
    //   {
    //     duration: cameraFocusDuration,
    //     easing: { type: "sinusoidal", mode: "inout" },
    //     rotation: focusOnRotation,
    //     zoom: 8,
    //   }
    // );

    const target = (data.parentDataIds
      ? data.getOldestAncestor()
      : undefined) ?? { id: data.id, type: data.type };
    await this.#stackUpdateServicePort.updateStack(
      target.id,
      target.type,
      pacing ?? "Regular"
    );
    data.changeSelectionState("SequenceComplete");
    this.#bookSelectionEventPort.emit("OnBookEndSelect", { data });

    // TODO: Move this to a propper adapter called by a PieceSelectionFeedbackService or something like that. Wire it to the OnBookEndSelect event atcomposition root.
    // thisBot.PlaySound({ soundName: "BookSelect" });
  }

  async deselectBook(
    data: StackBookData | StackSectionBookData,
    pacing?: StackUpdatePacing
  ): Promise<void> {
    this.#bookSelectionEventPort.emit("OnBookBeginDeselect", { data }); // TODO: Make the interaction registry liste to this and make this book the last interacted.
    const deselecting = data.changeSelectionState("RequestDeselect");
    if (!deselecting) {
      this.#loggerPort.error(
        "BookSelectionService: book should be deselecting"
      );
      return;
    }
    data.changeChildrenSelectionState("RequestDeselect");
    // Only the book's owning stack root needs to re-layout, not every stack.
    // With no ancestor the book is itself a standalone stack root.
    const target = (data.parentDataIds
      ? data.getOldestAncestor()
      : undefined) ?? { id: data.id, type: data.type };
    await this.#stackUpdateServicePort.updateStack(
      target.id,
      target.type,
      pacing ?? "Regular"
    );
    const piece = data.piece;
    if (!piece) {
      console.warn("Piece not found at DeselectBook");
      return;
    }

    this.#pieceAdapterPort.makeInteractable(piece);
    data.becomeHighlightable();

    data.changeSelectionState("SequenceComplete");
    this.#bookSelectionEventPort.emit("OnBookEndDeselect", { data });
  }
}
