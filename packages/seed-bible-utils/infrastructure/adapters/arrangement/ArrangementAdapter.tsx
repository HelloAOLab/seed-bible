import type { SectionInfoMapper } from "../../mappers/SectionInfoMapper";
import type { ArrangementInfoConfig } from "../../models/arrangement";
import type { ArrangementInfo } from "@packages/seed-bible-utils/domain/models/arrangement";

export class ArrangementAdapter {
  #sectionInfoMapperPort: SectionInfoMapper | undefined;

  setSectionInfoMapperPort(port: SectionInfoMapper) {
    this.#sectionInfoMapperPort = port;
  }

  toDomain(infrastructureArrangement: ArrangementInfoConfig): ArrangementInfo {
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
                this.#sectionInfoMapperPort as SectionInfoMapper
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
