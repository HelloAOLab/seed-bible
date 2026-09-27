import { describe, it, expect, beforeEach, type Mocked } from "vitest";
import { UserPresenceService } from "../../../../../../patterns/bible-stack/bible-stack/application/services/UserPresenceService";
import type {
  ReadingInstance,
  UserPresence,
} from "../../../../../../patterns/bible-stack/bible-stack/domain/models/userPresence";
import type { EventManagerPort } from "../../../../../../patterns/bible-stack/bible-stack/application/ports/out/EventManager";
import type { BibleStackEvents } from "../../../../../../patterns/bible-stack/bible-stack/domain/models/events";

const OWN_USER_ID = "own-user";
const REMOTE_USER_ID_1 = "remote-user-1";
const REMOTE_USER_ID_2 = "remote-user-2";

const makeInstance = (
  overrides: Partial<ReadingInstance> & { id: string }
): ReadingInstance => ({
  bookId: "GEN",
  chapter: 1,
  selected: false,
  translation: "KJV",
  connectionId: "connection-id",
  ...overrides,
});

const makePresence = (): UserPresence =>
  new Map([
    [
      OWN_USER_ID,
      [
        makeInstance({ id: "own-instance-1" }),
        makeInstance({
          id: "own-instance-2",
          bookId: "EXO",
          chapter: 3,
          selected: true,
        }),
      ],
    ],
    [
      REMOTE_USER_ID_1,
      [makeInstance({ id: "remote-instance-1", selected: true })],
    ],
    [
      REMOTE_USER_ID_2,
      [makeInstance({ id: "remote-instance-2", translation: "RVR" })],
    ],
  ]);

