import { TimeSync, type TimeSample } from "@casual-simulation/timesync";

export type { TimeSample };

/** Time between samples while the estimate is still settling. */
export const SERVER_CLOCK_EARLY_INTERVAL_MS = 1000;
/** Time between samples once it has settled, to follow slow clock drift. */
export const SERVER_CLOCK_SETTLED_INTERVAL_MS = 30_000;
/** Time before trying again after a sample failed. */
export const SERVER_CLOCK_RETRY_INTERVAL_MS = 5000;
/** Samples needed before the estimate is trusted at all. */
export const SERVER_CLOCK_MIN_SAMPLES = 3;
/** How many samples are taken a second apart before slowing down. */
const EARLY_SAMPLE_COUNT = 15;
/**
 * How far a new sample's offset may sit from the estimate before the device
 * clock is taken to have been changed. `TimeSync` keeps its lowest-latency
 * samples indefinitely, so without a reset it would go on averaging samples
 * from before the change.
 */
const CLOCK_JUMP_MS = 1000;

/**
 * This device's estimate of the CasualOS server's clock, so devices can agree
 * on "now" without trusting each other's clocks. Each sample times a round
 * trip over the records websocket; `TimeSync` keeps the quickest round trips
 * and averages their offsets.
 */
export interface ServerClock {
  /**
   * The server's time, in milliseconds since the epoch, or null until enough
   * samples have come back to trust.
   */
  now(): number | null;

  /**
   * Keeps the estimate current until the returned function is called.
   * Sampling runs while anyone holds the clock and stops when the last
   * holder lets go; the estimate itself is kept for the next holder.
   */
  acquire(): () => void;
}

/** Half the round trip, less the time the server spent answering. */
function sampleLatency(sample: TimeSample): number {
  return (
    (sample.currentTime -
      sample.clientRequestTime -
      (sample.serverTransmitTime - sample.serverReceiveTime)) /
    2
  );
}

/** How far the server's clock is ahead of this device's, by one sample. */
function sampleOffset(sample: TimeSample): number {
  return sample.serverTransmitTime - sample.currentTime + sampleLatency(sample);
}

export function createServerClock(
  sampleServerTime: () => Promise<TimeSample>,
  deviceNow: () => number = Date.now
): ServerClock {
  let sync = new TimeSync();
  let holders = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Bumped whenever sampling stops, so a sample still in flight from an
  // earlier run doesn't schedule a second loop.
  let run = 0;

  const offsetMs = (): number | null => {
    if (sync.numTotalSamples < SERVER_CLOCK_MIN_SAMPLES) return null;
    if (Number.isFinite(sync.offsetMS)) return sync.offsetMS;
    // `TimeSync` leaves out every sample when their round trips all took
    // exactly as long (a standard deviation of zero). The quickest is then
    // as good as any; its samples are kept quickest first.
    const quickest = sync.getSamples()[0];
    return quickest ? sampleOffset(quickest) : null;
  };

  const schedule = (thisRun: number, delayMs: number) => {
    timer = setTimeout(() => {
      timer = null;
      void takeSample(thisRun);
    }, delayMs);
  };

  const takeSample = async (thisRun: number) => {
    let sample: TimeSample;
    try {
      sample = await sampleServerTime();
    } catch {
      if (thisRun === run) schedule(thisRun, SERVER_CLOCK_RETRY_INTERVAL_MS);
      return;
    }
    if (thisRun !== run) return;
    const estimate = offsetMs();
    if (
      estimate !== null &&
      Math.abs(sampleOffset(sample) - estimate) >
        CLOCK_JUMP_MS + sampleLatency(sample)
    ) {
      sync = new TimeSync();
    }
    sync.addSample(sample);
    // Back to back until it can be trusted, so a session that has just
    // opened is synced within a few round trips rather than seconds.
    schedule(
      thisRun,
      sync.numTotalSamples < SERVER_CLOCK_MIN_SAMPLES
        ? 0
        : sync.numTotalSamples < EARLY_SAMPLE_COUNT
          ? SERVER_CLOCK_EARLY_INTERVAL_MS
          : SERVER_CLOCK_SETTLED_INTERVAL_MS
    );
  };

  const stop = () => {
    run += 1;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    now: () => {
      const offset = offsetMs();
      return offset === null ? null : deviceNow() + offset;
    },
    acquire: () => {
      holders += 1;
      if (holders === 1) void takeSample(run);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        holders -= 1;
        if (holders === 0) stop();
      };
    },
  };
}
