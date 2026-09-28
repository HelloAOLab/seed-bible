import type {
  SectionInfoConfig as InfrastructureSectionInfo,
  ArrangementInfoConfig,
} from "../models/arrangement";
import type { SectionInfo as DomainSectionInfo } from "../../domain/models/arrangement";
import { BookInfoMapper } from "./BookInfoMapper";

interface MapperParams {
  bookInfoMapper: BookInfoMapper;
  getArrangement: () => ArrangementInfoConfig | undefined;
}

export class SectionInfoMapper {
  #bookInfoMapper: MapperParams["bookInfoMapper"];
  #getArrangement: MapperParams["getArrangement"];

  constructor({ bookInfoMapper, getArrangement }: MapperParams) {
    this.#bookInfoMapper = bookInfoMapper;
    this.#getArrangement = getArrangement;
  }

  toDomain(
    info: InfrastructureSectionInfo,
    path: DomainSectionInfo["path"]
  ): DomainSectionInfo {
    return {
      name: info.name,
      color: info.color,
      path,
      translationKey: info.translationKey,
      books: info.books.map((book, bookIndex) =>
        this.#bookInfoMapper.toDomain(book, { ...path, bookIndex })
      ),
    };
  }

  toInfrastructure(info: DomainSectionInfo): InfrastructureSectionInfo {
    const { testamentIndex, sectionIndex } = info.path;

    const arrangement = this.#getArrangement();
    if (!arrangement) {
      throw new Error(
        `SectionInfoMapper: arrangement not found at toInfrastructure`
      );
    }

    const infrastructureInfo =
      arrangement.testaments[testamentIndex]?.sections[sectionIndex];

    if (!infrastructureInfo) {
      throw new Error(
        `SectionInfoMapper: infrastructureInfo not found at toInfrastructure`
      );
    }

    return infrastructureInfo;
  }
}
