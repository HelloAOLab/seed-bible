import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { TourGuideServicePort } from "../ports/in/TourGuide";
import type { TourGuidePort } from "../ports/out/TourGuide";

interface ServiceParams {
  tourGuideAdapterPort: TourGuidePort;
}

export class TourGuideService implements TourGuideServicePort {
  #ongoingTourGuideSectionData: StackSectionData | undefined;
  #tourGuideAdapterPort: ServiceParams["tourGuideAdapterPort"];

  constructor({ tourGuideAdapterPort }: ServiceParams) {
    this.#tourGuideAdapterPort = tourGuideAdapterPort;
  }

  isThereAnOngoingTourGuide(): boolean {
    return !!this.#ongoingTourGuideSectionData;
  }

  async beginTourGuide(data: StackSectionData): Promise<void> {
    if (this.isThereAnOngoingTourGuide()) return;

    this.#ongoingTourGuideSectionData = data;
    try {
      await this.#tourGuideAdapterPort.startTourGuideSequence(data);
    } finally {
      this.#endTourGuide();
    }
  }

  #endTourGuide() {
    this.#ongoingTourGuideSectionData = undefined;
  }

  stopTourGuide() {
    if (!this.isThereAnOngoingTourGuide()) return;
    this.#tourGuideAdapterPort.endTourGuideSequence();
  }

  get ongoingTourGuideSectionData() {
    return this.#ongoingTourGuideSectionData;
  }
}
