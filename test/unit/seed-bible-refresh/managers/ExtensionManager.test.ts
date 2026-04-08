import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import {
  createExtensionManager,
  ExtensionInitalizer,
  registerExtension,
  type ExtensionSet,
} from "seed-bible.managers.ExtensionManager";

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
    expect(init).toHaveBeenCalledWith(context, {});
  });

  it("supports registering extensions after context setup", () => {
    const init = jest.fn(() => ({}));

    initializer.setupExtensionContext(context);

    initializer.registerExtension({
      id: "ext.after-context",
      init,
    });

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(context, {});
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

  it("unregisterExtension() removes a registered extension", () => {
    const init = jest.fn(() => ({}));

    initializer.registerExtension({
      id: "ext.to-unregister",
      init,
    });

    expect(initializer.isExtensionRegistered("ext.to-unregister")).toBe(true);

    const unregistered = initializer.unregisterExtension("ext.to-unregister");

    expect(unregistered).toBe(true);
    expect(initializer.isExtensionRegistered("ext.to-unregister")).toBe(false);
  });

  it("unregisterExtension() returns false when extension is not registered", () => {
    const unregistered = initializer.unregisterExtension("ext.non-existent");
    expect(unregistered).toBe(false);
  });

  it("unregisterExtension() calls cleanup functions in reverse order", () => {
    const cleanup1 = jest.fn();
    const cleanup2 = jest.fn();
    const cleanupOrder: number[] = [];

    cleanup1.mockImplementation(() => cleanupOrder.push(1));
    cleanup2.mockImplementation(() => cleanupOrder.push(2));

    function* generatorInit() {
      yield cleanup1;
      yield cleanup2;
      return { test: true };
    }

    initializer.registerExtension({
      id: "ext.cleanup-test",
      init: generatorInit,
    });

    initializer.setupExtensionContext(context);

    expect(cleanup1).not.toHaveBeenCalled();
    expect(cleanup2).not.toHaveBeenCalled();

    initializer.unregisterExtension("ext.cleanup-test");

    expect(cleanup1).toHaveBeenCalledTimes(1);
    expect(cleanup2).toHaveBeenCalledTimes(1);
    expect(cleanupOrder).toEqual([1, 2]);
  });

  it("unregisterExtension() clears extension exports", () => {
    initializer.registerExtension({
      id: "ext.exports-clear",
      init: () => ({ exportedValue: 42 }),
    });

    initializer.setupExtensionContext(context);

    expect(
      initializer.getExtensionExports<{ exportedValue: number }>(
        "ext.exports-clear"
      )
    ).toEqual({ exportedValue: 42 });

    initializer.unregisterExtension("ext.exports-clear");

    expect(
      initializer.getExtensionExports<{ exportedValue: number }>(
        "ext.exports-clear"
      )
    ).toBeNull();
  });

  it("unregisterExtension() allows re-registration of the same extension ID", () => {
    const init1 = jest.fn(() => ({ version: 1 }));

    initializer.registerExtension({
      id: "ext.re-register",
      init: init1,
    });

    initializer.setupExtensionContext(context);

    expect(init1).toHaveBeenCalledTimes(1);

    initializer.unregisterExtension("ext.re-register");

    const init2 = jest.fn(() => ({ version: 2 }));

    initializer.registerExtension({
      id: "ext.re-register",
      init: init2,
    });

    expect(init2).toHaveBeenCalledTimes(1);
    expect(
      initializer.getExtensionExports<{ version: number }>("ext.re-register")
    ).toEqual({ version: 2 });
  });
});

