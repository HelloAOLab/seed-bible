import {
  createNavigationManager as createUntrackedNavigationManager,
  type NavigationManager,
  type NavigationManagerOptions,
} from "@packages/seed-bible/seed-bible/managers/NavigationManager";

const liveManagers: NavigationManager[] = [];

/**
 * Every manager patches the shared `window.history` and listens for
 * `popstate`, so one left alive keeps reacting to the navigations of every
 * test that follows. Creating them through here disposes them afterwards.
 */
function createNavigationManager(
  options?: NavigationManagerOptions
): NavigationManager {
  const navigation = createUntrackedNavigationManager(options);
  liveManagers.push(navigation);
  return navigation;
}

afterEach(() => {
  // Newest first: each manager's teardown only unwinds its own `history`
  // patch while it is still the outermost one.
  for (const navigation of liveManagers.splice(0).reverse()) {
    navigation.dispose();
  }
  window.history.replaceState(null, "", window.location.pathname);
});

describe("createNavigationManager updateQueryParams", () => {
  it("does not push a new history entry when the requested params already match the URL", () => {
    const navigation = createNavigationManager();
    navigation.updateQueryParams({ book: "GEN", chapter: "1" });
    const historyLengthAfterFirstPush = window.history.length;

    // Same values again — nothing actually changed, so this must not push.
    navigation.updateQueryParams({ book: "GEN", chapter: "1" });

    expect(window.history.length).toBe(historyLengthAfterFirstPush);
  });

  it("pushes exactly one history entry per distinct navigation, even across repeated calls with unrelated re-runs", () => {
    const navigation = createNavigationManager();
    const historyLengthBefore = window.history.length;

    // Simulates the "switch tab" case: params change once...
    navigation.updateQueryParams({ book: "2KI", chapter: "15" });
    // ...then an effect re-runs (e.g. from an unrelated signal write) with
    // the same resolved params, which previously still pushed a duplicate.
    navigation.updateQueryParams({ book: "2KI", chapter: "15" });
    navigation.updateQueryParams({ book: "2KI", chapter: "15" });

    expect(window.history.length).toBe(historyLengthBefore + 1);

    // Switching to another tab/chapter is one more distinct navigation.
    navigation.updateQueryParams({ book: "JOL", chapter: "1" });
    navigation.updateQueryParams({ book: "JOL", chapter: "1" });

    expect(window.history.length).toBe(historyLengthBefore + 2);
  });

  it("still pushes when a param actually changes", () => {
    const navigation = createNavigationManager();
    const historyLengthBefore = window.history.length;

    navigation.updateQueryParams({ book: "GEN", chapter: "1" });
    navigation.updateQueryParams({ book: "GEN", chapter: "2" });

    expect(window.history.length).toBe(historyLengthBefore + 2);
  });
});

describe("createNavigationManager updatePathAndQueryParams", () => {
  it("sets the pathname and query params in one history entry", () => {
    const navigation = createNavigationManager();
    const historyLengthBefore = window.history.length;

    navigation.updatePathAndQueryParams("/genesis/1", { translation: "KJV" });

    expect(window.history.length).toBe(historyLengthBefore + 1);
    expect(navigation.currentUrl.value.pathname).toBe("/genesis/1");
    expect(navigation.currentUrl.value.searchParams.get("translation")).toBe(
      "KJV"
    );
  });

  it("does not push when neither the pathname nor the params actually change", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", { translation: "KJV" });
    const historyLengthAfterFirstPush = window.history.length;

    navigation.updatePathAndQueryParams("/genesis/1", { translation: "KJV" });

    expect(window.history.length).toBe(historyLengthAfterFirstPush);
  });

  it("prefixes the pathname with basePath", () => {
    const navigation = createNavigationManager({
      basePath: "/b/some-branch",
    });

    navigation.updatePathAndQueryParams("/genesis/1", {});

    expect(navigation.currentUrl.value.pathname).toBe(
      "/b/some-branch/genesis/1"
    );
  });
});

describe("createNavigationManager dispose", () => {
  it("stops writing to the URL", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", {});
    const hrefAfterLastLiveWrite = window.location.href;

    navigation.dispose();
    navigation.updatePathAndQueryParams("/exodus/2", { translation: "KJV" });
    navigation.push("/leviticus/3");
    navigation.replace("/numbers/4");

    // Effects elsewhere hold onto the manager and keep calling these long
    // after the state owning it is finished. A disposed manager must not act
    // on them — otherwise it drags the live manager off its own page.
    expect(window.location.href).toBe(hrefAfterLastLiveWrite);
  });

  it("stops reacting to URL changes made by anyone else", () => {
    const navigation = createNavigationManager();
    const urlBefore = navigation.currentUrl.value.href;

    navigation.dispose();
    window.history.pushState(null, "", "/somewhere-else");

    expect(navigation.currentUrl.value.href).toBe(urlBefore);
  });

  it("restores the history methods it wrapped", () => {
    const pushStateBefore = window.history.pushState;
    const replaceStateBefore = window.history.replaceState;

    const navigation = createNavigationManager();
    expect(window.history.pushState).not.toBe(pushStateBefore);

    navigation.dispose();

    expect(window.history.pushState).toBe(pushStateBefore);
    expect(window.history.replaceState).toBe(replaceStateBefore);
  });

  it("leaves a later manager's wrapper alone when disposed out of order", () => {
    const first = createNavigationManager();
    const second = createNavigationManager();
    const secondsWrapper = window.history.pushState;

    // `first` is no longer the outermost wrapper, so unwinding it would throw
    // `second`'s away and leave that manager deaf to its own writes.
    first.dispose();

    expect(window.history.pushState).toBe(secondsWrapper);

    second.updatePathAndQueryParams("/genesis/1", {});
    expect(second.currentUrl.value.pathname).toBe("/genesis/1");
    // ...while the disposed one still ignores what it sees.
    expect(first.currentUrl.value.pathname).not.toBe("/genesis/1");
  });

  it("is safe to call twice", () => {
    const navigation = createNavigationManager();

    navigation.dispose();
    expect(() => navigation.dispose()).not.toThrow();
  });
});

