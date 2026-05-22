import { ActivityNotificationAdapter } from "bibleVizUtils.infrastructure.adapters.pieceActivity.ActivityNotificationAdapter";
import { ActivityNotificationMapper } from "bibleVizUtils.infrastructure.mappers.ActivityNotificationMapper";
import { PieceMapper } from "bibleVizUtils.infrastructure.mappers.PieceMapper";
import { BiblePiece } from "bibleVizUtils.domain.models.canvas";

// ─── module mocks ─────────────────────────────────────────────────────────────

jest.mock(
  "bibleVizUtils.infrastructure.mappers.ActivityNotificationMapper",
  () => ({
    ActivityNotificationMapper: {
      toInfrastructure: jest.fn(),
      toDomain: jest.fn(),
    },
  })
);

jest.mock("bibleVizUtils.infrastructure.mappers.PieceMapper", () => ({
  PieceMapper: { toInfrastructure: jest.fn() },
}));

jest.mock("bibleVizUtils.infrastructure.functions.casualos", () => ({
  GetBotScales: jest.fn().mockReturnValue({ x: 2, y: 1, z: 0.5 }),
}));

jest.mock("bibleVizUtils.infrastructure.functions.layout", () => ({
  computeNotificationDirection: jest.fn().mockReturnValue({ x: 1, y: 0 }),
}));

// ─── mock aliases ─────────────────────────────────────────────────────────────

const notificationMapperToInfra =
  ActivityNotificationMapper.toInfrastructure as jest.Mock;
const notificationMapperToDomain =
  ActivityNotificationMapper.toDomain as jest.Mock;
const pieceMapperToInfra = PieceMapper.toInfrastructure as jest.Mock;

// ─── globals ──────────────────────────────────────────────────────────────────

class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
  add(other: Vec3) {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
  }
}

let applyModMock: jest.Mock;
let setTagMaskMock: jest.Mock;
let getBotMock: jest.Mock;
let byIDMock: jest.Mock;
let getBotPositionMock: jest.Mock;

beforeEach(() => {
  applyModMock = jest.fn();
  setTagMaskMock = jest.fn();
  getBotMock = jest.fn().mockReturnValue(undefined);
  byIDMock = jest.fn().mockImplementation((id: string) => ({ byId: id }));
  getBotPositionMock = jest.fn().mockReturnValue(new Vec3(0, 0, 0));

  (globalThis as any).Vector3 = Vec3;
  (globalThis as any).applyMod = applyModMock;
  (globalThis as any).setTagMask = setTagMaskMock;
  (globalThis as any).getBot = getBotMock;
  (globalThis as any).byID = byIDMock;
  (globalThis as any).getBotPosition = getBotPositionMock;
  (globalThis as any).gridPortalBot = { tags: { cameraRotationZ: 0 } };
  (globalThis as any).os = {
    ...((globalThis as any).os ?? {}),
    getCurrentDimension: jest.fn().mockReturnValue("scene3d"),
  };
});

