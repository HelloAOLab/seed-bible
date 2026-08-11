import {
  createBibleReadingExtensionManager,
  type ReadingExtensionDefinition,
} from "@packages/seed-bible/seed-bible/managers/BibleReadingExtensionManager";

function makeDefinition(
  id: string,
  overrides: Partial<ReadingExtensionDefinition> = {}
): ReadingExtensionDefinition {
  return {
    id,
    activate: () => ({}),
    ...overrides,
  };
}

describe("createBibleReadingExtensionManager", () => {
  it("registers an extension and exposes it via registeredExtensions", () => {
    const manager = createBibleReadingExtensionManager();
    const definition = makeDefinition("ext-a");

    expect(manager.registeredExtensions.value).toEqual([]);

    manager.registerReadingExtension(definition);

    expect(manager.registeredExtensions.value).toEqual([definition]);
    expect(manager.getReadingExtension("ext-a")).toBe(definition);
  });

  it("returns undefined for unknown extension ids", () => {
    const manager = createBibleReadingExtensionManager();
    expect(manager.getReadingExtension("nope")).toBeUndefined();
  });

  it("replaces a registration when the same id is registered again", () => {
    const manager = createBibleReadingExtensionManager();
    const first = makeDefinition("ext-a");
    const second = makeDefinition("ext-a");

    manager.registerReadingExtension(first);
    manager.registerReadingExtension(second);

    expect(manager.registeredExtensions.value).toEqual([second]);
    expect(manager.getReadingExtension("ext-a")).toBe(second);
  });

  it("unregisters via the returned cleanup function", () => {
    const manager = createBibleReadingExtensionManager();
    const definition = makeDefinition("ext-a");

    const unregister = manager.registerReadingExtension(definition);
    expect(manager.getReadingExtension("ext-a")).toBe(definition);

    unregister();

    expect(manager.registeredExtensions.value).toEqual([]);
    expect(manager.getReadingExtension("ext-a")).toBeUndefined();
  });

  it("keeps multiple distinct extensions registered", () => {
    const manager = createBibleReadingExtensionManager();
    const a = makeDefinition("ext-a");
    const b = makeDefinition("ext-b");

    manager.registerReadingExtension(a);
    manager.registerReadingExtension(b);

    expect(manager.registeredExtensions.value).toEqual([a, b]);
  });

  it("throws when the id is empty or activate is missing", () => {
    const manager = createBibleReadingExtensionManager();

    expect(() =>
      manager.registerReadingExtension(makeDefinition(""))
    ).toThrow();
    expect(() =>
      manager.registerReadingExtension({
        id: "ext-a",
        // @ts-expect-error intentionally invalid
        activate: undefined,
      })
    ).toThrow();
  });
});
