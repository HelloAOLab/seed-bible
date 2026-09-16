import { describe, expect, it, vi, type Mocked, beforeEach } from "vitest";
import { ExperienceService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/ExperienceService";
import type { PiecesSequencePort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/experience";
import type { PiecesSetUpPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/piecesSetUp";
import type { EnvironmentSetUpPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/environmentSetUp";
import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";
import type { LoggerAdapterPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/LoggerAdapter";
import { BaseEventManager } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/BaseEventManager";
import type { DomainEventMap } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/events";

describe("application.services.ExperienceService", () => {
  let experienceService: ExperienceService;
  let piecesSequencePort: Mocked<PiecesSequencePort>;
  let piecesSetUpPort: Mocked<PiecesSetUpPort>;
  let environmentSetUpPort: Mocked<EnvironmentSetUpPort>;
  let logger: Mocked<LoggerAdapterPort>;
  let eventBus: BaseEventManager<DomainEventMap>;
  const testKey = EXPERIENCE_KEYS.TABERNACLE;
  // The domain has a single experience today, so the switch path is exercised
  // with fabricated keys; the collaborators are mocked and treat them opaquely.
  const secondKey = "second-experience" as unknown as ExperienceKey;
  const thirdKey = "third-experience" as unknown as ExperienceKey;

  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  function holdTestKeyDropUntilAbort() {
    let releaseDrop: (() => void) | undefined;
    piecesSequencePort.displayDropSequence.mockImplementation((experience) =>
      experience === testKey
        ? new Promise<void>((resolve) => {
            releaseDrop = resolve;
          })
        : Promise.resolve()
    );
    piecesSequencePort.tryAbortCurrentDropSequence.mockImplementation(() => {
      releaseDrop?.();
    });
  }

  beforeEach(() => {
    piecesSequencePort = {
      displayDropSequence: vi.fn(),
      displayClearSequence: vi.fn(),
      tryAbortCurrentDropSequence: vi.fn(),
    };
    piecesSetUpPort = {
      setUpPieces: vi.fn(),
      clearPieces: vi.fn(),
    };
    environmentSetUpPort = {
      setUp: vi.fn(),
    };
    logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    eventBus = new BaseEventManager<DomainEventMap>();

    experienceService = new ExperienceService({
      piecesSequencePort,
      piecesSetUpPort,
      environmentSetUpPort,
      logger,
      eventBus,
    });
  });

  it("displays the experience if there is no experience already displayed", async () => {
    expect(piecesSetUpPort.setUpPieces).not.toHaveBeenCalled();
    expect(environmentSetUpPort.setUp).not.toHaveBeenCalled();
    expect(piecesSequencePort.displayDropSequence).not.toHaveBeenCalled();

    await experienceService.tryDisplayExperience(testKey);

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledOnce();
    expect(environmentSetUpPort.setUp).toHaveBeenCalledOnce();
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledOnce();
    expect(experienceService.experience).toBe(testKey);
  });

  it("no-op if there is an experience already displayed", async () => {
    await experienceService.tryDisplayExperience(testKey);
    await experienceService.tryDisplayExperience(testKey);

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledOnce();
    expect(environmentSetUpPort.setUp).toHaveBeenCalledOnce();
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledOnce();
  });

  it("no-op if there is an ongoing experience display", async () => {
    piecesSequencePort.displayDropSequence.mockImplementation(() => {
      return new Promise(() => {});
    });
    experienceService.tryDisplayExperience(testKey);
    experienceService.tryDisplayExperience(testKey);

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledOnce();
    expect(environmentSetUpPort.setUp).toHaveBeenCalledOnce();
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledOnce();
  });

  it("displays the experience with the correct key", async () => {
    await experienceService.tryDisplayExperience(testKey);

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledWith(testKey);
    expect(environmentSetUpPort.setUp).toHaveBeenCalledWith(testKey);
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledWith(
      testKey
    );
  });

  it("returns true if the experience correctly displays", async () => {
    const result = await experienceService.tryDisplayExperience(testKey);

    expect(result).toBe(true);
  });

  it("handles drop sequence rejection and returns false", async () => {
    piecesSequencePort.displayDropSequence.mockImplementation(() => {
      return Promise.reject();
    });
    const result = await experienceService.tryDisplayExperience(testKey);

    expect(result).toBe(false);
  });

  it("allows a retry if the previous display failed", async () => {
    piecesSequencePort.displayDropSequence.mockRejectedValueOnce(
      new Error("piecesSequencePort.displayDropSequence failed")
    );

    await experienceService.tryDisplayExperience(testKey);
    const result = await experienceService.tryDisplayExperience(testKey);

    expect(result).toBe(true);
    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledTimes(2);
    expect(environmentSetUpPort.setUp).toHaveBeenCalledTimes(2);
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledTimes(2);
  });

  it("switches experiences: aborts the current drop, clears it, then displays the new one", async () => {
    holdTestKeyDropUntilAbort();

    experienceService.tryDisplayExperience(testKey);
    await experienceService.tryDisplayExperience(secondKey);

    expect(
      piecesSequencePort.tryAbortCurrentDropSequence
    ).toHaveBeenCalledOnce();
    expect(
      piecesSequencePort.displayClearSequence
    ).toHaveBeenCalledExactlyOnceWith(testKey);
    expect(piecesSetUpPort.clearPieces).toHaveBeenCalledExactlyOnceWith(
      testKey
    );
    expect(piecesSetUpPort.setUpPieces).toHaveBeenLastCalledWith(secondKey);
    expect(piecesSequencePort.displayDropSequence).toHaveBeenLastCalledWith(
      secondKey
    );
    expect(experienceService.experience).toBe(secondKey);

    const abortOrder =
      piecesSequencePort.tryAbortCurrentDropSequence.mock
        .invocationCallOrder[0]!;
    const clearOrder =
      piecesSequencePort.displayClearSequence.mock.invocationCallOrder[0]!;
    const newDropOrder =
      piecesSequencePort.displayDropSequence.mock.invocationCallOrder[1]!;
    expect(abortOrder).toBeLessThan(clearOrder);
    expect(clearOrder).toBeLessThan(newDropOrder);
  });

  it("coalesces rapid switches, landing on the last requested experience", async () => {
    holdTestKeyDropUntilAbort();

    experienceService.tryDisplayExperience(testKey);
    const switchPromise = experienceService.tryDisplayExperience(secondKey);
    experienceService.tryDisplayExperience(thirdKey);
    await switchPromise;

    expect(piecesSequencePort.displayDropSequence).toHaveBeenLastCalledWith(
      thirdKey
    );
    expect(piecesSequencePort.displayDropSequence).not.toHaveBeenCalledWith(
      secondKey
    );
    expect(piecesSetUpPort.setUpPieces).toHaveBeenLastCalledWith(thirdKey);
    expect(piecesSetUpPort.setUpPieces).not.toHaveBeenCalledWith(secondKey);
    expect(experienceService.experience).toBe(thirdKey);
  });

  it("emits OnExperienceChanged for each transition of a switch", async () => {
    holdTestKeyDropUntilAbort();
    const changes: (ExperienceKey | null)[] = [];
    eventBus.subscribe("OnExperienceChanged", ({ experience }) =>
      changes.push(experience)
    );

    experienceService.tryDisplayExperience(testKey);
    await experienceService.tryDisplayExperience(secondKey);

    expect(changes).toEqual([testKey, null, secondKey]);
  });

  it("keeps the final experience consistent when a switch arrives during an in-flight clear", async () => {
    holdTestKeyDropUntilAbort();
    let releaseClear: (() => void) | undefined;
    let clearCalls = 0;
    piecesSequencePort.displayClearSequence.mockImplementation(() => {
      clearCalls += 1;
      if (clearCalls === 1) {
        return new Promise<void>((resolve) => {
          releaseClear = resolve;
        });
      }
      return Promise.resolve();
    });

    experienceService.tryDisplayExperience(testKey);
    const toSecond = experienceService.tryDisplayExperience(secondKey);
    await flush();
    experienceService.tryDisplayExperience(thirdKey);
    releaseClear?.();
    await toSecond;
    await flush();

    expect(experienceService.experience).toBe(thirdKey);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
