import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { ExtensionInitalizer } from "seed-bible.managers.ExtensionManager";

describe("ExtensionInitalizer", () => {
  let initializer: ExtensionInitalizer;
  let context: SeedBibleState;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    initializer = new ExtensionInitalizer();
    context = {} as SeedBibleState;
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("initializes extensions only once", () => {
    const init = jest.fn(() => ({}));

    initializer.registerExtension({
      id: "ext.single-init",
      init,
    });

    initializer.setupExtensionContext(context);
    initializer.setupExtensionContext(context);

    expect(init).toHaveBeenCalledTimes(1);
  });

  it("supports registering extensions before context setup", () => {
    const init = jest.fn(() => ({}));

    initializer.registerExtension({
      id: "ext.before-context",
      init,
    });

    expect(init).not.toHaveBeenCalled();

    initializer.setupExtensionContext(context);

    expect(init).toHaveBeenCalledTimes(1);
  });

  it("supports registering extensions after context setup", () => {
    const init = jest.fn(() => ({}));

    initializer.setupExtensionContext(context);

    initializer.registerExtension({
      id: "ext.after-context",
      init,
    });

    expect(init).toHaveBeenCalledTimes(1);
  });

  it("supports declaring extension dependencies", () => {
    const initA = jest.fn(() => ({ value: "A" }));
    const initB = jest.fn(() => ({ value: "B" }));

    initializer.registerExtension({
      id: "ext.dependency-a",
      init: initA,
    });

    initializer.registerExtension({
      id: "ext.dependency-b",
      dependencies: ["ext.dependency-a"],
      init: initB,
    });

    initializer.setupExtensionContext(context);

    expect(initA).toHaveBeenCalledTimes(1);
    expect(initB).toHaveBeenCalledTimes(1);
  });

  it("initializes dependencies before dependents", () => {
    const initOrder: string[] = [];

    initializer.setupExtensionContext(context);

    initializer.registerExtension({
      id: "ext.dependent",
      dependencies: ["ext.dep"],
      init: () => {
        initOrder.push("dependent");
        return {};
      },
    });

    expect(initOrder).toEqual([]);

    initializer.registerExtension({
      id: "ext.dep",
      init: () => {
        initOrder.push("dependency");
        return {};
      },
    });

    expect(initOrder).toEqual(["dependency", "dependent"]);
  });

  it("passes dependency exports to dependent initializers", () => {
    initializer.registerExtension({
      id: "ext.exports-a",
      init: () => ({ sharedValue: 42 }),
    });

    const initB = jest.fn(
      (_ctx: SeedBibleState, dependencies: Record<string, object>) => {
        return {
          received: dependencies["ext.exports-a"],
        };
      }
    );

    initializer.registerExtension({
      id: "ext.exports-b",
      dependencies: ["ext.exports-a"],
      init: initB,
    });

    initializer.setupExtensionContext(context);

    expect(initB).toHaveBeenCalledTimes(1);
    expect(initB.mock.calls[0]?.[1]).toEqual({
      "ext.exports-a": { sharedValue: 42 },
    });
    expect(
      initializer.getExtensionExports<{ received: object }>("ext.exports-b")
    ).toEqual({ received: { sharedValue: 42 } });
  });

  it("uses a generator initializer's return value as exports and calls yielded cleanup functions", () => {
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();

    function* generatorInit() {
      yield cleanup1;
      yield cleanup2;
      return { generatorExport: true };
    }

    const unregister = initializer.registerExtension({
      id: "ext.generator",
      init: generatorInit,
    });

    initializer.setupExtensionContext(context);

    expect(
      initializer.getExtensionExports<{ generatorExport: boolean }>(
        "ext.generator"
      )
    ).toEqual({ generatorExport: true });

    expect(cleanup1).not.toHaveBeenCalled();
    expect(cleanup2).not.toHaveBeenCalled();

    unregister();

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
  });

  it("uses a non-generator initializer's return value as exports", () => {
    const unregister = initializer.registerExtension({
      id: "ext.non-generator",
      init: () => ({ nonGeneratorExport: 99 }),
    });

    initializer.setupExtensionContext(context);

    expect(
      initializer.getExtensionExports<{ nonGeneratorExport: number }>(
        "ext.non-generator"
      )
    ).toEqual({ nonGeneratorExport: 99 });

    unregister();
  });

  it("logs circular dependencies between extensions", () => {
    const initA = jest.fn(() => ({}));
    const initB = jest.fn(() => ({}));

    initializer.registerExtension({
      id: "ext.circular-a",
      dependencies: ["ext.circular-b"],
      init: initA,
    });

    initializer.registerExtension({
      id: "ext.circular-b",
      dependencies: ["ext.circular-a"],
      init: initB,
    });

    initializer.setupExtensionContext(context);

    const circularDependencyLogExists = errorSpy.mock.calls.some((call) => {
      const message = String(call[0] ?? "");
      return message.includes("circular dependency detected");
    });

    expect(circularDependencyLogExists).toBe(true);
    expect(initA).not.toHaveBeenCalled();
    expect(initB).not.toHaveBeenCalled();
  });
});
