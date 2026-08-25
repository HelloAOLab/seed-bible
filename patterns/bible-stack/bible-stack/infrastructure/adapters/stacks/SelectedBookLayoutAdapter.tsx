import type { StackBookData } from "../../../domain/entities/StackBookData";
import type { StackSectionBookData } from "../../../domain/entities/StackSectionBookData";
import type { SelectedBookLayout } from "../../../application/ports/out/StackBookUpdater";
import type { VisualStateRegistry } from "./VisualStateRegistry";
import type { LayoutConfigProvider } from "../../config/layout/LayoutConfigProvider";

interface AdapterParams {
  sectionBookVisualStateRegistryPort: VisualStateRegistry;
  stackConfigProviderPort: LayoutConfigProvider;
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
    if (
      (data.selectionState !== "Selected" &&
        data.selectionState !== "Selecting") ||
      !data.piece
    ) {
      return {};
    }

    let scaleX: number;
    let chaptersCount: number;

    switch (data.type) {
      case "StackBook": {
        scaleX =
          this.#stackConfigProviderPort.getStackPieceMeasurement(
            "BookScales"
          ).x;
        chaptersCount = data.pieceInfo.numberOfChapters;
        break;
      }
      case "StackSectionBook": {
        scaleX = this.#sectionBookVisualStateRegistryPort.getStateProperty({
          piece: data.piece,
          property: "unhoveredScales",
        }).x;
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

    const columns = Math.max(
      1,
      Math.floor(scaleX / (chapterWidth + chapterGap * 2))
    );
    const rows = Math.ceil(chaptersCount / columns) + 1;
    const height = rows * (chapterHeight + chapterGap * 2);

    return { columns, rows, height };
  }
}
