import type {
  BookInfo as InfrastructureBookInfo,
  SectionInfo as InfrastructureSectionInfo,
} from "bibleVizUtils.infrastructure.models.arrangement";
import type {
  BookInfo as DomainBookInfo,
  SectionInfo as DomainSectionInfo,
} from "bibleVizUtils.domain.models.arrangement";

export interface BookInfoMapperPort {
  toDomain: (
    info: InfrastructureBookInfo,
    path: DomainBookInfo["path"]
  ) => DomainBookInfo;
}

export interface SectionInfoMapperPort {
  toDomain: (
    info: InfrastructureSectionInfo,
    path: DomainSectionInfo["path"]
  ) => DomainSectionInfo;
}
