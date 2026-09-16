import { describe, expect, it, vi } from "vitest";
import { BaseEventManager } from "../../../../../../patterns/house-of-the-lord/house-of-the-lord/application/services/BaseEventManager";

interface Eventmap {
  OnEmptyEventCalled: void;
  OnRichEventCalled: {
    value: string;
  };
}

describe("application.services.BaseEventManager", () => {
  let eventManager: BaseEventManager<Eventmap>;
  beforeEach(() => {
    eventManager = new BaseEventManager<Eventmap>();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls a subscribed callback", () => {
    const callback = vi.fn();
    const event = "OnEmptyEventCalled";

    eventManager.subscribe(event, callback);
    eventManager.emit(event);

    expect(callback).toHaveBeenCalled();
  });

  it("calls a subscribed callback the amount of times the emit method is called", () => {
    const callback = vi.fn();
    const event = "OnEmptyEventCalled";

    eventManager.subscribe(event, callback);
    const times = 3;

    for (let i = 0; i < times; i++) {
      eventManager.emit(event);
    }

    expect(callback).toHaveBeenCalledTimes(times);
  });

  it("calls a subscribed callback providing the required payload", () => {
    const callback = vi.fn();
    const event = "OnRichEventCalled";
    const payload: Eventmap[typeof event] = {
      value: "my value",
    };

    eventManager.subscribe(event, callback);
    eventManager.emit(event, payload);

    expect(callback).toHaveBeenCalledWith(payload);
  });

  it("emits for multiple subscribed callbacks", () => {
    const callback_1 = vi.fn();
    const callback_2 = vi.fn();
    const callback_3 = vi.fn();
    const event = "OnEmptyEventCalled";

    eventManager.subscribe(event, callback_1);
    eventManager.subscribe(event, callback_2);
    eventManager.subscribe(event, callback_3);

    eventManager.emit(event);

    expect(callback_1).toHaveBeenCalledTimes(1);
    expect(callback_2).toHaveBeenCalledTimes(1);
    expect(callback_3).toHaveBeenCalledTimes(1);
  });

  it("returns an unsubscribe function on subscription", () => {
    const callback = vi.fn();
    const event = "OnEmptyEventCalled";

    const unsubscribe = eventManager.subscribe(event, callback);

    expect(unsubscribe).toBeTypeOf("function");
  });

  it("does not call an unsubscribed callback", () => {
    const callback = vi.fn();
    const event = "OnEmptyEventCalled";

    const unsubscribe = eventManager.subscribe(event, callback);
    eventManager.emit(event);

    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    eventManager.emit(event);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not leak callback calls to other events", () => {
    const emptyCallback = vi.fn();
    const richCallback = vi.fn();
    const emptyEvent = "OnEmptyEventCalled";
    const richEvent = "OnRichEventCalled";
    const payload: Eventmap[typeof richEvent] = {
      value: "my value",
    };

    eventManager.subscribe(emptyEvent, emptyCallback);
    eventManager.subscribe(richEvent, richCallback);

    eventManager.emit(emptyEvent);

    expect(emptyCallback).toHaveBeenCalledOnce();
    expect(richCallback).not.toHaveBeenCalled();

    emptyCallback.mockClear();
    richCallback.mockClear();

    eventManager.emit(richEvent, payload);

    expect(emptyCallback).not.toHaveBeenCalled();
    expect(richCallback).toHaveBeenCalledOnce();
  });

  it("subscribes to an event just once", () => {
    const callback = vi.fn();
    const event = "OnEmptyEventCalled";

    eventManager.subscribe(event, callback);
    eventManager.subscribe(event, callback);
    eventManager.subscribe(event, callback);

    eventManager.emit(event);

    expect(callback).toHaveBeenCalledOnce();
  });

  it("does not propagate callback throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const callback = vi.fn(() => {
      throw new Error("Callback error!");
    });
    const event = "OnEmptyEventCalled";

    eventManager.subscribe(event, callback);
    const emit = () => eventManager.emit(event);

    expect(emit).not.toThrow();
  });

  it("callback throws does not affect other callback calls", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const callback_1 = vi.fn(() => {
      throw new Error("Callback error!");
    });
    const callback_2 = vi.fn();
    const event = "OnEmptyEventCalled";

    eventManager.subscribe(event, callback_1);
    eventManager.subscribe(event, callback_2);
    eventManager.emit(event);

    expect(callback_2).toHaveBeenCalledOnce();
  });

  it("successfully remove all listeners", () => {
    const emptyCallback = vi.fn();
    const richCallback = vi.fn();
    const emptyEvent = "OnEmptyEventCalled";
    const richEvent = "OnRichEventCalled";
    const payload: Eventmap[typeof richEvent] = {
      value: "my value",
    };

    eventManager.subscribe(emptyEvent, emptyCallback);
    eventManager.subscribe(richEvent, richCallback);

    eventManager.removeAllListeners();

    eventManager.emit(emptyEvent);
    eventManager.emit(richEvent, payload);

    expect(emptyCallback).not.toHaveBeenCalled();
    expect(richCallback).not.toHaveBeenCalled();
  });

  it("successfully emits after removing all listeners", () => {
    const emptyCallback = vi.fn();
    const richCallback = vi.fn();
    const emptyEvent = "OnEmptyEventCalled";
    const richEvent = "OnRichEventCalled";
    const payload: Eventmap[typeof richEvent] = {
      value: "my value",
    };

    eventManager.subscribe(emptyEvent, emptyCallback);
    eventManager.subscribe(richEvent, richCallback);

    eventManager.removeAllListeners();

    eventManager.emit(emptyEvent);
    eventManager.emit(richEvent, payload);

    expect(emptyCallback).not.toHaveBeenCalled();
    expect(richCallback).not.toHaveBeenCalled();

    eventManager.subscribe(emptyEvent, emptyCallback);
    eventManager.subscribe(richEvent, richCallback);
    eventManager.emit(emptyEvent);
    eventManager.emit(richEvent, payload);
    expect(emptyCallback).toHaveBeenCalledOnce();
    expect(richCallback).toHaveBeenCalledOnce();
  });

  it("successfully unsubscribes after removing all listeners", () => {
    const callback = vi.fn();
    const event = "OnEmptyEventCalled";

    eventManager.subscribe(event, callback);
    eventManager.removeAllListeners();
    const unsubscribe = eventManager.subscribe(event, callback);
    unsubscribe();
    eventManager.emit(event);
    expect(callback).not.toHaveBeenCalled();
  });
});
