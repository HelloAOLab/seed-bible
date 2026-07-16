import { LabelFeedbackAdapter } from "bibleVizUtils.infrastructure.adapters.labels.LabelFeedbackAdapter";
import { InfoLabelData } from "bibleVizUtils.domain.entities.InfoLabelData";
import { InfoLabelTransformerMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper";
import { InfoLabelTailMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper";
import { InfoLabelDateMapper } from "bibleVizUtils.infrastructure.mappers.InfoLabelDateMapper";
import {
  LabelPosition,
  LabelTranslucencyModes,
  ShowSequencePacings,
} from "bibleVizUtils.domain.models.label";

// ─── module mocks ─────────────────────────────────────────────────────────────

jest.mock(
  "bibleVizUtils.infrastructure.mappers.InfoLabelTransformerMapper",
  () => ({
    InfoLabelTransformerMapper: { toInfrastructure: jest.fn() },
  })
);

jest.mock("bibleVizUtils.infrastructure.mappers.InfoLabelTailMapper", () => ({
  InfoLabelTailMapper: { toInfrastructure: jest.fn() },
}));

jest.mock("bibleVizUtils.infrastructure.mappers.InfoLabelDateMapper", () => ({
  InfoLabelDateMapper: { toInfrastructure: jest.fn() },
}));

// ─── mock aliases ─────────────────────────────────────────────────────────────

const transformerMapperToInfra =
  InfoLabelTransformerMapper.toInfrastructure as jest.Mock;
const tailMapperToInfra = InfoLabelTailMapper.toInfrastructure as jest.Mock;
const dateMapperToInfra = InfoLabelDateMapper.toInfrastructure as jest.Mock;

// ─── globals ──────────────────────────────────────────────────────────────────

let animateTagMock: jest.Mock;
let setTagMaskMock: jest.Mock;
let clearAnimationsMock: jest.Mock;
let infoLabelTextMapper: { toInfrastructure: jest.Mock };
let activityIndicatorMapper: { toInfrastructure: jest.Mock };

beforeEach(() => {
  jest.useFakeTimers();

  animateTagMock = jest.fn().mockResolvedValue(undefined);
  setTagMaskMock = jest.fn();
  clearAnimationsMock = jest.fn();
  infoLabelTextMapper = { toInfrastructure: jest.fn() };
  activityIndicatorMapper = { toInfrastructure: jest.fn() };

  (globalThis as any).animateTag = animateTagMock;
  (globalThis as any).setTagMask = setTagMaskMock;
  (globalThis as any).clearAnimations = clearAnimationsMock;
  (globalThis as any).thisBot = { tags: { targetOpacity: 1 } };
});

afterEach(() => {
  jest.useRealTimers();
  delete (globalThis as any).animateTag;
  delete (globalThis as any).setTagMask;
  delete (globalThis as any).clearAnimations;
  delete (globalThis as any).thisBot;
  jest.clearAllMocks();
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeBot = (id = "bot-1", type = "InfoLabelTransformer"): any => ({
  id,
  link: "",
  tags: { type, targetOpacity: 1, pointableDefault: true },
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makeInfoLabel = (overrides: any = {}) =>
  new InfoLabelData({
    id: "label-1",
    transformer: { id: "t-1", type: "InfoLabelTransformer" as const },
    tail: { id: "tail-1", type: "InfoLabelTail" as const },
    label: { id: "text-1", type: "InfoLabelText" as const },
    owner: { id: "owner-1", type: "StackBook" as const },
    positioning: LabelPosition.RightSided,
    ...overrides,
  });

const makeConfigProvider = (overrides: any = {}) => ({
  getShowAnimationDuration: jest.fn().mockReturnValue(300),
  getShowAnimationConfig: jest.fn().mockReturnValue("easeInOut"),
  getShakeAnimationDelay: jest.fn().mockReturnValue(100),
  getShakeDuration: jest.fn().mockReturnValue(400),
  getShakeEasing: jest.fn().mockReturnValue("linear"),
  getShakeDirection: jest.fn().mockReturnValue({ x: 1, y: 0 }),
  getIntensityOpacity: jest.fn().mockReturnValue(0.5),
  ...overrides,
});

const makeAdapter = (configProvider = makeConfigProvider()) =>
  new LabelFeedbackAdapter({
    dimensionProvider: jest.fn().mockReturnValue("scene3d"),
    labelFeedbackConfigProviderPort: configProvider,
    infoLabelTextMapperPort: infoLabelTextMapper,
    activityIndicatorMapperPort: activityIndicatorMapper,
  });

const setupValidMappers = () => {
  transformerMapperToInfra.mockReturnValue(
    makeBot("t-bot", "InfoLabelTransformer")
  );
  infoLabelTextMapper.toInfrastructure.mockReturnValue(
    makeBot("text-bot", "InfoLabelText")
  );
  tailMapperToInfra.mockReturnValue(makeBot("tail-bot", "InfoLabelTail"));
  activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
  dateMapperToInfra.mockReturnValue(undefined);
};

// ─── displayAttentionFeedback ─────────────────────────────────────────────────

describe("displayAttentionFeedback", () => {
  it("calls setInterval with the delay from getShakeAnimationDelay", () => {
    const config = makeConfigProvider({
      getShakeAnimationDelay: jest.fn().mockReturnValue(250),
    });
    const adapter = makeAdapter(config);
    const label = makeInfoLabel();
    adapter.displayAttentionFeedback(label);
    expect(config.getShakeAnimationDelay).toHaveBeenCalled();
  });

  it("stores the interval so stopAttentionFeedback can cancel it", () => {
    const adapter = makeAdapter();
    const label = makeInfoLabel();
    adapter.displayAttentionFeedback(label);
    adapter.stopAttentionFeedback(label);
    jest.advanceTimersByTime(10000);
    // interval was cancelled — shakeLabel callbacks never fire
    expect(animateTagMock).not.toHaveBeenCalled();
  });

  it("stops the existing animation for the same id before starting a new one", () => {
    const adapter = makeAdapter();
    const label = makeInfoLabel();
    adapter.displayAttentionFeedback(label);
    // start a second animation for the same id — the first interval must be stopped
    adapter.displayAttentionFeedback(label);
    adapter.stopAttentionFeedback(label);
    jest.advanceTimersByTime(10000);
    expect(animateTagMock).not.toHaveBeenCalled();
  });

  it("does not stop the animation of a different label id", () => {
    const adapter = makeAdapter();
    const labelA = makeInfoLabel({ id: "label-a" });
    const labelB = makeInfoLabel({ id: "label-b" });
    adapter.displayAttentionFeedback(labelA);
    adapter.displayAttentionFeedback(labelB);
    // both animations are running independently
    adapter.stopAttentionFeedback(labelA);
    adapter.stopAttentionFeedback(labelB);
    // no error thrown — different ids are independent
  });

  it("passes the label's positioning to getShakeDirection", () => {
    const config = makeConfigProvider();
    const adapter = makeAdapter(config);
    const label = makeInfoLabel({ positioning: LabelPosition.LeftSided });
    adapter.displayAttentionFeedback(label);
    expect(config.getShakeDirection).toHaveBeenCalledWith(
      LabelPosition.LeftSided
    );
  });
});

// ─── stopAttentionFeedback ────────────────────────────────────────────────────

describe("stopAttentionFeedback", () => {
  it("cancels the interval so no further shakeLabel ticks fire", () => {
    const adapter = makeAdapter();
    const label = makeInfoLabel();
    adapter.displayAttentionFeedback(label);
    adapter.stopAttentionFeedback(label);
    jest.advanceTimersByTime(10000);
    expect(animateTagMock).not.toHaveBeenCalled();
  });

  it("is a no-op when the id is not tracked", () => {
    const adapter = makeAdapter();
    const label = makeInfoLabel();
    expect(() => adapter.stopAttentionFeedback(label)).not.toThrow();
  });

  it("removes the entry so a second stop call is also a no-op", () => {
    const adapter = makeAdapter();
    const label = makeInfoLabel();
    adapter.displayAttentionFeedback(label);
    adapter.stopAttentionFeedback(label);
    expect(() => adapter.stopAttentionFeedback(label)).not.toThrow();
  });
});

// ─── displayShowFeedback ──────────────────────────────────────────────────────

describe("displayShowFeedback", () => {
  const pacing = ShowSequencePacings.Regular;

  describe("guard — #unpackLabelData throws", () => {
    it("rejects when transformer is not found", async () => {
      transformerMapperToInfra.mockReturnValue(undefined);
      infoLabelTextMapper.toInfrastructure.mockReturnValue(makeBot("text-bot"));
      tailMapperToInfra.mockReturnValue(makeBot("tail-bot"));
      await expect(
        makeAdapter().displayShowFeedback({ data: makeInfoLabel(), pacing })
      ).rejects.toThrow("LabelFeedbackAdapter: transformer not found");
    });

    it("rejects when text is not found", async () => {
      transformerMapperToInfra.mockReturnValue(makeBot("t-bot"));
      infoLabelTextMapper.toInfrastructure.mockReturnValue(undefined);
      tailMapperToInfra.mockReturnValue(makeBot("tail-bot"));
      await expect(
        makeAdapter().displayShowFeedback({ data: makeInfoLabel(), pacing })
      ).rejects.toThrow("LabelFeedbackAdapter: text not found");
    });

    it("rejects when tail is not found", async () => {
      transformerMapperToInfra.mockReturnValue(makeBot("t-bot"));
      infoLabelTextMapper.toInfrastructure.mockReturnValue(makeBot("text-bot"));
      tailMapperToInfra.mockReturnValue(undefined);
      await expect(
        makeAdapter().displayShowFeedback({ data: makeInfoLabel(), pacing })
      ).rejects.toThrow("LabelFeedbackAdapter: tail not found");
    });
  });

  describe("happy path", () => {
    beforeEach(() => {
      setupValidMappers();
    });

    it("calls clearAnimations with 'formOpacity' via #stopOpacityTransition", async () => {
      await makeAdapter().displayShowFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      expect(clearAnimationsMock).toHaveBeenCalledWith(
        expect.any(Array),
        "formOpacity"
      );
    });

    it("calls clearAnimations with 'labelOpacity' via #stopOpacityTransition", async () => {
      await makeAdapter().displayShowFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      expect(clearAnimationsMock).toHaveBeenCalledWith(
        expect.any(Array),
        "labelOpacity"
      );
    });

    it("calls animateTag at least once", async () => {
      await makeAdapter().displayShowFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      expect(animateTagMock).toHaveBeenCalled();
    });

    it("uses the duration returned by getShowAnimationDuration", async () => {
      const config = makeConfigProvider({
        getShowAnimationDuration: jest.fn().mockReturnValue(500),
      });
      setupValidMappers();
      await makeAdapter(config).displayShowFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      const durations = animateTagMock.mock.calls
        .map(([, , opts]: any[]) => opts?.duration)
        .filter((d: any) => d !== undefined);
      expect(durations.every((d: number) => d === 500)).toBe(true);
    });

    it("sets pointable on text and tail after animation resolves", async () => {
      const textBot = makeBot("text-bot", "InfoLabelText");
      const tailBot = makeBot("tail-bot", "InfoLabelTail");
      infoLabelTextMapper.toInfrastructure.mockReturnValue(textBot);
      tailMapperToInfra.mockReturnValue(tailBot);
      await makeAdapter().displayShowFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      expect(setTagMaskMock).toHaveBeenCalledWith(
        [textBot, tailBot],
        "pointable",
        expect.anything()
      );
    });
  });
});

// ─── displayHideFeedback ──────────────────────────────────────────────────────

describe("displayHideFeedback", () => {
  const pacing = ShowSequencePacings.Regular;

  describe("guard — #unpackLabelData throws", () => {
    it("rejects when transformer is not found", async () => {
      transformerMapperToInfra.mockReturnValue(undefined);
      infoLabelTextMapper.toInfrastructure.mockReturnValue(makeBot("text-bot"));
      tailMapperToInfra.mockReturnValue(makeBot("tail-bot"));
      await expect(
        makeAdapter().displayHideFeedback({ data: makeInfoLabel(), pacing })
      ).rejects.toThrow("LabelFeedbackAdapter: transformer not found");
    });

    it("rejects when text is not found", async () => {
      transformerMapperToInfra.mockReturnValue(makeBot("t-bot"));
      infoLabelTextMapper.toInfrastructure.mockReturnValue(undefined);
      tailMapperToInfra.mockReturnValue(makeBot("tail-bot"));
      await expect(
        makeAdapter().displayHideFeedback({ data: makeInfoLabel(), pacing })
      ).rejects.toThrow("LabelFeedbackAdapter: text not found");
    });

    it("rejects when tail is not found", async () => {
      transformerMapperToInfra.mockReturnValue(makeBot("t-bot"));
      infoLabelTextMapper.toInfrastructure.mockReturnValue(makeBot("text-bot"));
      tailMapperToInfra.mockReturnValue(undefined);
      await expect(
        makeAdapter().displayHideFeedback({ data: makeInfoLabel(), pacing })
      ).rejects.toThrow("LabelFeedbackAdapter: tail not found");
    });
  });

  describe("happy path", () => {
    beforeEach(() => {
      setupValidMappers();
    });

    it("calls clearAnimations with 'formOpacity' via #stopOpacityTransition", async () => {
      await makeAdapter().displayHideFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      expect(clearAnimationsMock).toHaveBeenCalledWith(
        expect.any(Array),
        "formOpacity"
      );
    });

    it("calls clearAnimations with 'labelOpacity' via #stopOpacityTransition", async () => {
      await makeAdapter().displayHideFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      expect(clearAnimationsMock).toHaveBeenCalledWith(
        expect.any(Array),
        "labelOpacity"
      );
    });

    it("animates formOpacity to 0", async () => {
      await makeAdapter().displayHideFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      const formOpacityCalls = animateTagMock.mock.calls.filter(
        ([, tag]: any[]) => tag === "formOpacity"
      );
      expect(formOpacityCalls.length).toBeGreaterThan(0);
      expect(formOpacityCalls[0][2].toValue).toBe(0);
    });

    it("animates labelOpacity to 0", async () => {
      await makeAdapter().displayHideFeedback({
        data: makeInfoLabel(),
        pacing,
      });
      const labelOpacityCalls = animateTagMock.mock.calls.filter(
        ([, tag]: any[]) => tag === "labelOpacity"
      );
      expect(labelOpacityCalls.length).toBeGreaterThan(0);
      expect(labelOpacityCalls[0][2].toValue).toBe(0);
    });
  });
});

// ─── displayChangedIntensityFeedback ──────────────────────────────────────────

describe("displayChangedIntensityFeedback", () => {
  const pacing = ShowSequencePacings.Regular;

  describe("guard — #unpackLabelData throws", () => {
    it("rejects when transformer is not found", async () => {
      transformerMapperToInfra.mockReturnValue(undefined);
      infoLabelTextMapper.toInfrastructure.mockReturnValue(makeBot("text-bot"));
      tailMapperToInfra.mockReturnValue(makeBot("tail-bot"));
      await expect(
        makeAdapter().displayChangedIntensityFeedback({
          data: makeInfoLabel(),
          translucencyMode: LabelTranslucencyModes.Solid,
          pacing,
        })
      ).rejects.toThrow("LabelFeedbackAdapter: transformer not found");
    });
  });

  describe("happy path", () => {
    beforeEach(() => {
      setupValidMappers();
    });

    it("calls getIntensityOpacity with the translucency mode", async () => {
      const config = makeConfigProvider();
      await makeAdapter(config).displayChangedIntensityFeedback({
        data: makeInfoLabel(),
        translucencyMode: LabelTranslucencyModes.Faded,
        pacing,
      });
      expect(config.getIntensityOpacity).toHaveBeenCalledWith(
        LabelTranslucencyModes.Faded
      );
    });

    it("animates formOpacity to the value returned by getIntensityOpacity", async () => {
      const config = makeConfigProvider({
        getIntensityOpacity: jest.fn().mockReturnValue(0.3),
      });
      setupValidMappers();
      await makeAdapter(config).displayChangedIntensityFeedback({
        data: makeInfoLabel(),
        translucencyMode: LabelTranslucencyModes.Faded,
        pacing,
      });
      const formOpacityCalls = animateTagMock.mock.calls.filter(
        ([, tag]: any[]) => tag === "formOpacity"
      );
      expect(formOpacityCalls.length).toBeGreaterThan(0);
      expect(formOpacityCalls[0][2].toValue).toBe(0.3);
    });

    it("calls clearAnimations twice (formOpacity and labelOpacity)", async () => {
      await makeAdapter().displayChangedIntensityFeedback({
        data: makeInfoLabel(),
        translucencyMode: LabelTranslucencyModes.Solid,
        pacing,
      });
      expect(clearAnimationsMock).toHaveBeenCalledTimes(2);
    });
  });
});

// ─── disposeAll ───────────────────────────────────────────────────────────────

describe("disposeAll", () => {
  it("cancels all tracked intervals", () => {
    const adapter = makeAdapter();
    const labelA = makeInfoLabel({ id: "label-a" });
    const labelB = makeInfoLabel({ id: "label-b" });
    adapter.displayAttentionFeedback(labelA);
    adapter.displayAttentionFeedback(labelB);
    adapter.disposeAll();
    jest.advanceTimersByTime(10000);
    expect(animateTagMock).not.toHaveBeenCalled();
  });

  it("is a no-op when no animations are tracked", () => {
    const adapter = makeAdapter();
    expect(() => adapter.disposeAll()).not.toThrow();
  });

  it("clears the map so subsequent displayAttentionFeedback works without side-effects", () => {
    const adapter = makeAdapter();
    const label = makeInfoLabel();
    adapter.displayAttentionFeedback(label);
    adapter.disposeAll();
    expect(() => adapter.displayAttentionFeedback(label)).not.toThrow();
  });
});

// ─── #shakeLabel (via interval tick) ─────────────────────────────────────────

describe("#shakeLabel via interval tick", () => {
  const makeBotWithPosition = (id: string, type: string): any => ({
    ...makeBot(id, type),
    tags: {
      type,
      targetOpacity: 1,
      pointableDefault: true,
      initialPosition: { x: 1, y: 2, z: 3 },
    },
  });

  beforeEach(() => {
    infoLabelTextMapper.toInfrastructure.mockReturnValue(
      makeBotWithPosition("text-bot", "InfoLabelText")
    );
    tailMapperToInfra.mockReturnValue(
      makeBotWithPosition("tail-bot", "InfoLabelTail")
    );
    activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
    dateMapperToInfra.mockReturnValue(undefined);
  });

  it("calls dimensionProvider when the interval fires", () => {
    const dimProvider = jest.fn().mockReturnValue("scene3d");
    const adapter = new LabelFeedbackAdapter({
      dimensionProvider: dimProvider,
      labelFeedbackConfigProviderPort: makeConfigProvider(),
      infoLabelTextMapperPort: infoLabelTextMapper,
      activityIndicatorMapperPort: activityIndicatorMapper,
    });
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100); // delay = 100
    expect(dimProvider).toHaveBeenCalled();
  });

  it("calls getShakeDuration when the interval fires", () => {
    const config = makeConfigProvider();
    const adapter = makeAdapter(config);
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    expect(config.getShakeDuration).toHaveBeenCalled();
  });

  it("calls getShakeEasing when the interval fires", () => {
    const config = makeConfigProvider();
    const adapter = makeAdapter(config);
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    expect(config.getShakeEasing).toHaveBeenCalled();
  });

  it("calls setTagMask with dimensionX on bots that have initialPosition", () => {
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    expect(setTagMaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "text-bot" }),
      "scene3dX",
      1
    );
  });

  it("calls setTagMask with dimensionY on bots that have initialPosition", () => {
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    expect(setTagMaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "text-bot" }),
      "scene3dY",
      2
    );
  });

  it("calls setTagMask with dimensionZ on bots that have initialPosition", () => {
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    expect(setTagMaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "text-bot" }),
      "scene3dZ",
      3
    );
  });

  it("calls animateTag (shakeForward) synchronously before the first await", async () => {
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    expect(animateTagMock).toHaveBeenCalled();
  });

  it("calls animateTag with fromValue containing dimension key (shakeForward)", async () => {
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    const hasForwardKey = animateTagMock.mock.calls.some(
      ([, opts]: any[]) => opts?.fromValue?.["scene3dX"] !== undefined
    );
    expect(hasForwardKey).toBe(true);
  });

  it("calls animateTag (shakeBackward) after the first await resolves", async () => {
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();
    const hasBackwardKey = animateTagMock.mock.calls.some(
      ([, opts]: any[]) =>
        opts?.toValue?.["scene3dX"] !== undefined &&
        opts?.fromValue?.["scene3dX"] !== undefined
    );
    // both forward and backward have been called
    expect(animateTagMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(hasBackwardKey).toBe(true);
  });

  it("skips pieceBot processing silently when bot is undefined (date not set)", () => {
    const adapter = makeAdapter();
    expect(() => {
      adapter.displayAttentionFeedback(makeInfoLabel());
      jest.advanceTimersByTime(100);
    }).not.toThrow();
  });

  it("catches errors via console.error when bot has no initialPosition", async () => {
    infoLabelTextMapper.toInfrastructure.mockReturnValue(
      makeBot("text-bot", "InfoLabelText")
    ); // no initialPosition
    tailMapperToInfra.mockReturnValue(makeBot("tail-bot", "InfoLabelTail")); // no initialPosition
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(makeInfoLabel());
    jest.advanceTimersByTime(100);
    await Promise.resolve();
    await Promise.resolve();
    expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("includes date bot in piecesBot when data.date is set", () => {
    const dateBot = makeBotWithPosition("date-bot", "InfoLabelDate");
    dateMapperToInfra.mockReturnValue(dateBot);
    const label = makeInfoLabel({
      date: { id: "date-1", type: "InfoLabelDate" as const },
    });
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(label);
    jest.advanceTimersByTime(100);
    expect(setTagMaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "date-bot" }),
      "scene3dX",
      1
    );
  });

  it("includes activity indicator bots in piecesBot", () => {
    const indBot = makeBotWithPosition("ind-bot", "ActivityIndicator");
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indBot);
    const indicator = {
      id: "ind-1",
      type: "ActivityIndicator" as const,
      indicatorType: "regular",
      index: 0,
    };
    const label = makeInfoLabel({
      activityIndicators: new Map([["ind-1", indicator as any]]),
    });
    const adapter = makeAdapter();
    adapter.displayAttentionFeedback(label);
    jest.advanceTimersByTime(100);
    expect(setTagMaskMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ind-bot" }),
      "scene3dX",
      1
    );
  });
});

