import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { StackBookData } from "../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../domain/entities/StackSectionBookData";
import type {
  BookStackUpdaterPort as UpdaterServicePort,
  PrepareBookCommand,
  PrepareSectionBookCommand,
  PrepareCommand,
} from "../ports/in/BookStackUpdates";
import type {
  BookStackUpdaterPort as UpdaterAdapterPort,
  LoggerPort,
} from "../ports/out/StackBookUpdater";
import type { BookChaptersManagementServicePort } from "../ports/bibleLifecycle";
import type { PieceLabelServicePort } from "../ports/pieceLifecycle";
import { BookShapes } from "../../domain/models/canvas";

type BookEntity = StackBookData | StackSectionBookData;

interface ServiceParams {
  updaterAdapterPort: UpdaterAdapterPort;
  bookChaptersManagementServicePort: BookChaptersManagementServicePort;
  pieceLabelServicePort: PieceLabelServicePort;
  loggerPort: LoggerPort;
}

export class BookStackUpdaterService implements UpdaterServicePort {
  #updaterAdapterPort: ServiceParams["updaterAdapterPort"];
  #bookChaptersManagementServicePort: ServiceParams["bookChaptersManagementServicePort"];
  #pieceLabelServicePort: ServiceParams["pieceLabelServicePort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    updaterAdapterPort,
    bookChaptersManagementServicePort,
    pieceLabelServicePort,
    loggerPort,
  }: ServiceParams) {
    this.#updaterAdapterPort = updaterAdapterPort;
    this.#bookChaptersManagementServicePort = bookChaptersManagementServicePort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#loggerPort = loggerPort;
  }

  /**
   * Pre-flight: chapters are hidden BEFORE the shape transition (the render
   * adapter resets the book's shape). The management service no-ops when the
   * book isn't currently showing chapters.
   */
  prepareBook(command: PrepareCommand): boolean {
    switch (command.data.type) {
      case "StackBook":
        return this.#prepareRegularBook(command as PrepareBookCommand);

      case "StackSectionBook":
        return this.#prepareSectionBook(command as PrepareSectionBookCommand);

      default:
        return false;
    }
  }

  #prepareRegularBook(command: PrepareBookCommand): boolean {
    if (!command.data.piece) {
      this.#loggerPort.error(
        "BookStackUpdaterService: command.data.piece not defined at prepareRegularBook"
      );
      return false;
    }
    if (command.data.isShowingChapters) {
      if (
        (command.data.selectionState === "Selected" &&
          command.sectionData &&
          !command.sectionData.isInExplodedView) ||
        command.data.selectionState === "Deselecting"
      ) {
        this.#bookChaptersManagementServicePort.hideChapters(command.data);
        this.#pieceLabelServicePort.hideLabel(command.data.piece);
      }
    }
    return true;
  }

  #prepareSectionBook(command: PrepareSectionBookCommand): boolean {
    if (!command.data.piece) {
      this.#loggerPort.error(
        "BookStackUpdaterService: command.data.piece not defined at prepareRegularBook"
      );
      return false;
    }
    if (
      command.data.isShowingChapters &&
      command.data.selectionState === "Deselecting"
    ) {
      this.#bookChaptersManagementServicePort.hideChapters(command.data);
      this.#pieceLabelServicePort.hideLabel(command.data.piece);
    }
    return true;
  }

  /**
   * Post-flight: once the book has settled into its shape, re-show chapters and
   * show/hide its info label when it ended up Selected.
   */
  async finalizeBook(data: BookEntity): Promise<void> {
    const isSelectedShape = data.currentShape === BookShapes.Selected;
    if (isSelectedShape) {
      this.#bookChaptersManagementServicePort.showChapters(data);

      const piece = data.piece!;

      try {
        await this.#pieceLabelServicePort.showLabel({
          piece,
          translucencyMode: "Solid",
        });
      } catch (error) {
        this.#loggerPort.error(
          "BookStackUpdaterService: showLabel failed at finalizeBook",
          error
        );
      }
    }
  }

  async update({
    data,
    pacing,
  }: {
    data: BookEntity;
    pacing: StackUpdatePacing;
  }): Promise<void> {
    // Both branches are identical on purpose: the ternary narrows `data` per
    // branch (StackSectionBookData vs StackBookData) so each `{ data }` matches
    // a concrete member of the PrepareCommand union. A single `{ data }` would
    // type as the un-narrowed union and fail to assign.
    const prepared = this.prepareBook(
      data.type === "StackSectionBook" ? { data } : { data }
    );
    if (!prepared) return;

    try {
      await this.#updaterAdapterPort.update({ data, pacing });
      await this.finalizeBook(data);
    } catch (error) {
      this.#loggerPort.error("BookStackUpdaterService: Error at update", {
        error,
      });
    }
  }
}