describe("pattern.bible-stack.application.services.UserPresenceService", () => {
  let service: UserPresenceService;
  let eventManagerPort: Mocked<EventManagerPort<BibleStackEvents>>;

  const makeService = (initialUserPresence?: UserPresence) =>
    new UserPresenceService({
      eventManagerPort,
      initialUserPresence,
      userId: OWN_USER_ID,
    });

  beforeEach(() => {
    eventManagerPort = {
      emit: vi.fn(),
    } as unknown as Mocked<EventManagerPort<BibleStackEvents>>;

    service = new UserPresenceService({
      eventManagerPort,
      userId: OWN_USER_ID,
    });
  });

  describe("update", () => {
    it("no-ops if the new presence is structurally the same as the current", () => {
      service.update(makePresence());
      eventManagerPort.emit.mockClear();

      const reordered: UserPresence = new Map(
        [...makePresence().entries()]
          .reverse()
          .map(([userId, instances]) => [userId, instances.toReversed()])
      );

      service.update(makePresence());
      service.update(reordered);

      expect(eventManagerPort.emit).not.toHaveBeenCalled();
      expect(service.getUserPresence()).toEqual(makePresence());

      const variants: ((presence: UserPresence) => void)[] = [
        (presence) => {
          presence.get(OWN_USER_ID)![0]!.selected = true;
        },
        (presence) => {
          presence.get(OWN_USER_ID)![0]!.bookId = "LEV";
        },
        (presence) => {
          presence.get(OWN_USER_ID)![0]!.chapter = 2;
        },
        (presence) => {
          presence.get(OWN_USER_ID)![0]!.translation = "NIV";
        },
        (presence) => {
          presence.get(OWN_USER_ID)![0]!.id = "another-instance";
        },
        (presence) => {
          presence
            .get(REMOTE_USER_ID_1)!
            .push(makeInstance({ id: "extra-instance" }));
        },
        (presence) => {
          presence.delete(REMOTE_USER_ID_2);
        },
        (presence) => {
          presence.set("another-user", presence.get(REMOTE_USER_ID_2)!);
          presence.delete(REMOTE_USER_ID_2);
        },
        (presence) => {
          presence.set("new-user", [makeInstance({ id: "new-instance" })]);
        },
      ];

      for (const change of variants) {
        const variantService = makeService(makePresence());
        eventManagerPort.emit.mockClear();
        const variant = makePresence();
        change(variant);

        variantService.update(variant);

        expect(eventManagerPort.emit).toHaveBeenCalledOnce();
        expect(variantService.getUserPresence()).toEqual(variant);
      }
    });

    it("creates a deep copy of the new presence and sets it as the user presence", () => {
      const presence = makePresence();

      service.update(presence);

      expect(service.getUserPresence()).toEqual(makePresence());

      presence.get(OWN_USER_ID)![0]!.chapter = 50;
      presence.get(OWN_USER_ID)!.push(makeInstance({ id: "pushed-instance" }));
      presence.set("new-user", [makeInstance({ id: "new-instance" })]);
      presence.delete(REMOTE_USER_ID_1);

      expect(service.getUserPresence()).toEqual(makePresence());
      expect(service.getOwnUserPresence()).toEqual(
        makePresence().get(OWN_USER_ID)
      );
    });

    it("emits with a deep clone of the new user presence", () => {
      const presence = makePresence();

      service.update(presence);

      expect(eventManagerPort.emit).toHaveBeenCalledExactlyOnceWith(
        "OnUserPresenceUpdated",
        { userPresence: makePresence() }
      );

      const emitted = eventManagerPort.emit.mock.calls[0]![1] as {
        userPresence: UserPresence;
      };

      expect(emitted.userPresence).not.toBe(presence);
      expect(emitted.userPresence.get(OWN_USER_ID)).not.toBe(
        presence.get(OWN_USER_ID)
      );
      expect(emitted.userPresence.get(OWN_USER_ID)![0]).not.toBe(
        presence.get(OWN_USER_ID)![0]
      );

      emitted.userPresence.get(OWN_USER_ID)![0]!.chapter = 50;
      emitted.userPresence.delete(REMOTE_USER_ID_1);

      expect(service.getUserPresence()).toEqual(makePresence());
    });

    it("works a second time", () => {
      const firstPresence = makePresence();
      const secondPresence: UserPresence = new Map([
        [
          OWN_USER_ID,
          [
            makeInstance({
              id: "own-instance-3",
              bookId: "MAT",
              selected: true,
            }),
          ],
        ],
      ]);

      service.update(firstPresence);
      service.update(secondPresence);

      expect(eventManagerPort.emit.mock.calls).toEqual([
        ["OnUserPresenceUpdated", { userPresence: firstPresence }],
        ["OnUserPresenceUpdated", { userPresence: secondPresence }],
      ]);
      expect(service.getUserPresence()).toEqual(secondPresence);

      service.update(firstPresence);

      expect(eventManagerPort.emit).toHaveBeenCalledTimes(3);
      expect(eventManagerPort.emit).toHaveBeenLastCalledWith(
        "OnUserPresenceUpdated",
        { userPresence: firstPresence }
      );
      expect(service.getUserPresence()).toEqual(firstPresence);
    });
  });

  describe("getUserPresence", () => {
    it("returns a deep clone of the user presence", () => {
      service.update(makePresence());

      const first = service.getUserPresence();
      const second = service.getUserPresence();

      expect(first).toEqual(makePresence());
      expect(first).not.toBe(second);
      expect(first.get(OWN_USER_ID)).not.toBe(second.get(OWN_USER_ID));
      expect(first.get(OWN_USER_ID)![0]).not.toBe(second.get(OWN_USER_ID)![0]);

      first.get(OWN_USER_ID)![0]!.chapter = 50;
      first.get(OWN_USER_ID)!.push(makeInstance({ id: "pushed-instance" }));
      first.delete(REMOTE_USER_ID_1);

      expect(service.getUserPresence()).toEqual(makePresence());
    });
  });

  describe("getOwnConnectionId", () => {
    it("returns the own user's id", () => {
      expect(service.getOwnConnectionId()).toBe(OWN_USER_ID);
      expect(
        new UserPresenceService({
          eventManagerPort,
          userId: REMOTE_USER_ID_1,
        }).getOwnConnectionId()
      ).toBe(REMOTE_USER_ID_1);
    });
  });

  describe("getOwnUserPresence", () => {
    it("returns the user presence corresponding to the own user id", () => {
      service.update(makePresence());

      expect(service.getOwnUserPresence()).toEqual(
        makePresence().get(OWN_USER_ID)
      );
    });

    it("returns an empty array if there is no presence for the own user", () => {
      expect(service.getOwnUserPresence()).toEqual([]);

      const presence = makePresence();
      presence.delete(OWN_USER_ID);
      service.update(presence);

      expect(service.getOwnUserPresence()).toEqual([]);
    });
  });

  describe("getRemotesUserPresence", () => {
    it("returns the user presence for every user that is not the own user", () => {
      service.update(makePresence());

      expect(service.getRemotesUserPresence()).toEqual(
        new Map([
          [REMOTE_USER_ID_1, makePresence().get(REMOTE_USER_ID_1)],
          [REMOTE_USER_ID_2, makePresence().get(REMOTE_USER_ID_2)],
        ])
      );

      const ownOnly = makeService(
        new Map([[OWN_USER_ID, makePresence().get(OWN_USER_ID)!]])
      );

      expect(ownOnly.getRemotesUserPresence()).toEqual(new Map());
    });
  });

  describe("getOwnUserSelectedInstance", () => {
    it("returns the own user's selected instance", () => {
      service.update(makePresence());

      expect(service.getOwnUserSelectedInstance()).toEqual(
        makeInstance({
          id: "own-instance-2",
          bookId: "EXO",
          chapter: 3,
          selected: true,
        })
      );
    });

    it("returns undefined if there is no selected instance", () => {
      expect(service.getOwnUserSelectedInstance()).toBeUndefined();

      const presence = makePresence();
      presence.get(OWN_USER_ID)![1]!.selected = false;
      service.update(presence);

      expect(service.getOwnUserSelectedInstance()).toBeUndefined();
    });
  });
});