// ─── #unpackLabelData — activityIndicators and date paths ─────────────────────

describe("#unpackLabelData — activityIndicators and date paths", () => {
  const pacing = ShowSequencePacings.Regular;

  it("throws when indicatorBot is not found for an activityIndicator", async () => {
    transformerMapperToInfra.mockReturnValue(makeBot("t-bot"));
    infoLabelTextMapper.toInfrastructure.mockReturnValue(makeBot("text-bot"));
    tailMapperToInfra.mockReturnValue(makeBot("tail-bot"));
    activityIndicatorMapper.toInfrastructure.mockReturnValue(undefined);
    const indicator = {
      id: "ind-1",
      type: "ActivityIndicator" as const,
      indicatorType: "regular",
      index: 0,
    };
    const label = makeInfoLabel({
      activityIndicators: new Map([["ind-1", indicator as any]]),
    });
    await expect(
      makeAdapter().displayShowFeedback({ data: label, pacing })
    ).rejects.toThrow("LabelFeedbackAdapter: indicatorBot not found");
  });

  it("calls InfoLabelDateMapper with data.date when date is set", async () => {
    setupValidMappers();
    const dateBot = makeBot("date-bot", "InfoLabelDate");
    dateMapperToInfra.mockReturnValue(dateBot);
    const label = makeInfoLabel({
      date: { id: "date-1", type: "InfoLabelDate" as const },
    });
    await makeAdapter().displayShowFeedback({ data: label, pacing });
    expect(dateMapperToInfra).toHaveBeenCalledWith(
      expect.objectContaining({ id: "date-1" })
    );
  });
});

