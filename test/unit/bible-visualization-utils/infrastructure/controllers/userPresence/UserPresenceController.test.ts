import { UserPresenceController } from "bibleVizUtils.infrastructure.controllers.userPresence.UserPresenceController";

// ─── factories ────────────────────────────────────────────────────────────────

const makeService = () => ({
  updateUserPresence: jest.fn(),
});

const makeController = (service = makeService()) =>
  new UserPresenceController(service as any);

// ─── handleActiveTabDataUpdated ───────────────────────────────────────────────

describe("handleActiveTabDataUpdated", () => {
  it("calls updateUserPresence on the service", () => {
    const service = makeService();
    makeController(service).handleActiveTabDataUpdated();
    expect(service.updateUserPresence).toHaveBeenCalled();
  });

  it("calls updateUserPresence exactly once", () => {
    const service = makeService();
    makeController(service).handleActiveTabDataUpdated();
    expect(service.updateUserPresence).toHaveBeenCalledTimes(1);
  });

  it("calls updateUserPresence once per invocation", () => {
    const service = makeService();
    const controller = makeController(service);
    controller.handleActiveTabDataUpdated();
    controller.handleActiveTabDataUpdated();
    expect(service.updateUserPresence).toHaveBeenCalledTimes(2);
  });
});

// ─── handleOnlineUsersChanged ─────────────────────────────────────────────────

describe("handleOnlineUsersChanged", () => {
  it("calls updateUserPresence on the service", () => {
    const service = makeService();
    makeController(service).handleOnlineUsersChanged();
    expect(service.updateUserPresence).toHaveBeenCalled();
  });

  it("calls updateUserPresence exactly once", () => {
    const service = makeService();
    makeController(service).handleOnlineUsersChanged();
    expect(service.updateUserPresence).toHaveBeenCalledTimes(1);
  });

  it("calls updateUserPresence once per invocation", () => {
    const service = makeService();
    const controller = makeController(service);
    controller.handleOnlineUsersChanged();
    controller.handleOnlineUsersChanged();
    expect(service.updateUserPresence).toHaveBeenCalledTimes(2);
  });
});

// ─── both methods share the same service ──────────────────────────────────────

describe("shared service", () => {
  it("calls from both methods accumulate on the same service instance", () => {
    const service = makeService();
    const controller = makeController(service);
    controller.handleActiveTabDataUpdated();
    controller.handleOnlineUsersChanged();
    expect(service.updateUserPresence).toHaveBeenCalledTimes(2);
  });
});
