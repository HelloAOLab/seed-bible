import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { PieceSelectionSource } from "../../domain/models/canvas";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";
import type {
  LabelDataStorePort,
  PieceLabelServicePort,
  SectionSelectionAdapterPort,
  SectionSelectionEventPort,
} from "../ports/out/SectionSelection";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type { BookSelectionServicePort } from "../ports/in/BookSelection";
import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
import type { ExplodedViewServicePort } from "../ports/in/ExplodedView";
import type { BookSpawnerPort } from "../ports/in/PieceSpawn";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";

interface ServiceParams {
  labelDataStorePort: LabelDataStorePort;
  pieceHighlighterPort: PieceHighlighterPort;
  bookSelectionServicePort: BookSelectionServicePort;
  pieceLabelServicePort: PieceLabelServicePort;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  stackUpdateServicePort: StackUpdateServicePort;
  sectionSelectionAdapterPort: SectionSelectionAdapterPort;
  explodedViewServicePort: ExplodedViewServicePort;
  sectionSelectionEventPort: SectionSelectionEventPort;
  bookSpawnerPort: BookSpawnerPort;
  tourGuideServicePort: TourGuideServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
}

export class SectionSelectionService implements SectionSelectionServicePort {
  #labelDataStorePort: ServiceParams["labelDataStorePort"];
  #pieceHighlighterPort: ServiceParams["pieceHighlighterPort"];
  #bookSelectionServicePort: ServiceParams["bookSelectionServicePort"];
  #pieceLabelServicePort: ServiceParams["pieceLabelServicePort"];
  #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];
  #sectionSelectionAdapterPort: ServiceParams["sectionSelectionAdapterPort"];
  #explodedViewServicePort: ServiceParams["explodedViewServicePort"];
  #sectionSelectionEventPort: ServiceParams["sectionSelectionEventPort"];
  #bookSpawnerPort: ServiceParams["bookSpawnerPort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #selectionNameRegistry: Set<string> = new Set();

  constructor({
    labelDataStorePort,
    pieceHighlighterPort,
    bookSelectionServicePort,
    pieceLabelServicePort,
    pieceLifecycleServicePort,
    stackUpdateServicePort,
    sectionSelectionAdapterPort,
    explodedViewServicePort,
    sectionSelectionEventPort,
    bookSpawnerPort,
    tourGuideServicePort,
    pieceHierarchyServicePort,
  }: ServiceParams) {
    this.#labelDataStorePort = labelDataStorePort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#bookSelectionServicePort = bookSelectionServicePort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    this.#sectionSelectionAdapterPort = sectionSelectionAdapterPort;
    this.#explodedViewServicePort = explodedViewServicePort;
    this.#sectionSelectionEventPort = sectionSelectionEventPort;
    this.#bookSpawnerPort = bookSpawnerPort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
  }

