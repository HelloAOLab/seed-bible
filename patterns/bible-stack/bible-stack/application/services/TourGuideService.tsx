import type { StackSectionData } from "../../domain/entities/StackSectionData";
import type { TourGuieAdapterPort } from "../ports/tourGuide";
import type { TourGuideServicePort } from "../ports/in/TourGuide";

interface ServiceParams {
  tourGuieAdapterPort: TourGuieAdapterPort;
}

export class TourGuideService implements TourGuideServicePort {
  #ongoingTourGuideSectionData: StackSectionData | undefined;
  #tourGuieAdapterPort: ServiceParams["tourGuieAdapterPort"];

  constructor({ tourGuieAdapterPort }: ServiceParams) {
    this.#tourGuieAdapterPort = tourGuieAdapterPort;
  }

  isThereAnOngoingTourGuide(): boolean {
    return !!this.#ongoingTourGuideSectionData;
  }

  async beginTourGuide(data: StackSectionData): Promise<void> {
    if (!this.isThereAnOngoingTourGuide()) {
      this.#ongoingTourGuideSectionData = data;
      try {
        await this.#tourGuieAdapterPort.startTourGuideSequence(data);
      } finally {
        this.#endTourGuide();
      }
    }
  }

  #endTourGuide() {
    if (this.isThereAnOngoingTourGuide()) {
      this.#ongoingTourGuideSectionData = undefined;
    }
  }

  stopTourGuide() {
    if (this.isThereAnOngoingTourGuide()) {
      this.#tourGuieAdapterPort.endTourGuideSequence();
    }
  }

  get ongoingTourGuideSectionData() {
    return this.#ongoingTourGuideSectionData;
  }
}
