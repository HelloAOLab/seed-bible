import { HistoryModeService } from "bibleVizUtils.application.services.HistoryModeService";
import type { HistoryModeEventPort } from "bibleVizUtils.domain.ports.historyMode";

// ─── factory ─────────────────────────────────────────────────────────────────

const makeEventPort = (): HistoryModeEventPort => ({ emit: jest.fn() });

const makeService = (
  overrides: {
    isInHistoryMode?: boolean;
    eventPort?: HistoryModeEventPort;
  } = {}
) =>
  new HistoryModeService({
    eventPort: makeEventPort(),
    ...overrides,
  });

// ─── constructor ─────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("defaults isInHistoryMode to false when not provided", () => {
    expect(makeService().isInHistoryMode).toBe(false);
  });

  it("stores the provided isInHistoryMode=true", () => {
    expect(makeService({ isInHistoryMode: true }).isInHistoryMode).toBe(true);
  });

  it("stores the provided isInHistoryMode=false explicitly", () => {
    expect(makeService({ isInHistoryMode: false }).isInHistoryMode).toBe(false);
  });
});

// ─── isInHistoryMode getter ───────────────────────────────────────────────────

describe("isInHistoryMode getter", () => {
  it("reflects false before any mode change", () => {
    const svc = makeService();
    expect(svc.isInHistoryMode).toBe(false);
  });

  it("reflects true after enterHistoryMode is called", () => {
    const svc = makeService();
    svc.enterHistoryMode();
    expect(svc.isInHistoryMode).toBe(true);
  });

  it("reflects false again after exitHistoryMode is called", () => {
    const svc = makeService();
    svc.enterHistoryMode();
    svc.exitHistoryMode();
    expect(svc.isInHistoryMode).toBe(false);
  });
});

// ─── enterHistoryMode ─────────────────────────────────────────────────────────

describe("enterHistoryMode", () => {
  it("sets isInHistoryMode to true", () => {
    const svc = makeService();
    svc.enterHistoryMode();
    expect(svc.isInHistoryMode).toBe(true);
  });

  it("emits OnEnterHistoryMode when transitioning from false", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ eventPort });
    svc.enterHistoryMode();
    expect(eventPort.emit).toHaveBeenCalledWith("OnEnterHistoryMode");
  });

  it("emits exactly once on the first call", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ eventPort });
    svc.enterHistoryMode();
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when already in history mode — does not emit again", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ isInHistoryMode: true, eventPort });
    svc.enterHistoryMode();
    expect(eventPort.emit).not.toHaveBeenCalled();
  });

  it("is a no-op when already in history mode — isInHistoryMode stays true", () => {
    const svc = makeService({ isInHistoryMode: true });
    svc.enterHistoryMode();
    expect(svc.isInHistoryMode).toBe(true);
  });

  it("calling enterHistoryMode twice only emits once", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ eventPort });
    svc.enterHistoryMode();
    svc.enterHistoryMode();
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });
});

// ─── exitHistoryMode ──────────────────────────────────────────────────────────

describe("exitHistoryMode", () => {
  it("sets isInHistoryMode to false", () => {
    const svc = makeService({ isInHistoryMode: true });
    svc.exitHistoryMode();
    expect(svc.isInHistoryMode).toBe(false);
  });

  it("emits OnExitHistoryMode when transitioning from true", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ isInHistoryMode: true, eventPort });
    svc.exitHistoryMode();
    expect(eventPort.emit).toHaveBeenCalledWith("OnExitHistoryMode");
  });

  it("emits exactly once on the first call", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ isInHistoryMode: true, eventPort });
    svc.exitHistoryMode();
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when already outside history mode — does not emit", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ isInHistoryMode: false, eventPort });
    svc.exitHistoryMode();
    expect(eventPort.emit).not.toHaveBeenCalled();
  });

  it("is a no-op when already outside history mode — isInHistoryMode stays false", () => {
    const svc = makeService({ isInHistoryMode: false });
    svc.exitHistoryMode();
    expect(svc.isInHistoryMode).toBe(false);
  });

  it("calling exitHistoryMode twice only emits once", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ isInHistoryMode: true, eventPort });
    svc.exitHistoryMode();
    svc.exitHistoryMode();
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });
});

// ─── round-trip ───────────────────────────────────────────────────────────────

describe("round-trip transitions", () => {
  it("enter → exit → enter emits OnEnterHistoryMode twice and OnExitHistoryMode once", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ eventPort });
    svc.enterHistoryMode();
    svc.exitHistoryMode();
    svc.enterHistoryMode();
    const calls = (eventPort.emit as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls).toEqual([
      "OnEnterHistoryMode",
      "OnExitHistoryMode",
      "OnEnterHistoryMode",
    ]);
  });

  it("exit → enter starting from true emits OnExitHistoryMode then OnEnterHistoryMode", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ isInHistoryMode: true, eventPort });
    svc.exitHistoryMode();
    svc.enterHistoryMode();
    const calls = (eventPort.emit as jest.Mock).mock.calls.map((c) => c[0]);
    expect(calls).toEqual(["OnExitHistoryMode", "OnEnterHistoryMode"]);
  });
});
