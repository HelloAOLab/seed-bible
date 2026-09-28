import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { ExplodedViewServicePort } from "../ports/in/ExplodedView";
import type { PieceHierarchyServicePort } from "../ports/in/PieceHierarchy";
import { BibleVisualizationStates } from "../../domain/models/canvas";
import type { StackUpdateServicePort } from "../ports/in/StackUpdate";
import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { PieceActivityServicePort } from "../ports/in/PieceActivity";
import type { ExplodedViewEventPort } from "../ports/out/ExplodedView";

interface ServiceParams {
  pieceHierarchyServicePort: PieceHierarchyServicePort;
  stackUpdateServicePort: StackUpdateServicePort;
  pieceActivityServicePort: PieceActivityServicePort;
  bibleStackEventPort: ExplodedViewEventPort;
}

export class ExplodedViewService implements ExplodedViewServicePort {
  #currentExplodedSection: StackSectionData | undefined;
  #pieceHierarchyServicePort: ServiceParams["pieceHierarchyServicePort"];
  #stackUpdateServicePort: ServiceParams["stackUpdateServicePort"];
  #pieceActivityServicePort: ServiceParams["pieceActivityServicePort"];
  #bibleStackEventPort: ServiceParams["bibleStackEventPort"];

  constructor({
    pieceHierarchyServicePort,
    stackUpdateServicePort,
    pieceActivityServicePort,
    bibleStackEventPort,
  }: ServiceParams) {
    this.#pieceHierarchyServicePort = pieceHierarchyServicePort;
    this.#stackUpdateServicePort = stackUpdateServicePort;
    this.#pieceActivityServicePort = pieceActivityServicePort;
    this.#bibleStackEventPort = bibleStackEventPort;
  }

  get currentExplodedSection(): StackSectionData | undefined {
    return this.#currentExplodedSection;
  }

  registerExplodedSection(section: StackSectionData): void {
    this.#currentExplodedSection = section;
  }

  async explodeSection({
    data,
    pacing,
  }: {
    data: StackSectionData;
    pacing?: StackUpdatePacing;
  }): Promise<void> {
    const { bibleData, testamentData } =
      this.#pieceHierarchyServicePort.getParentDataChain(
        data.parentDataIds ?? {}
      );

    if (
      (testamentData && !bibleData) ||
      bibleData?.currentStackVizState === BibleVisualizationStates.Regular
    ) {
      if (this.#currentExplodedSection) {
        this.#currentExplodedSection.implode();
      }
    }

    data.explode();
    this.registerExplodedSection(data);
    const stack = (data.parentDataIds
      ? data.getOldestAncestor()
      : undefined) ?? {
      id: data.id,
      type: data.type,
    };
    await this.#stackUpdateServicePort.updateStack(
      stack.id,
      stack.type,
      pacing ?? "Regular"
    );

    this.#pieceActivityServicePort.updateAllNotifications();

    this.#bibleStackEventPort.emit("OnStackSectionExploded", {
      sectionData: data,
    });
  }
}
