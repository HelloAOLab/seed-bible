import type { ArrangementInfo } from "../../../domain/models/arrangement";

export interface StaticArrangementsProviderPort {
  getStaticArrangements: () => readonly ArrangementInfo[];
}
