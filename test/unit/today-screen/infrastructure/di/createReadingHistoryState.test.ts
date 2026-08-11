import { signal } from "@preact/signals";
import { createReadingHistoryState } from "../../../../../packages/today-screen/infrastructure/di/createReadingHistoryState";
import type { UserLastReading } from "../../../../../packages/today-screen/domain/models/readingHistory";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Flush all pending microtasks (a macrotask tick drains the promise queue). */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

describe("createReadingHistoryState", () => {
  it("is empty and fetches nothing when there is no user", () => {
    const userId = signal<string | null>(null);
    const refetchTrigger = signal(0);
    const getUserLastReading = vi.fn();

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    expect(readingHistory.value).toEqual({ status: "empty" });
    expect(getUserLastReading).not.toHaveBeenCalled();
    dispose();
  });

  it("goes loading → ready when the user has history", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const d = deferred<UserLastReading>();
    const getUserLastReading = vi.fn(() => d.promise);

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    expect(readingHistory.value).toEqual({ status: "loading" });
    expect(getUserLastReading).toHaveBeenCalledWith("A", expect.any(Object));

    d.resolve({ bookId: "GEN", chapter: 2 });
    await flush();

    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 2 },
    });
    dispose();
  });

  it("goes loading → empty when the logged-in user has never read", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const d = deferred<UserLastReading>();
    const getUserLastReading = vi.fn(() => d.promise);

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    expect(readingHistory.value).toEqual({ status: "loading" });

    d.resolve(undefined);
    await flush();

    expect(readingHistory.value).toEqual({ status: "empty" });
    dispose();
  });

  it("resets to loading on an account switch and ignores the previous user's late result", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const dA = deferred<UserLastReading>();
    const dB = deferred<UserLastReading>();
    const getUserLastReading = vi.fn((id: string) =>
      id === "A" ? dA.promise : dB.promise
    );

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    expect(readingHistory.value).toEqual({ status: "loading" });

    // Switch to a second account before A's fetch resolves.
    userId.value = "B";
    expect(readingHistory.value).toEqual({ status: "loading" });

    // B resolves first and becomes the live state.
    dB.resolve({ bookId: "JHN", chapter: 1 });
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "JHN", chapter: 1 },
    });

    // A's stale, in-flight fetch must NOT overwrite B's state.
    dA.resolve({ bookId: "GEN", chapter: 9 });
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "JHN", chapter: 1 },
    });
    dispose();
  });

  it("returns to empty on sign-out and ignores the previous user's late result", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const d = deferred<UserLastReading>();
    const getUserLastReading = vi.fn(() => d.promise);

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    expect(readingHistory.value).toEqual({ status: "loading" });

    userId.value = null;
    expect(readingHistory.value).toEqual({ status: "empty" });

    // A's fetch resolving after sign-out must not resurrect the old position.
    d.resolve({ bookId: "GEN", chapter: 1 });
    await flush();
    expect(readingHistory.value).toEqual({ status: "empty" });
    dispose();
  });

  it("refetches without flashing a placeholder when the same user reads on", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const d1 = deferred<UserLastReading>();
    const d2 = deferred<UserLastReading>();
    let call = 0;
    const getUserLastReading = vi.fn(() =>
      ++call === 1 ? d1.promise : d2.promise
    );

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    d1.resolve({ bookId: "GEN", chapter: 1 });
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 1 },
    });

    // Reading progresses: refetch, but the current card stays visible.
    refetchTrigger.value = 1;
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 1 },
    });
    expect(getUserLastReading).toHaveBeenCalledTimes(2);

    d2.resolve({ bookId: "JHN", chapter: 4 });
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "JHN", chapter: 4 },
    });
    dispose();
  });

  it("falls back to empty when the initial load fails", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const d = deferred<UserLastReading>();
    const getUserLastReading = vi.fn(() => d.promise);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    d.reject(new Error("boom"));
    await flush();

    expect(readingHistory.value).toEqual({ status: "empty" });
    errSpy.mockRestore();
    dispose();
  });

  it("keeps the current card when a same-user refetch fails", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const d1 = deferred<UserLastReading>();
    const d2 = deferred<UserLastReading>();
    let call = 0;
    const getUserLastReading = vi.fn(() =>
      ++call === 1 ? d1.promise : d2.promise
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    d1.resolve({ bookId: "GEN", chapter: 1 });
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 1 },
    });

    // Reading progresses; the refetch fails on a transient error. A returning
    // user must NOT be flashed back to Welcome — the existing card stays.
    refetchTrigger.value = 1;
    d2.reject(new Error("network blip"));
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 1 },
    });

    errSpy.mockRestore();
    dispose();
  });

  it("keeps the current card when a same-user refetch returns no history", async () => {
    const userId = signal<string | null>("A");
    const refetchTrigger = signal(0);
    const d1 = deferred<UserLastReading>();
    const d2 = deferred<UserLastReading>();
    let call = 0;
    const getUserLastReading = vi.fn(() =>
      ++call === 1 ? d1.promise : d2.promise
    );

    const { readingHistory, dispose } = createReadingHistoryState({
      userId,
      refetchTrigger,
      getUserLastReading,
    });

    d1.resolve({ bookId: "GEN", chapter: 1 });
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 1 },
    });

    // A spurious empty result on a same-user refetch must not erase a
    // known-good position.
    refetchTrigger.value = 1;
    d2.resolve(undefined);
    await flush();
    expect(readingHistory.value).toEqual({
      status: "ready",
      lastReading: { bookId: "GEN", chapter: 1 },
    });

    dispose();
  });
});
