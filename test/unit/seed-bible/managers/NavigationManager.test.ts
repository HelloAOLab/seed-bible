import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";

afterEach(() => {
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
