import {
  alignToStep,
  firstAcceptableSettingValue,
  numberFieldLimits,
  numberRangeAdmitsAValue,
} from "@packages/seed-bible/seed-bible/managers/extensionSettingConstraints";

describe("alignToStep", () => {
  it("keeps a bound written in exponential notation on its step", () => {
    // `1e-7`.toString() has no ".", so counting decimal places and calling
    // toFixed(0) used to round this to 0.
    expect(alignToStep(3e-7, 1e-7, "up")).toBe(3e-7);
    expect(alignToStep(1e-6, 1e-7, "down")).toBe(1e-6);
  });

  it("moves an unaligned bound onto the next step in the given direction", () => {
    expect(alignToStep(1, 2, "up")).toBe(2);
    expect(alignToStep(1, 2, "down")).toBe(0);
    expect(alignToStep(0.05, 0.1, "up")).toBe(0.1);
  });
});

describe("numberFieldLimits", () => {
  it("shifts min and max onto the step so the spinner stays on valid values", () => {
    expect(
      numberFieldLimits({
        type: "number",
        minimum: 1,
        maximum: 10,
        multipleOf: 2,
      })
    ).toEqual({ min: 2, max: 10, step: 2 });
  });

  it("keeps exponential bounds instead of rounding them to integers", () => {
    expect(
      numberFieldLimits({
        type: "number",
        minimum: 3e-7,
        maximum: 1e-6,
        multipleOf: 1e-7,
      })
    ).toEqual({ min: 3e-7, max: 1e-6, step: 1e-7 });
  });

  it("drops inverted bounds after alignment and leaves the step", () => {
    // 1 rounded up onto multiples of 2 is 2; 1 rounded down is 0.
    expect(
      numberFieldLimits({
        type: "number",
        minimum: 1,
        maximum: 1,
        multipleOf: 2,
      })
    ).toEqual({ step: 2 });
  });
});

describe("numberRangeAdmitsAValue", () => {
  it("is false when no multiple of the step sits inside the bounds", () => {
    expect(
      numberRangeAdmitsAValue({
        type: "number",
        minimum: 1,
        maximum: 1,
        multipleOf: 2,
      })
    ).toBe(false);
  });

  it("is true when a multiple sits inside the bounds, or a bound is open", () => {
    expect(
      numberRangeAdmitsAValue({
        type: "number",
        minimum: 1,
        maximum: 10,
        multipleOf: 2,
      })
    ).toBe(true);
    expect(
      numberRangeAdmitsAValue({ type: "number", minimum: 1, multipleOf: 2 })
    ).toBe(true);
  });
});

describe("firstAcceptableSettingValue", () => {
  it("replaces an invalid default with the smallest in-range number", () => {
    expect(
      firstAcceptableSettingValue({
        type: "number",
        default: 11,
        minimum: 1,
        maximum: 10,
        multipleOf: 1,
      })
    ).toBe(1);
  });

  it("returns the declared default when nothing else in range is valid", () => {
    expect(
      firstAcceptableSettingValue({
        type: "number",
        default: 1,
        minimum: 1,
        maximum: 1,
        multipleOf: 2,
      })
    ).toBe(1);
  });

  it("returns the computed candidate when there is no default and the range admits nothing", () => {
    expect(
      firstAcceptableSettingValue({
        type: "number",
        minimum: 1,
        maximum: 1,
        multipleOf: 2,
      })
    ).toBe(0);
  });

  it("uses the first enum choice when a string setting has no valid default", () => {
    expect(
      firstAcceptableSettingValue({
        type: "string",
        default: "loud",
        enum: ["plain", "warm"],
      })
    ).toBe("plain");
  });
});
