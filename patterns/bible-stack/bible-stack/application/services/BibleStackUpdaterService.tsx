import type { StackBibleData } from "../../domain/entities/StackBibleData";
import type { BibleStackUpdaterPort } from "../ports/in/BibleStackUpdater";
import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { BibleStackUpdaterAdapterPort } from "../ports/out/BibleStackUpdater";
import type { LoggerPort } from "../ports/in/Logger";
import type { TestamentStackUpdaterPort } from "../ports/in/TestamentStackUpdater";

interface ServiceParams {
  updaterAdapterPort: BibleStackUpdaterAdapterPort;
  testamentUpdaterPort: TestamentStackUpdaterPort;
  loggerPort: LoggerPort;
}

interface UpdateParams {
  data: StackBibleData;
  pacing: StackUpdatePacing;
}

export class BibleStackUpdaterService implements BibleStackUpdaterPort {
  #updaterAdapterPort: ServiceParams["updaterAdapterPort"];
  #testamentUpdaterPort: ServiceParams["testamentUpdaterPort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    updaterAdapterPort,
    testamentUpdaterPort,
    loggerPort,
  }: ServiceParams) {
    this.#updaterAdapterPort = updaterAdapterPort;
    this.#testamentUpdaterPort = testamentUpdaterPort;
    this.#loggerPort = loggerPort;
  }

  async update({ data, pacing }: UpdateParams): Promise<void> {
    const isBibleEmpty = data.isEmpty();
    const shouldCrossGoInMiddle =
      data.areAllTestamentsSelected() && !isBibleEmpty;
    const activeTestaments = data.getActiveTestaments("StackSection");
    const currentCrossPosition = data.currentCrossPosition;

    const lowerCover = data.getStaticPiece("lowerCover");
    const upperCover = data.getStaticPiece("upperCover");
    const crossHorizontalLine = data.getStaticPiece("crossHorizontalLine");
    const crossVerticalLine = data.getStaticPiece("crossVerticalLine");

    if (
      !lowerCover ||
      !upperCover ||
      !crossHorizontalLine ||
      !crossVerticalLine
    ) {
      this.#loggerPort.error(
        `BibleStackUpdaterService: Static pieces not found`,
        {
          lowerCover,
          upperCover,
          crossHorizontalLine,
          crossVerticalLine,
        }
      );
      return;
    }

    // Pre-flight: delegate to each active testament, which prepares its own
    // sections/section-books (cascading down to books). The bible no longer
    // reaches past the testament layer.
    for (const testament of activeTestaments) {
      this.#testamentUpdaterPort.prepareTestament(testament);
    }

    const { targetCrossPosition } = await this.#updaterAdapterPort.update({
      pacing,
      lowerCover,
      upperCover,
      crossHorizontalLine,
      crossVerticalLine,
      isBibleEmpty,
      shouldCrossGoInMiddle,
      activeTestaments,
      currentCrossPosition,
    });

    // Post-flight: finalize each active testament.
    for (const testament of activeTestaments) {
      await this.#testamentUpdaterPort.finalizeTestament(testament);
    }

    if (targetCrossPosition !== currentCrossPosition) {
      data.changeCrossPosition(targetCrossPosition);
    }
  }
}
