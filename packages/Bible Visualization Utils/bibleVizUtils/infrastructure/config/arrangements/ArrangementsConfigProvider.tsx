import { staticArrangements } from "bibleVizUtils.infrastructure.config.arrangements.staticArrangements";
import { PsalmsConfig } from "bibleVizUtils.infrastructure.config.arrangements.psalms";
import { SectionNames } from "bibleVizUtils.infrastructure.config.arrangements.sectionNames";
import type {
  ArrangementAdapterPort,
  ArrangementConfigProviderPort,
} from "bibleVizUtils.domain.ports.arrangement";

export class ArrangementsConfigProvider implements ArrangementConfigProviderPort {
  #arrangementAdapterPort: ArrangementAdapterPort;

  constructor(arrangementAdapterPort: ArrangementAdapterPort) {
    this.#arrangementAdapterPort = arrangementAdapterPort;
  }

  getStaticArrangements: ArrangementConfigProviderPort["getStaticArrangements"] =
    () => {
      return staticArrangements.map((staticArrangement) =>
        this.#arrangementAdapterPort.toDomain(staticArrangement)
      );
    };

  getPsalmConfig<K extends keyof typeof PsalmsConfig>(
    key: K
  ): (typeof PsalmsConfig)[K] {
    return PsalmsConfig[key];
  }

  getSectionName<K extends keyof typeof SectionNames>(
    key: K
  ): (typeof SectionNames)[K] {
    return SectionNames[key];
  }
}
