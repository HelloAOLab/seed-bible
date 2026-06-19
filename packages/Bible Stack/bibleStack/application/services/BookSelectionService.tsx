import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
// import type { PieceSelectionSource } from "bibleVizUtils.domain.models.canvas";
import type { BookSelectionServicePort } from "bibleStack.application.ports.books";
import type { StackPresenceNavigationPacing } from "bibleStack.domain.models.userPresence";
import type {
  BookSelectionEventPort,
  PieceAdapterPort,
} from "../ports/out/BookSelection";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";

interface ServiceParams {
  bookSelectionEventPort: BookSelectionEventPort;
  pieceAdapterPort: PieceAdapterPort;
  stackUpdateServicePort: StackUpdateServicePort;
}

export class BookSelectionService implements BookSelectionServicePort {
  #bookSelectionEventPort: ServiceParams["bookSelectionEventPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];

  constructor({
    bookSelectionEventPort,
    pieceAdapterPort,
    stackUpdateServicePort,
  }: ServiceParams) {
    this.#bookSelectionEventPort = bookSelectionEventPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
  }

  async selectBook({
    data,
    pacing,
  }: {
    data: StackBookData | StackSectionBookData;
    pacing?: StackPresenceNavigationPacing;
  }): Promise<void> {
    // TODO: Bring book selection logic here
  }

  async deselectBook(
    data: StackBookData | StackSectionBookData
  ): Promise<void> {
    this.#bookSelectionEventPort.emit("OnBookBeginDeselect", { data }); // TODO: Make the interaction registry liste to this and make this book the last interacted.
    const deselecting = data.changeSelectionState("RequestDeselect");
    if (!deselecting)
      throw new Error("BookSelectionService: book should be deselecting");
    data.changeChildrenSelectionState("RequestDeselect");
    await this.#stackUpdateServicePort.updateAllStacks("Regular");
    const piece = data.piece;
    if (!piece) {
      console.warn("Piece not found at DeselectBook");
      return;
    }

    this.#pieceAdapterPort.makeInteractable(piece);
    data.becomeHighlightable();

    this.#bookSelectionEventPort.emit("OnBookEndDeselect", { data });
  }
}
