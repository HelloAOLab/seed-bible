import {
  FakeSubscribedUsersProvider,
  type UserVisualIdentityPort,
} from "todayScreen.infrastructure.adapters.fake.FakeSubscribedUsersProvider";
import type { ReadingEvent } from "@packages/seed-bible/seed-bible/managers/ReadingHistoryManager";

const NOW = 1_000_000_000; // seconds
const NOW_MS = NOW * 1000;

// Generation derived values when Math.random() === 0:
//   userCount   = 4 + floor(0 * 7)        = 4
//   eventCount  = 20 + floor(0 * 20)      = 20
//   daysAgo/offset = 0                    → start = now
//   duration    = 5 * 60 + floor(0)       = 300 → end = now + 300
const MIN_USER_COUNT = 4;
const EVENT_COUNT = 20;
const EVENT_DURATION = 300;
const NAMES = ["Craig", "Sarah", "Michael", "Emma"];

let visualIdentity: UserVisualIdentityPort & {
  getUserColorById: jest.Mock;
  getUserIconById: jest.Mock;
};

beforeEach(() => {
  jest.spyOn(Math, "random").mockReturnValue(0);
  jest.spyOn(Date, "now").mockReturnValue(NOW_MS);
  visualIdentity = {
    getUserColorById: jest.fn((id: string) => `color-${id}`),
    getUserIconById: jest.fn((id: string) => `icon-${id}`),
  };
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("FakeSubscribedUsersProvider", () => {
  describe("construction", () => {
    it("creates the minimum of 4 users when random is 0", () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      expect(provider.getUsersIds()).toHaveLength(MIN_USER_COUNT);
    });

    it("creates the maximum of 10 users when random is near 1", () => {
      (Math.random as jest.Mock).mockReturnValue(0.999);
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      expect(provider.getUsersIds()).toHaveLength(10);
    });

    it("creates users with unique ids", () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const ids = provider.getUsersIds();
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("resolves color and icon from the visual identity port per user", () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const ids = provider.getUsersIds();

      expect(visualIdentity.getUserColorById).toHaveBeenCalledTimes(
        MIN_USER_COUNT
      );
      expect(visualIdentity.getUserIconById).toHaveBeenCalledTimes(
        MIN_USER_COUNT
      );

      const profile = provider.getUserProfile(ids[0]!)!;
      expect(profile.color).toBe(`color-${ids[0]}`);
      expect(profile.icon).toBe(`icon-${ids[0]}`);
    });

    it("assigns names from the NAMES list in order", () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const ids = provider.getUsersIds();
      const names = ids.map((id) => provider.getUserProfile(id)!.name);
      expect(names).toEqual(NAMES);
    });
  });

  describe("getUserProfile", () => {
    it("returns the rich profile for a known user", () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const id = provider.getUsersIds()[0]!;
      expect(provider.getUserProfile(id)).toEqual({
        name: "Craig",
        color: `color-${id}`,
        icon: `icon-${id}`,
      });
    });

    it("returns undefined for an unknown user", () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      expect(provider.getUserProfile("does-not-exist")).toBeUndefined();
    });
  });

  describe("getReadingHistoryEvents", () => {
    it("returns an empty list for an unknown user", async () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const events = await provider.getReadingHistoryEvents(
        "does-not-exist",
        0,
        NOW * 2
      );
      expect([...events]).toEqual([]);
    });

    it("returns all events whose end falls within the window", async () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const id = provider.getUsersIds()[0]!;
      const events = [
        ...(await provider.getReadingHistoryEvents(
          id,
          NOW,
          NOW + EVENT_DURATION
        )),
      ];
      expect(events).toHaveLength(EVENT_COUNT);
    });

    it("includes events whose end is exactly on the window boundaries", async () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const id = provider.getUsersIds()[0]!;
      // Every event ends at NOW + 300 when random is 0.
      const events = [
        ...(await provider.getReadingHistoryEvents(
          id,
          NOW + EVENT_DURATION,
          NOW + EVENT_DURATION
        )),
      ];
      expect(events).toHaveLength(EVENT_COUNT);
    });

    it("excludes events that end after the window", async () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const id = provider.getUsersIds()[0]!;
      const events = [
        ...(await provider.getReadingHistoryEvents(
          id,
          NOW + EVENT_DURATION + 1,
          NOW + EVENT_DURATION + 100
        )),
      ];
      expect(events).toHaveLength(0);
    });

    it("excludes events that end before the window", async () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const id = provider.getUsersIds()[0]!;
      const events = [
        ...(await provider.getReadingHistoryEvents(
          id,
          NOW,
          NOW + EVENT_DURATION - 1
        )),
      ];
      expect(events).toHaveLength(0);
    });

    it("generates events with the expected shape and book/chapter rotation", async () => {
      const provider = new FakeSubscribedUsersProvider(visualIdentity);
      const id = provider.getUsersIds()[0]!;
      const events: ReadingEvent[] = [
        ...(await provider.getReadingHistoryEvents(
          id,
          NOW,
          NOW + EVENT_DURATION
        )),
      ];

      // First event of user 0: bookId index (0*3 + 0) % 15 = 0 → "GEN".
      expect(events[0]).toEqual({
        bookId: "GEN",
        chapter: 1,
        start: NOW,
        end: NOW + EVENT_DURATION,
        userId: id,
      });

      // Chapter cycles as (i % 10) + 1 → event 10 wraps back to chapter 1.
      expect(events[10]!.chapter).toBe(1);
      // Book id index wraps modulo BOOK_IDS.length (15): (0*3 + 15) % 15 = 0.
      expect(events[15]!.bookId).toBe("GEN");
      // Every event is attributed to the owning user.
      expect(events.every((event) => event.userId === id)).toBe(true);
    });
  });
});
