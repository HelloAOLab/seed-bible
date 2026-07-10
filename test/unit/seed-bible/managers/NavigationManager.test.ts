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
