import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { TourGuideService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/TourGuideService";
import type { TourGuideAdapterPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/tourGuide";
import { StackSectionData } from "../../../../../../patterns/bible-stack/bible-stack/domain/entities/StackSectionData";

const makeSectionData = (id: string): StackSectionData =>
  new StackSectionData({
    id,
    piece: { id: `${id}-piece`, type: "StackSection" },
    pieceInfo: {
      name: id,
      color: "#ffffff",
      books: [],
      path: {
        arrangementName: "arrangement",
        testamentIndex: 0,
        sectionIndex: 0,
      },
    },
    parentDataIds: { stackBibleId: "bible-id" },
    isActive: true,
    creationParams: {
      arrangementIndex: 0,
      testamentIndex: 0,
      sectionIndex: 0,
      amountOfChaptersInSection: 3,
    },
  });

const makeDeferred = () => {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const trackSettlement = (promise: Promise<unknown>) => {
  const state = { settled: false };
  promise.then(
    () => {
      state.settled = true;
    },
    () => {
      state.settled = true;
    }
  );
  return state;
};

describe("pattern.bible-stack.application.services.TourGuideService", () => {
  let service: TourGuideService;
  let tourGuideAdapterPort: Mocked<TourGuideAdapterPort>;

  beforeEach(() => {
    tourGuideAdapterPort = {
      startTourGuideSequence: vi.fn(),
      endTourGuideSequence: vi.fn(),
    };

    service = new TourGuideService({
      tourGuideAdapterPort,
    });
  });

  describe("isThereAnOngoingTourGuide", () => {
    it("returns true if ongoingTourGuideSectionData is truthy, otherwise returns false", async () => {
      const data = makeSectionData("section");
      const sequence = makeDeferred();
      tourGuideAdapterPort.startTourGuideSequence.mockReturnValue(
        sequence.promise
      );

      expect(service.ongoingTourGuideSectionData).toBeUndefined();
      expect(service.isThereAnOngoingTourGuide()).toBe(false);

      const tourGuide = service.beginTourGuide(data);

      expect(service.ongoingTourGuideSectionData).toBe(data);
      expect(service.isThereAnOngoingTourGuide()).toBe(true);

      sequence.resolve();
      await tourGuide;

      expect(service.ongoingTourGuideSectionData).toBeUndefined();
      expect(service.isThereAnOngoingTourGuide()).toBe(false);
    });
  });

  describe("beginTourGuide", () => {
    it("no-ops if there's an ongoing tour guide", async () => {
      const ongoingData = makeSectionData("ongoing-section");
      const otherData = makeSectionData("other-section");
      const sequence = makeDeferred();
      tourGuideAdapterPort.startTourGuideSequence.mockReturnValueOnce(
        sequence.promise
      );

      const ongoingTourGuide = service.beginTourGuide(ongoingData);

      await expect(service.beginTourGuide(otherData)).resolves.toBeUndefined();

      expect(
        tourGuideAdapterPort.startTourGuideSequence
      ).toHaveBeenCalledExactlyOnceWith(ongoingData);
      expect(service.ongoingTourGuideSectionData).toBe(ongoingData);

      sequence.resolve();
      await ongoingTourGuide;
    });

    it("awaits for the tour guide sequence", async () => {
      const data = makeSectionData("section");
      const sequence = makeDeferred();
      tourGuideAdapterPort.startTourGuideSequence.mockReturnValue(
        sequence.promise
      );

      const tourGuide = service.beginTourGuide(data);
      const state = trackSettlement(tourGuide);
      await flush();

      expect(
        tourGuideAdapterPort.startTourGuideSequence
      ).toHaveBeenCalledExactlyOnceWith(data);
      expect(state.settled).toBe(false);
      expect(service.isThereAnOngoingTourGuide()).toBe(true);

      sequence.resolve();

      await expect(tourGuide).resolves.toBeUndefined();
    });

    it("finally clears the ongoing tour guide data", async () => {
      const data = makeSectionData("section");

      await service.beginTourGuide(data);

      expect(service.ongoingTourGuideSectionData).toBeUndefined();
      expect(service.isThereAnOngoingTourGuide()).toBe(false);

      const error = new Error("tour guide rejected");
      tourGuideAdapterPort.startTourGuideSequence.mockRejectedValueOnce(error);

      await expect(service.beginTourGuide(data)).rejects.toBe(error);

      expect(service.ongoingTourGuideSectionData).toBeUndefined();
      expect(service.isThereAnOngoingTourGuide()).toBe(false);

      const nextData = makeSectionData("next-section");

      await service.beginTourGuide(nextData);

      expect(
        tourGuideAdapterPort.startTourGuideSequence
      ).toHaveBeenLastCalledWith(nextData);
      expect(tourGuideAdapterPort.startTourGuideSequence).toHaveBeenCalledTimes(
        3
      );
    });
  });

  describe("stopTourGuide", () => {
    it("no-ops if there's no ongoing tour guide", async () => {
      service.stopTourGuide();

      expect(tourGuideAdapterPort.endTourGuideSequence).not.toHaveBeenCalled();

      await service.beginTourGuide(makeSectionData("section"));
      service.stopTourGuide();

      expect(tourGuideAdapterPort.endTourGuideSequence).not.toHaveBeenCalled();
      expect(service.isThereAnOngoingTourGuide()).toBe(false);
    });

    it("ends the tour guide sequence", async () => {
      const data = makeSectionData("section");
      const sequence = makeDeferred();
      tourGuideAdapterPort.startTourGuideSequence.mockReturnValue(
        sequence.promise
      );
      tourGuideAdapterPort.endTourGuideSequence.mockImplementation(() => {
        sequence.resolve();
      });

      const tourGuide = service.beginTourGuide(data);
      service.stopTourGuide();

      expect(tourGuideAdapterPort.endTourGuideSequence).toHaveBeenCalledOnce();

      await expect(tourGuide).resolves.toBeUndefined();
      expect(service.isThereAnOngoingTourGuide()).toBe(false);
    });
  });
});
