import {
  compareVersions,
  emptyNotificationState,
  mergeNotificationStates,
  noteAppVersion,
  NOTIFICATION_STATE_RETENTION_MS,
  NOTIFICATION_STATE_SCHEMA,
  pruneNotificationState,
  type NotificationState,
} from "@packages/seed-bible/seed-bible/managers/NotificationState";

const state = (overrides: Partial<NotificationState>): NotificationState => ({
  ...emptyNotificationState(),
  ...overrides,
});

describe("compareVersions", () => {
  it.each([
    ["1.17.0", "1.18.0", -1],
    ["1.18.0", "1.17.9", 1],
    ["1.10.0", "1.9.0", 1],
    ["2.0.0", "2.0.0", 0],
    ["1.18", "1.18.0", 0],
    ["1.18.0-beta.1", "1.18.0", 0],
  ])("%s vs %s", (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});

describe("mergeNotificationStates", () => {
  it("keeps everything either device saw or dismissed", () => {
    const phone = state({
      seen: { "friend-request:a": 100 },
      dismissed: { "friend-request:b": 200 },
    });
    const laptop = state({
      seen: { "friend-request:c": 300 },
      dismissed: { "app-update:1.18.0": 400 },
    });

    expect(mergeNotificationStates(phone, laptop)).toEqual({
      seen: { "friend-request:a": 100, "friend-request:c": 300 },
      dismissed: { "friend-request:b": 200, "app-update:1.18.0": 400 },
      appVersion: null,
    });
  });

  it("gives the same result whichever copy comes first", () => {
    const a = state({
      seen: { x: 100 },
      appVersion: { version: "1.18.0", previousVersion: "1.17.0", sinceMs: 5 },
    });
    const b = state({
      seen: { x: 50, y: 60 },
      appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
    });

    expect(mergeNotificationStates(a, b)).toEqual(
      mergeNotificationStates(b, a)
    );
  });

  it("keeps the earlier time for an id both devices saw", () => {
    expect(
      mergeNotificationStates(
        state({ seen: { x: 500 } }),
        state({ seen: { x: 100 } })
      ).seen
    ).toEqual({ x: 100 });
  });

  it("keeps the newer app version", () => {
    const merged = mergeNotificationStates(
      state({
        appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
      }),
      state({
        appVersion: {
          version: "1.18.0",
          previousVersion: "1.17.0",
          sinceMs: 9,
        },
      })
    );

    expect(merged.appVersion).toEqual({
      version: "1.18.0",
      previousVersion: "1.17.0",
      sinceMs: 9,
    });
  });

  it("keeps what came before when only one device of two knew it", () => {
    // A new device noticed 1.18.0 first, before it had the account's copy; the
    // other device knew the account was on 1.17.0 before.
    const merged = mergeNotificationStates(
      state({
        appVersion: { version: "1.18.0", previousVersion: null, sinceMs: 1 },
      }),
      state({
        appVersion: {
          version: "1.18.0",
          previousVersion: "1.17.0",
          sinceMs: 7,
        },
      })
    );

    expect(merged.appVersion).toEqual({
      version: "1.18.0",
      previousVersion: "1.17.0",
      sinceMs: 1,
    });
  });
});

describe("pruneNotificationState", () => {
  it("drops entries older than the retention window and keeps the rest", () => {
    const now = 1_000_000_000_000;
    const old = now - NOTIFICATION_STATE_RETENTION_MS - 1;
    const recent = now - 1000;

    expect(
      pruneNotificationState(
        state({
          seen: { old: old, recent },
          dismissed: { old: old, recent },
        }),
        now
      )
    ).toEqual(
      state({
        seen: { recent },
        dismissed: { recent },
      })
    );
  });
});

describe("noteAppVersion", () => {
  it("starts an account with no earlier version, so it gets no update notice", () => {
    expect(
      noteAppVersion(emptyNotificationState(), "1.18.0", 42).appVersion
    ).toEqual({
      version: "1.18.0",
      previousVersion: null,
      sinceMs: 42,
    });
  });

  it("remembers the version before a newer one", () => {
    const before = state({
      appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
    });

    expect(noteAppVersion(before, "1.18.0", 42).appVersion).toEqual({
      version: "1.18.0",
      previousVersion: "1.17.0",
      sinceMs: 42,
    });
  });

  it.each(["1.18.0", "1.17.5"])(
    "leaves the state alone when running %s after 1.18.0",
    (version) => {
      const before = state({
        appVersion: {
          version: "1.18.0",
          previousVersion: "1.17.0",
          sinceMs: 1,
        },
      });

      expect(noteAppVersion(before, version, 42)).toBe(before);
    }
  );
});

describe("NOTIFICATION_STATE_SCHEMA", () => {
  it("reads a saved state back", () => {
    const saved = state({
      seen: { a: 1 },
      dismissed: { b: 2 },
      appVersion: { version: "1.18.0", previousVersion: "1.17.0", sinceMs: 3 },
    });

    expect(NOTIFICATION_STATE_SCHEMA.parse(saved)).toEqual(saved);
  });

  it("treats a damaged part as empty rather than losing the rest", () => {
    expect(
      NOTIFICATION_STATE_SCHEMA.parse({
        seen: "not a map",
        dismissed: { b: 2 },
        appVersion: { version: 7 },
      })
    ).toEqual(state({ dismissed: { b: 2 } }));
  });
});
