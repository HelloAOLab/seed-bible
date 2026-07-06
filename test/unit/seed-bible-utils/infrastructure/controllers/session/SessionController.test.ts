import { SessionController } from "../../../../../../packages/seed-bible-utils/infrastructure/controllers/session/SessionController";

// ─── factories ────────────────────────────────────────────────────────────────

const makeService = () => ({
  tryEmitUserLoggedInEvent: vi.fn(),
  handleOnlineUsersChanged: vi.fn(),
});

const makeController = (service = makeService()) =>
  new SessionController({ sessionService: service as any });

// ─── handleUserLoggedIn ───────────────────────────────────────────────────────

describe("handleUserLoggedIn", () => {
  it("calls tryEmitUserLoggedInEvent on the service", () => {
    const service = makeService();
    makeController(service).handleUserLoggedIn();
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalled();
  });

  it("calls tryEmitUserLoggedInEvent exactly once", () => {
    const service = makeService();
    makeController(service).handleUserLoggedIn();
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalledTimes(1);
  });

  it("calls tryEmitUserLoggedInEvent with no arguments", () => {
    const service = makeService();
    makeController(service).handleUserLoggedIn();
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalledWith();
  });

  it("calls tryEmitUserLoggedInEvent once per invocation", () => {
    const service = makeService();
    const controller = makeController(service);
    controller.handleUserLoggedIn();
    controller.handleUserLoggedIn();
    expect(service.tryEmitUserLoggedInEvent).toHaveBeenCalledTimes(2);
  });

  it("does not call handleOnlineUsersChanged", () => {
    const service = makeService();
    makeController(service).handleUserLoggedIn();
    expect(service.handleOnlineUsersChanged).not.toHaveBeenCalled();
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
