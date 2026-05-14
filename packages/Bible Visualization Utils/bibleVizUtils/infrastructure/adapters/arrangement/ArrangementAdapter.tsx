import type { ArrangementInfo as InfrastructureArrangementInfo } from "bibleVizUtils.infrastructure.models.arrangement";
import type { ArrangementInfo as DomainArrangementInfo } from "bibleVizUtils.domain.models.arrangement";
import type { SectionInfoMapperPort } from "bibleVizUtils.infrastructure.ports.arrangement";

export class ArrangementAdapter {
  #sectionInfoMapperPort: SectionInfoMapperPort | undefined;

  setSectionInfoMapperPort(port: SectionInfoMapperPort) {
    this.#sectionInfoMapperPort = port;
  }

  toDomain(
    infrastructureArrangement: InfrastructureArrangementInfo
  ): DomainArrangementInfo {
    if (!this.#sectionInfoMapperPort) {
      throw new Error(
        "ArrangementAdapter: sectionInfoMapperPort not set. Call setSectionInfoMapperPort before toDomain."
      );
    }
    return {
      ...infrastructureArrangement,
      testaments: infrastructureArrangement.testaments.map(
        (testament, testamentIndex) => {
          return {
            ...testament,
            sections: testament.sections.map((section, sectionIndex) => {
              return (
                this.#sectionInfoMapperPort as SectionInfoMapperPort
              ).toDomain(section, {
                arrangementName: infrastructureArrangement.name,
                testamentIndex,
                sectionIndex,
              });
            }),
          };
        }
      ),
    };
  }
}
