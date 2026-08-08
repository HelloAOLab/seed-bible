import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { PieceSelectionSource } from "../../domain/models/canvas";
import type { TestamentSelectionPort } from "../ports/in/TestamentSelection";
import type {
  AwaiterPort,
  LabelSequenceConfigProviderPort,
  TestamentSelectionAdapterPort,
  TestamentSelectionEventPort,
  PieceAdapterPort,
} from "../ports/out/TestamentSelection";
import type { SectionSpawnerPort } from "../ports/in/PieceSpawn";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
// import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";

interface ServiceParams {
  testamentSelectionAdapterPort: TestamentSelectionAdapterPort;
  testamentSelectionEventPort: TestamentSelectionEventPort;
  pieceHighlighterPort: PieceHighlighterPort;
  sectionSpawnerPort: SectionSpawnerPort;
  stackUpdateServicePort: StackUpdateServicePort;
  awaiterPort: AwaiterPort;
  labelSequenceConfigProviderPort: LabelSequenceConfigProviderPort;
  pieceAdapterPort: PieceAdapterPort;
  // pieceLifecycleServicePort: PieceLifecycleServicePort;
}

export class TestamentSelectionService implements TestamentSelectionPort {
  #testamentSelectionAdapterPort: ServiceParams["testamentSelectionAdapterPort"];
  #testamentSelectionEventPort: ServiceParams["testamentSelectionEventPort"];
  #pieceHighlighterPort: ServiceParams["pieceHighlighterPort"];
  #sectionSpawnerPort: ServiceParams["sectionSpawnerPort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];
  #awaiterPort: ServiceParams["awaiterPort"];
  #labelSequenceConfigProviderPort: ServiceParams["labelSequenceConfigProviderPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  // #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];

  constructor({
    testamentSelectionAdapterPort,
    testamentSelectionEventPort,
    pieceHighlighterPort,
    sectionSpawnerPort,
    stackUpdateServicePort,
    awaiterPort,
    labelSequenceConfigProviderPort,
    pieceAdapterPort,
    // pieceLifecycleServicePort,
  }: ServiceParams) {
    this.#testamentSelectionAdapterPort = testamentSelectionAdapterPort;
    this.#testamentSelectionEventPort = testamentSelectionEventPort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#sectionSpawnerPort = sectionSpawnerPort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    this.#awaiterPort = awaiterPort;
    this.#labelSequenceConfigProviderPort = labelSequenceConfigProviderPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    // this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
  }

  async #prepareSelection(data: StackTestamentData): Promise<void> {
    this.#testamentSelectionEventPort.emit("OnTestamentBeginSelect", { data });

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

  async #finalizeSelection(
    data: StackTestamentData,
    pacing: StackUpdatePacing = "Regular"
  ): Promise<void> {
    for (const sectionData of data.childrenData) {
      sectionData.becomeHighlightable();
    }
    const animations: Promise<void>[] = [];
    if (pacing === "Instant") return;

    for (const sectionData of data.getReversedChildren()) {
      if (!sectionData.piece) {
        throw new Error(
          "TestamentSelectionService: sectionData.piece not found at finalizeSelection"
        );
      }
      animations.push(
        this.#pieceHighlighterPort.tryHighlightPiece({
          piece: sectionData.piece,
          source: "Transition",
          scheduledUnhighlightData: {
            delay: 2000,
            pacing,
          },
          pacing,
        })
      );
      await this.#awaiterPort.sleep(
        (this.#labelSequenceConfigProviderPort.getShowSequenceDurationSeconds(
          pacing
        ) /
          3) *
          2 *
          1000
      );
    }
    await Promise.all(animations);

    data.childrenData.forEach((sectionData) => {
      this.#pieceAdapterPort.makeInteractable(sectionData.piece!);
    });

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

    await this.#finalizeSelection(data);
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
