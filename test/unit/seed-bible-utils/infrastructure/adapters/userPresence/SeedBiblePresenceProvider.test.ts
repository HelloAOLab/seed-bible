import { SeedBiblePresenceProvider } from "../../../../../../packages/seed-bible-utils/infrastructure/adapters/userPresence/SeedBiblePresenceProvider";

// ─── factories ────────────────────────────────────────────────────────────────

const makeSelectedTab = (overrides: any = {}): any => ({
  id: "tab-1",
  readingState: {
    bookId: { value: "GEN" },
    chapterNumber: { value: 1 },
    translation: { value: { shortName: "NIV" } },
  },
  ...overrides,
});

const makeConnectedUser = (overrides: any = {}): any => ({
  connectionId: "remote-conn-id",
  ...overrides,
});

const makeTab = (overrides: any = {}): any => ({
  id: "tab-1",
  sharedSession: null,
  ...overrides,
});

const makeSharedSession = (overrides: any = {}): any => ({
  connectedUsers: { value: [] },
  readingState: {
    bookId: { value: "GEN" },
    chapterNumber: { value: 1 },
  },
  ...overrides,
});

const makeState = (overrides: any = {}): any => ({
  os: {
    connectionId: "config-bot-id",
  },
  app: {
    selectedTab: { value: null },
  },
  tabs: {
    tabs: { value: [] },
  },
  ...overrides,
});

const makeProvider = (state = makeState()) =>
  new SeedBiblePresenceProvider({ state });

// ─── getCurrUserId ────────────────────────────────────────────────────────────

describe("getCurrUserId", () => {
  it("returns the connectionId from state.os", () => {
    expect(makeProvider().getCurrUserId()).toBe("config-bot-id");
  });

  it("reflects the connectionId of the provided state", () => {
    const state = makeState({ os: { connectionId: "updated-id" } });
    expect(makeProvider(state).getCurrUserId()).toBe("updated-id");
  });
});

// ─── getSelectedReadingInstanceId ─────────────────────────────────────────────

describe("getSelectedReadingInstanceId", () => {
  it("returns the selected tab's id when a tab is selected", () => {
    const state = makeState({
      app: { selectedTab: { value: makeSelectedTab({ id: "tab-42" }) } },
    });
    expect(makeProvider(state).getSelectedReadingInstanceId()).toBe("tab-42");
  });

  it("returns undefined when selectedTab.value is null", () => {
    const state = makeState({ app: { selectedTab: { value: null } } });
    expect(makeProvider(state).getSelectedReadingInstanceId()).toBeUndefined();
  });
});

// ─── getSelectedReadingInstance ───────────────────────────────────────────────

describe("getSelectedReadingInstance", () => {
  it("returns undefined when no tab is selected", () => {
    expect(makeProvider().getSelectedReadingInstance()).toBeUndefined();
  });

  it("returns a reading instance with the selected tab's id", () => {
    const state = makeState({
      app: { selectedTab: { value: makeSelectedTab({ id: "tab-7" }) } },
    });
    expect(makeProvider(state).getSelectedReadingInstance()?.id).toBe("tab-7");
  });

  it("sets bookId from readingState.bookId.value", () => {
    const tab = makeSelectedTab({
      readingState: {
        bookId: { value: "EXO" },
        chapterNumber: { value: 2 },
        translation: { value: { shortName: "ESV" } },
      },
    });
    const state = makeState({ app: { selectedTab: { value: tab } } });
    expect(makeProvider(state).getSelectedReadingInstance()?.bookId).toBe(
      "EXO"
    );
  });

  it("sets bookId to empty string when readingState.bookId.value is nullish", () => {
    const tab = makeSelectedTab({
      readingState: {
        bookId: { value: null },
        chapterNumber: { value: 1 },
        translation: { value: { shortName: "NIV" } },
      },
    });
    const state = makeState({ app: { selectedTab: { value: tab } } });
    expect(makeProvider(state).getSelectedReadingInstance()?.bookId).toBe("");
  });

  it("sets chapter from readingState.chapterNumber.value", () => {
    const tab = makeSelectedTab({
      readingState: {
        bookId: { value: "GEN" },
        chapterNumber: { value: 5 },
        translation: { value: { shortName: "NIV" } },
      },
    });
    const state = makeState({ app: { selectedTab: { value: tab } } });
    expect(makeProvider(state).getSelectedReadingInstance()?.chapter).toBe(5);
  });

  it("sets chapter to 0 when readingState.chapterNumber.value is nullish", () => {
    const tab = makeSelectedTab({
      readingState: {
        bookId: { value: "GEN" },
        chapterNumber: { value: null },
        translation: { value: { shortName: "NIV" } },
      },
    });
    const state = makeState({ app: { selectedTab: { value: tab } } });
    expect(makeProvider(state).getSelectedReadingInstance()?.chapter).toBe(0);
  });

  it("sets translation from readingState.translation.value.shortName", () => {
    const tab = makeSelectedTab({
      readingState: {
        bookId: { value: "GEN" },
        chapterNumber: { value: 1 },
        translation: { value: { shortName: "KJV" } },
      },
    });
    const state = makeState({ app: { selectedTab: { value: tab } } });
    expect(makeProvider(state).getSelectedReadingInstance()?.translation).toBe(
      "KJV"
    );
  });
});

