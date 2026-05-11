import type { BookInfo as InfrastructureBookInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { BookInfo as DomainBookInfo } from "bibleVizUtils.domain.models.arrangement";

export interface BookInfoMapperPort {
  toDomain: (
    info: InfrastructureBookInfo,
    path: DomainBookInfo["path"]
  ) => DomainBookInfo;
}
