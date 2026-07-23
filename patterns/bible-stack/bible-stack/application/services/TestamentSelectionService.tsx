import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { PieceSelectionSource } from "../../domain/models/canvas";
import type { TestamentSelectionPort } from "../ports/in/TestamentSelection";
import type {
  TestamentSelectionAdapterPort,
  TestamentSelectionEventPort,
} from "../ports/out/TestamentSelection";
import type { SectionSpawnerPort } from "../ports/in/PieceSpawn";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
// import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { StackUpdatePacing } from "../../domain/models/stacks";

interface ServiceParams {
  testamentSelectionAdapterPort: TestamentSelectionAdapterPort;
  testamentSelectionEventPort: TestamentSelectionEventPort;
  sectionSpawnerPort: SectionSpawnerPort;
  stackUpdateServicePort: StackUpdateServicePort;
  // pieceLifecycleServicePort: PieceLifecycleServicePort;
}

export class TestamentSelectionService implements TestamentSelectionPort {
  #testamentSelectionAdapterPort: ServiceParams["testamentSelectionAdapterPort"];
  #testamentSelectionEventPort: ServiceParams["testamentSelectionEventPort"];
  #sectionSpawnerPort: ServiceParams["sectionSpawnerPort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];
  // #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];

  constructor({
    testamentSelectionAdapterPort,
    testamentSelectionEventPort,
    sectionSpawnerPort,
    stackUpdateServicePort,
    // pieceLifecycleServicePort,
  }: ServiceParams) {
    this.#testamentSelectionAdapterPort = testamentSelectionAdapterPort;
    this.#testamentSelectionEventPort = testamentSelectionEventPort;
    this.#sectionSpawnerPort = sectionSpawnerPort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    // this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
  }

  /**
   * Splits the testament into sections and spawns + attaches each one so the
   * adapter can lay them out. Mirrors SectionSelectionService.#prepareSelection.
   */
  #prepareSelection(data: StackTestamentData): void {
    this.#testamentSelectionEventPort.emit("OnTestamentBeginSelect", { data });

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
    this.#prepareSelection(data);

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
