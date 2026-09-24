import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type { StackAncestor } from "../../domain/models/canvas";
import type {
  BookSelectionEventPort,
  PieceAdapterPort,
} from "../ports/out/BookSelection";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type { LoggerPort } from "../ports/in/Logger";
import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { BookSelectionServicePort } from "../ports/in/BookSelection";

type BookEntity = StackBookData | StackSectionBookData;

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

  /**
   * Resolves the stack root a book ultimately belongs to (its oldest ancestor),
   * falling back to the book itself when it is a standalone root.
   */
  #resolveTarget(data: BookEntity): StackAncestor {
    return (
      (data.parentDataIds ? data.getOldestAncestor() : undefined) ?? {
        id: data.id,
        type: data.type,
      }
    );
  }

  /** Unique stack-root targets for a batch, deduped by id (one update per root). */
  #resolveUniqueTargets(dataArray: BookEntity[]): StackAncestor[] {
    const targets = dataArray.map((book) => this.#resolveTarget(book));
    return targets.filter(
      (target, index) =>
        targets.findIndex((other) => other.id === target.id) === index
    );
  }

  // --- Selection pre/post-flight ------------------------------------------

  async #prepareBookSelection(
    data: BookEntity,
    pacing?: StackUpdatePacing
  ): Promise<boolean> {
    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error(
        "BookSelectionService: data.piece is not defined at selectBook"
      );
      return false;
    }

    this.#bookSelectionEventPort.emit("OnBookBeginSelect", { data });
    await this.#pieceHighlighterPort.tryUnhighlightPiece({
      piece,
      source: "Transition",
      pacing: pacing ?? "Regular",
    });

    const selecting = data.changeSelectionState("RequestSelect");
    if (!selecting) {
      this.#loggerPort.error("BookSelectionService: book should be selecting");
      return false;
    }
    data.changeLastInteractionSource("UserSelection");

    this.#pieceAdapterPort.makeNonInteractable(piece);
    data.becomeNonHighlightable();

    return true;
  }

  #finalizeBookSelection(data: BookEntity): void {
    data.changeSelectionState("SequenceComplete");
    this.#bookSelectionEventPort.emit("OnBookEndSelect", { data });
  }

  /**
   * Aborts a selection that never reached its end, walking the book out of the
   * transient `Selecting` state so it stays interactable. Books that already
   * settled keep their state.
   */
  #handleSelectionFail(data: BookEntity): void {
    if (data.selectionState !== "Selecting") return;
    data.changeSelectionState("RequestDeselect");
    data.changeSelectionState("SequenceComplete");
    data.changeChildrenSelectionState("RequestDeselect");
    data.clearLastInteractionSource();
    if (data.piece) {
      this.#pieceAdapterPort.makeInteractable(data.piece);
    }
    data.becomeHighlightable();
  }

  // --- Deselection pre/post-flight ----------------------------------------

  #prepareBookDeselection(data: BookEntity): void {
    this.#bookSelectionEventPort.emit("OnBookBeginDeselect", { data });
    data.changeSelectionState("RequestDeselect");
    data.changeChildrenSelectionState("RequestDeselect");
    if (data.piece) {
      this.#pieceAdapterPort.makeInteractable(data.piece);
    }
    data.becomeHighlightable();
  }

  #finalizeBookDeselection(data: BookEntity): void {
    data.changeSelectionState("SequenceComplete");
    this.#bookSelectionEventPort.emit("OnBookEndDeselect", { data });
  }

  /**
   * Aborts a deselection that never reached its end, walking the book back into
   * `Selected`. Only the children the pre-flight moved are restored, since
   * `changeChildrenSelectionState` cannot tell them from the idle ones. Books
   * that already settled keep their state.
   */
  #handleDeselectionFail(data: BookEntity): void {
    if (data.selectionState !== "Deselecting") return;
    data.changeSelectionState("RequestSelect");
    data.changeSelectionState("SequenceComplete");
    for (const child of data.childrenData) {
      if (child.selectionState !== "Deselecting") continue;
      child.changeSelectionState("RequestSelect");
      child.changeSelectionState("SequenceComplete");
    }
    if (data.piece) {
      this.#pieceAdapterPort.makeNonInteractable(data.piece);
    }
    data.becomeNonHighlightable();
  }

  // --- Public API ----------------------------------------------------------

  async selectBook({
    data,
    pacing,
  }: {
    data: BookEntity;
    pacing?: StackUpdatePacing;
  }): Promise<void> {
    try {
      const prepared = await this.#prepareBookSelection(data, pacing);
      if (!prepared) return;

      const target = this.#resolveTarget(data);
      await this.#stackUpdateServicePort.updateStack(
        target.id,
        target.type,
        pacing ?? "Regular"
      );
      this.#finalizeBookSelection(data);
    } catch (error) {
      this.#loggerPort.error(
        "BookSelectionService: Error at selectBook",
        error
      );
      this.#handleSelectionFail(data);
    }
  }

  async selectBooks(
    dataArray: BookEntity[],
    pacing?: StackUpdatePacing
  ): Promise<void> {
    try {
      const preparations = await Promise.all(
        dataArray.map(async (book) => ({
          book,
          prepared: await this.#prepareBookSelection(book, pacing),
        }))
      );
      const preparedBooks = preparations
        .filter(({ prepared }) => prepared)
        .map(({ book }) => book);
      if (preparedBooks.length === 0) return;

      const uniqueTargets = this.#resolveUniqueTargets(preparedBooks);
      await Promise.all(
        uniqueTargets.map((target) =>
          this.#stackUpdateServicePort.updateStack(
            target.id,
            target.type,
            pacing ?? "Regular"
          )
        )
      );

      preparedBooks.forEach((book) => this.#finalizeBookSelection(book));
    } catch (error) {
      this.#loggerPort.error(
        "BookSelectionService: Error at selectBooks",
        error
      );
      dataArray.forEach((book) => this.#handleSelectionFail(book));
    }
  }

  async deselectBook(
    data: BookEntity,
    pacing?: StackUpdatePacing
  ): Promise<void> {
    try {
      this.#prepareBookDeselection(data);

      const target = this.#resolveTarget(data);
      await this.#stackUpdateServicePort.updateStack(
        target.id,
        target.type,
        pacing ?? "Regular"
      );
      this.#finalizeBookDeselection(data);
    } catch (error) {
      this.#loggerPort.error(
        "BookSelectionService: Error at deselectBook",
        error
      );
      this.#handleDeselectionFail(data);
    }
  }

  async deselectBooks(
    dataArray: BookEntity[],
    pacing?: StackUpdatePacing
  ): Promise<void> {
    try {
      dataArray.forEach((book) => this.#prepareBookDeselection(book));

      const uniqueTargets = this.#resolveUniqueTargets(dataArray);
      await Promise.all(
        uniqueTargets.map((target) =>
          this.#stackUpdateServicePort.updateStack(
            target.id,
            target.type,
            pacing ?? "Regular"
          )
        )
      );

      dataArray.forEach((book) => this.#finalizeBookDeselection(book));
    } catch (error) {
      this.#loggerPort.error(
        "BookSelectionService: Error at deselectBooks",
        error
      );
      dataArray.forEach((book) => this.#handleDeselectionFail(book));
    }
  }
}
