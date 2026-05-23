import { BaseEventManager } from "bibleVizUtils.application.services.BaseEventManager";
import type { EventCallback } from "bibleVizUtils.application.services.BaseEventManager";

// ─── test map ────────────────────────────────────────────────────────────────

type TestEvents = {
  ping: string;
  pong: number;
  silent: void;
};

const makeManager = () => new BaseEventManager<TestEvents>();

// ─── subscribe ────────────────────────────────────────────────────────────────

describe("subscribe", () => {
  it("calls the registered callback when the event is emitted", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    mgr.subscribe("ping", cb);
    mgr.emit("ping", "hello");
    expect(cb).toHaveBeenCalledWith("hello");
  });

  it("returns a function (unsubscribe)", () => {
    const mgr = makeManager();
    const unsub = mgr.subscribe("ping", jest.fn());
    expect(typeof unsub).toBe("function");
  });

  it("registers multiple callbacks for the same event — all are called", () => {
    const mgr = makeManager();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    mgr.subscribe("ping", cb1);
    mgr.subscribe("ping", cb2);
    mgr.emit("ping", "hi");
    expect(cb1).toHaveBeenCalledWith("hi");
    expect(cb2).toHaveBeenCalledWith("hi");
  });

  it("callbacks for different events are independent — only the matching one fires", () => {
    const mgr = makeManager();
    const cbPing = jest.fn();
    const cbPong = jest.fn();
    mgr.subscribe("ping", cbPing);
    mgr.subscribe("pong", cbPong);
    mgr.emit("ping", "x");
    expect(cbPing).toHaveBeenCalledTimes(1);
    expect(cbPong).not.toHaveBeenCalled();
  });

  it("adding the same callback reference twice still calls it once per emit (Set dedup)", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    mgr.subscribe("ping", cb);
    mgr.subscribe("ping", cb);
    mgr.emit("ping", "dup");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("subscribing to 'silent' (void) event works without payload", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    mgr.subscribe("silent", cb);
    mgr.emit("silent");
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ─── unsubscribe (returned function) ─────────────────────────────────────────

describe("unsubscribe", () => {
  it("calling the returned function stops the callback from firing", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    const unsub = mgr.subscribe("ping", cb);
    unsub();
    mgr.emit("ping", "after");
    expect(cb).not.toHaveBeenCalled();
  });

  it("only removes the specific callback — other callbacks for the same event keep firing", () => {
    const mgr = makeManager();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const unsub1 = mgr.subscribe("ping", cb1);
    mgr.subscribe("ping", cb2);
    unsub1();
    mgr.emit("ping", "x");
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledWith("x");
  });

  it("calling unsubscribe a second time does not throw", () => {
    const mgr = makeManager();
    const unsub = mgr.subscribe("ping", jest.fn());
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  it("removing the last listener for an event cleans up — emit is a no-op afterwards", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    const unsub = mgr.subscribe("ping", cb);
    unsub();
    mgr.emit("ping", "gone");
    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── emit ─────────────────────────────────────────────────────────────────────

describe("emit", () => {
  it("passes the payload to the callback", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    mgr.subscribe("pong", cb);
    mgr.emit("pong", 42);
    expect(cb).toHaveBeenCalledWith(42);
  });

  it("does nothing when no listeners are registered for the event", () => {
    const mgr = makeManager();
    expect(() => mgr.emit("ping", "nobody")).not.toThrow();
  });

  it("continues calling remaining callbacks after one throws", () => {
    const mgr = makeManager();
    const bad = jest.fn(() => {
      throw new Error("boom");
    });
    const good = jest.fn();
    mgr.subscribe("ping", bad);
    mgr.subscribe("ping", good);
    jest.spyOn(console, "error").mockImplementation(() => {});
    mgr.emit("ping", "test");
    expect(good).toHaveBeenCalledWith("test");
    jest.restoreAllMocks();
  });

  it("logs console.error when a callback throws", () => {
    const mgr = makeManager();
    mgr.subscribe("ping", () => {
      throw new Error("oops");
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    mgr.emit("ping", "x");
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("ping"),
      expect.any(Error)
    );
    errorSpy.mockRestore();
  });

  it("can emit with no payload for void events", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    mgr.subscribe("silent", cb);
    mgr.emit("silent");
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(undefined);
  });

  it("each emit call triggers the callback the expected number of times", () => {
    const mgr = makeManager();
    const cb = jest.fn();
    mgr.subscribe("ping", cb);
    mgr.emit("ping", "a");
    mgr.emit("ping", "b");
    mgr.emit("ping", "c");
    expect(cb).toHaveBeenCalledTimes(3);
  });
});

// ─── removeAllListeners ───────────────────────────────────────────────────────

describe("removeAllListeners", () => {
  it("prevents all previously registered callbacks from firing", () => {
    const mgr = makeManager();
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    mgr.subscribe("ping", cb1);
    mgr.subscribe("pong", cb2);
    mgr.removeAllListeners();
    mgr.emit("ping", "x");
    mgr.emit("pong", 1);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).not.toHaveBeenCalled();
  });

  it("calling removeAllListeners twice does not throw", () => {
    const mgr = makeManager();
    mgr.subscribe("ping", jest.fn());
    mgr.removeAllListeners();
    expect(() => mgr.removeAllListeners()).not.toThrow();
  });

  it("calling removeAllListeners on an empty manager does not throw", () => {
    const mgr = makeManager();
    expect(() => mgr.removeAllListeners()).not.toThrow();
  });

  it("new subscriptions registered after removeAllListeners work normally", () => {
    const mgr = makeManager();
    mgr.subscribe("ping", jest.fn());
    mgr.removeAllListeners();
    const fresh = jest.fn();
    mgr.subscribe("ping", fresh);
    mgr.emit("ping", "new");
    expect(fresh).toHaveBeenCalledWith("new");
  });

  it("unsubscribe tokens obtained before removeAllListeners are safe to call after", () => {
    const mgr = makeManager();
    const unsub = mgr.subscribe("ping", jest.fn());
    mgr.removeAllListeners();
    expect(() => unsub()).not.toThrow();
  });
});
