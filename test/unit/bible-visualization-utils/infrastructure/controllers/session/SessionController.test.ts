import { SessionController } from "bibleVizUtils.infrastructure.controllers.session.SessionController";

// ─── globals ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  (globalThis as any).authBot = { id: "auth-bot-id" };
});

afterEach(() => {
  delete (globalThis as any).authBot;
});

// ─── factories ────────────────────────────────────────────────────────────────

const makeService = () => ({
  tryEmitUserLoggedInEvent: jest.fn(),
  handleOnlineUsersChanged: jest.fn(),
});

const makeController = (service = makeService()) =>
  new SessionController(service as any);

const makeBot = (id = "some-bot"): any => ({ id });

// ─── handleAnyBotsAdded ───────────────────────────────────────────────────────

describe("handleAnyBotsAdded", () => {
  it("does nothing when authBot is null", () => {
    (globalThis as any).authBot = null;
    const service = makeService();
    makeController(service).handleAnyBotsAdded([makeBot("auth-bot-id")]);
    expect(service.tryEmitUserLoggedInEvent).not.toHaveBeenCalled();
  });

  it("calls tryEmitUserLoggedInEvent(true) when the added bots include authBot", () => {
    const service = makeService();
    makeController(service).handleAnyBotsAdded([makeBot("auth-bot-id")]);
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalledWith(true);
  });

  it("calls tryEmitUserLoggedInEvent exactly once when authBot is present", () => {
    const service = makeService();
    makeController(service).handleAnyBotsAdded([makeBot("auth-bot-id")]);
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalledTimes(1);
  });

  it("does not call tryEmitUserLoggedInEvent when no added bot matches authBot", () => {
    const service = makeService();
    makeController(service).handleAnyBotsAdded([makeBot("other-bot")]);
    expect(service.tryEmitUserLoggedInEvent).not.toHaveBeenCalled();
  });

  it("does not call tryEmitUserLoggedInEvent when the added bots array is empty", () => {
    const service = makeService();
    makeController(service).handleAnyBotsAdded([]);
    expect(service.tryEmitUserLoggedInEvent).not.toHaveBeenCalled();
  });

  it("detects authBot among multiple added bots", () => {
    const service = makeService();
    makeController(service).handleAnyBotsAdded([
      makeBot("other-1"),
      makeBot("auth-bot-id"),
      makeBot("other-2"),
    ]);
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalledWith(true);
  });

  it("does not call tryEmitUserLoggedInEvent when none of several bots match", () => {
    const service = makeService();
    makeController(service).handleAnyBotsAdded([
      makeBot("a"),
      makeBot("b"),
      makeBot("c"),
    ]);
    expect(service.tryEmitUserLoggedInEvent).not.toHaveBeenCalled();
  });

  it("does not call handleOnlineUsersChanged", () => {
    const service = makeService();
    makeController(service).handleAnyBotsAdded([makeBot("auth-bot-id")]);
    expect(service.handleOnlineUsersChanged).not.toHaveBeenCalled();
  });

  it("uses authBot.id at call time — reflects runtime value of authBot", () => {
    (globalThis as any).authBot = { id: "dynamic-id" };
    const service = makeService();
    makeController(service).handleAnyBotsAdded([makeBot("dynamic-id")]);
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalledWith(true);
  });
});

// ─── handleOnlineUsersChanged ─────────────────────────────────────────────────

describe("handleOnlineUsersChanged", () => {
  it("calls handleOnlineUsersChanged on the service", () => {
    const service = makeService();
    makeController(service).handleOnlineUsersChanged();
    expect(service.handleOnlineUsersChanged).toHaveBeenCalled();
  });

  it("calls handleOnlineUsersChanged exactly once", () => {
    const service = makeService();
    makeController(service).handleOnlineUsersChanged();
    expect(service.handleOnlineUsersChanged).toHaveBeenCalledTimes(1);
  });

  it("calls handleOnlineUsersChanged once per invocation", () => {
    const service = makeService();
    const controller = makeController(service);
    controller.handleOnlineUsersChanged();
    controller.handleOnlineUsersChanged();
    expect(service.handleOnlineUsersChanged).toHaveBeenCalledTimes(2);
  });

  it("does not call tryEmitUserLoggedInEvent", () => {
    const service = makeService();
    makeController(service).handleOnlineUsersChanged();
    expect(service.tryEmitUserLoggedInEvent).not.toHaveBeenCalled();
  });
});