describe("createNavigationManager batchWrites", () => {
  it("folds several URL writes into one history entry", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", { sidebar: "open" });
    const historyLengthBefore = window.history.length;

    // One user action, two things that mirror to the URL: the reader moves and
    // the sidebar that launched it closes.
    navigation.batchWrites(() => {
      navigation.updatePathAndQueryParams("/exodus/2", {}, true);
      navigation.updateQueryParams({ sidebar: null });
    });

    expect(window.history.length).toBe(historyLengthBefore + 1);
    expect(window.location.pathname).toBe("/exodus/2");
    expect(window.location.search).toBe("");
  });

  it("replaces when every write in the batch replaces, pushes when any pushes", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", {});
    const historyLengthBefore = window.history.length;

    navigation.batchWrites(() => {
      navigation.replace("/exodus/2");
      navigation.replace("/exodus/3");
    });
    expect(window.history.length).toBe(historyLengthBefore);
    expect(window.location.pathname).toBe("/exodus/3");

    navigation.batchWrites(() => {
      navigation.replace("/leviticus/1");
      navigation.push("/leviticus/2");
    });
    expect(window.history.length).toBe(historyLengthBefore + 1);
    expect(window.location.pathname).toBe("/leviticus/2");
  });

  it("publishes each batched write to currentUrl right away", () => {
    const navigation = createNavigationManager();
    const seen: string[] = [];

    navigation.batchWrites(() => {
      navigation.updatePathAndQueryParams("/genesis/1", { sidebar: "open" });
      // State bound to the URL reads `currentUrl`, not `window.location`, and
      // has to see the pending write — otherwise it reverts the change that is
      // still being batched.
      seen.push(navigation.currentUrl.value.search);
      navigation.updateQueryParams({ sidebar: null });
      seen.push(navigation.currentUrl.value.search);
    });

    expect(seen).toEqual(["?sidebar=open", ""]);
  });

  it("writes nothing when the batch changes nothing", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", { book: "GEN" });
    const hrefBefore = window.location.href;
    const historyLengthBefore = window.history.length;

    navigation.batchWrites(() => {
      navigation.updateQueryParams({ book: "GEN" });
    });

    expect(window.location.href).toBe(hrefBefore);
    expect(window.history.length).toBe(historyLengthBefore);
  });

  it("writes nothing when the batch ends back where it started", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", { sidebar: "open" });
    const hrefBefore = window.location.href;
    const historyLengthBefore = window.history.length;

    // Each write is measured against the live, mid-batch URL, so both halves
    // of a round trip look like real changes. Only the batch as a whole can
    // tell that the URL never actually moved.
    navigation.batchWrites(() => {
      navigation.updateQueryParams({ sidebar: null });
      navigation.updateQueryParams({ sidebar: "open" });
    });

    expect(window.location.href).toBe(hrefBefore);
    expect(window.history.length).toBe(historyLengthBefore);
  });

  it("returns the callback's value and flushes even when it throws", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", {});

    expect(navigation.batchWrites(() => "done")).toBe("done");

    expect(() =>
      navigation.batchWrites(() => {
        navigation.push("/exodus/2");
        throw new Error("boom");
      })
    ).toThrow("boom");
    // The write already happened as far as the rest of the app is concerned —
    // leaving it unflushed would leave `currentUrl` describing a URL the
    // browser never got.
    expect(window.location.pathname).toBe("/exodus/2");
  });
});

describe("createNavigationManager nested batchWrites", () => {
  it("flushes once, when the outermost batch ends", () => {
    const navigation = createNavigationManager();
    navigation.updatePathAndQueryParams("/genesis/1", { sidebar: "open" });
    const historyLengthBefore = window.history.length;

    // Actions compose: opening a bookmark batches its own writes and calls
    // into `selectTab`, which batches too.
    navigation.batchWrites(() => {
      navigation.updatePathAndQueryParams("/exodus/2", {}, true);
      navigation.batchWrites(() => {
        navigation.updateQueryParams({ sidebar: null });
      });
      expect(window.location.pathname).toBe("/genesis/1");
    });

    expect(window.history.length).toBe(historyLengthBefore + 1);
    expect(window.location.pathname).toBe("/exodus/2");
    expect(window.location.search).toBe("");
  });
});
