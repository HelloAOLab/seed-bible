import { ScriptureMap3DConfigProvider } from "bibleVizUtils.infrastructure.config.scriptureMap3D.ScriptureMap3DConfigProvider";
import { ScriptureMap3DMeasurements } from "bibleVizUtils.infrastructure.config.scriptureMap3D.measurements";

const makeProvider = () => new ScriptureMap3DConfigProvider();

// ─── getBibleLayoutMeasurements ───────────────────────────────────────────────

describe("getBibleLayoutMeasurements", () => {
  it("returns the ScriptureMap3DMeasurements object", () => {
    expect(makeProvider().getBibleLayoutMeasurements()).toBe(
      ScriptureMap3DMeasurements
    );
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getBibleLayoutMeasurements()).toBe(
      provider.getBibleLayoutMeasurements()
    );
  });

  it("returns a non-empty object", () => {
    expect(
      Object.keys(makeProvider().getBibleLayoutMeasurements()).length
    ).toBeGreaterThan(0);
  });
});

// ─── getBibleLayoutMeasurement ────────────────────────────────────────────────

describe("getBibleLayoutMeasurement", () => {
  it("returns the exact value for every key in ScriptureMap3DMeasurements", () => {
    const provider = makeProvider();
    for (const key of Object.keys(ScriptureMap3DMeasurements) as Array<
      keyof typeof ScriptureMap3DMeasurements
    >) {
      expect(provider.getBibleLayoutMeasurement(key)).toBe(
        ScriptureMap3DMeasurements[key]
      );
    }
  });

  it("returns MaxAmountOfColumns as 7", () => {
    expect(makeProvider().getBibleLayoutMeasurement("MaxAmountOfColumns")).toBe(
      7
    );
  });

  it("returns Book3DMaxAmountOfColumns as 5", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("Book3DMaxAmountOfColumns")
    ).toBe(5);
  });

  it("returns Chapter3DWidth as 0.5", () => {
    expect(makeProvider().getBibleLayoutMeasurement("Chapter3DWidth")).toBe(
      0.5
    );
  });

  it("returns Chapter3DHeight as 0.5", () => {
    expect(makeProvider().getBibleLayoutMeasurement("Chapter3DHeight")).toBe(
      0.5
    );
  });

  it("returns Chapter3DPadding as 0.1", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("Chapter3DPadding")
    ).toBeCloseTo(0.1);
  });

  it("returns Chapter3DGap as 0.1", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("Chapter3DGap")
    ).toBeCloseTo(0.1);
  });

  it("returns BookHorizontalGap as 1", () => {
    expect(makeProvider().getBibleLayoutMeasurement("BookHorizontalGap")).toBe(
      1
    );
  });

  it("returns BookVerticalGap as 1", () => {
    expect(makeProvider().getBibleLayoutMeasurement("BookVerticalGap")).toBe(1);
  });

  it("returns LayersVerticalGap as an array", () => {
    expect(
      Array.isArray(
        makeProvider().getBibleLayoutMeasurement("LayersVerticalGap")
      )
    ).toBe(true);
  });

  it("returns LayersVerticalGap with 10 entries", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("LayersVerticalGap")
    ).toHaveLength(10);
  });

  it("returns GapBetweenBookAndLine as 1.5", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("GapBetweenBookAndLine")
    ).toBe(1.5);
  });

  it("returns BookHorizontalOffset as 5", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("BookHorizontalOffset")
    ).toBe(5);
  });

  it("returns BookLabelHeight as 1", () => {
    expect(makeProvider().getBibleLayoutMeasurement("BookLabelHeight")).toBe(1);
  });

  it("returns BookPositionZ as 1", () => {
    expect(makeProvider().getBibleLayoutMeasurement("BookPositionZ")).toBe(1);
  });

  it("returns ChapterInitialScaleZ as 0.15", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("ChapterInitialScaleZ")
    ).toBeCloseTo(0.15);
  });

  it("returns ChapterSelectedScaleZ as 0.3", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("ChapterSelectedScaleZ")
    ).toBeCloseTo(0.3);
  });

  it("returns ChapterPlaylistItemDeltaHeight as 0.075", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("ChapterPlaylistItemDeltaHeight")
    ).toBeCloseTo(0.075);
  });

  it("returns PlaylistNavigationButtonVerticalGap as 1", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement(
        "PlaylistNavigationButtonVerticalGap"
      )
    ).toBe(1);
  });

  it("returns PlaylistStackedEntryItemGap as 0.0375", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("PlaylistStackedEntryItemGap")
    ).toBeCloseTo(0.0375);
  });

  it("returns PlaylistEntryItemPadding as 0.01", () => {
    expect(
      makeProvider().getBibleLayoutMeasurement("PlaylistEntryItemPadding")
    ).toBeCloseTo(0.01);
  });

  it("returns Book2DMaxColumns as 5", () => {
    expect(makeProvider().getBibleLayoutMeasurement("Book2DMaxColumns")).toBe(
      5
    );
  });

  it("returns Book3DScaleX as a number", () => {
    expect(
      typeof makeProvider().getBibleLayoutMeasurement("Book3DScaleX")
    ).toBe("number");
  });

  it("Book3DScaleX matches the derived formula (5 cols * 0.5 + 0.1*2 + 0.1*4)", () => {
    // Book3DScaleX = 5 * 0.5 + 0.1 * 2 + 0.1 * (5 - 1) = 2.5 + 0.2 + 0.4 = 3.1
    expect(
      makeProvider().getBibleLayoutMeasurement("Book3DScaleX")
    ).toBeCloseTo(3.1);
  });

  it("returns the same reference on successive calls for the same key", () => {
    const provider = makeProvider();
    expect(provider.getBibleLayoutMeasurement("LayersVerticalGap")).toBe(
      provider.getBibleLayoutMeasurement("LayersVerticalGap")
    );
  });

  it("covers all keys defined in ScriptureMap3DMeasurements", () => {
    const provider = makeProvider();
    const keys = Object.keys(ScriptureMap3DMeasurements) as Array<
      keyof typeof ScriptureMap3DMeasurements
    >;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(provider.getBibleLayoutMeasurement(key)).toBeDefined();
    }
  });
});