describe("createExtensionManager", () => {
  let installPackage: jest.Mock;
  let shoutSpy: jest.Mock;

  beforeEach(() => {
    installPackage = jest.fn(async () => ({ success: true }));
    shoutSpy = jest.fn();

    (globalThis as any).os = {
      ...(globalThis as any).os,
      installPackage,
    };
    (globalThis as any).shout = shoutSpy;
    (globalThis as any).thisBot = {
      tags: {
        availableExtensions: null,
      },
    };
  });

  it("loadExtensionSet() installs dependencies before dependents", async () => {
    const manager = createExtensionManager();
    const set: ExtensionSet = {
      id: "set.dependencies",
      recordName: "record",
      extensions: [
        {
          recordName: "record",
          address: "pkg://dependent",
          meta: {
            id: "ext.dependent",
            titles: { en: "Dependent" },
            descriptions: { en: "Dependent extension" },
            dependencies: ["ext.dependency"],
          },
        },
        {
          recordName: "record",
          address: "pkg://dependency",
          meta: {
            id: "ext.dependency",
            titles: { en: "Dependency" },
            descriptions: { en: "Dependency extension" },
          },
        },
      ],
    };

    await manager.loadExtensionSet(set);

    const installedIds = installPackage.mock.calls.map((call) => call[1]);
    expect(installedIds).toEqual(["pkg://dependency", "pkg://dependent"]);
  });

  it("loadExtension() installs an unregistered dependency from loaded extension sets", async () => {
    const manager = createExtensionManager();

    await manager.loadExtensionSet({
      id: "set.catalog",
      recordName: "record",
      extensions: [
        {
          recordName: "record",
          address: "pkg://catalog-dependency",
          meta: {
            id: "ext.catalog-dependency",
            titles: { en: "Catalog Dependency" },
            descriptions: { en: "Catalog Dependency extension" },
          },
        },
      ],
    });

    installPackage.mockClear();

    const loaded = await manager.loadExtension({
      recordName: "record",
      address: "pkg://catalog-dependent",
      meta: {
        id: "ext.catalog-dependent",
        titles: { en: "Catalog Dependent" },
        descriptions: { en: "Catalog Dependent extension" },
        dependencies: ["ext.catalog-dependency"],
      },
    });

    expect(loaded).toBe(true);
    const installedIds = installPackage.mock.calls.map((call) => call[1]);
    expect(installedIds).toEqual(["pkg://catalog-dependent"]);
  });

  it("loadExtension() returns false when dependency is missing from registry and loaded sets", async () => {
    const manager = createExtensionManager();

    const loaded = await manager.loadExtension({
      recordName: "record",
      address: "pkg://missing-dependent",
      meta: {
        id: "ext.missing-dependent",
        titles: { en: "Missing Dependent" },
        descriptions: { en: "Missing Dependent extension" },
        dependencies: ["ext.missing-dependency"],
      },
    });

    expect(loaded).toBe(false);
    expect(installPackage).not.toHaveBeenCalled();
  });

  it("loadExtension() does not install an already registered dependency", async () => {
    const manager = createExtensionManager();
    const unregisterDependency = registerExtension({
      id: "ext.registered-dependency",
      init: () => ({}),
    });

    try {
      const loaded = await manager.loadExtension({
        recordName: "record",
        address: "pkg://registered-dependent",
        meta: {
          id: "ext.registered-dependent",
          titles: { en: "Registered Dependent" },
          descriptions: { en: "Registered Dependent extension" },
          dependencies: ["ext.registered-dependency"],
        },
      });

      expect(loaded).toBe(true);
      const installedIds = installPackage.mock.calls.map((call) => call[1]);
      expect(installedIds).toEqual(["pkg://registered-dependent"]);
    } finally {
      unregisterDependency();
    }
  });

  it("loadExtensionSet() avoids reinstalling extensions that are already installed", async () => {
    const manager = createExtensionManager();
    const set: ExtensionSet = {
      id: "set.reinstall",
      recordName: "record",
      extensions: [
        {
          recordName: "record",
          address: "pkg://single",
          meta: {
            id: "ext.single",
            titles: { en: "Single" },
            descriptions: { en: "Single extension" },
          },
        },
      ],
    };

    await manager.loadExtensionSet(set);
    await manager.loadExtensionSet(set);

    expect(installPackage).toHaveBeenCalledTimes(1);
  });

  it("getExtensions() lists known extensions from loaded sets even when not installed", async () => {
    const manager = createExtensionManager();
    const set: ExtensionSet = {
      id: "set.known-only",
      recordName: "record",
      extensions: [
        {
          recordName: "record",
          address: "pkg://known-only",
          meta: {
            id: "ext.known-only",
            titles: { en: "Known Only" },
            descriptions: { en: "Known-only extension" },
          },
        },
      ],
    };

    await manager.loadExtensionSet(set, () => false);

    expect(manager.getExtensions()).toEqual([
      {
        extension: set.extensions[0],
        extensionSet: set,
        registration: null,
        installed: false,
        pendingInstallation: false,
      },
    ]);
    expect(installPackage).not.toHaveBeenCalled();
  });

  it("getExtensions() marks direct extensions as known without an owning set", async () => {
    const manager = createExtensionManager();
    const extension = {
      recordName: "record",
      address: "pkg://direct",
      meta: {
        id: "ext.direct",
        titles: { en: "Direct" },
        descriptions: { en: "Direct extension" },
      },
    };

    const loaded = await manager.loadExtension(extension);

    expect(loaded).toBe(true);
    expect(manager.getExtensions()).toEqual([
      {
        extension,
        extensionSet: null,
        installed: true,
        pendingInstallation: false,
        registration: null,
      },
    ]);
  });

  it("getExtensions() reports pending installation state", async () => {
    const manager = createExtensionManager();
    let resolveInstall: ((result: { success: boolean }) => void) | null = null;

    installPackage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInstall = resolve as (result: { success: boolean }) => void;
        })
    );

    const extension = {
      recordName: "record",
      address: "pkg://slow",
      meta: {
        id: "ext.slow",
        titles: { en: "Slow" },
        descriptions: { en: "Slow extension" },
      },
    };

    const installationPromise = manager.loadExtension(extension);
    await Promise.resolve();

    expect(manager.getExtensions()).toEqual([
      {
        extension,
        extensionSet: null,
        installed: false,
        pendingInstallation: true,
        registration: null,
      },
    ]);

    expect(resolveInstall).not.toBeNull();
    resolveInstall!({ success: true });

    await installationPromise;

    expect(manager.getExtensions()).toEqual([
      {
        extension,
        extensionSet: null,
        installed: true,
        pendingInstallation: false,
        registration: null,
      },
    ]);
  });

  it("getExtensions() returns the union of registered extensions and extension packages", async () => {
    const manager = createExtensionManager();
    const packageOnlyExtension = {
      recordName: "record",
      address: "pkg://package-only",
      meta: {
        id: "ext.package-only",
        titles: { en: "Package Only" },
        descriptions: { en: "Package-only extension" },
      },
    };

    const unregisterRegisteredOnly = registerExtension({
      id: "ext.registered-only",
      init: () => ({}),
    });

    try {
      await manager.loadExtensionSet(
        {
          id: "set.union",
          recordName: "record",
          extensions: [packageOnlyExtension],
        },
        () => false
      );

      const extensions = manager.getExtensions();
      const packageOnly = extensions.find(
        (item) =>
          item.registration === null &&
          item.extension?.meta.id === "ext.package-only"
      );
      const registeredOnly = extensions.find(
        (item) => item.registration?.id === "ext.registered-only"
      );

      expect(packageOnly).toEqual({
        extension: packageOnlyExtension,
        extensionSet: {
          id: "set.union",
          recordName: "record",
          extensions: [packageOnlyExtension],
        },
        registration: null,
        installed: false,
        pendingInstallation: false,
      });
      expect(registeredOnly).toEqual(
        expect.objectContaining({
          extension: null,
          extensionSet: null,
          registration: expect.objectContaining({ id: "ext.registered-only" }),
          installed: true,
          pendingInstallation: false,
        })
      );
    } finally {
      unregisterRegisteredOnly();
    }
  });
});
