import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { PieceSelectionSource } from "../../domain/models/canvas";
import type { TestamentSelectionPort } from "../ports/in/TestamentSelection";
import type {
  TestamentSelectionAdapterPort,
  TestamentSelectionEventPort,
  TestamentSelectionPieceHighlighterPort,
} from "../ports/out/TestamentSelection";
import type { SectionSpawnerPort } from "../ports/in/PieceSpawn";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
// import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { StackUpdatePacing } from "../../domain/models/stacks";

interface ServiceParams {
  testamentSelectionAdapterPort: TestamentSelectionAdapterPort;
  testamentSelectionEventPort: TestamentSelectionEventPort;
  pieceHighlighterPort: TestamentSelectionPieceHighlighterPort;
  sectionSpawnerPort: SectionSpawnerPort;
  stackUpdateServicePort: StackUpdateServicePort;
  // pieceLifecycleServicePort: PieceLifecycleServicePort;
}

export class TestamentSelectionService implements TestamentSelectionPort {
  #testamentSelectionAdapterPort: ServiceParams["testamentSelectionAdapterPort"];
  #testamentSelectionEventPort: ServiceParams["testamentSelectionEventPort"];
  #pieceHighlighterPort: ServiceParams["pieceHighlighterPort"];
  #sectionSpawnerPort: ServiceParams["sectionSpawnerPort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];
  // #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];

  constructor({
    testamentSelectionAdapterPort,
    testamentSelectionEventPort,
    pieceHighlighterPort,
    sectionSpawnerPort,
    stackUpdateServicePort,
    // pieceLifecycleServicePort,
  }: ServiceParams) {
    this.#testamentSelectionAdapterPort = testamentSelectionAdapterPort;
    this.#testamentSelectionEventPort = testamentSelectionEventPort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#sectionSpawnerPort = sectionSpawnerPort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    // this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
  }

  /**
   * Splits the testament into sections and spawns + attaches each one so the
   * adapter can lay them out. Mirrors SectionSelectionService.#prepareSelection.
   */
  async #prepareSelection(data: StackTestamentData): Promise<void> {
    this.#testamentSelectionEventPort.emit("OnTestamentBeginSelect", { data });

    // Unhighlight anything still highlighted in this bible before the testament
    // splits into sections (runs as a transition, so it isn't blocked by the
    // ongoing selection sequence). Label removal is owned by the unhighlight.
    const bibleId = data.getParentId("stackBibleId");
    if (data.isInsideBible && bibleId) {
      await this.#pieceHighlighterPort.unhighlightBiblePieces(bibleId);
    }

    const selecting = data.changeSelectionState("RequestSelect");

    if (!selecting) {
      throw new Error(
        "TestamentSelectionService: testament not selecting at prepareSelection."
      );
    }

    for (const sectionData of data.childrenData) {
      if (data.isInsideBible) sectionData.attachToBible();
      else sectionData.detachFromBible();

      if (sectionData.type === "StackSection") {
        sectionData.attachToTestament();
        sectionData.setPiece(this.#sectionSpawnerPort.spawnSectionDomain());
      } else {
        sectionData.setPiece(this.#sectionSpawnerPort.spawnSectionBookDomain());
      }
      sectionData.activate();
    }
  }

  #finalizeSelection(data: StackTestamentData): void {
    this.#testamentSelectionEventPort.emit("OnTestamentEndSelect", { data });
  }

  async select({
    data,
    pacing = "Regular",
  }: {
    data: StackTestamentData;
    pacing?: StackUpdatePacing;
    source: PieceSelectionSource;
  }): Promise<void> {
    await this.#prepareSelection(data);

    await this.#testamentSelectionAdapterPort.select(data);

    const stack = (data.parentDataIds
      ? data.getOldestAncestor()
      : undefined) ?? {
      id: data.id,
      type: data.type,
    };
    await this.#stackUpdateServicePort.updateStack(
      stack.id,
      stack.type,
      pacing
    );

    this.#finalizeSelection(data);
  }

  async deselect(/*data: StackTestamentData*/): Promise<void> {
    // await this.#testamentSelectionAdapterPort.deselect(data);
    // const piecesToRelease = data.resetHierarchy(false);
    // await Promise.all(
    //   piecesToRelease.map((piece) =>
    //     this.#pieceLifecycleServicePort.clearPiece(piece)
    //   )
    // );
    // const stack = (data.parentDataIds
    //   ? data.getOldestAncestor()
    //   : undefined) ?? {
    //   id: data.id,
    //   type: data.type,
    // };
    // await this.#stackUpdateServicePort.updateStack(
    //   stack.id,
    //   stack.type,
    //   "Regular"
    // );
  }
}
