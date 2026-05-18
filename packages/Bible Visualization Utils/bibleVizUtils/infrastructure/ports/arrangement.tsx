import type {
  BookInfoConfig,
  SectionInfoConfig,
} from "bibleVizUtils.infrastructure.models.arrangement";
import type {
  BookInfo,
  SectionInfo,
} from "bibleVizUtils.domain.models.arrangement";

export interface BookInfoMapperPort {
  toDomain: (info: BookInfoConfig, path: BookInfo["path"]) => BookInfo;
}

export interface SectionInfoMapperPort {
  toDomain: (info: SectionInfoConfig, path: SectionInfo["path"]) => SectionInfo;
}
