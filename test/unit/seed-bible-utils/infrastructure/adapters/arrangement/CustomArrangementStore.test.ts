import { CustomArrangementStore } from "../../../../../../packages/seed-bible-utils/infrastructure/adapters/arrangement/CustomArrangementStore";
import type { ArrangementInfoConfig } from "../../../../../../packages/seed-bible-utils/infrastructure/models/arrangement";
import type { Mock } from "vitest";
import type { ArrangementInfo } from "../../../../../../packages/seed-bible-utils/domain/models/arrangement";

// ─── factories ────────────────────────────────────────────────────────────────

const makeConfig = (name = "Standard"): ArrangementInfoConfig => ({
  name,
  testaments: [],
});

const makeDomainArrangement = (name = "Standard"): ArrangementInfo => ({
  name,
  testaments: [],
});

const makeAdapterPort = (
  overrides: Partial<{ toDomain: Mock }> = {}
): { toDomain: Mock } => ({
  toDomain: vi
    .fn()
    .mockImplementation((config: ArrangementInfoConfig) =>
      makeDomainArrangement(config.name)
    ),
  ...overrides,
});

const makeStore = (
  initialArrangements?: ArrangementInfoConfig[],
  adapterPort = makeAdapterPort()
) =>
  new CustomArrangementStore({
    initialArrangements,
    arrangementAdapter: adapterPort as any,
  });

// ─── constructor ──────────────────────────────────────────────────────────────

describe("constructor", () => {
  it("creates an empty store when initialArrangements is not provided", () => {
    expect(makeStore().getRawArrangements()).toHaveLength(0);
  });

  it("creates an empty store when initialArrangements is an empty array", () => {
    expect(makeStore([]).getRawArrangements()).toHaveLength(0);
  });

  it("pre-loads arrangements from initialArrangements", () => {
    const store = makeStore([makeConfig("Alpha"), makeConfig("Beta")]);
    expect(store.getRawArrangements()).toHaveLength(2);
  });

  it("keys initial arrangements by name — duplicate names are deduplicated", () => {
    const store = makeStore([makeConfig("Same"), makeConfig("Same")]);
    expect(store.getRawArrangements()).toHaveLength(1);
  });

  it("stores the last duplicate when initial names collide (Map.set semantics)", () => {
    const first = { ...makeConfig("Dup"), testaments: [] };
    const second = { ...makeConfig("Dup"), testaments: [] };
    const store = makeStore([first, second]);
    expect(store.getRawArrangements()[0]).toBe(second);
  });
});

// ─── tryAddArrangement ────────────────────────────────────────────────────────

describe("tryAddArrangement", () => {
  it("returns true when the arrangement name is new", () => {
    expect(makeStore().tryAddArrangement(makeConfig("New") as any)).toBe(true);
  });

  it("adds the arrangement so it appears in getRawArrangements", () => {
    const store = makeStore();
    const config = makeConfig("Custom");
    store.tryAddArrangement(config as any);
    expect(store.getRawArrangements()).toContain(config);
  });

  it("returns false when an arrangement with the same name already exists", () => {
    const store = makeStore([makeConfig("Existing")]);
    expect(store.tryAddArrangement(makeConfig("Existing") as any)).toBe(false);
  });

  it("does not overwrite the existing entry when returning false", () => {
    const original = makeConfig("Dup");
    const store = makeStore([original]);
    const duplicate = makeConfig("Dup");
    store.tryAddArrangement(duplicate as any);
    expect(store.getRawArrangements()[0]).toBe(original);
  });

  it("can add multiple arrangements with distinct names", () => {
    const store = makeStore();
    store.tryAddArrangement(makeConfig("A") as any);
    store.tryAddArrangement(makeConfig("B") as any);
    store.tryAddArrangement(makeConfig("C") as any);
    expect(store.getRawArrangements()).toHaveLength(3);
  });

  it("allows re-adding an arrangement after it has been removed", () => {
    const config = makeConfig("Removed");
    const store = makeStore([config]);
    store.tryRemoveArrangement(config as any);
    expect(store.tryAddArrangement(config as any)).toBe(true);
  });
});

// ─── tryRemoveArrangement ─────────────────────────────────────────────────────

