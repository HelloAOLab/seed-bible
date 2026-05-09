import type { ArrangementInfo as InfrastructureArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { ArrangementInfo as DomainArrangementInfo } from "bibleVizUtils.domain.models.arrangement";
import type { BookInfoMapperPort } from "bibleVizUtils.infrastructure.ports.arrangement";

export class ArrangementAdapter {
  #bookInfoMapperPort: BookInfoMapperPort | undefined;

  setBookInfoMapperPort(port: BookInfoMapperPort) {
    this.#bookInfoMapperPort = port;
  }

  toDomain(
    infrastructureArrangement: InfrastructureArrangementInfo
  ): DomainArrangementInfo {
    if (!this.#bookInfoMapperPort) {
      throw new Error(
        "ArrangementAdapter: bookInfoMapperPort not set. Call setBookInfoMapperPort before toDomain."
      );
    }
    return {
      ...infrastructureArrangement,
      testaments: infrastructureArrangement.testaments.map(
        (testament, testamentIndex) => {
          return {
            ...testament,
            sections: testament.sections.map((section, sectionIndex) => {
              return {
                name: section.name,
                color: section.color,
                path: {
                  arrangementName: infrastructureArrangement.name,
                  testamentIndex,
                  sectionIndex,
                },
                books: section.books.map((book, bookIndex) => {
                  return (
                    this.#bookInfoMapperPort as BookInfoMapperPort
                  ).toDomain(book, {
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
