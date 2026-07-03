import { LabelDateService } from "bibleVizUtils.application.services.LabelDateService";
import {
  LabelDateFormat,
  type LabelDateFormatType,
} from "bibleVizUtils.domain.models.label";
import type { LabelDateEventPort } from "bibleVizUtils.domain.ports.labelDate";

// ─── factory ─────────────────────────────────────────────────────────────────

const makeEventPort = (): LabelDateEventPort => ({ emit: jest.fn() });

const makeService = (
  overrides: {
    dateFormat?: LabelDateFormatType;
    eventPort?: LabelDateEventPort;
  } = {}
) =>
  new LabelDateService({
    eventPort: makeEventPort(),
    ...overrides,
  });

// ─── constructor ─────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("defaults dateFormat to Absolute when not provided", () => {
    expect(makeService().dateFormat).toBe(LabelDateFormat.Absolute);
  });

  it("stores the provided dateFormat=Absolute", () => {
    expect(
      makeService({ dateFormat: LabelDateFormat.Absolute }).dateFormat
    ).toBe(LabelDateFormat.Absolute);
  });

  it("stores the provided dateFormat=Relative", () => {
    expect(
      makeService({ dateFormat: LabelDateFormat.Relative }).dateFormat
    ).toBe(LabelDateFormat.Relative);
  });
});

// ─── dateFormat getter ────────────────────────────────────────────────────────

describe("dateFormat getter", () => {
  it("returns the current format before any change", () => {
    const svc = makeService({ dateFormat: LabelDateFormat.Relative });
    expect(svc.dateFormat).toBe(LabelDateFormat.Relative);
  });

  it("reflects the new format after changeDateFormat is called", () => {
    const svc = makeService();
    svc.changeDateFormat(LabelDateFormat.Relative);
    expect(svc.dateFormat).toBe(LabelDateFormat.Relative);
  });
});

// ─── changeDateFormat ─────────────────────────────────────────────────────────

describe("changeDateFormat", () => {
  it("updates dateFormat when a different format is provided", () => {
    const svc = makeService({ dateFormat: LabelDateFormat.Absolute });
    svc.changeDateFormat(LabelDateFormat.Relative);
    expect(svc.dateFormat).toBe(LabelDateFormat.Relative);
  });

  it("emits OnLabelDateFormatChange when the format changes", () => {
    const eventPort = makeEventPort();
    const svc = makeService({
      dateFormat: LabelDateFormat.Absolute,
      eventPort,
    });
    svc.changeDateFormat(LabelDateFormat.Relative);
    expect(eventPort.emit).toHaveBeenCalledWith("OnLabelDateFormatChange");
  });

  it("emits exactly once per change", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ eventPort });
    svc.changeDateFormat(LabelDateFormat.Relative);
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when the new format equals the current one — does not emit", () => {
    const eventPort = makeEventPort();
    const svc = makeService({
      dateFormat: LabelDateFormat.Absolute,
      eventPort,
    });
    svc.changeDateFormat(LabelDateFormat.Absolute);
    expect(eventPort.emit).not.toHaveBeenCalled();
  });

  it("is a no-op when the same format is provided — dateFormat stays unchanged", () => {
    const svc = makeService({ dateFormat: LabelDateFormat.Relative });
    svc.changeDateFormat(LabelDateFormat.Relative);
    expect(svc.dateFormat).toBe(LabelDateFormat.Relative);
  });

  it("calling changeDateFormat twice with the same value only emits once", () => {
    const eventPort = makeEventPort();
    const svc = makeService({ eventPort });
    svc.changeDateFormat(LabelDateFormat.Relative);
    svc.changeDateFormat(LabelDateFormat.Relative);
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("toggling back to the original format emits a second time", () => {
    const eventPort = makeEventPort();
    const svc = makeService({
      dateFormat: LabelDateFormat.Absolute,
      eventPort,
    });
    svc.changeDateFormat(LabelDateFormat.Relative);
    svc.changeDateFormat(LabelDateFormat.Absolute);
    expect(eventPort.emit).toHaveBeenCalledTimes(2);
  });

  it("dateFormat is correct after each step of a round-trip", () => {
    const svc = makeService({ dateFormat: LabelDateFormat.Absolute });
    svc.changeDateFormat(LabelDateFormat.Relative);
    expect(svc.dateFormat).toBe(LabelDateFormat.Relative);
    svc.changeDateFormat(LabelDateFormat.Absolute);
    expect(svc.dateFormat).toBe(LabelDateFormat.Absolute);
  });
});
