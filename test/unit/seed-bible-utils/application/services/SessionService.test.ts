import type { Mock } from "vitest";
import { SessionService } from "../../../../../packages/seed-bible-utils/application/services/SessionService";
import type { SessionEventPort } from "../../../../../packages/seed-bible-utils/domain/ports/session";

// ─── factory ─────────────────────────────────────────────────────────────────

const makeEventPort = (): SessionEventPort => ({ emit: vi.fn() });

const makeLoginManager = (userId: string | null = "user-id"): any => ({
  userId,
});

const makeService = (
  sessionEventPort = makeEventPort(),
  loginManager = makeLoginManager()
) =>
  new SessionService({
    loginManager,
    sessionEventPort,
  } as any);

// ─── tryEmitUserLoggedInEvent ─────────────────────────────────────────────────

describe("tryEmitUserLoggedInEvent", () => {
  it("emits OnUserLoggedIn when a user is logged in and the event has not been emitted before", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort, makeLoginManager("user-id"));
    svc.tryEmitUserLoggedInEvent();
    expect(eventPort.emit).toHaveBeenCalledWith("OnUserLoggedIn");
  });

  it("emits exactly once on the first call when logged in", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort, makeLoginManager("user-id"));
    svc.tryEmitUserLoggedInEvent();
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("does not emit when no user is logged in", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort, makeLoginManager(null));
    svc.tryEmitUserLoggedInEvent();
    expect(eventPort.emit).not.toHaveBeenCalled();
  });

  it("does not emit a second time when called again while logged in", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort, makeLoginManager("user-id"));
    svc.tryEmitUserLoggedInEvent();
    svc.tryEmitUserLoggedInEvent();
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("remains suppressed even after the user logs out following the first emission", () => {
    const eventPort = makeEventPort();
    const loginManager = makeLoginManager("user-id");
    const svc = makeService(eventPort, loginManager);
    svc.tryEmitUserLoggedInEvent();
    loginManager.userId = null;
    svc.tryEmitUserLoggedInEvent();
    loginManager.userId = "user-id";
    svc.tryEmitUserLoggedInEvent();
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("does not emit while logged out, then emits once when the user logs in", () => {
    const eventPort = makeEventPort();
    const loginManager = makeLoginManager(null);
    const svc = makeService(eventPort, loginManager);
    svc.tryEmitUserLoggedInEvent();
    svc.tryEmitUserLoggedInEvent();
    loginManager.userId = "user-id";
    svc.tryEmitUserLoggedInEvent();
    expect(eventPort.emit).toHaveBeenCalledWith("OnUserLoggedIn");
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });
});

// ─── handleOnlineUsersChanged ─────────────────────────────────────────────────

describe("handleOnlineUsersChanged", () => {
  it("emits OnlineUsersChanged", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.handleOnlineUsersChanged();
    expect(eventPort.emit).toHaveBeenCalledWith("OnlineUsersChanged");
  });

  it("emits every time it is called — no one-shot suppression", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.handleOnlineUsersChanged();
    svc.handleOnlineUsersChanged();
    svc.handleOnlineUsersChanged();
    expect(eventPort.emit).toHaveBeenCalledTimes(3);
  });

  it("emits independently of tryEmitUserLoggedInEvent state", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort, makeLoginManager("user-id"));
    svc.tryEmitUserLoggedInEvent();
    svc.handleOnlineUsersChanged();
    const calls = (eventPort.emit as Mock).mock.calls.map(([name]) => name);
    expect(calls).toContain("OnlineUsersChanged");
  });
});

// ─── event isolation ──────────────────────────────────────────────────────────

describe("event isolation", () => {
  it("handleOnlineUsersChanged does not affect the login-emitted flag", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort, makeLoginManager("user-id"));
    svc.handleOnlineUsersChanged();
    svc.tryEmitUserLoggedInEvent();
    // Login event must still fire — handleOnlineUsersChanged has no effect on the flag
    expect(eventPort.emit).toHaveBeenCalledWith("OnUserLoggedIn");
  });

  it("emits are recorded in call order", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort, makeLoginManager("user-id"));
    svc.tryEmitUserLoggedInEvent();
    svc.handleOnlineUsersChanged();
    const names = (eventPort.emit as Mock).mock.calls.map(([n]) => n);
    expect(names).toEqual(["OnUserLoggedIn", "OnlineUsersChanged"]);
  });
});
