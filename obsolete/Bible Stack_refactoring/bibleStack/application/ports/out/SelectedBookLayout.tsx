import type { Piece } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/canvas";

interface MeasurementMap {
  SingleBooksScaleX: number;
  ChapterWidth: number;
  ChapterHeight: number;
}

export interface SectionBookVisualStateRegistryPort {
  getSectionBookInitialScaleX(piece: Piece<"StackSectionBook">): number;
}

export interface StackConfigProviderPort {
  getStackPieceMeasurement<K extends keyof MeasurementMap>(
    key: K
  ): MeasurementMap[K];
  getStackSpacing(key: "ChapterGap"): number;
}
