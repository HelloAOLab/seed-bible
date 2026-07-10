import type { Piece } from "../../../domain/models/canvas";

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
