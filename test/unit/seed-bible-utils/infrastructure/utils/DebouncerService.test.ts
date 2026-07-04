import { DebouncerService } from "../../../../../packages/seed-bible-utils/infrastructure/utils/DebouncerService";

// ─── timer setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── construction ─────────────────────────────────────────────────────────────

describe("construction", () => {
  it("creates an instance without throwing", () => {
    expect(() => new DebouncerService(vi.fn(), 100)).not.toThrow();
  });

  it("exposes an execute method", () => {
    const service = new DebouncerService(vi.fn(), 100);
    expect(typeof service.execute).toBe("function");
  });
});

// ─── debounce timing ──────────────────────────────────────────────────────────

describe("debounce timing", () => {
  it("does not call the callback immediately after execute", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 200);
    service.execute();
    expect(callback).not.toHaveBeenCalled();
  });

  it("does not call the callback before the debounce period elapses", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 200);
    service.execute();
    vi.advanceTimersByTime(199);
    expect(callback).not.toHaveBeenCalled();
  });

  it("calls the callback exactly once after the debounce period elapses", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 200);
    service.execute();
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls the callback after a longer debounce period", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 500);
    service.execute();
    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

// ─── debounce coalescing ──────────────────────────────────────────────────────

describe("debounce coalescing", () => {
  it("calls the callback only once when execute is called multiple times within the debounce period", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 200);
    service.execute();
    service.execute();
    service.execute();
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("resets the timer on each execute call", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 200);
    service.execute();
    vi.advanceTimersByTime(150);
    service.execute();
    vi.advanceTimersByTime(150);
    // only 150ms have passed since the last execute — should not have fired yet
    expect(callback).not.toHaveBeenCalled();
  });

  it("fires after the full period following the last execute", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 200);
    service.execute();
    vi.advanceTimersByTime(150);
    service.execute();
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});

// ─── argument passing ─────────────────────────────────────────────────────────

describe("argument passing", () => {
  it("passes the argument to the callback", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 100);
    service.execute("hello");
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledWith("hello");
  });

  it("passes an object argument to the callback", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 100);
    const arg = { key: "value" };
    service.execute(arg);
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledWith(arg);
  });

  it("calls the callback with undefined when execute is called with no argument", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 100);
    service.execute();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledWith(undefined);
  });

  it("passes the last argument when execute is called multiple times within the debounce period", () => {
    const callback = vi.fn();
    const service = new DebouncerService(callback, 200);
    service.execute("first");
    service.execute("second");
    service.execute("third");
    vi.advanceTimersByTime(200);
    expect(callback).toHaveBeenCalledWith("third");
  });
});

// ─── independent instances ────────────────────────────────────────────────────

describe("independent instances", () => {
  it("two instances with different callbacks fire independently", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const s1 = new DebouncerService(cb1, 100);
    const s2 = new DebouncerService(cb2, 100);
    s1.execute("a");
    s2.execute("b");
    vi.advanceTimersByTime(100);
    expect(cb1).toHaveBeenCalledWith("a");
    expect(cb2).toHaveBeenCalledWith("b");
  });

  it("two instances with different debounce times fire at their own times", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const s1 = new DebouncerService(cb1, 100);
    const s2 = new DebouncerService(cb2, 300);
    s1.execute();
    s2.execute();
    vi.advanceTimersByTime(100);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});
