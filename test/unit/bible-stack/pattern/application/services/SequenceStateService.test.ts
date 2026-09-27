import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { SequenceStateService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/SequenceStateService";
import type { SequenceEventPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/sequence";
import type { LoggerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/Logger";

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

describe("pattern.bible-stack.application.services.SequenceStateService", () => {
  let service: SequenceStateService;
  let sequenceEventPort: Mocked<SequenceEventPort>;
  let loggerPort: Mocked<LoggerPort>;

  beforeEach(() => {
    sequenceEventPort = {
      emit: vi.fn(),
    } as unknown as Mocked<SequenceEventPort>;

    loggerPort = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    service = new SequenceStateService({
      sequenceEventPort,
      loggerPort,
    });
  });

  describe("startSequence", () => {
    it("no-ops if there's an ongoing sequence", () => {
      service.startSequence();
      vi.clearAllMocks();

      service.startSequence();

      expect(service.isThereAnOngoingSequence()).toBe(true);
      expect(sequenceEventPort.emit).not.toHaveBeenCalled();
    });

    it("sets isThereAnOngoingSequence to true", () => {
      service.startSequence();

      expect(service.isThereAnOngoingSequence()).toBe(true);
    });

    it("emits", () => {
      service.startSequence();

      expect(sequenceEventPort.emit).toHaveBeenCalledTimes(1);
      expect(sequenceEventPort.emit).toHaveBeenCalledWith(
        "OnStackSequenceStart"
      );
    });
  });

  describe("endSequence", () => {
    it("no-ops if there isn't an ongoing sequence", () => {
      service.endSequence();

      expect(service.isThereAnOngoingSequence()).toBe(false);
      expect(sequenceEventPort.emit).not.toHaveBeenCalled();
    });

    it("sets isThereAnOngoingSequence to false", () => {
      service.startSequence();

      service.endSequence();

      expect(service.isThereAnOngoingSequence()).toBe(false);
    });

    it("emits", () => {
      service.startSequence();
      vi.clearAllMocks();

      service.endSequence();

      expect(sequenceEventPort.emit).toHaveBeenCalledTimes(1);
      expect(sequenceEventPort.emit).toHaveBeenCalledWith("OnStackSequenceEnd");
    });
  });

  describe("isThereAnOngoingSequence", () => {
    it("returns the current value of isThereAnOngoingSequence", () => {
      expect(service.isThereAnOngoingSequence()).toBe(false);

      service.startSequence();

      expect(service.isThereAnOngoingSequence()).toBe(true);

      service.endSequence();

      expect(service.isThereAnOngoingSequence()).toBe(false);
    });
  });

  describe("executeAsSequence", () => {
    it("no-ops if there's an ongoing sequence", async () => {
      service.startSequence();
      vi.clearAllMocks();
      const task = vi.fn(async () => {});

      await expect(service.executeAsSequence(task)).resolves.toBeUndefined();

      expect(task).not.toHaveBeenCalled();
      expect(sequenceEventPort.emit).not.toHaveBeenCalled();
      expect(service.isThereAnOngoingSequence()).toBe(true);
    });

    it("starts a sequence", async () => {
      let wasOngoingDuringTask: boolean | undefined;
      let emittedBeforeTask: unknown[][] = [];
      const task = vi.fn(async () => {
        wasOngoingDuringTask = service.isThereAnOngoingSequence();
        emittedBeforeTask = [...sequenceEventPort.emit.mock.calls];
      });

      await service.executeAsSequence(task);

      expect(task).toHaveBeenCalledTimes(1);
      expect(wasOngoingDuringTask).toBe(true);
      expect(emittedBeforeTask).toEqual([["OnStackSequenceStart"]]);
    });

    it("awaits the callback", async () => {
      const taskCompletion = makeDeferred();
      let settled = false;

      const execution = service
        .executeAsSequence(() => taskCompletion.promise)
        .then(() => {
          settled = true;
        });
      await flush();

      expect(settled).toBe(false);
      expect(service.isThereAnOngoingSequence()).toBe(true);
      expect(sequenceEventPort.emit).not.toHaveBeenCalledWith(
        "OnStackSequenceEnd"
      );

      taskCompletion.resolve();
      await execution;

      expect(settled).toBe(true);
    });

    it("finally ends the sequence", async () => {
      await service.executeAsSequence(async () => {});

      expect(service.isThereAnOngoingSequence()).toBe(false);
      expect(sequenceEventPort.emit.mock.calls).toEqual([
        ["OnStackSequenceStart"],
        ["OnStackSequenceEnd"],
      ]);

      vi.clearAllMocks();

      await service.executeAsSequence(async () => {
        throw new Error("task failed");
      });

      expect(service.isThereAnOngoingSequence()).toBe(false);
      expect(sequenceEventPort.emit.mock.calls).toEqual([
        ["OnStackSequenceStart"],
        ["OnStackSequenceEnd"],
      ]);
    });

    it("catches and logs the error if the callback promise rejects", async () => {
      const error = new Error("task failed");

      await expect(
        service.executeAsSequence(() => Promise.reject(error))
      ).resolves.toBeUndefined();

      expect(loggerPort.error).toHaveBeenCalledTimes(1);
      expect(loggerPort.error).toHaveBeenCalledWith(
        "SequenceStateService: Error while executing the task",
        { error }
      );
    });
  });
});
