import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { SectionStackUpdaterPort as UpdaterServicePort } from "../ports/in/SectionStackUpdates";
import type {
  SectionStackUpdaterPort as UpdaterAdapterPort,
  LoggerPort,
} from "../ports/out/StackSectionUpdater";
import type { BookStackUpdaterPort } from "../ports/in/BookStackUpdates";
import type {
  PieceLabelServicePort,
  StackPieceLifecycleAdapterPort,
} from "../ports/pieceLifecycle";

interface ServiceParams {
  updaterAdapterPort: UpdaterAdapterPort;
  bookStackUpdaterPort: BookStackUpdaterPort;
  pieceLifecyclePort: StackPieceLifecycleAdapterPort;
  pieceLabelServicePort: PieceLabelServicePort;
  loggerPort: LoggerPort;
}

export class SectionStackUpdaterService implements UpdaterServicePort {
  #updaterAdapterPort: ServiceParams["updaterAdapterPort"];
  #bookStackUpdaterPort: ServiceParams["bookStackUpdaterPort"];
  #pieceLifecyclePort: ServiceParams["pieceLifecyclePort"];
  #pieceLabelServicePort: ServiceParams["pieceLabelServicePort"];
  #loggerPort: ServiceParams["loggerPort"];

  constructor({
    updaterAdapterPort,
    bookStackUpdaterPort,
    pieceLifecyclePort,
    pieceLabelServicePort,
    loggerPort,
  }: ServiceParams) {
    this.#updaterAdapterPort = updaterAdapterPort;
    this.#bookStackUpdaterPort = bookStackUpdaterPort;
    this.#pieceLifecyclePort = pieceLifecyclePort;
    this.#pieceLabelServicePort = pieceLabelServicePort;
    this.#loggerPort = loggerPort;
  }

  /**
   * Pre-flight: instantiate and attach the shadow a split section needs BEFORE
   * any render engine runs, so visual adapters can assume it already exists.
   * Safe to call from any entry point (single update, testament, or bible).
   */
  prepareSection(data: StackSectionData): void {
    if (!data.isSplitIntoBooks) return;

    if (!data.shadow) {
      const shadowDomain = this.#pieceLifecyclePort.spawnSectionShadowDomain(
        data.id
      );
      data.attachShadow(shadowDomain);
      data.markShadowForReveal();
    }

    if (!data.isInExplodedView) {
      this.#pieceLabelServicePort.hideLabel(data.shadow!);
    }

    // A split section owns the pre-flight of its books: prepare each before the
    // section's render engine lays them out. The section context lets the book
    // updater honour the selected/non-exploded chapter-hide nuance.
    for (const book of data.getActiveBooks()) {
      this.#bookStackUpdaterPort.prepareBook({ data: book, sectionData: data });
    }
  }

  /**
   * Post-flight: the section info label follows the exploded-view state. Runs
   * AFTER the visual update so the label can anchor to the settled shadow.
   */
  async finalizeSection(data: StackSectionData): Promise<void> {
    // Mirror of prepareSection: a split section finalizes its books afterwards.
    if (data.isSplitIntoBooks) {
      await Promise.all(
        data.getActiveBooks().map((book) => {
          return this.#bookStackUpdaterPort.finalizeBook(book);
        })
      );
    }

    const shadow = data.shadow;
    if (!shadow) return;

    try {
      if (data.isInExplodedView) {
        await this.#pieceLabelServicePort.showLabel({
          piece: shadow,
          translucencyMode: "Solid",
        });
      } else {
        await this.#pieceLabelServicePort.hideLabel(shadow);
      }
    } catch (error) {
      this.#loggerPort.error(
        "SectionStackUpdaterService: showLabel failed at finalizeSection",
        error
      );
    }
  }

  /**
   * Single-section entry point: runs the scoped two-pass pipeline end to end.
   */
  async update({
    data,
    pacing,
  }: {
    data: StackSectionData;
    pacing: StackUpdatePacing;
  }): Promise<void> {
    this.prepareSection(data);
    await this.#updaterAdapterPort.update({ data, pacing });
    await this.finalizeSection(data);
  }
}
