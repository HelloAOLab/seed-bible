import {
  SERVER_CLOCK_EARLY_INTERVAL_MS,
  SERVER_CLOCK_RETRY_INTERVAL_MS,
  SERVER_CLOCK_SETTLED_INTERVAL_MS,
  createServerClock,
  type TimeSample,
} from "@packages/seed-bible/seed-bible/managers/ServerClock";

/**
 * A server whose clock runs `offsetMs` ahead of this device's, reached in
 * `latencyMs` each way. The sample is what `InstRecordsClient` builds from
 * the server's reply, timed on this device's clock.
 */
function server(offsetMs: number, latencyMs = 40) {
  let jitter = 0;
  return vi.fn(async (): Promise<TimeSample> => {
    // Round trips that never take exactly as long, like a real network.
    jitter = (jitter + 7) % 11;
    const latency = latencyMs + jitter;
    const clientRequestTime = Date.now();
    const serverReceiveTime = clientRequestTime + latency + offsetMs;
    return {
      clientRequestTime,
      serverReceiveTime,
      serverTransmitTime: serverReceiveTime,
      currentTime: clientRequestTime + 2 * latency,
    };
  });
}

/**
 * Lets the back-to-back samples that start a run go through. A zero delay
 * still counts as a millisecond to the fake timers.
 */
async function settle() {
  for (let i = 0; i < 5; i++) await vi.advanceTimersByTimeAsync(1);
}

describe("ServerClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("knows nothing until a few samples are in, then gives the server's time", async () => {
    const sample = server(60_000);
    const clock = createServerClock(sample);
    expect(clock.now()).toBeNull();

    clock.acquire();
    await settle();

    // Taken back to back, so it settles without waiting seconds.
    expect(sample).toHaveBeenCalledTimes(3);
    expect(clock.now()).not.toBeNull();
    expect(clock.now()! - Date.now()).toBeCloseTo(60_000, -1);
  });

  it("samples a second apart while settling, then every 30 seconds", async () => {
    const sample = server(0);
    const clock = createServerClock(sample);
    clock.acquire();
    await settle();
    const afterSettling = sample.mock.calls.length;

    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_EARLY_INTERVAL_MS);
    expect(sample).toHaveBeenCalledTimes(afterSettling + 1);

    // Fifteen samples in all, a second apart after the first few...
    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_EARLY_INTERVAL_MS * 11);
    expect(sample).toHaveBeenCalledTimes(15);

    // ...then one every 30 seconds.
    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_SETTLED_INTERVAL_MS - 1000);
    expect(sample).toHaveBeenCalledTimes(15);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sample).toHaveBeenCalledTimes(16);
  });

  it("keeps trying after a sample fails", async () => {
    const working = server(5000);
    const sample = vi
      .fn<() => Promise<TimeSample>>()
      .mockRejectedValueOnce(new Error("socket closed"))
      .mockImplementation(working);
    const clock = createServerClock(sample);

    clock.acquire();
    await settle();
    expect(clock.now()).toBeNull();

    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_RETRY_INTERVAL_MS);

    expect(clock.now()! - Date.now()).toBeCloseTo(5000, -1);
  });

  it("stops sampling when the last holder lets go, and keeps what it learned", async () => {
    const sample = server(2000);
    const clock = createServerClock(sample);
    const releaseFirst = clock.acquire();
    const releaseSecond = clock.acquire();
    await settle();

    releaseFirst();
    const calls = sample.mock.calls.length;
    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_EARLY_INTERVAL_MS);
    expect(sample.mock.calls.length).toBeGreaterThan(calls);

    releaseSecond();
    const stoppedAt = sample.mock.calls.length;
    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_SETTLED_INTERVAL_MS * 2);
    expect(sample).toHaveBeenCalledTimes(stoppedAt);
    expect(clock.now()! - Date.now()).toBeCloseTo(2000, -1);
  });

  it("starts over when the device's clock is changed", async () => {
    let offset = 0;
    const sample = vi.fn(() => server(offset)());
    const clock = createServerClock(sample);
    clock.acquire();
    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_EARLY_INTERVAL_MS * 5);
    expect(clock.now()! - Date.now()).toBeCloseTo(0, -1);

    // Someone set this device's clock back ten minutes.
    offset = 600_000;
    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_EARLY_INTERVAL_MS * 3);

    expect(clock.now()! - Date.now()).toBeCloseTo(600_000, -1);
  });

  it("still gives an answer when every round trip takes exactly as long", async () => {
    const sample = vi.fn(async (): Promise<TimeSample> => {
      const clientRequestTime = Date.now();
      return {
        clientRequestTime,
        serverReceiveTime: clientRequestTime + 50 + 9000,
        serverTransmitTime: clientRequestTime + 50 + 9000,
        currentTime: clientRequestTime + 100,
      };
    });
    const clock = createServerClock(sample);
    clock.acquire();

    await vi.advanceTimersByTimeAsync(SERVER_CLOCK_EARLY_INTERVAL_MS * 10);

    expect(clock.now()! - Date.now()).toBe(9000);
  });
});
