import { UserColorController } from "bibleVizUtils.infrastructure.controllers.session.UserColorController";

jest.mock("bibleVizUtils.infrastructure.utils.DebouncerService");

import { DebouncerService } from "bibleVizUtils.infrastructure.utils.DebouncerService";

// ─── factories ────────────────────────────────────────────────────────────────

const makeService = () => ({ syncUserColors: jest.fn() });

const makeMockExecute = () => {
  const instance = (DebouncerService as jest.Mock).mock.instances.at(-1);
  return instance.execute as jest.Mock;
};

const makeController = (service = makeService()) => {
  (DebouncerService as jest.Mock).mockClear();
  const ctrl = new UserColorController(service as any);
  return { controller: ctrl, service };
};

beforeEach(() => {
  jest.clearAllMocks();
  (DebouncerService as jest.Mock).mockImplementation(function (
    this: any,
    _cb: any,
    _delay: number
  ) {
    this.execute = jest.fn();
  });
});

// ─── constructor ──────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("creates a DebouncerService with a 500 ms delay", () => {
    const { service } = makeController();
    const [, delay] = (DebouncerService as jest.Mock).mock.calls.at(-1)!;
    expect(delay).toBe(500);
  });

  it("passes a callback that calls syncUserColors on the service", () => {
    const { service } = makeController();
    const [callback] = (DebouncerService as jest.Mock).mock.calls.at(-1)!;
    callback();
    expect(service.syncUserColors).toHaveBeenCalledTimes(1);
  });
});

// ─── syncUserColors ───────────────────────────────────────────────────────────

describe("syncUserColors", () => {
  it("calls execute on the DebouncerService", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.syncUserColors();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("calls execute on every invocation", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.syncUserColors();
    controller.syncUserColors();
    expect(execute).toHaveBeenCalledTimes(2);
  });
});

// ─── handleUserLogin ──────────────────────────────────────────────────────────

describe("handleUserLogin", () => {
  it("calls execute on the DebouncerService", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.handleUserLogin();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

// ─── handleUserSubscribed ─────────────────────────────────────────────────────

describe("handleUserSubscribed", () => {
  it("calls execute on the DebouncerService", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.handleUserSubscribed();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

// ─── handleUserUnsubscribed ───────────────────────────────────────────────────

describe("handleUserUnsubscribed", () => {
  it("calls execute on the DebouncerService", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.handleUserUnsubscribed();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

// ─── handleGetOrSetVisualInTagsDefined ────────────────────────────────────────

describe("handleGetOrSetVisualInTagsDefined", () => {
  it("calls execute on the DebouncerService", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.handleGetOrSetVisualInTagsDefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

// ─── handleOnlineUsersChanged ─────────────────────────────────────────────────

describe("handleOnlineUsersChanged", () => {
  it("calls execute on the DebouncerService", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.handleOnlineUsersChanged();
    expect(execute).toHaveBeenCalledTimes(1);
  });
});

// ─── shared: all public trigger methods delegate to syncUserColors ─────────────

describe("all trigger methods share the same debouncer", () => {
  it("each method increments the execute call count by one", () => {
    const { controller } = makeController();
    const execute = makeMockExecute();
    controller.handleUserLogin();
    controller.handleUserSubscribed();
    controller.handleUserUnsubscribed();
    controller.handleGetOrSetVisualInTagsDefined();
    controller.handleOnlineUsersChanged();
    controller.syncUserColors();
    expect(execute).toHaveBeenCalledTimes(6);
  });
});
