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
  prepareBook(command: PrepareCommand) {
    // The legacy only hid chapters when the book was actually showing them
    // (and, for a selected book, only inside a non-exploded section). That
    // selected/non-exploded branch needs the parent-section context, which the
    // standalone update() flow doesn't carry — so from update() only the
    // Deselecting path fires. It IS reachable when a split section drives the
    // update: SectionStackUpdaterService.prepareSection passes sectionData for
    // each of its books, which enables the selected/non-exploded chapter-hide.
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
        command.data.selectionState === "Deselecting"
      ) {
        this.#bookChaptersManagementServicePort.hideChapters(command.data);
        if (!command.data.piece) {
          throw new Error(
            "BookStackUpdaterService: command.data.piece not defined at prepareRegularBook"
          );
        }
        this.#pieceLabelServicePort.hideLabel(command.data.piece);
      }
    }
  }

  #prepareSectionBook(command: PrepareSectionBookCommand) {
    if (
      command.data.isShowingChapters &&
      command.data.selectionState === "Deselecting"
    ) {
      this.#bookChaptersManagementServicePort.hideChapters(command.data);
      if (!command.data.piece) {
        throw new Error(
          "BookStackUpdaterService: command.data.piece not defined at prepareRegularBook"
        );
      }
      this.#pieceLabelServicePort.hideLabel(command.data.piece);
    }
  }

  /**
   * Post-flight: once the book has settled into its shape, re-show chapters and
   * show/hide its info label when it ended up Selected.
   */
  async finalizeBook(data: BookEntity): Promise<void> {
    const isSelectedShape = data.currentShape === BookShapes.Selected;
    if (isSelectedShape) {
      this.#bookChaptersManagementServicePort.showChapters(data);

      const piece = data.piece;
      if (!piece) return;

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
    this.prepareBook(data.type === "StackSectionBook" ? { data } : { data });
    await this.#updaterAdapterPort.update({ data, pacing });
    await this.finalizeBook(data);
  }
}
