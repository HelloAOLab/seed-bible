import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { PieceSelectionSource } from "../../domain/models/canvas";
import type { StackPresenceNavigationPacing } from "../../domain/models/userPresence";
import type { SectionSelectionPort } from "../ports/out/SectionSelection";
import type { BookSelectionServicePort } from "../ports/in/BookSelection";
import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
import type { ExplodedViewServicePort } from "../ports/in/ExplodedView";
import type { SectionSelectionServicePort } from "../ports/in/SectionSelection";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import type { LoggerPort } from "../ports/out/Logger";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";
import type { PieceHighlightServicePort } from "../ports/in/PieceHighlight";
import type { PieceLabelServicePort } from "../ports/in/PieceLabel";
import type { StackLabelableBiblePiece } from "../../domain/models/pieceLifecycle";
import type { StackPieceLifecyclePort } from "../ports/out/StackPieceLifecycle";
import type { LabelDataStorePort } from "../ports/out/LabelDataStore";

interface ServiceParams {
  labelDataStorePort: LabelDataStorePort;
  pieceHighlighterPort: PieceHighlightServicePort;
  bookSelectionServicePort: BookSelectionServicePort;
  pieceLabelServicePort: PieceLabelServicePort<StackLabelableBiblePiece>;
  pieceLifecycleServicePort: PieceLifecycleServicePort;
  stackUpdateServicePort: StackUpdateServicePort;
  sectionSelectionAdapterPort: SectionSelectionPort;
  explodedViewServicePort: ExplodedViewServicePort;
  eventManagerPort: EventManagerPort<BibleStackEvents>;
  bookSpawnerPort: StackPieceLifecyclePort;
  tourGuideServicePort: TourGuideServicePort;
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  loggerPort: LoggerPort;
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
  #eventManagerPort: ServiceParams["eventManagerPort"];
  #bookSpawnerPort: ServiceParams["bookSpawnerPort"];
  #tourGuideServicePort: ServiceParams["tourGuideServicePort"];
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #selectionNameRegistry: Set<string> = new Set();
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    labelDataStorePort,
    pieceHighlighterPort,
    bookSelectionServicePort,
    pieceLabelServicePort,
    pieceLifecycleServicePort,
    stackUpdateServicePort,
    sectionSelectionAdapterPort,
    explodedViewServicePort,
    eventManagerPort,
    bookSpawnerPort,
    tourGuideServicePort,
    pieceHierarchyServicePort,
    loggerPort,
  }: ServiceParams) {
    this.#labelDataStorePort = labelDataStorePort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#bookSelectionServicePort = bookSelectionServicePort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    this.#sectionSelectionAdapterPort = sectionSelectionAdapterPort;
    this.#explodedViewServicePort = explodedViewServicePort;
    this.#eventManagerPort = eventManagerPort;
    this.#bookSpawnerPort = bookSpawnerPort;
    this.#tourGuideServicePort = tourGuideServicePort;
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#loggerPort = loggerPort;
  }

  async #prepareSelection(data: StackSectionData): Promise<boolean> {
    if (!data.piece) {
      this.#loggerPort.error(
        "SectionSelectionService: data.piece not defined at prepareSelection."
      );
      return false;
    }
    this.#eventManagerPort.emit("OnSectionBeginSelect", { data });
    const { bibleData } = this.#pieceHierarchyServicePort.getParentDataChain(
      data.parentDataIds ?? {}
    );

    this.#pieceLabelServicePort.hideLabel(data.piece, "Instant");

    // Implode the previously-exploded section before exploding this one.
    const previous = this.#explodedViewServicePort.currentExplodedSection;
    if (
      previous &&
      previous.id !== data.id &&
      bibleData &&
      bibleData.currentStackVizState === "Regular"
    ) {
      previous.implode();
      const previousStack = (previous.parentDataIds
        ? previous.getOldestAncestor()
        : undefined) ?? {
        id: previous.id,
        type: previous.type,
      };
      try {
        await this.#stackUpdateServicePort.updateStack(
          previousStack.id,
          previousStack.type,
          "Regular"
        );
      } catch (error) {
        this.#loggerPort.error(
          "SectionSelectionService: Error while updating stack",
          {
            error,
          }
        );
        return false;
      }
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

      try {
        await Promise.all(unhighlights);
      } catch (error) {
        this.#loggerPort.error(
          "SectionSelectionService: Error while unhighlighting books",
          {
            error,
          }
        );
        return false;
      }
    }

    // Split + explode the section and register it as the current exploded one.
    const changed = data.changeSelectionState("RequestSelect");
    if (!changed) {
      this.#loggerPort.error(
        "SectionSelectionService: section is not idle at prepareSelection."
      );
      return false;
    }
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
    return true;
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
    this.#eventManagerPort.emit("OnSectionEndSelect", { data });
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
    const prepared = await this.#prepareSelection(data);

    if (!prepared) return;

    const name = data.getPieceInfoProperty("name");
    const isFirstSelection = !this.hasSectionEverBeenSelected(name);
    this.#selectionNameRegistry.add(name);
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
      this.#loggerPort.error(
        "SectionSelectionService: data.shadow not defined at deselect"
      );
      return;
    }

    this.#eventManagerPort.emit("OnSectionDeselected", { data });

    const infoLabelData = this.#labelDataStorePort.getDataByOwnerId(
      data.shadow.id
    );

    const selectedBooksData = data.getActivelySelectedBooks();
    const highlightedBooks = data.getActivelyHighlightedChildren();

    if (highlightedBooks.length > 0) {
      const booksPieces = highlightedBooks.map((bookData) => bookData.piece);
      const unhighlights: Promise<void>[] = [];
      for (const book of booksPieces) {
        if (!book) {
          this.#loggerPort.error(
            "SectionSelectionService: book not defined at deselect."
          );
          continue;
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