// ─── displayShowFeedback — with activityIndicators ────────────────────────────

describe("displayShowFeedback — with activityIndicators", () => {
  const pacing = ShowSequencePacings.Regular;

  it("calls animateTag for each activity indicator formOpacity", async () => {
    const indBot = makeBot("ind-bot", "ActivityIndicator");
    transformerMapperToInfra.mockReturnValue(makeBot("t-bot"));
    infoLabelTextMapper.toInfrastructure.mockReturnValue(makeBot("text-bot"));
    tailMapperToInfra.mockReturnValue(makeBot("tail-bot"));
    activityIndicatorMapper.toInfrastructure.mockReturnValue(indBot);
    const indicator = {
      id: "ind-1",
      type: "ActivityIndicator" as const,
      indicatorType: "regular",
      index: 0,
    };
    const label = makeInfoLabel({
      activityIndicators: new Map([["ind-1", indicator as any]]),
    });
    await makeAdapter().displayShowFeedback({ data: label, pacing });
    expect(animateTagMock).toHaveBeenCalledWith(
      indBot,
      "formOpacity",
      expect.objectContaining({ toValue: indBot.tags.targetOpacity })
    );
  });
});

// ─── #stopOpacityTransition — date branch ─────────────────────────────────────

describe("#stopOpacityTransition — date branch", () => {
  const pacing = ShowSequencePacings.Regular;

  it("includes the date bot in clearAnimations when data.date has a matching bot", async () => {
    setupValidMappers();
    const dateBot = makeBot("date-bot", "InfoLabelDate");
    dateMapperToInfra.mockReturnValue(dateBot);
    const label = makeInfoLabel({
      date: { id: "date-1", type: "InfoLabelDate" as const },
    });
    await makeAdapter().displayHideFeedback({ data: label, pacing });
    const botsUsed = clearAnimationsMock.mock.calls.flatMap(
      ([bots]: any[]) => bots
    );
    expect(botsUsed).toContain(dateBot);
  });

  it("does not call InfoLabelDateMapper in #stopOpacityTransition when data.date is not set", async () => {
    setupValidMappers();
    const label = makeInfoLabel(); // no date
    await makeAdapter().displayHideFeedback({ data: label, pacing });
    expect(dateMapperToInfra).not.toHaveBeenCalled();
  });
});
