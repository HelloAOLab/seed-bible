import type { StackBookData } from "bibleVizUtils.domain.entities.StackBookData";
import type { StackSectionBookData } from "bibleVizUtils.domain.entities.StackSectionBookData";
import type { StackAncestor } from "bibleVizUtils.domain.models.canvas";
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
  ): Promise<void> {
    const piece = data.piece;
    if (!piece) {
      this.#loggerPort.error(
        "BookSelectionService: data.piece is not defined at selectBook"
      );
      return;
    }

    this.#bookSelectionEventPort.emit("OnBookBeginSelect", { data }); // TODO: Make the interaction registry listen to this and make this book the last interacted.
    await this.#pieceHighlighterPort.tryUnhighlightPiece({
      piece,
      source: "Transition",
      pacing: pacing ?? "Regular",
    });

    const selecting = data.changeSelectionState("RequestSelect");
    if (!selecting) {
      this.#loggerPort.error("BookSelectionService: book should be selecting");
      return;
    }
    data.changeLastInteractionSource("UserSelection");

    this.#pieceAdapterPort.makeNonInteractable(piece);
    data.becomeNonHighlightable();
  }

  #finalizeBookSelection(data: BookEntity): void {
    data.changeSelectionState("SequenceComplete");
    this.#bookSelectionEventPort.emit("OnBookEndSelect", { data });

    // TODO: Move this to a propper adapter called by a PieceSelectionFeedbackService or something like that. Wire it to the OnBookEndSelect event at composition root.
    // thisBot.PlaySound({ soundName: "BookSelect" });
  }

  // --- Deselection pre/post-flight ----------------------------------------

  #prepareBookDeselection(data: BookEntity): void {
    this.#bookSelectionEventPort.emit("OnBookBeginDeselect", { data }); // TODO: Make the interaction registry listen to this and make this book the last interacted.
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

  // --- Public API ----------------------------------------------------------

  async selectBook({
    data,
    pacing,
  }: {
    data: BookEntity;
    pacing?: StackUpdatePacing;
  }): Promise<void> {
    await this.#prepareBookSelection(data, pacing);
    const target = this.#resolveTarget(data);
    await this.#stackUpdateServicePort.updateStack(
      target.id,
      target.type,
      pacing ?? "Regular"
    );
    this.#finalizeBookSelection(data);
  }

  async deselectBook(
    data: BookEntity,
    pacing?: StackUpdatePacing
  ): Promise<void> {
    this.#prepareBookDeselection(data);
    const target = this.#resolveTarget(data);
    await this.#stackUpdateServicePort.updateStack(
      target.id,
      target.type,
      pacing ?? "Regular"
    );
    this.#finalizeBookDeselection(data);
  }

  async selectBooks(
    dataArray: BookEntity[],
    pacing?: StackUpdatePacing
  ): Promise<void> {
    await Promise.all(
      dataArray.map((book) => this.#prepareBookSelection(book, pacing))
    );

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

    dataArray.forEach((book) => this.#finalizeBookSelection(book));
  }

  async deselectBooks(
    dataArray: BookEntity[],
    pacing?: StackUpdatePacing
  ): Promise<void> {
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
  }
}
