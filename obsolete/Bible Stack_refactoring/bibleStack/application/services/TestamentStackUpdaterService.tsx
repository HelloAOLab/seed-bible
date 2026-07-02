import type { StackTestamentData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackTestamentData";
import type { StackUpdatePacing } from "../../domain/models/stacks";
import type { TestamentStackUpdaterPort as UpdaterServicePort } from "../ports/in/TestamentStackUpdater";
import type { TestamentStackUpdaterPort as UpdaterAdapterPort } from "../ports/out/StackTestamentUpdater";
import type { SectionStackUpdaterPort } from "../ports/in/SectionStackUpdates";
import type { BookStackUpdaterPort } from "../ports/in/BookStackUpdates";

interface ServiceParams {
  updaterAdapterPort: UpdaterAdapterPort;
  sectionUpdaterPort: SectionStackUpdaterPort;
  bookStackUpdaterPort: BookStackUpdaterPort;
}

export class TestamentStackUpdaterService implements UpdaterServicePort {
  #updaterAdapterPort: ServiceParams["updaterAdapterPort"];
  #sectionUpdaterPort: ServiceParams["sectionUpdaterPort"];
  #bookStackUpdaterPort: ServiceParams["bookStackUpdaterPort"];

  constructor({
    updaterAdapterPort,
    sectionUpdaterPort,
    bookStackUpdaterPort,
  }: ServiceParams) {
    this.#updaterAdapterPort = updaterAdapterPort;
    this.#sectionUpdaterPort = sectionUpdaterPort;
    this.#bookStackUpdaterPort = bookStackUpdaterPort;
  }

  /**
   * Pre-flight wrapper: prepare the testament's direct active children — true
   * sections (→ section updater, which cascades to their books) and single-book
   * sections (→ book updater directly). Callable from the testament's own
   * update or from the bible, so the bible doesn't skip this layer.
   */
  prepareTestament(data: StackTestamentData): void {
    if (!data.isSplitIntoSections || data.isEmpty()) return;

    for (const child of data.getActiveSections()) {
      if (child.type === "StackSection") {
        this.#sectionUpdaterPort.prepareSection(child);
      } else {
        this.#bookStackUpdaterPort.prepareBook({ data: child });
      }
    }
  }

  /** Post-flight mirror of prepareTestament. */
  async finalizeTestament(data: StackTestamentData): Promise<void> {
    if (!data.isSplitIntoSections || data.isEmpty()) return;

    for (const child of data.getActiveSections()) {
      if (child.type === "StackSection") {
        await this.#sectionUpdaterPort.finalizeSection(child);
      } else {
        await this.#bookStackUpdaterPort.finalizeBook(child);
      }
    }
  }

  async update({
    data,
    pacing,
  }: {
    data: StackTestamentData;
    pacing: StackUpdatePacing;
  }): Promise<void> {
    if (!data.isSplitIntoSections || data.isEmpty()) return;

    this.prepareTestament(data);
    await this.#updaterAdapterPort.update({ data, pacing });
    await this.finalizeTestament(data);
  }
}
