import {
  DRIFT_RATE_CHANGE_INTERVAL_MS,
  DRIFT_SEEK_COOLDOWN_MS,
  DRIFT_STARTUP_SEEK_COOLDOWN_MS,
  decideDriftCorrection,
  initialDriftState,
  type DriftState,
} from "@packages/audio-reader-extension/ext_audioReader/host/driftCorrection";

const NOW = 100_000;

function nudging(rate: number, changedAgoMs = 5000): DriftState {
  return {
    ...initialDriftState(),
    rate,
    lastRateChangeMs: NOW - changedAgoMs,
  };
}

describe("decideDriftCorrection", () => {
  it("leaves a listener alone who is already in step", () => {
    expect(decideDriftCorrection(0.05, initialDriftState(), NOW)).toEqual({
      kind: "hold",
    });
    expect(decideDriftCorrection(-0.05, initialDriftState(), NOW)).toEqual({
      kind: "hold",
    });
  });

  it("speeds up a listener who is behind, and slows one who is ahead", () => {
    expect(decideDriftCorrection(-0.3, initialDriftState(), NOW)).toEqual({
      kind: "rate",
      rate: 1.03,
    });
    expect(decideDriftCorrection(0.3, initialDriftState(), NOW)).toEqual({
      kind: "rate",
      rate: 0.97,
    });
  });

  it("never nudges by more than 5%", () => {
    expect(decideDriftCorrection(-0.9, initialDriftState(), NOW)).toEqual({
      kind: "rate",
      rate: 1.05,
    });
    expect(decideDriftCorrection(0.9, initialDriftState(), NOW)).toEqual({
      kind: "rate",
      rate: 0.95,
    });
  });

  it("jumps a listener too far off to catch up smoothly, but not twice in a row", () => {
    expect(decideDriftCorrection(-4, initialDriftState(), NOW)).toEqual({
      kind: "seek",
    });

    const justJumped = { ...initialDriftState(), lastSeekMs: NOW - 500 };
    expect(decideDriftCorrection(-4, justJumped, NOW)).toEqual({
      kind: "hold",
    });
    expect(
      decideDriftCorrection(-4, justJumped, NOW - 500 + DRIFT_SEEK_COOLDOWN_MS)
    ).toEqual({ kind: "seek" });
  });

  it("goes straight back to normal speed once caught up, without waiting", () => {
    expect(decideDriftCorrection(-0.01, nudging(1.05, 10), NOW)).toEqual({
      kind: "rate",
      rate: 1,
    });
  });

  it("keeps nudging until it's properly caught up, not just nearly", () => {
    // Inside the band that starts a nudge, but outside the one that ends it.
    expect(decideDriftCorrection(-0.05, nudging(1.01), NOW)).toEqual({
      kind: "hold",
    });
    expect(decideDriftCorrection(-0.05, initialDriftState(), NOW)).toEqual({
      kind: "hold",
    });
  });

  it("changes speed at most once a second", () => {
    const changedJustNow = nudging(1.02, 200);
    expect(decideDriftCorrection(-0.5, changedJustNow, NOW)).toEqual({
      kind: "hold",
    });
    expect(
      decideDriftCorrection(
        -0.5,
        changedJustNow,
        NOW - 200 + DRIFT_RATE_CHANGE_INTERVAL_MS
      )
    ).toEqual({ kind: "rate", rate: 1.05 });
  });

  it("jumps a gap over a tenth of a second right after starting, instead of nudging", () => {
    expect(decideDriftCorrection(-0.3, initialDriftState(), NOW, true)).toEqual(
      {
        kind: "seek",
      }
    );
    // Close enough is still left alone, or nudged, as usual.
    expect(
      decideDriftCorrection(-0.05, initialDriftState(), NOW, true)
    ).toEqual({ kind: "hold" });
    expect(
      decideDriftCorrection(-0.09, initialDriftState(), NOW, true)
    ).toEqual({ kind: "rate", rate: 1.01 });
  });

  it("can jump again sooner while starting, to land on the timeline", () => {
    const jumped = { ...initialDriftState(), lastSeekMs: NOW };
    expect(decideDriftCorrection(-0.3, jumped, NOW + 100, true)).toEqual({
      kind: "hold",
    });
    expect(
      decideDriftCorrection(
        -0.3,
        jumped,
        NOW + DRIFT_STARTUP_SEEK_COOLDOWN_MS,
        true
      )
    ).toEqual({ kind: "seek" });
  });
});
