import type { BibleVizUtilsEvents } from "bibleVizUtils.domain.models.events";
import type { BookStaticInfoConfig } from "bibleVizUtils.infrastructure.models.arrangement";
import type { ArrangementInfoConfig as InfrastructureArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { ArrangementInfo as DomainArrangementInfo } from "bibleVizUtils.domain.models.arrangement";

export interface ArrangementConfigProviderPort {
  getStaticArrangements: () => readonly DomainArrangementInfo[];
}

export interface ArrangementEventPort {
  emit: <K extends "OnArrangementIndexChanged" | "OnCustomArrangementsChanged">(
    eventName: K,
    ...args: BibleVizUtilsEvents[K] extends undefined | void
      ? [payload?: BibleVizUtilsEvents[K]]
      : [payload: BibleVizUtilsEvents[K]]
  ) => void;
}

export interface CustomArrangementStorePort {
  tryAddArrangement: (arrangement: DomainArrangementInfo) => boolean;
  tryRemoveArrangement: (arrangement: DomainArrangementInfo) => boolean;
  getArrangements: () => DomainArrangementInfo[];
}

export interface BooksStaticInfoRepository {
  getBookStaticInfo: (book: string) => BookStaticInfoConfig | undefined;
}

export interface ArrangementAdapterPort {
  toDomain: (
    infrastructureArrangement: InfrastructureArrangementInfo
  ) => DomainArrangementInfo;
}
