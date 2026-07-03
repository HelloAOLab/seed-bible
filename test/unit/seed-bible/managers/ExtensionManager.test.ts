import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { signal } from "@preact/signals";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", () => ({
  addTranslations: vi.fn(),
}));

import {
  createExtensionManager,
  ExtensionInitalizer,
  registerExtension,
  type ExtensionSet,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { Mock } from "vitest";

/**
 * Builds a minimal LoginManager stub backed by signals, exposing just the
 * surface the ExtensionManager touches: `userId`, `profile`, and
 * `updateProfile` (which merges into the profile signal like the real one).
 * Defaults to logged out (userId null) so persistence falls back to local
 * storage only.
 */
function createTestLogin(initial?: {
  userId?: string | null;
  profile?: UserProfile | null;
}): LoginManager {
  const userId = signal<string | null>(initial?.userId ?? null);
  const profile = signal<UserProfile | null>(initial?.profile ?? null);
  const updateProfile = (newData: Partial<UserProfile>) => {
    profile.value = {
      ...(profile.value ?? { name: "" }),
      ...newData,
    } as UserProfile;
  };
  return { userId, profile, updateProfile } as unknown as LoginManager;
}

describe("ExtensionInitalizer", () => {
  let initializer: ExtensionInitalizer;
  let context: SeedBibleState;
  let errorSpy: Mock;

  beforeEach(() => {
    initializer = new ExtensionInitalizer();
    context = {} as SeedBibleState;
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("initializes extensions only once", () => {
    const init = vi.fn(() => ({}));

    initializer.registerExtension({
      id: "ext.single-init",
      init,
    });

    initializer.setupExtensionContext(context);
    initializer.setupExtensionContext(context);

    expect(init).toHaveBeenCalledTimes(1);
  });

  it("supports registering extensions before context setup", () => {
    const init = vi.fn(() => ({}));

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
    const init = vi.fn(() => ({}));

    initializer.setupExtensionContext(context);

    initializer.registerExtension({
      id: "ext.after-context",
      init,
    });

    expect(init).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledWith(context, {});
  });

  it("supports declaring extension dependencies", () => {
    const initA = vi.fn(() => ({ value: "A" }));
    const initB = vi.fn(() => ({ value: "B" }));

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

    const initB = vi.fn(
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
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();

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
    const initA = vi.fn(() => ({}));
    const initB = vi.fn(() => ({}));

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
    const init = vi.fn(() => ({}));

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
    const cleanup1 = vi.fn();
    const cleanup2 = vi.fn();
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
    const init1 = vi.fn(() => ({ version: 1 }));

    initializer.registerExtension({
      id: "ext.re-register",
      init: init1,
    });

    initializer.setupExtensionContext(context);

    expect(init1).toHaveBeenCalledTimes(1);

    initializer.unregisterExtension("ext.re-register");

    const init2 = vi.fn(() => ({ version: 2 }));

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
  let addTranslationsMock: Mock;
  let loadedModules: string[];
  let login: LoginManager;

  /**
   * Mocks the ES module that the given extension URL resolves to. The URL is
   * recorded in `loadedModules` when the module is evaluated, which happens
   * when the ExtensionManager dynamically imports the extension.
   */
  function mockExtensionModule(
    url: string,
    moduleFactory?: () => Promise<object> | object
  ) {
    vi.doMock(url, async () => {
      loadedModules.push(url);
      return moduleFactory ? await moduleFactory() : { default: vi.fn() };
    });
  }

  beforeEach(async () => {
    loadedModules = [];
    localStorage.clear();
    login = createTestLogin();
    const { addTranslations } = await vi.importMock<
      typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
    >("@packages/seed-bible/seed-bible/i18n/I18nManager");
    addTranslationsMock = addTranslations as Mock;
    addTranslationsMock.mockReset();
  });

  it("loadExtensionSet() installs dependencies before dependents", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://dependency");
    mockExtensionModule("pkg://dependent");
    const set: ExtensionSet = {
      id: "set.dependencies",
      extensions: [
        {
          url: "pkg://dependent",
          meta: {
            id: "ext.dependent",
            translations: {
              en: {
                title: "Dependent",
                description: "Dependent extension",
              },
            },
            dependencies: ["ext.dependency"],
          },
        },
        {
          url: "pkg://dependency",
          meta: {
            id: "ext.dependency",
            translations: {
              en: {
                title: "Dependent",
                description: "Dependent extension",
              },
            },
          },
        },
      ],
    };

    await manager.loadExtensionSet(set);

    expect(loadedModules).toEqual(["pkg://dependency", "pkg://dependent"]);
  });

  it("loadExtension() installs an unregistered dependency from loaded extension sets", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://catalog-dependency");
    mockExtensionModule("pkg://catalog-dependent");

    await manager.loadExtensionSet({
      id: "set.catalog",
      extensions: [
        {
          url: "pkg://catalog-dependency",
          meta: {
            id: "ext.catalog-dependency",
            translations: {
              en: {
                title: "Catalog Dependent",
                description: "Catalog Dependent extension",
              },
            },
          },
        },
      ],
    });

    loadedModules.length = 0;

    const loaded = await manager.loadExtension({
      url: "pkg://catalog-dependent",
      meta: {
        id: "ext.catalog-dependent",
        translations: {
          en: {
            title: "Catalog Dependent",
            description: "Catalog Dependent extension",
          },
        },
        dependencies: ["ext.catalog-dependency"],
      },
    });

    expect(loaded).toBe(true);

    expect(loadedModules).toEqual(["pkg://catalog-dependent"]);
  });

  it("loadExtension() returns false when dependency is missing from registry and loaded sets", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://missing-dependent");

    const loaded = await manager.loadExtension({
      url: "pkg://missing-dependent",
      meta: {
        id: "ext.missing-dependent",
        translations: {
          en: {
            title: "Missing Dependent",
            description: "Missing Dependent extension",
          },
        },
        dependencies: ["ext.missing-dependency"],
      },
    });

    expect(loaded).toBe(false);

    expect(loadedModules).toEqual([]);
  });

  it("loadExtension() does not install an already registered dependency", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://registered-dependent");
    const unregisterDependency = registerExtension({
      id: "ext.registered-dependency",
      init: () => ({}),
    });

    try {
      const loaded = await manager.loadExtension({
        url: "pkg://registered-dependent",
        meta: {
          id: "ext.registered-dependent",
          translations: {
            en: {
              title: "Registered Dependent",
              description: "Registered Dependent extension",
            },
          },
          dependencies: ["ext.registered-dependency"],
        },
      });

      expect(loaded).toBe(true);
      expect(loadedModules).toEqual(["pkg://registered-dependent"]);
    } finally {
      unregisterDependency();
    }
  });

  it("loadExtensionSet() avoids reinstalling extensions that are already installed", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://single");
    const set: ExtensionSet = {
      id: "set.reinstall",
      extensions: [
        {
          url: "pkg://single",
          meta: {
            id: "ext.single",
            translations: {
              en: {
                title: "Single",
                description: "Single extension",
              },
            },
          },
        },
      ],
    };

    await manager.loadExtensionSet(set);
    await manager.loadExtensionSet(set);

    expect(loadedModules).toEqual(["pkg://single"]);
  });

  it("loadExtensionSet() adds translations for extensions in the set", async () => {
    const manager = createExtensionManager(login);
    const translationsA = {
      en: {
        title: "Translation A",
        description: "Translation A extension",
      },
    };
    const translationsB = {
      en: {
        title: "Translation B",
        description: "Translation B extension",
      },
    };
    const set: ExtensionSet = {
      id: "set.translations",
      extensions: [
        {
          url: "pkg://translation-a",
          meta: {
            id: "ext.translation-a",
            translations: translationsA,
          },
        },
        {
          url: "pkg://translation-b",
          meta: {
            id: "ext.translation-b",
            translations: translationsB,
          },
        },
      ],
    };

    await manager.loadExtensionSet(set, () => false);

    expect(addTranslationsMock).toHaveBeenCalledWith(
      "ext.translation-a",
      translationsA
    );
    expect(addTranslationsMock).toHaveBeenCalledWith(
      "ext.translation-b",
      translationsB
    );
  });

  it("loadDefaultExtensions() auto-installs extensions when the matching query param is true", async () => {
    const defaultExtensions = {
      id: "set.autoinstall",
      extensions: [
        {
          url: "pkg://autoinstall",
          meta: {
            id: "ext.autoinstall",
            translations: {
              en: {
                title: "Autoinstall",
                description: "Autoinstall extension",
              },
            },
          },
        },
      ],
    };

    const manager = createExtensionManager(login, { defaultExtensions });
    mockExtensionModule("pkg://autoinstall");

    window.history.replaceState(null, "", "/?autoinstall-ext.autoinstall=true");
    try {
      await manager.loadDefaultExtensions();
    } finally {
      window.history.replaceState(null, "", "/");
    }

    expect(loadedModules).toEqual(["pkg://autoinstall"]);
  });

  it("getExtensions() lists known extensions from loaded sets even when not installed", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://known-only");
    const set: ExtensionSet = {
      id: "set.known-only",
      extensions: [
        {
          // recordName: "record",
          url: "pkg://known-only",
          meta: {
            id: "ext.known-only",
            translations: {
              en: {
                title: "Known-only",
                description: "Known-only extension",
              },
            },
          },
        },
      ],
    };

    await manager.loadExtensionSet(set, () => false);

    expect(manager.getExtensions()).toEqual([
      {
        id: "ext.known-only",
        extension: set.extensions[0],
        extensionSet: set,
        registration: null,
        installed: false,
        pendingInstallation: false,
      },
    ]);

    expect(loadedModules).toEqual([]);
  });

  it("getExtensions() marks direct extensions as known without an owning set", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://direct");
    const extension = {
      // recordName: "record",
      url: "pkg://direct",
      meta: {
        id: "ext.direct",
        translations: {
          en: {
            title: "Direct",
            description: "Direct extension",
          },
        },
      },
    };

    const loaded = await manager.loadExtension(extension);

    expect(loaded).toBe(true);
    expect(manager.getExtensions()).toEqual([
      {
        id: "ext.direct",
        extension,
        extensionSet: null,
        installed: true,
        pendingInstallation: false,
        registration: null,
      },
    ]);
  });

  it("getExtensions() reports pending installation state", async () => {
    const manager = createExtensionManager(login);

    let resolveInstall: () => void = () => undefined;
    const installGate = new Promise<void>((resolve) => {
      resolveInstall = resolve;
    });

    mockExtensionModule("pkg://slow", async () => {
      await installGate;
      return { default: vi.fn() };
    });

    const extension = {
      // recordName: "record",
      url: "pkg://slow",
      meta: {
        id: "ext.slow",
        translations: {
          en: {
            title: "Slow",
            description: "Slow extension",
          },
        },
      },
    };

    const installationPromise = manager.loadExtension(extension);
    await Promise.resolve();

    expect(manager.getExtensions()).toEqual([
      {
        id: "ext.slow",
        extension,
        extensionSet: null,
        installed: false,
        pendingInstallation: true,
        registration: null,
      },
    ]);

    resolveInstall();

    await installationPromise;

    expect(manager.getExtensions()).toEqual([
      {
        id: "ext.slow",
        extension,
        extensionSet: null,
        installed: true,
        pendingInstallation: false,
        registration: null,
      },
    ]);
  });

  it("getExtensions() returns the union of registered extensions and extension packages", async () => {
    const manager = createExtensionManager(login);
    const packageOnlyExtension = {
      // recordName: "record",
      url: "pkg://package-only",
      meta: {
        id: "ext.package-only",
        translations: {
          en: {
            title: "Package Only",
            description: "Package Only extension",
          },
        },
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
        id: "ext.package-only",
        extension: packageOnlyExtension,
        extensionSet: {
          id: "set.union",
          extensions: [packageOnlyExtension],
        },
        registration: null,
        installed: false,
        pendingInstallation: false,
      });
      expect(registeredOnly).toEqual(
        expect.objectContaining({
          id: "ext.registered-only",
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

  it("unloadExtension() marks the extension as not installed", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://unload-me");
    const extension = {
      url: "pkg://unload-me",
      meta: {
        id: "ext.unload-me",
        translations: {
          en: {
            title: "Unload me",
            description: "Extension to unload",
          },
        },
      },
    };

    await manager.loadExtension(extension);

    expect(manager.getExtensions()[0]?.installed).toBe(true);

    manager.unloadExtension("ext.unload-me");

    expect(manager.getExtensions()[0]?.installed).toBe(false);
  });

  it("unloadExtension() unregisters the extension", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://unload-reg");
    const extension = {
      url: "pkg://unload-reg",
      meta: {
        id: "ext.unload-reg",
        translations: {
          en: {
            title: "Unload Reg",
            description: "Unload Reg extension",
          },
        },
      },
    };

    await manager.loadExtension(extension);
    registerExtension({ id: "ext.unload-reg", init: () => ({}) });

    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered("ext.unload-reg")
    ).toBe(true);

    manager.unloadExtension("ext.unload-reg");

    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered("ext.unload-reg")
    ).toBe(false);
  });

  it("unloadExtension() keeps the extension in the known list", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://unload-known");
    const extension = {
      // recordName: "record",
      url: "pkg://unload-known",
      meta: {
        id: "ext.unload-known",
        translations: {
          en: {
            title: "Unload Known",
            description: "Extension known list test",
          },
        },
      },
    };

    await manager.loadExtension(extension);

    manager.unloadExtension("ext.unload-known");

    const known = manager.getExtensions();
    expect(known).toHaveLength(1);
    expect(known[0]?.extension?.meta.id).toBe("ext.unload-known");
    expect(known[0]?.installed).toBe(false);
  });

  it("loadExtension() re-invokes a url-based module's default export so an extension can be reinstalled after being unloaded", async () => {
    const manager = createExtensionManager(login);
    const defaultFn = vi.fn(() => {
      registerExtension({ id: "ext.reinstall", init: () => ({}) });
    });
    mockExtensionModule("pkg://reinstall", () => ({ default: defaultFn }));

    const extension = {
      url: "pkg://reinstall",
      meta: {
        id: "ext.reinstall",
        translations: {
          en: { title: "Reinstall", description: "Reinstall extension" },
        },
      },
    };

    expect(await manager.loadExtension(extension)).toBe(true);
    expect(defaultFn).toHaveBeenCalledTimes(1);
    expect(loadedModules).toEqual(["pkg://reinstall"]);
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered("ext.reinstall")
    ).toBe(true);

    manager.unloadExtension("ext.reinstall");
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered("ext.reinstall")
    ).toBe(false);

    expect(await manager.loadExtension(extension)).toBe(true);
    // Called a second time even though the module body did NOT re-evaluate
    // (loadedModules is still length 1) - this is the fix: ExtensionManager
    // re-invokes the cached default export explicitly.
    expect(defaultFn).toHaveBeenCalledTimes(2);
    expect(loadedModules).toEqual(["pkg://reinstall"]);
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered("ext.reinstall")
    ).toBe(true);
  });

  it("loadExtension() re-invokes an ImportExtension's default export so an extension can be reinstalled after being unloaded", async () => {
    const manager = createExtensionManager(login);
    const defaultFn = vi.fn(() => {
      registerExtension({ id: "ext.import-reinstall", init: () => ({}) });
    });
    const extension = {
      import: () => Promise.resolve({ default: defaultFn }),
      meta: {
        id: "ext.import-reinstall",
        translations: {
          en: {
            title: "Import Reinstall",
            description: "Import reinstall extension",
          },
        },
      },
    };

    expect(await manager.loadExtension(extension)).toBe(true);
    expect(defaultFn).toHaveBeenCalledTimes(1);
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered(
        "ext.import-reinstall"
      )
    ).toBe(true);

    manager.unloadExtension("ext.import-reinstall");
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered(
        "ext.import-reinstall"
      )
    ).toBe(false);

    expect(await manager.loadExtension(extension)).toBe(true);
    expect(defaultFn).toHaveBeenCalledTimes(2);
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered(
        "ext.import-reinstall"
      )
    ).toBe(true);
  });

  it("loadExtension() fails and logs when a url-based module has no default export function", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://no-default", () => ({}));
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const loaded = await manager.loadExtension({
      url: "pkg://no-default",
      meta: {
        id: "ext.no-default",
        translations: { en: { title: "No default", description: "x" } },
      },
    });

    expect(loaded).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered("ext.no-default")
    ).toBe(false);
  });

  it("loadExtension() fails and logs when an ImportExtension module has no default export function", async () => {
    const manager = createExtensionManager(login);
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    const loaded = await manager.loadExtension({
      import: () => Promise.resolve({}),
      meta: {
        id: "ext.import-no-default",
        translations: { en: { title: "No default", description: "x" } },
      },
    });

    expect(loaded).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    expect(
      ExtensionInitalizer.getInstance().isExtensionRegistered(
        "ext.import-no-default"
      )
    ).toBe(false);
  });

  it("getAllExtensionsAsSet() returns undefined and warns when there are no extension packages", () => {
    const manager = createExtensionManager(login);
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    try {
      const result = manager.getAllExtensionsAsSet();

      expect(result).toBeUndefined();
      expect(warnSpy).toHaveBeenCalledWith(
        "No extensions available to download."
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("getAllExtensionsAsSet() returns a sorted extension set with a hash-based id", async () => {
    const manager = createExtensionManager(login);
    const extensionB = {
      url: "pkg://b",
      meta: {
        id: "ext.b",
        translations: {
          en: {
            title: "B",
            description: "B extension",
          },
        },
      },
    };
    const extensionA = {
      url: "pkg://a",
      meta: {
        id: "ext.a",
        translations: {
          en: {
            title: "A",
            description: "A extension",
          },
        },
      },
    };

    const unregisterRegisteredOnly = registerExtension({
      id: "ext.registered-only-set",
      init: () => ({}),
    });

    try {
      await manager.loadExtensionSet(
        {
          id: "set.hash-test",
          extensions: [extensionB, extensionA],
        },
        () => false
      );

      const result = manager.getAllExtensionsAsSet();

      expect(result).toEqual({
        id: expect.stringMatching(/^downloaded-extension-set-[0-9a-f]{8}$/),
        extensions: [extensionA, extensionB],
      });

      // The id is derived from a hash of the contents, so it is stable
      // across calls.
      expect(manager.getAllExtensionsAsSet()?.id).toBe(result?.id);
    } finally {
      unregisterRegisteredOnly();
    }
  });

  it("loadExtension() persists the installed extension ID to local storage", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://persisted");

    await manager.loadExtension({
      url: "pkg://persisted",
      meta: {
        id: "ext.persisted",
        translations: {
          en: { title: "Persisted", description: "Persisted extension" },
        },
      },
    });

    expect(
      JSON.parse(localStorage.getItem("sb-installed-extensions") ?? "[]")
    ).toEqual(["ext.persisted"]);
  });

  it("unloadExtension() removes the extension ID from local storage", async () => {
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://forget");

    await manager.loadExtension({
      url: "pkg://forget",
      meta: {
        id: "ext.forget",
        translations: {
          en: { title: "Forget", description: "Forget extension" },
        },
      },
    });

    manager.unloadExtension("ext.forget");

    expect(
      JSON.parse(localStorage.getItem("sb-installed-extensions") ?? "[]")
    ).toEqual([]);
  });

  it("loadSavedExtensions() re-loads extensions saved in local storage", async () => {
    localStorage.setItem(
      "sb-installed-extensions",
      JSON.stringify(["ext.saved"])
    );

    const defaultExtensions: ExtensionSet = {
      id: "set.saved",
      extensions: [
        {
          url: "pkg://saved",
          meta: {
            id: "ext.saved",
            // Not flagged for autoinstall — only restored because it was saved.
            translations: {
              en: { title: "Saved", description: "Saved extension" },
            },
          },
        },
      ],
    };

    const manager = createExtensionManager(login, { defaultExtensions });
    mockExtensionModule("pkg://saved");

    await manager.loadDefaultExtensions();

    expect(loadedModules).toEqual(["pkg://saved"]);
    expect(manager.getExtensions()[0]?.installed).toBe(true);
  });

  it("loadSavedExtensions() skips saved IDs that are not in any known set", async () => {
    localStorage.setItem(
      "sb-installed-extensions",
      JSON.stringify(["ext.unknown"])
    );
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    const manager = createExtensionManager(login, {
      defaultExtensions: { id: "set.empty", extensions: [] },
    });

    try {
      await manager.loadDefaultExtensions();

      expect(loadedModules).toEqual([]);
      expect(
        warnSpy.mock.calls.some((call) =>
          String(call[0] ?? "").includes("ext.unknown")
        )
      ).toBe(true);
      // The unknown ID is left in storage in case a later build reintroduces it.
      expect(
        JSON.parse(localStorage.getItem("sb-installed-extensions") ?? "[]")
      ).toEqual(["ext.unknown"]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  /** Reads the installed-extension IDs persisted to a login's profile config. */
  function getProfileInstalled(l: LoginManager): unknown {
    const config = l.profile.value?.config as
      | Record<string, unknown>
      | undefined;
    return config?.installedExtensions;
  }

  /** Polls until `check()` is true, or throws after `timeoutMs`. */
  async function waitForCondition(
    check: () => boolean,
    timeoutMs = 1000
  ): Promise<void> {
    const start = Date.now();
    while (!check()) {
      if (Date.now() - start > timeoutMs) {
        throw new Error("waitForCondition timed out");
      }
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  it("loadExtension() writes the installed ID to the profile config when logged in", async () => {
    login = createTestLogin({
      userId: "user-1",
      profile: { name: "Test" } as UserProfile,
    });
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://acct");

    await manager.loadExtension({
      url: "pkg://acct",
      meta: {
        id: "ext.acct",
        translations: {
          en: { title: "Acct", description: "Acct extension" },
        },
      },
    });

    expect(getProfileInstalled(login)).toEqual(["ext.acct"]);
    // Local storage is still written too — both stores stay in sync.
    expect(
      JSON.parse(localStorage.getItem("sb-installed-extensions") ?? "[]")
    ).toEqual(["ext.acct"]);
  });

  it("unloadExtension() removes the ID from the profile config when logged in", async () => {
    login = createTestLogin({
      userId: "user-1",
      profile: { name: "Test" } as UserProfile,
    });
    const manager = createExtensionManager(login);
    mockExtensionModule("pkg://acct-forget");

    await manager.loadExtension({
      url: "pkg://acct-forget",
      meta: {
        id: "ext.acct-forget",
        translations: {
          en: { title: "Acct Forget", description: "Acct Forget extension" },
        },
      },
    });

    expect(getProfileInstalled(login)).toEqual(["ext.acct-forget"]);

    manager.unloadExtension("ext.acct-forget");

    expect(getProfileInstalled(login)).toEqual([]);
  });

  it("installs profile-saved extensions on login and caches them locally", async () => {
    const defaultExtensions: ExtensionSet = {
      id: "set.profile-saved",
      extensions: [
        {
          url: "pkg://profile-saved",
          meta: {
            id: "ext.profile-saved",
            translations: {
              en: { title: "Profile Saved", description: "Profile Saved" },
            },
          },
        },
      ],
    };

    const manager = createExtensionManager(login, { defaultExtensions });
    mockExtensionModule("pkg://profile-saved");

    // Startup: logged out, nothing saved locally — the extension stays known
    // but uninstalled.
    await manager.loadDefaultExtensions();
    expect(loadedModules).toEqual([]);

    // The user logs in with a profile that already lists the extension.
    login.userId.value = "user-1";
    login.profile.value = {
      name: "Test",
      config: { installedExtensions: ["ext.profile-saved"] },
    } as UserProfile;

    await waitForCondition(() => loadedModules.includes("pkg://profile-saved"));

    expect(manager.getExtensions()[0]?.installed).toBe(true);
    // The profile ID is cached into local storage so it persists offline too.
    expect(
      JSON.parse(localStorage.getItem("sb-installed-extensions") ?? "[]")
    ).toEqual(["ext.profile-saved"]);
  });

  it("adopts locally-installed extensions into the profile on login", async () => {
    localStorage.setItem(
      "sb-installed-extensions",
      JSON.stringify(["ext.local-only"])
    );

    const defaultExtensions: ExtensionSet = {
      id: "set.local-only",
      extensions: [
        {
          url: "pkg://local-only",
          meta: {
            id: "ext.local-only",
            translations: {
              en: { title: "Local Only", description: "Local Only" },
            },
          },
        },
      ],
    };

    const manager = createExtensionManager(login, { defaultExtensions });
    mockExtensionModule("pkg://local-only");

    // Startup restores the locally-saved extension while logged out.
    await manager.loadDefaultExtensions();
    expect(loadedModules).toEqual(["pkg://local-only"]);

    // Logging in adopts the local extension into the (initially empty) profile.
    login.userId.value = "user-1";
    login.profile.value = { name: "Test" } as UserProfile;

    await waitForCondition(() => {
      const saved = getProfileInstalled(login);
      return Array.isArray(saved) && saved.includes("ext.local-only");
    });

    expect(getProfileInstalled(login)).toEqual(["ext.local-only"]);
  });
});
