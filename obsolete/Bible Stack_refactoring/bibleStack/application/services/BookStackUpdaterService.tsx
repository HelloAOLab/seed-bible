import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type {
  BookStackUpdaterPort as UpdaterServicePort,
  PrepareBookCommand,
  PrepareSectionBookCommand,
  PrepareCommand,
} from "../ports/in/BookStackUpdates";
import type { BookStackUpdaterPort as UpdaterAdapterPort } from "../ports/out/StackBookUpdater";
import type { BookChaptersManagementServicePort } from "../ports/bibleLifecycle";
import type { PieceLabelServicePort } from "../ports/pieceLifecycle";
import { BookShape } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

type BookEntity = StackBookData | StackSectionBookData;

interface ServiceParams {
  updaterAdapterPort: UpdaterAdapterPort;
  bookChaptersManagementServicePort: BookChaptersManagementServicePort;
  pieceLabelServicePort: PieceLabelServicePort;
}

export class BookStackUpdaterService implements UpdaterServicePort {
  #updaterAdapterPort: ServiceParams["updaterAdapterPort"];
  #bookChaptersManagementServicePort: ServiceParams["bookChaptersManagementServicePort"];
  #pieceLabelServicePort: ServiceParams["pieceLabelServicePort"];

  constructor({
    updaterAdapterPort,
    bookChaptersManagementServicePort,
    pieceLabelServicePort,
  }: ServiceParams) {
    this.#updaterAdapterPort = updaterAdapterPort;
    this.#bookChaptersManagementServicePort = bookChaptersManagementServicePort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
  }

  /**
   * Pre-flight: chapters are hidden BEFORE the shape transition (the render
   * adapter resets the book's shape). The management service no-ops when the
   * book isn't currently showing chapters.
   */
  prepareBook(command: PrepareCommand) {
    // The legacy only hid chapters when the book was actually showing them
    // (and, for a selected book, only inside a non-exploded section — that
    // exploded-view nuance needs the parent-section context the standalone
    // update flow doesn't carry, so it's left to the chapter service / a later
    // refinement).
    switch (command.data.type) {
      case "StackBook":
        this.#prepareRegularBook(command as PrepareBookCommand);
        break;

      case "StackSectionBook":
        this.#prepareSectionBook(command as PrepareSectionBookCommand);
        break;

      default:
        break;
    }
  }

  #prepareRegularBook(command: PrepareBookCommand) {
    if (command.data.isShowingChapters) {
      if (
        (command.data.selectionState === "Selected" &&
          command.sectionData &&
          !command.sectionData.isInExplodedView) ||
        command.data.selectionState === "Idle"
      ) {
        this.#bookChaptersManagementServicePort.hideChapters(command.data);
      }
    }
  }

  #prepareSectionBook(command: PrepareSectionBookCommand) {
    if (
      command.data.isShowingChapters &&
      command.data.selectionState === "Idle"
    ) {
      this.#bookChaptersManagementServicePort.hideChapters(command.data);
    }
  }

  /**
   * Post-flight: once the book has settled into its shape, re-show chapters and
   * show/hide its info label when it ended up Selected.
   */
  async finalizeBook(data: BookEntity): Promise<void> {
    const isSelectedShape = data.currentShape === BookShape.Selected;
    if (isSelectedShape) {
      this.#bookChaptersManagementServicePort.showChapters(data);
    }

    const piece = data.piece;
    if (!piece) return;

    try {
      if (isSelectedShape) {
        await this.#pieceLabelServicePort.showLabel({
          piece,
          translucencyMode: "Solid",
        });
      } else {
        await this.#pieceLabelServicePort.hideLabel(piece);
      }
    } catch {
      // No label currently attached to the book — nothing to toggle.
    }
  }

  async update({
    data,
    pacing,
  }: {
    data: BookEntity;
    pacing: StackUpdatePacing;
  }): Promise<void> {
    this.prepareBook(data.type === "StackSectionBook" ? { data } : { data });
    await this.#updaterAdapterPort.update({ data, pacing });
    await this.finalizeBook(data);
  }
}
