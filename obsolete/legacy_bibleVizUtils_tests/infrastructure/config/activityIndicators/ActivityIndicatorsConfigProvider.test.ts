import { ActivityIndicatorsConfigProvider } from "bibleVizUtils.infrastructure.config.activityIndicators.ActivityIndicatorsConfigProvider";
import { ActivityIndicatorVisualConfigs } from "bibleVizUtils.infrastructure.config.activityIndicators.visuals";

const makeProvider = () => new ActivityIndicatorsConfigProvider();

// ─── getVisualConfig ──────────────────────────────────────────────────────────

describe("getVisualConfig", () => {
  it("returns the exact value from ActivityIndicatorVisualConfigs for every key", () => {
    const provider = makeProvider();
    for (const key of Object.keys(ActivityIndicatorVisualConfigs) as Array<
      keyof typeof ActivityIndicatorVisualConfigs
    >) {
      expect(provider.getVisualConfig(key)).toBe(
        ActivityIndicatorVisualConfigs[key]
      );
    }
  });

  it("returns the ChapterOffset object", () => {
    expect(makeProvider().getVisualConfig("ChapterOffset")).toEqual(
      ActivityIndicatorVisualConfigs.ChapterOffset
    );
  });

  it("returns the ChapterStep object", () => {
    expect(makeProvider().getVisualConfig("ChapterStep")).toEqual(
      ActivityIndicatorVisualConfigs.ChapterStep
    );
  });

  it("returns the GroundedForm string", () => {
    expect(makeProvider().getVisualConfig("GroundedForm")).toBe(
      ActivityIndicatorVisualConfigs.GroundedForm
    );
  });

  it("returns the GroundedScales object", () => {
    expect(makeProvider().getVisualConfig("GroundedScales")).toEqual(
      ActivityIndicatorVisualConfigs.GroundedScales
    );
  });

  it("returns the GroundedExtraUsersBackgroundScales object", () => {
    expect(
      makeProvider().getVisualConfig("GroundedExtraUsersBackgroundScales")
    ).toEqual(
      ActivityIndicatorVisualConfigs.GroundedExtraUsersBackgroundScales
    );
  });

  it("returns the GroundedExtraUsersContentScales object", () => {
    expect(
      makeProvider().getVisualConfig("GroundedExtraUsersContentScales")
    ).toEqual(ActivityIndicatorVisualConfigs.GroundedExtraUsersContentScales);
  });

  it("returns the LabelForm string", () => {
    expect(makeProvider().getVisualConfig("LabelForm")).toBe(
      ActivityIndicatorVisualConfigs.LabelForm
    );
  });

  it("returns the LabelOffset object", () => {
    expect(makeProvider().getVisualConfig("LabelOffset")).toEqual(
      ActivityIndicatorVisualConfigs.LabelOffset
    );
  });

  it("returns the LabelScales object", () => {
    expect(makeProvider().getVisualConfig("LabelScales")).toEqual(
      ActivityIndicatorVisualConfigs.LabelScales
    );
  });

  it("returns the LabelStep object", () => {
    expect(makeProvider().getVisualConfig("LabelStep")).toEqual(
      ActivityIndicatorVisualConfigs.LabelStep
    );
  });

  it("returns the LabelExtraUsersBackgroundScales object", () => {
    expect(
      makeProvider().getVisualConfig("LabelExtraUsersBackgroundScales")
    ).toEqual(ActivityIndicatorVisualConfigs.LabelExtraUsersBackgroundScales);
  });

  it("returns the LabelExtraUsersContentScales object", () => {
    expect(
      makeProvider().getVisualConfig("LabelExtraUsersContentScales")
    ).toEqual(ActivityIndicatorVisualConfigs.LabelExtraUsersContentScales);
  });

  it("returns the ScriptureMapBookOffset object", () => {
    expect(makeProvider().getVisualConfig("ScriptureMapBookOffset")).toEqual(
      ActivityIndicatorVisualConfigs.ScriptureMapBookOffset
    );
  });

  it("returns the ScriptureMapBookStep object", () => {
    expect(makeProvider().getVisualConfig("ScriptureMapBookStep")).toEqual(
      ActivityIndicatorVisualConfigs.ScriptureMapBookStep
    );
  });

  it("returns the same reference on successive calls for the same key", () => {
    const provider = makeProvider();
    expect(provider.getVisualConfig("LabelScales")).toBe(
      provider.getVisualConfig("LabelScales")
    );
  });

  it("covers all keys defined in ActivityIndicatorVisualConfigs", () => {
    const provider = makeProvider();
    const keys = Object.keys(ActivityIndicatorVisualConfigs) as Array<
      keyof typeof ActivityIndicatorVisualConfigs
    >;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(provider.getVisualConfig(key)).toBeDefined();
    }
  });
});
