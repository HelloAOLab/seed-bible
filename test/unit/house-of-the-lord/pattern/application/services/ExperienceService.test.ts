import {
  describe,
  expect,
  it,
  vi,
  type Mocked,
  beforeEach,
  type Mock,
} from "vitest";
import { ExperienceService } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/ExperienceService";
import type {
  LoggerPort,
  PiecesSequencePort,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/out/experience";
import type { PiecesSetUpPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/piecesSetUp";
import type { EnvironmentSetUpPort } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/ports/in/environmentSetUp";
import {
  EXPERIENCE_KEYS,
  type ExperienceKey,
} from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/domain/models/experience";

describe("application.services.ExperienceService", () => {
  let experienceService: ExperienceService;
  let piecesSequencePort: Mocked<PiecesSequencePort>;
  let piecesSetUpPort: Mocked<PiecesSetUpPort>;
  let environmentSetUpPort: Mocked<EnvironmentSetUpPort>;
  let logger: Mocked<LoggerPort>;
  let getExperienceKey: Mock<() => ExperienceKey>;
  const testKey = EXPERIENCE_KEYS.TABERNACLE;

  beforeEach(() => {
    piecesSequencePort = {
      displayDropSequence: vi.fn(),
    };
    piecesSetUpPort = {
      setUpPieces: vi.fn(),
    };
    environmentSetUpPort = {
      setUp: vi.fn(),
    };
    logger = {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    getExperienceKey = vi.fn(() => testKey);

    experienceService = new ExperienceService({
      piecesSequencePort,
      piecesSetUpPort,
      environmentSetUpPort,
      logger,
      getExperienceKey,
    });
  });

  it("displays the experience if there is no experience already displayed", async () => {
    expect(piecesSetUpPort.setUpPieces).not.toHaveBeenCalled();
    expect(environmentSetUpPort.setUp).not.toHaveBeenCalled();
    expect(piecesSequencePort.displayDropSequence).not.toHaveBeenCalled();

    await experienceService.tryDisplayExperience();

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledOnce();
    expect(environmentSetUpPort.setUp).toHaveBeenCalledOnce();
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledOnce();
  });

  it("no-op if there is an experience already displayed", async () => {
    await experienceService.tryDisplayExperience();
    await experienceService.tryDisplayExperience();

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledOnce();
    expect(environmentSetUpPort.setUp).toHaveBeenCalledOnce();
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledOnce();
  });

  it("no-op if there is an ongoing experience display", async () => {
    piecesSequencePort.displayDropSequence.mockImplementation(() => {
      return new Promise(() => {});
    });
    experienceService.tryDisplayExperience();
    experienceService.tryDisplayExperience();

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledOnce();
    expect(environmentSetUpPort.setUp).toHaveBeenCalledOnce();
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledOnce();
  });

  it("displays the experience with the correct key", async () => {
    await experienceService.tryDisplayExperience();

    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledWith(testKey);
    expect(environmentSetUpPort.setUp).toHaveBeenCalledWith(testKey);
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledWith(
      testKey
    );
  });

  it("returns true if the experience correctly displays", async () => {
    const result = await experienceService.tryDisplayExperience();

    expect(result).toBe(true);
  });

  it("handles drop sequence rejection and returns false", async () => {
    piecesSequencePort.displayDropSequence.mockImplementation(() => {
      return Promise.reject();
    });
    const result = await experienceService.tryDisplayExperience();

    expect(result).toBe(false);
  });

  it("allows a retry if the previous display failed", async () => {
    piecesSequencePort.displayDropSequence.mockRejectedValueOnce(
      new Error("piecesSequencePort.displayDropSequence failed")
    );

    await experienceService.tryDisplayExperience();
    const result = await experienceService.tryDisplayExperience();

    expect(result).toBe(true);
    expect(piecesSetUpPort.setUpPieces).toHaveBeenCalledTimes(2);
    expect(environmentSetUpPort.setUp).toHaveBeenCalledTimes(2);
    expect(piecesSequencePort.displayDropSequence).toHaveBeenCalledTimes(2);
  });
});
