import type { SeedBibleUtilsEvents } from "@packages/seed-bible-utils/domain/models/events";
import type { BookStaticInfo } from "../models/arrangement";
// import type { ArrangementInfoConfig as InfrastructureArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { ArrangementInfo } from "../models/arrangement";

export interface ArrangementConfigProviderPort {
  getStaticArrangements: () => readonly ArrangementInfo[];
}

export interface ArrangementEventPort {
  emit: <K extends "OnArrangementIndexChanged" | "OnCustomArrangementsChanged">(
    eventName: K,
    ...args: SeedBibleUtilsEvents[K] extends undefined | void
      ? [payload?: SeedBibleUtilsEvents[K]]
      : [payload: SeedBibleUtilsEvents[K]]
  ) => void;
}

export interface CustomArrangementStorePort {
  tryAddArrangement: (arrangement: ArrangementInfo) => boolean;
  tryRemoveArrangement: (arrangement: ArrangementInfo) => boolean;
  getArrangements: () => ArrangementInfo[];
}

export interface BooksStaticInfoRepository {
  getBookStaticInfo: (book: string) => BookStaticInfo | undefined;
}

// export interface ArrangementAdapterPort {
//   toDomain: (
//     infrastructureArrangement: InfrastructureArrangementInfo
//   ) => ArrangementInfo;
// }