// ─── getRemotesPresence ───────────────────────────────────────────────────────

describe("getRemotesPresence", () => {
  it("returns an empty Map when there are no tabs", () => {
    const result = makeProvider().getRemotesPresence();
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it("returns an empty Map when all tabs have no sharedSession", () => {
    const state = makeState({ tabs: { tabs: { value: [makeTab()] } } });
    expect(makeProvider(state).getRemotesPresence().size).toBe(0);
  });

  it("returns an empty Map when a tab's session has no connected users", () => {
    const tab = makeTab({
      sharedSession: makeSharedSession({ connectedUsers: { value: [] } }),
    });
    const state = makeState({ tabs: { tabs: { value: [tab] } } });
    expect(makeProvider(state).getRemotesPresence().size).toBe(0);
  });

  it("includes a remote user keyed by connectionId", () => {
    const user = makeConnectedUser({ connectionId: "user-conn" });
    const session = makeSharedSession({ connectedUsers: { value: [user] } });
    const state = makeState({
      tabs: { tabs: { value: [makeTab({ sharedSession: session })] } },
    });
    expect(makeProvider(state).getRemotesPresence().has("user-conn")).toBe(
      true
    );
  });

  it("sets bookId from the session's readingState.bookId.value", () => {
    const user = makeConnectedUser({ connectionId: "u1" });
    const session = makeSharedSession({
      connectedUsers: { value: [user] },
      readingState: { bookId: { value: "REV" }, chapterNumber: { value: 22 } },
    });
    const state = makeState({
      tabs: { tabs: { value: [makeTab({ sharedSession: session })] } },
    });
    expect(makeProvider(state).getRemotesPresence().get("u1")?.bookId).toBe(
      "REV"
    );
  });

  it("sets chapter from the session's readingState.chapterNumber.value", () => {
    const user = makeConnectedUser({ connectionId: "u1" });
    const session = makeSharedSession({
      connectedUsers: { value: [user] },
      readingState: { bookId: { value: "GEN" }, chapterNumber: { value: 3 } },
    });
    const state = makeState({
      tabs: { tabs: { value: [makeTab({ sharedSession: session })] } },
    });
    expect(makeProvider(state).getRemotesPresence().get("u1")?.chapter).toBe(3);
  });

  it("sets readingInstanceId to the tab's id", () => {
    const user = makeConnectedUser({ connectionId: "u1" });
    const session = makeSharedSession({ connectedUsers: { value: [user] } });
    const tab = makeTab({ id: "tab-session-42", sharedSession: session });
    const state = makeState({ tabs: { tabs: { value: [tab] } } });
    expect(
      makeProvider(state).getRemotesPresence().get("u1")?.readingInstanceId
    ).toBe("tab-session-42");
  });

  it("collects users from multiple tabs", () => {
    const session1 = makeSharedSession({
      connectedUsers: { value: [makeConnectedUser({ connectionId: "u1" })] },
    });
    const session2 = makeSharedSession({
      connectedUsers: { value: [makeConnectedUser({ connectionId: "u2" })] },
    });
    const state = makeState({
      tabs: {
        tabs: {
          value: [
            makeTab({ id: "t1", sharedSession: session1 }),
            makeTab({ id: "t2", sharedSession: session2 }),
          ],
        },
      },
    });
    const result = makeProvider(state).getRemotesPresence();
    expect(result.has("u1")).toBe(true);
    expect(result.has("u2")).toBe(true);
  });

  it("collects multiple users from the same tab's session", () => {
    const session = makeSharedSession({
      connectedUsers: {
        value: [
          makeConnectedUser({ connectionId: "ua" }),
          makeConnectedUser({ connectionId: "ub" }),
        ],
      },
    });
    const state = makeState({
      tabs: { tabs: { value: [makeTab({ sharedSession: session })] } },
    });
    expect(makeProvider(state).getRemotesPresence().size).toBe(2);
  });

  it("overwrites a duplicate connectionId with the last session's data (Map.set semantics)", () => {
    const userA = makeConnectedUser({ connectionId: "dup" });
    const userB = makeConnectedUser({ connectionId: "dup" });
    const session1 = makeSharedSession({
      connectedUsers: { value: [userA] },
      readingState: { bookId: { value: "GEN" }, chapterNumber: { value: 1 } },
    });
    const session2 = makeSharedSession({
      connectedUsers: { value: [userB] },
      readingState: { bookId: { value: "REV" }, chapterNumber: { value: 22 } },
    });
    const state = makeState({
      tabs: {
        tabs: {
          value: [
            makeTab({ id: "t1", sharedSession: session1 }),
            makeTab({ id: "t2", sharedSession: session2 }),
          ],
        },
      },
    });
    const result = makeProvider(state).getRemotesPresence();
    expect(result.size).toBe(1);
    expect(result.get("dup")?.bookId).toBe("REV");
  });
});