  async #prepareSelection(data: StackSectionData): Promise<void> {
    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      data.parentDataIds ?? {}
    );

    if (!data.piece) {
      throw new Error(
        "SectionSelectionService: data.piece not defined at prepareSelection."
      );
    }
    this.#sectionSelectionEventPort.emit("OnSectionBeginSelect", { data });

    this.#pieceLabelServicePort.hideLabel(data.piece, "Instant");

    // Implode the previously-exploded section before exploding this one.
    const previous = this.#explodedViewServicePort.currentExplodedSection;
    if (
      previous &&
      previous.id !== data.id &&
      bibleData?.currentStackVizState === "Regular"
    ) {
      previous.implode();
      const previousStack = (previous.parentDataIds
        ? previous.getOldestAncestor()
        : undefined) ?? {
        id: previous.id,
        type: previous.type,
      };
      await this.#stackUpdateServicePort.updateStack(
        previousStack.id,
        previousStack.type,
        "Regular"
      );
    }

    // Unhighlight any actively-highlighted books before the section explodes.
    const highlightedBooks = data.getActivelyHighlightedChildren();
    if (highlightedBooks.length > 0) {
      const unhighlights: Promise<void>[] = [];
      for (const bookData of highlightedBooks) {
        const piece = bookData.piece;
        if (!piece) continue;
        unhighlights.push(
          this.#pieceHighlighterPort.tryUnhighlightPiece({
            piece,
            source: "Transition",
            pacing: "Regular",
          })
        );
      }

      await Promise.all(unhighlights);
    }

    // Split + explode the section and register it as the current exploded one.
    data.changeSelectionState("RequestSelect");
    data.explode();
    this.#explodedViewServicePort.registerExplodedSection(data);

    // Spawn, attach and activate each book so the stack updater can lay them out.
    for (const bookData of data.childrenData.flat()) {
      if (data.isInsideBible) bookData.attachToBible();
      else bookData.detachFromBible();
      if (data.isInsideTestament) bookData.attachToTestament();
      else bookData.detachFromTestament();
      bookData.attachToSection();

      const piece = this.#bookSpawnerPort.spawnBookDomain();
      bookData.setPiece(piece);
      bookData.activate();
    }
  }

  #finalizeSelection(data: StackSectionData): void {
    for (const bookData of data.getActiveBooks()) {
      bookData.becomeHighlightable();
    }
    if (data.shadow) {
      this.#pieceLabelServicePort.showLabel({
        piece: data.shadow,
        translucencyMode: "Solid",
      });
    }
    this.#sectionSelectionEventPort.emit("OnSectionEndSelect", { data });
  }

  async select({
    data,
    makeTourGuide = true,
  }: {
    data: StackSectionData;
    source: PieceSelectionSource;
    pacing?: StackPresenceNavigationPacing;
    makeTourGuide?: boolean;
  }): Promise<void> {
    const name = data.getPieceInfoProperty("name");
    const isFirstSelection = !this.hasSectionEverBeenSelected(name);
    this.#selectionNameRegistry.add(name);

    await this.#prepareSelection(data);

    await this.#sectionSelectionAdapterPort.select(data);

    const stack = (data.parentDataIds
      ? data.getOldestAncestor()
      : undefined) ?? {
      id: data.id,
      type: data.type,
    };

    await this.#stackUpdateServicePort.updateStack(
      stack.id,
      stack.type,
      "Regular"
    );

    this.#finalizeSelection(data);

    if (isFirstSelection && makeTourGuide)
      await this.#tourGuideServicePort.beginTourGuide(data);
  }

  async deselect(data: StackSectionData): Promise<void> {
    if (!data.shadow) {
      throw new Error(
        "SectionSelectionService: data.shadow not defined at deselect"
      );
    }

    const infoLabelData = this.#labelDataStorePort.getDataByOwnerId(
      data.shadow.id
    );

    const selectedBooksData = data.getActivelySelectedBooks();
    const highlightedBooks = data.getActivelyHighlightedChildren();
    // thisBot.vars.lastInteractedStackSectionData = data; TODO: Call an event here. Make the interaction registry listen;

    if (highlightedBooks.length > 0) {
      const booksPieces = highlightedBooks.map((bookData) => bookData.piece);
      const unhighlights: Promise<void>[] = [];
      for (const book of booksPieces) {
        if (!book) {
          throw new Error(
            "SectionSelectionService: book not defined at deselect."
          );
        }
        unhighlights.push(
          this.#pieceHighlighterPort.tryUnhighlightPiece({
            piece: book,
            source: "Transition",
            pacing: "Fast",
          })
        );
      }
      await Promise.all(unhighlights);
    }

    if (selectedBooksData.length > 0) {
      await this.#bookSelectionServicePort.deselectBooks(
        selectedBooksData,
        "Fast"
      );
    }

    await this.#sectionSelectionAdapterPort.deselect(data);

    if (infoLabelData) await this.#pieceLabelServicePort.hideLabel(data.shadow);

    const piecesToRelease = data.resetHierarchy(false);
    await Promise.all(
      piecesToRelease.map((piece) =>
        this.#pieceLifecycleServicePort.clearPiece(piece)
      )
    );

    const stack = (data.parentDataIds
      ? data.getOldestAncestor()
      : undefined) ?? {
      id: data.id,
      type: data.type,
    };

    await this.#stackUpdateServicePort.updateStack(
      stack.id,
      stack.type,
      "Regular"
    );
  }

  hasSectionEverBeenSelected(name: string): boolean {
    return this.#selectionNameRegistry.has(name);
  }
}