afterEach(() => {
  delete (globalThis as any).Vector3;
  delete (globalThis as any).applyMod;
  delete (globalThis as any).setTagMask;
  delete (globalThis as any).getBot;
  delete (globalThis as any).byID;
  delete (globalThis as any).getBotPosition;
  delete (globalThis as any).gridPortalBot;
  jest.clearAllMocks();
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeNotificationBot = (tagOverrides: any = {}): any => ({
  id: "notification-bot-1",
  link: "",
  tags: {
    type: "ActivityNotification",
    direction: { x: 1, y: 0 },
    offset: 0,
    ...tagOverrides,
  },
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makeOwnerBot = (tagOverrides: any = {}): any => ({
  id: "owner-bot-1",
  link: "",
  tags: { type: BiblePiece.StackChapter, isInUse: true, ...tagOverrides },
  masks: {},
  links: {},
  vars: {},
  raw: {},
  changes: {},
  maskChanges: {},
});

const makeActivityNotification = (id = "notification-1"): any => ({
  id,
  type: "ActivityNotification" as const,
});

const makeDomainNotification = (id = "domain-notification-1"): any => ({
  id,
  type: "ActivityNotification" as const,
});

const makeContainer = (overrides: any = {}): any => ({
  id: "container-1",
  piece: { id: "piece-1", type: BiblePiece.StackChapter },
  activityNotification: undefined,
  ...overrides,
});

const makePooler = (): any => ({
  getObject: jest.fn().mockReturnValue(makeNotificationBot()),
  releaseObject: jest.fn(),
});

const makeAdapter = (pooler = makePooler()) =>
  new ActivityNotificationAdapter({ objectPooler: pooler });

const makeShowCommand = (overrides: any = {}): any => ({
  isOwnUserInPiece: false,
  activityCount: 1,
  color: "#ff0000",
  direction: { x: 1, y: 0 },
  notification: undefined,
  container: makeContainer(),
  ...overrides,
});

// ─── hideNotification ─────────────────────────────────────────────────────────

describe("hideNotification", () => {
  it("throws when the notification bot is not found", () => {
    notificationMapperToInfra.mockReturnValue(undefined);
    expect(() =>
      makeAdapter().hideNotification(makeActivityNotification())
    ).toThrow(
      "ActivityNotificationAdapter: notificationBot not found at hideNotification"
    );
  });

  it("calls objectPooler.releaseObject with the bot and ActivityNotification key", () => {
    const bot = makeNotificationBot();
    notificationMapperToInfra.mockReturnValue(bot);
    const pooler = makePooler();
    makeAdapter(pooler).hideNotification(makeActivityNotification());
    expect(pooler.releaseObject).toHaveBeenCalledWith(
      bot,
      BiblePiece.ActivityNotification
    );
  });

  it("calls ActivityNotificationMapper.toInfrastructure with the notification", () => {
    const notification = makeActivityNotification("n-42");
    notificationMapperToInfra.mockReturnValue(makeNotificationBot());
    makeAdapter().hideNotification(notification);
    expect(notificationMapperToInfra).toHaveBeenCalledWith(notification);
  });
});

// ─── showNotification ─────────────────────────────────────────────────────────

describe("showNotification", () => {
  describe("notification bot acquisition", () => {
    it("uses ActivityNotificationMapper.toInfrastructure when notification is provided", () => {
      const notification = makeActivityNotification();
      notificationMapperToInfra.mockReturnValue(makeNotificationBot());
      makeAdapter().showNotification(makeShowCommand({ notification }));
      expect(notificationMapperToInfra).toHaveBeenCalledWith(notification);
    });

    it("uses objectPooler.getObject(ActivityNotification) when notification is undefined", () => {
      const pooler = makePooler();
      makeAdapter(pooler).showNotification(
        makeShowCommand({ notification: undefined })
      );
      expect(pooler.getObject).toHaveBeenCalledWith(
        BiblePiece.ActivityNotification
      );
    });

    it("does not call objectPooler.getObject when notification is provided", () => {
      notificationMapperToInfra.mockReturnValue(makeNotificationBot());
      const pooler = makePooler();
      makeAdapter(pooler).showNotification(
        makeShowCommand({ notification: makeActivityNotification() })
      );
      expect(pooler.getObject).not.toHaveBeenCalled();
    });
  });

  describe("guards", () => {
    it("throws when notification is provided but toInfrastructure returns undefined", () => {
      notificationMapperToInfra.mockReturnValue(undefined);
      expect(() =>
        makeAdapter().showNotification(
          makeShowCommand({ notification: makeActivityNotification() })
        )
      ).toThrow(
        "ActivityNotificationAdapter: notificationBot not found at showNotification"
      );
    });

    it("throws when no notification and objectPooler.getObject returns undefined", () => {
      const pooler = makePooler();
      pooler.getObject.mockReturnValue(undefined);
      expect(() =>
        makeAdapter(pooler).showNotification(
          makeShowCommand({ notification: undefined })
        )
      ).toThrow(
        "ActivityNotificationAdapter: notificationBot not found at showNotification"
      );
    });

    it("throws when container.piece is not defined", () => {
      const container = makeContainer({ piece: undefined });
      expect(() =>
        makeAdapter().showNotification(makeShowCommand({ container }))
      ).toThrow(
        "ActivityNotificationAdapter: container.piece not defined at showNotification"
      );
    });
  });

  describe("mod fields", () => {
    it("sets formOpacity=1 when isOwnUserInPiece=true", () => {
      makeAdapter().showNotification(
        makeShowCommand({ isOwnUserInPiece: true })
      );
      expect(applyModMock.mock.calls[0][1].formOpacity).toBe(1);
    });

    it("sets formOpacity=0.5 when isOwnUserInPiece=false", () => {
      makeAdapter().showNotification(
        makeShowCommand({ isOwnUserInPiece: false })
      );
      expect(applyModMock.mock.calls[0][1].formOpacity).toBe(0.5);
    });

    it("sets label to the count string when activityCount > 1", () => {
      makeAdapter().showNotification(makeShowCommand({ activityCount: 5 }));
      expect(applyModMock.mock.calls[0][1].label).toBe("5");
    });

    it("sets label to an empty string when activityCount === 1", () => {
      makeAdapter().showNotification(makeShowCommand({ activityCount: 1 }));
      expect(applyModMock.mock.calls[0][1].label).toBe("");
    });

    it("sets ownerBotId to container.piece.id", () => {
      const container = makeContainer({
        piece: { id: "the-piece", type: BiblePiece.StackChapter },
      });
      makeAdapter().showNotification(makeShowCommand({ container }));
      expect(applyModMock.mock.calls[0][1].ownerBotId).toBe("the-piece");
    });

    it("sets ownerDataId to container.id", () => {
      const container = makeContainer({ id: "the-container" });
      makeAdapter().showNotification(makeShowCommand({ container }));
      expect(applyModMock.mock.calls[0][1].ownerDataId).toBe("the-container");
    });

    it("sets direction from the command", () => {
      const direction = { x: -1, y: 0 };
      makeAdapter().showNotification(makeShowCommand({ direction }));
      expect(applyModMock.mock.calls[0][1].direction).toEqual(direction);
    });

    it("sets color from the command", () => {
      makeAdapter().showNotification(makeShowCommand({ color: "#aabbcc" }));
      expect(applyModMock.mock.calls[0][1].color).toBe("#aabbcc");
    });

    it("sets the dimension tag to true using os.getCurrentDimension", () => {
      makeAdapter().showNotification(makeShowCommand());
      expect(applyModMock.mock.calls[0][1]["scene3d"]).toBe(true);
    });

    it("sets type='ActivityNotification'", () => {
      makeAdapter().showNotification(makeShowCommand());
      expect(applyModMock.mock.calls[0][1].type).toBe("ActivityNotification");
    });
  });

  describe("return value", () => {
    it("calls ActivityNotificationMapper.toDomain on the notification bot", () => {
      const bot = makeNotificationBot();
      const pooler = makePooler();
      pooler.getObject.mockReturnValue(bot);
      makeAdapter(pooler).showNotification(makeShowCommand());
      expect(notificationMapperToDomain).toHaveBeenCalledWith(bot);
    });

    it("returns the domain notification from toDomain", () => {
      const domainNotification = makeDomainNotification();
      notificationMapperToDomain.mockReturnValue(domainNotification);
      const result = makeAdapter().showNotification(makeShowCommand());
      expect(result).toBe(domainNotification);
    });
  });
});

// ─── updateNotificationPosition ───────────────────────────────────────────────

describe("updateNotificationPosition", () => {
  describe("guards", () => {
    it("throws when container.activityNotification is not defined", () => {
      expect(() =>
        makeAdapter().updateNotificationPosition(
          makeContainer({ activityNotification: undefined })
        )
      ).toThrow(
        "ActivityNotificationAdapter: container.activityNotification not defined"
      );
    });

    it("throws when mapper returns undefined for the notification bot", () => {
      notificationMapperToInfra.mockReturnValue(undefined);
      expect(() =>
        makeAdapter().updateNotificationPosition(
          makeContainer({ activityNotification: makeActivityNotification() })
        )
      ).toThrow(
        "ActivityNotificationAdapter: notificationBot not defined at updateNotificationPosition"
      );
    });

    it("throws when notificationBot.tags.direction is not defined", () => {
      notificationMapperToInfra.mockReturnValue(
        makeNotificationBot({ direction: undefined })
      );
      expect(() =>
        makeAdapter().updateNotificationPosition(
          makeContainer({ activityNotification: makeActivityNotification() })
        )
      ).toThrow(
        "ActivityNotificationAdapter: notificationBot.tags.direction not defined"
      );
    });

    it("throws when notificationBot.tags.offset is not defined", () => {
      notificationMapperToInfra.mockReturnValue(
        makeNotificationBot({ direction: { x: 1, y: 0 }, offset: undefined })
      );
      expect(() =>
        makeAdapter().updateNotificationPosition(
          makeContainer({ activityNotification: makeActivityNotification() })
        )
      ).toThrow(
        "ActivityNotificationAdapter: notificationBot.tags.offset not defined"
      );
    });

    it("throws when container.piece is not defined", () => {
      notificationMapperToInfra.mockReturnValue(makeNotificationBot());
      expect(() =>
        makeAdapter().updateNotificationPosition(
          makeContainer({
            activityNotification: makeActivityNotification(),
            piece: undefined,
          })
        )
      ).toThrow("ActivityNotificationAdapter: container.piece is not defined");
    });

    it("throws when ownerBot is not found via PieceMapper", () => {
      notificationMapperToInfra.mockReturnValue(makeNotificationBot());
      pieceMapperToInfra.mockReturnValue(undefined);
      expect(() =>
        makeAdapter().updateNotificationPosition(
          makeContainer({ activityNotification: makeActivityNotification() })
        )
      ).toThrow(
        "ActivityNotificationAdapter: ownerBot not found at updateNotificationPosition"
      );
    });
  });

  describe("position update", () => {
    const setupValid = () => {
      const bot = makeNotificationBot();
      notificationMapperToInfra.mockReturnValue(bot);
      pieceMapperToInfra.mockReturnValue(makeOwnerBot());
      getBotPositionMock.mockReturnValue(new Vec3(1, 2, 3));
      return bot;
    };

    it("calls setTagMask exactly 3 times (x, y, z)", () => {
      setupValid();
      makeAdapter().updateNotificationPosition(
        makeContainer({ activityNotification: makeActivityNotification() })
      );
      expect(setTagMaskMock).toHaveBeenCalledTimes(3);
    });

    it("sets the dimension X tag on the notification bot", () => {
      const bot = setupValid();
      makeAdapter().updateNotificationPosition(
        makeContainer({ activityNotification: makeActivityNotification() })
      );
      expect(setTagMaskMock).toHaveBeenCalledWith(
        bot,
        "scene3dX",
        expect.any(Number)
      );
    });

    it("sets the dimension Y tag on the notification bot", () => {
      const bot = setupValid();
      makeAdapter().updateNotificationPosition(
        makeContainer({ activityNotification: makeActivityNotification() })
      );
      expect(setTagMaskMock).toHaveBeenCalledWith(
        bot,
        "scene3dY",
        expect.any(Number)
      );
    });

    it("sets the dimension Z tag on the notification bot", () => {
      const bot = setupValid();
      makeAdapter().updateNotificationPosition(
        makeContainer({ activityNotification: makeActivityNotification() })
      );
      expect(setTagMaskMock).toHaveBeenCalledWith(
        bot,
        "scene3dZ",
        expect.any(Number)
      );
    });

    it("does not call getBot when ownerBot has no transformer tag", () => {
      setupValid();
      makeAdapter().updateNotificationPosition(
        makeContainer({ activityNotification: makeActivityNotification() })
      );
      expect(getBotMock).not.toHaveBeenCalled();
    });

    it("calls getBot via byID when ownerBot.tags.transformer is set", () => {
      notificationMapperToInfra.mockReturnValue(makeNotificationBot());
      pieceMapperToInfra.mockReturnValue(
        makeOwnerBot({ transformer: "t-123" })
      );
      getBotPositionMock.mockReturnValue(new Vec3(0, 0, 0));
      getBotMock.mockReturnValue({ id: "t-123", tags: {} });
      makeAdapter().updateNotificationPosition(
        makeContainer({ activityNotification: makeActivityNotification() })
      );
      expect(byIDMock).toHaveBeenCalledWith("t-123");
      expect(getBotMock).toHaveBeenCalled();
    });
  });
});

// ─── updateNotificationDirection ─────────────────────────────────────────────

describe("updateNotificationDirection", () => {
  it("throws when container.piece is not defined", () => {
    expect(() =>
      makeAdapter().updateNotificationDirection(
        makeContainer({ piece: undefined })
      )
    ).toThrow("ActivityNotificatioNAdapter: container.piece not defined");
  });

  it("returns early (no-op) when PieceMapper returns undefined", () => {
    pieceMapperToInfra.mockReturnValue(undefined);
    makeAdapter().updateNotificationDirection(makeContainer());
    expect(setTagMaskMock).not.toHaveBeenCalled();
  });

  it("returns early when pieceBot.tags.isInUse is falsy", () => {
    pieceMapperToInfra.mockReturnValue(makeOwnerBot({ isInUse: false }));
    const container = makeContainer({
      activityNotification: makeActivityNotification(),
    });
    makeAdapter().updateNotificationDirection(container);
    expect(setTagMaskMock).not.toHaveBeenCalled();
  });

  it("returns early when container.activityNotification is not defined", () => {
    pieceMapperToInfra.mockReturnValue(makeOwnerBot({ isInUse: true }));
    makeAdapter().updateNotificationDirection(
      makeContainer({ activityNotification: undefined })
    );
    expect(setTagMaskMock).not.toHaveBeenCalled();
  });

  it("throws when notificationBot is not found after passing the isValid check", () => {
    pieceMapperToInfra.mockReturnValue(makeOwnerBot({ isInUse: true }));
    notificationMapperToInfra.mockReturnValue(undefined);
    const container = makeContainer({
      activityNotification: makeActivityNotification(),
    });
    expect(() => makeAdapter().updateNotificationDirection(container)).toThrow(
      "ActivityNotificatioNAdapter: notificationBot not found"
    );
  });

  it("throws when notificationBot.tags.direction is not defined", () => {
    pieceMapperToInfra.mockReturnValue(makeOwnerBot({ isInUse: true }));
    notificationMapperToInfra.mockReturnValue(
      makeNotificationBot({ direction: undefined })
    );
    const container = makeContainer({
      activityNotification: makeActivityNotification(),
    });
    expect(() => makeAdapter().updateNotificationDirection(container)).toThrow(
      "ActivityNotificationAdapter: currDirection not defined"
    );
  });

  it("does not call setTagMask when direction has not changed", () => {
    pieceMapperToInfra.mockReturnValue(makeOwnerBot({ isInUse: true }));
    // computeNotificationDirection returns { x: 1, y: 0 } (mocked at top)
    // notificationBot.tags.direction is also { x: 1, y: 0 } — same values
    notificationMapperToInfra.mockReturnValue(
      makeNotificationBot({ direction: { x: 1, y: 0 } })
    );
    const container = makeContainer({
      activityNotification: makeActivityNotification(),
    });
    makeAdapter().updateNotificationDirection(container);
    expect(setTagMaskMock).not.toHaveBeenCalled();
  });

  it("updates direction tag and calls updateNotificationPosition when direction has changed", () => {
    pieceMapperToInfra
      .mockReturnValueOnce(makeOwnerBot({ isInUse: true })) // updateNotificationDirection call
      .mockReturnValueOnce(makeOwnerBot()); // updateNotificationPosition → PieceMapper call
    // computeNotificationDirection returns { x: 1, y: 0 }, but bot has { x: 0, y: 1 }
    const bot = makeNotificationBot({ direction: { x: 0, y: 1 } });
    notificationMapperToInfra.mockReturnValue(bot);
    getBotPositionMock.mockReturnValue(new Vec3(0, 0, 0));
    const container = makeContainer({
      activityNotification: makeActivityNotification(),
    });
    makeAdapter().updateNotificationDirection(container);
    // direction tag updated
    expect(bot.tags.direction).toEqual({ x: 1, y: 0 });
    // updateNotificationPosition triggered → setTagMask called 3 times
    expect(setTagMaskMock).toHaveBeenCalledTimes(3);
  });
});