describe("tryRemoveArrangement", () => {
  it("returns true when the arrangement exists", () => {
    const config = makeConfig("ToRemove");
    const store = makeStore([config]);
    expect(store.tryRemoveArrangement(config as any)).toBe(true);
  });

  it("removes the arrangement so it no longer appears in getRawArrangements", () => {
    const config = makeConfig("ToRemove");
    const store = makeStore([config]);
    store.tryRemoveArrangement(config as any);
    expect(store.getRawArrangements()).not.toContain(config);
  });

  it("returns false when the arrangement name does not exist", () => {
    expect(makeStore().tryRemoveArrangement(makeConfig("Ghost") as any)).toBe(
      false
    );
  });

  it("matches by name — not by object reference", () => {
    const store = makeStore([makeConfig("Named")]);
    const differentRef = makeConfig("Named");
    expect(store.tryRemoveArrangement(differentRef as any)).toBe(true);
  });

  it("does not affect other arrangements when removing one", () => {
    const keep = makeConfig("Keep");
    const remove = makeConfig("Remove");
    const store = makeStore([keep, remove]);
    store.tryRemoveArrangement(remove as any);
    expect(store.getRawArrangements()).toContain(keep);
    expect(store.getRawArrangements()).toHaveLength(1);
  });

  it("returns false on a second removal attempt after the first succeeds", () => {
    const config = makeConfig("Once");
    const store = makeStore([config]);
    store.tryRemoveArrangement(config as any);
    expect(store.tryRemoveArrangement(config as any)).toBe(false);
  });
});

// ─── getArrangements ──────────────────────────────────────────────────────────

describe("getArrangements", () => {
  it("returns an empty array when the store has no arrangements", () => {
    expect(makeStore().getArrangements()).toEqual([]);
  });

  it("calls toDomain on the adapter for each stored config", () => {
    const adapterPort = makeAdapterPort();
    const store = makeStore([makeConfig("A"), makeConfig("B")], adapterPort);
    store.getArrangements();
    expect(adapterPort.toDomain).toHaveBeenCalledTimes(2);
  });

  it("passes each raw config to toDomain", () => {
    const config = makeConfig("MyBible");
    const adapterPort = makeAdapterPort();
    const store = makeStore([config], adapterPort);
    store.getArrangements();
    expect(adapterPort.toDomain).toHaveBeenCalledWith(config);
  });

  it("returns the values produced by toDomain — not the raw configs", () => {
    const domainArrangement = makeDomainArrangement("Mapped");
    const adapterPort = makeAdapterPort({
      toDomain: vi.fn().mockReturnValue(domainArrangement),
    });
    const store = makeStore([makeConfig("MyBible")], adapterPort);
    expect(store.getArrangements()[0]).toBe(domainArrangement);
  });

  it("returns one entry per stored arrangement", () => {
    const store = makeStore([
      makeConfig("A"),
      makeConfig("B"),
      makeConfig("C"),
    ]);
    expect(store.getArrangements()).toHaveLength(3);
  });

  it("calls toDomain on every call — result is not cached", () => {
    const adapterPort = makeAdapterPort();
    const store = makeStore([makeConfig("A")], adapterPort);
    store.getArrangements();
    store.getArrangements();
    expect(adapterPort.toDomain).toHaveBeenCalledTimes(2);
  });

  it("reflects arrangements added after construction", () => {
    const store = makeStore();
    store.tryAddArrangement(makeConfig("Late") as any);
    expect(store.getArrangements()).toHaveLength(1);
  });

  it("does not include arrangements that were removed", () => {
    const config = makeConfig("Removed");
    const store = makeStore([config]);
    store.tryRemoveArrangement(config as any);
    expect(store.getArrangements()).toHaveLength(0);
  });
});

// ─── getRawArrangements ───────────────────────────────────────────────────────

describe("getRawArrangements", () => {
  it("returns an empty array when the store has no arrangements", () => {
    expect(makeStore().getRawArrangements()).toEqual([]);
  });

  it("returns the original config objects — not domain-mapped values", () => {
    const config = makeConfig("Raw");
    const adapterPort = makeAdapterPort();
    const store = makeStore([config], adapterPort);
    expect(store.getRawArrangements()[0]).toBe(config);
    expect(adapterPort.toDomain).not.toHaveBeenCalled();
  });

  it("does not call the adapter port", () => {
    const adapterPort = makeAdapterPort();
    const store = makeStore([makeConfig("A")], adapterPort);
    store.getRawArrangements();
    expect(adapterPort.toDomain).not.toHaveBeenCalled();
  });

  it("returns all stored configs", () => {
    const a = makeConfig("A");
    const b = makeConfig("B");
    const store = makeStore([a, b]);
    const raw = store.getRawArrangements();
    expect(raw).toContain(a);
    expect(raw).toContain(b);
  });

  it("reflects additions made after construction", () => {
    const store = makeStore();
    const config = makeConfig("Added");
    store.tryAddArrangement(config as any);
    expect(store.getRawArrangements()).toContain(config);
  });

  it("does not include removed arrangements", () => {
    const config = makeConfig("Gone");
    const store = makeStore([config]);
    store.tryRemoveArrangement(config as any);
    expect(store.getRawArrangements()).not.toContain(config);
  });

  it("returns a snapshot array — mutating it does not affect internal state", () => {
    const store = makeStore([makeConfig("A"), makeConfig("B")]);
    const snapshot = store.getRawArrangements() as ArrangementInfoConfig[];
    snapshot.splice(0);
    expect(store.getRawArrangements()).toHaveLength(2);
  });
});
