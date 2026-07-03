import { staticArrangements } from "./staticArrangements";
// import { PsalmsConfig } from "bibleVizUtils.infrastructure.config.arrangements.psalms";
import { SectionNames } from "./sectionNames";
import type { ArrangementConfigProviderPort } from "@packages/seed-bible-utils/domain/ports/arrangement";
// import type { ArrangementConfigProviderPort as BookInfoMapperProviderPort } from "bibleVizUtils.infrastructure.ports.bookInfo";
import type { ArrangementInfoConfig } from "../../models/arrangement";
import type { ArrangementAdapter } from "../../adapters/arrangement/ArrangementAdapter";

export class ArrangementsConfigProvider implements ArrangementConfigProviderPort {
  #arrangementAdapterPort: ArrangementAdapter;

  constructor(arrangementAdapterPort: ArrangementAdapter) {
    this.#arrangementAdapterPort = arrangementAdapterPort;
  }

  getStaticArrangements: ArrangementConfigProviderPort["getStaticArrangements"] =
    () => {
      return staticArrangements.map((staticArrangement) =>
        this.#arrangementAdapterPort.toDomain(staticArrangement)
      );
    };

  getRawStaticArrangements: () => readonly ArrangementInfoConfig[] = () => {
    return staticArrangements;
  };

  // getPsalmConfig<K extends keyof typeof PsalmsConfig>(
  //   key: K
  // ): (typeof PsalmsConfig)[K] {
  //   return PsalmsConfig[key];
  // }

  getSectionName<K extends keyof typeof SectionNames>(
    key: K
  ): (typeof SectionNames)[K] {
    return SectionNames[key];
  }
}
