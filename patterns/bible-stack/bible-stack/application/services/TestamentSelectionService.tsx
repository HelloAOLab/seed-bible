import type { StackTestamentData } from "../../domain/entities/StackTestamentData";
import type { PieceSelectionSource } from "../../domain/models/canvas";
import type { TestamentSelectionPort } from "../ports/in/TestamentSelection";
import type {
  AwaiterPort,
  LabelSequenceConfigProviderPort,
  TestamentSelectionAdapterPort,
  PieceAdapterPort,
} from "../ports/out/TestamentSelection";
import type { SectionSpawnerPort } from "../ports/in/PieceSpawn";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
// import type { PieceLifecycleServicePort } from "../ports/in/PieceLifecycle";
import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { PieceHighlighterPort } from "../ports/in/PieceHighlight";
import type { LoggerPort } from "../ports/out/Logger";
import type { EventManagerPort } from "../ports/out/EventManager";
import type { BibleStackEvents } from "../../domain/models/events";

interface ServiceParams {
  testamentSelectionAdapterPort: TestamentSelectionAdapterPort;
  eventManagerPort: EventManagerPort<BibleStackEvents>;
  pieceHighlighterPort: PieceHighlighterPort;
  sectionSpawnerPort: SectionSpawnerPort;
  stackUpdateServicePort: StackUpdateServicePort;
  awaiterPort: AwaiterPort;
  labelSequenceConfigProviderPort: LabelSequenceConfigProviderPort;
  pieceAdapterPort: PieceAdapterPort;
  loggerPort: LoggerPort;
  // pieceLifecycleServicePort: PieceLifecycleServicePort;
}

export class TestamentSelectionService implements TestamentSelectionPort {
  #testamentSelectionAdapterPort: ServiceParams["testamentSelectionAdapterPort"];
  #eventManagerPort: ServiceParams["eventManagerPort"];
  #pieceHighlighterPort: ServiceParams["pieceHighlighterPort"];
  #sectionSpawnerPort: ServiceParams["sectionSpawnerPort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];
  #awaiterPort: ServiceParams["awaiterPort"];
  #labelSequenceConfigProviderPort: ServiceParams["labelSequenceConfigProviderPort"];
  #pieceAdapterPort: ServiceParams["pieceAdapterPort"];
  #loggerPort: ServiceParams["loggerPort"];
  // #pieceLifecycleServicePort: ServiceParams["pieceLifecycleServicePort"];

  constructor({
    testamentSelectionAdapterPort,
    eventManagerPort,
    pieceHighlighterPort,
    sectionSpawnerPort,
    stackUpdateServicePort,
    awaiterPort,
    labelSequenceConfigProviderPort,
    pieceAdapterPort,
    loggerPort,
    // pieceLifecycleServicePort,
  }: ServiceParams) {
    this.#testamentSelectionAdapterPort = testamentSelectionAdapterPort;
    this.#eventManagerPort = eventManagerPort;
    this.#pieceHighlighterPort = pieceHighlighterPort;
    this.#sectionSpawnerPort = sectionSpawnerPort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    this.#awaiterPort = awaiterPort;
    this.#labelSequenceConfigProviderPort = labelSequenceConfigProviderPort;
    this.#pieceAdapterPort = pieceAdapterPort;
    this.#loggerPort = loggerPort;
    // this.#pieceLifecycleServicePort = pieceLifecycleServicePort;
  }

  async #prepareSelection(data: StackTestamentData): Promise<boolean> {
    this.#eventManagerPort.emit("OnTestamentBeginSelect", { data });

    const selecting = data.changeSelectionState("RequestSelect");

    if (!selecting) {
      this.#loggerPort.error(
        "TestamentSelectionService: testament not selecting at prepareSelection."
      );
      return false;
    }

    const bibleId = data.getParentId("stackBibleId");
    if (data.isInsideBible && bibleId) {
      await this.#pieceHighlighterPort.unhighlightBiblePieces(bibleId);
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
    return true;
  }

  async #finalizeSelection(
    data: StackTestamentData,
    pacing: StackUpdatePacing = "Regular"
  ): Promise<void> {
    for (const sectionData of data.childrenData) {
      sectionData.becomeHighlightable();
    }

    if (pacing !== "Instant") await this.#highlightChildren(data, pacing);

    data.childrenData.forEach((sectionData) => {
      this.#pieceAdapterPort.makeInteractable(sectionData.piece!);
    });

    this.#eventManagerPort.emit("OnTestamentEndSelect", { data });
  }

  async #highlightChildren(
    data: StackTestamentData,
    pacing: StackUpdatePacing
  ): Promise<void> {
    const animations: Promise<void>[] = [];

    for (const sectionData of data.getReversedChildren()) {
      if (!sectionData.piece) {
        this.#loggerPort.error(
          "TestamentSelectionService: sectionData.piece not found at finalizeSelection"
        );
        continue;
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
  }

  async select({
    data,
    pacing = "Regular",
  }: {
    data: StackTestamentData;
    pacing?: StackUpdatePacing;
    source: PieceSelectionSource;
  }): Promise<void> {
    const prepared = await this.#prepareSelection(data);
    if (!prepared) return;

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

    await this.#finalizeSelection(data, pacing);
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
