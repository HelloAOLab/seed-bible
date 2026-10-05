import { effect } from "@preact/signals";
import { stubPageVisibility } from "../testUtils/pageVisibility";
import {
  createFriendContentFreshness,
  createFriendReadLimiter,
  SkippedFriendRead,
} from "@packages/seed-bible/seed-bible/managers/friendContentFreshness";

/** A read that stays in flight until the test settles it. */
function pendingRead<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  const load = vi.fn(() => promise);
  return { load, resolve, reject };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const always = () => true;

describe("createFriendReadLimiter", () => {
  it("runs at most the limit at once, starting the next as one finishes", async () => {
    const limiter = createFriendReadLimiter(2);
    const reads = [pendingRead(), pendingRead(), pendingRead()];

    const results = reads.map((r, i) =>
      limiter.run(r.load, always).then(() => i)
    );
    await flush();

    expect(reads.map((r) => r.load.mock.calls.length)).toEqual([1, 1, 0]);

    reads[0]!.resolve(undefined);
    await flush();
    expect(reads[2]!.load).toHaveBeenCalledTimes(1);

    reads[1]!.resolve(undefined);
    reads[2]!.resolve(undefined);
    await expect(Promise.all(results)).resolves.toEqual([0, 1, 2]);
  });

  it("frees the slot of a read that fails", async () => {
    const limiter = createFriendReadLimiter(1);
    const failing = pendingRead();
    const next = pendingRead();

    const first = limiter.run(failing.load, always);
    const second = limiter.run(next.load, always);
    failing.reject(new Error("offline"));

    await expect(first).rejects.toThrow("offline");
    await flush();
    expect(next.load).toHaveBeenCalledTimes(1);
    next.resolve(undefined);
    await expect(second).resolves.toBeUndefined();
  });

  it("skips a waiting read that's no longer wanted when its turn comes, and moves on", async () => {
    const limiter = createFriendReadLimiter(1);
    const busy = pendingRead();
    const unwanted = pendingRead();
    const wanted = pendingRead();

    void limiter.run(busy.load, always);
    const skipped = limiter.run(unwanted.load, () => false);
    void limiter.run(wanted.load, always);
    busy.resolve(undefined);

    await expect(skipped).rejects.toBeInstanceOf(SkippedFriendRead);
    await flush();
    expect(unwanted.load).not.toHaveBeenCalled();
    expect(wanted.load).toHaveBeenCalledTimes(1);
  });

  it("never skips a read that had room straight away", async () => {
    const limiter = createFriendReadLimiter(1);
    const read = pendingRead<string>();

    const result = limiter.run(read.load, () => false);
    read.resolve("notes");

    await expect(result).resolves.toBe("notes");
  });
});

describe("createFriendContentFreshness().read", () => {
  it("skips a waiting read once its content is off screen, but makes it while shown", async () => {
    const limiter = createFriendReadLimiter(1);
    const freshness = createFriendContentFreshness(limiter);
    const offScreen = freshness.trackedSignal<string[]>([], () => {});
    const onScreen = freshness.trackedSignal<string[]>([], () => {});
    const stopShowing = effect(() => void onScreen.value);
    const busy = pendingRead();
    const forOffScreen = pendingRead();
    const forOnScreen = pendingRead();

    try {
      void limiter.run(busy.load, always);
      const skipped = freshness.read(offScreen, forOffScreen.load);
      const made = freshness.read(onScreen, forOnScreen.load);
      busy.resolve(undefined);

      await expect(skipped).rejects.toBeInstanceOf(SkippedFriendRead);
      await flush();
      expect(forOffScreen.load).not.toHaveBeenCalled();
      expect(forOnScreen.load).toHaveBeenCalledTimes(1);
      forOnScreen.resolve(undefined);
      await expect(made).resolves.toBeUndefined();
    } finally {
      stopShowing();
    }
  });

  it("shares one limit between everything given the same limiter", async () => {
    const limiter = createFriendReadLimiter(1);
    const notes = createFriendContentFreshness(limiter);
    const playlists = createFriendContentFreshness(limiter);
    const noteContent = notes.trackedSignal<string[]>([], () => {});
    const playlistContent = playlists.trackedSignal<string[]>([], () => {});
    const stopShowing = effect(() => {
      void noteContent.value;
      void playlistContent.value;
    });
    const noteRead = pendingRead();
    const playlistRead = pendingRead();

    try {
      void notes.read(noteContent, noteRead.load);
      void playlists.read(playlistContent, playlistRead.load);
      await flush();

      expect(noteRead.load).toHaveBeenCalledTimes(1);
      expect(playlistRead.load).not.toHaveBeenCalled();

      noteRead.resolve(undefined);
      await flush();
      expect(playlistRead.load).toHaveBeenCalledTimes(1);
    } finally {
      stopShowing();
    }
  });
});

describe("createFriendContentFreshness().refreshOnScreen", () => {
  it("refreshes only the content something is showing", async () => {
    const freshness = createFriendContentFreshness();
    const refreshShown = vi.fn();
    const refreshHidden = vi.fn();
    const shown = freshness.trackedSignal<string[]>([], refreshShown);
    freshness.trackedSignal<string[]>([], refreshHidden);
    const stopShowing = effect(() => void shown.value);

    try {
      await flush();
      refreshShown.mockClear();

      freshness.refreshOnScreen();

      expect(refreshShown).toHaveBeenCalledTimes(1);
      expect(refreshHidden).not.toHaveBeenCalled();
    } finally {
      stopShowing();
    }
  });
});

describe("createFriendContentFreshness listening for the app coming back", () => {
  // A read that failed while offline can only work again now.
  it("refreshes what's shown when the connection comes back, while the app is in view", async () => {
    const page = stubPageVisibility();
    const freshness = createFriendContentFreshness();
    const refresh = vi.fn();
    const shown = freshness.trackedSignal<string[]>([], refresh);
    const stopShowing = effect(() => void shown.value);

    try {
      await flush();
      refresh.mockClear();

      window.dispatchEvent(new Event("online"));
      expect(refresh).toHaveBeenCalledTimes(1);

      page.set("hidden");
      window.dispatchEvent(new Event("online"));
      expect(refresh).toHaveBeenCalledTimes(1);
    } finally {
      stopShowing();
      page.restore();
    }

    window.dispatchEvent(new Event("online"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("listens only while something is shown", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const focusListeners = (spy: typeof add) =>
      spy.mock.calls.filter(([type]) => type === "focus").map(([, l]) => l);

    try {
      const freshness = createFriendContentFreshness();
      const first = freshness.trackedSignal<string[]>([], () => {});
      const second = freshness.trackedSignal<string[]>([], () => {});
      expect(focusListeners(add)).toEqual([]);

      const stopFirst = effect(() => void first.value);
      const stopSecond = effect(() => void second.value);
      expect(focusListeners(add)).toHaveLength(1);

      stopFirst();
      expect(focusListeners(remove)).toEqual([]);

      stopSecond();
      expect(focusListeners(remove)).toEqual(focusListeners(add));
    } finally {
      add.mockRestore();
      remove.mockRestore();
    }
  });
});
