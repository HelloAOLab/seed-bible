import { SessionService } from "bibleVizUtils.application.services.SessionService";
import type { SessionEventPort } from "bibleVizUtils.domain.ports.session";

// ─── factory ─────────────────────────────────────────────────────────────────

const makeEventPort = (): SessionEventPort => ({ emit: jest.fn() });

const makeService = (eventPort = makeEventPort()) =>
  new SessionService(eventPort);

// ─── tryEmitUserLoggedInEvent ─────────────────────────────────────────────────

describe("tryEmitUserLoggedInEvent", () => {
  it("emits OnUserLoggedIn when isLogged is true and the event has not been emitted before", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(true);
    expect(eventPort.emit).toHaveBeenCalledWith("OnUserLoggedIn");
  });

  it("emits exactly once on the first call with isLogged=true", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(true);
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("does not emit when isLogged is false", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(false);
    expect(eventPort.emit).not.toHaveBeenCalled();
  });

  it("does not emit a second time when called again with isLogged=true", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(true);
    svc.tryEmitUserLoggedInEvent(true);
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("remains suppressed even after a false call follows the first true call", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(true);
    svc.tryEmitUserLoggedInEvent(false);
    svc.tryEmitUserLoggedInEvent(true);
    expect(eventPort.emit).toHaveBeenCalledTimes(1);
  });

  it("multiple false calls before the first true call do not prevent emission", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(false);
    svc.tryEmitUserLoggedInEvent(false);
    svc.tryEmitUserLoggedInEvent(true);
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
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(true);
    svc.handleOnlineUsersChanged();
    const calls = (eventPort.emit as jest.Mock).mock.calls.map(
      ([name]) => name
    );
    expect(calls).toContain("OnlineUsersChanged");
  });
});

// ─── event isolation ──────────────────────────────────────────────────────────

describe("event isolation", () => {
  it("handleOnlineUsersChanged does not affect the login-emitted flag", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.handleOnlineUsersChanged();
    svc.tryEmitUserLoggedInEvent(true);
    // Login event must still fire — handleOnlineUsersChanged has no effect on the flag
    expect(eventPort.emit).toHaveBeenCalledWith("OnUserLoggedIn");
  });

  it("emits are recorded in call order", () => {
    const eventPort = makeEventPort();
    const svc = makeService(eventPort);
    svc.tryEmitUserLoggedInEvent(true);
    svc.handleOnlineUsersChanged();
    const names = (eventPort.emit as jest.Mock).mock.calls.map(([n]) => n);
    expect(names).toEqual(["OnUserLoggedIn", "OnlineUsersChanged"]);
  });
});
