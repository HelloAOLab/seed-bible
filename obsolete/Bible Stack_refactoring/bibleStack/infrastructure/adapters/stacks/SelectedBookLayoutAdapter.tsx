import type { StackBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackBookData";
import type { StackSectionBookData } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/entities/StackSectionBookData";
import type {
  SectionBookVisualStateRegistryPort,
  StackConfigProviderPort,
} from "@packages/Bible Stack/bibleStack/application/ports/out/SelectedBookLayout";
import type { SelectedBookLayout } from "@packages/Bible Stack/bibleStack/application/ports/out/StackBookUpdater";

interface AdapterParams {
  sectionBookVisualStateRegistryPort: SectionBookVisualStateRegistryPort;
  stackConfigProviderPort: StackConfigProviderPort;
}

/**
 * Computes the chapter grid (columns / rows / height) a selected book needs.
 * Lives in infrastructure so it can be injected directly into the render
 * adapters instead of being orchestrated from the application layer.
 */
export class SelectedBookLayoutAdapter {
  #sectionBookVisualStateRegistryPort: AdapterParams["sectionBookVisualStateRegistryPort"];
  #stackConfigProviderPort: AdapterParams["stackConfigProviderPort"];

  constructor({
    sectionBookVisualStateRegistryPort,
    stackConfigProviderPort,
  }: AdapterParams) {
    this.#sectionBookVisualStateRegistryPort =
      sectionBookVisualStateRegistryPort;
    this.#stackConfigProviderPort = stackConfigProviderPort;
  }

  computeLayout(
    data: StackBookData | StackSectionBookData
  ): SelectedBookLayout {
    if (data.selectionState !== "Selected" || !data.piece) {
      return {};
    }

    let scaleX: number;
    let chaptersCount: number;

    switch (data.type) {
      case "StackBook": {
        scaleX =
          this.#stackConfigProviderPort.getStackPieceMeasurement(
            "SingleBooksScaleX"
          );
        chaptersCount = data.pieceInfo.numberOfChapters;
        break;
      }
      case "StackSectionBook": {
        scaleX =
          this.#sectionBookVisualStateRegistryPort.getSectionBookInitialScaleX(
            data.piece
          );
        chaptersCount = data.pieceBookInfo.numberOfChapters;
        break;
      }
      default:
        return {};
    }

    const chapterWidth =
      this.#stackConfigProviderPort.getStackPieceMeasurement("ChapterWidth");
    const chapterGap =
      this.#stackConfigProviderPort.getStackSpacing("ChapterGap");
    const chapterHeight =
      this.#stackConfigProviderPort.getStackPieceMeasurement("ChapterHeight");

    const columns = Math.floor(scaleX / (chapterWidth + chapterGap * 2));
    const rows = Math.ceil(chaptersCount / columns) + 1;
    const height = rows * (chapterHeight + chapterGap * 2);

    return { columns, rows, height };
  }
}
