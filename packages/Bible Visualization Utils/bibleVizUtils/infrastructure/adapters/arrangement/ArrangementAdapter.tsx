import type { ArrangementInfo as InfrastructureArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { ArrangementInfo as DomainArrangementInfo } from "bibleVizUtils.domain.models.arrangement";
import type { BookInfoMapperPort } from "bibleVizUtils.infrastructure.ports.arrangement";

interface AdapterParams {
  bookInfoMapperPort: BookInfoMapperPort;
}

export class ArrangementAdapter {
  #bookInfoMapperPort: AdapterParams["bookInfoMapperPort"];

  constructor({ bookInfoMapperPort }: AdapterParams) {
    this.#bookInfoMapperPort = bookInfoMapperPort;
  }

  toDomain(
    infrastructureArrangement: InfrastructureArrangementInfo
  ): DomainArrangementInfo {
    return {
      ...infrastructureArrangement,
      testaments: infrastructureArrangement.testaments.map(
        (testament, testamentIndex) => {
          return {
            ...testament,
            sections: testament.sections.map((section, sectionIndex) => {
              return {
                ...section,
                books: section.books.map((book, bookIndex) => {
                  return this.#bookInfoMapperPort.toDomain(book, {
                    arrangementName: infrastructureArrangement.name,
                    testamentIndex,
                    sectionIndex,
                    bookIndex,
                  });
                }),
              };
            }),
          };
        }
      ),
    };
  }
}
