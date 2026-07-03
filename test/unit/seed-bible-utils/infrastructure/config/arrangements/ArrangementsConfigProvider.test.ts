import { ArrangementsConfigProvider } from "../../../../../../packages/seed-bible-utils/infrastructure/config/arrangements/ArrangementsConfigProvider";
import { staticArrangements } from "../../../../../../packages/seed-bible-utils/infrastructure/config/arrangements/staticArrangements";
import { SectionNames } from "../../../../../../packages/seed-bible-utils/infrastructure/config/arrangements/sectionNames";

// ─── factories ────────────────────────────────────────────────────────────────

const makeDomainArrangement = (name = "mapped"): any => ({
  name,
  testaments: [],
});

const makeAdapterPort = (overrides: any = {}) => ({
  toDomain: vi
    .fn()
    .mockImplementation((config: any) => makeDomainArrangement(config.name)),
  ...overrides,
});

const makeProvider = (adapterPort = makeAdapterPort()) =>
  new ArrangementsConfigProvider(adapterPort);

// ─── getStaticArrangements ────────────────────────────────────────────────────

describe("getStaticArrangements", () => {
  it("returns an array", () => {
    expect(Array.isArray(makeProvider().getStaticArrangements())).toBe(true);
  });

  it("returns one entry per static arrangement", () => {
    expect(makeProvider().getStaticArrangements()).toHaveLength(
      staticArrangements.length
    );
  });

  it("calls toDomain once for each static arrangement", () => {
    const adapterPort = makeAdapterPort();
    makeProvider(adapterPort).getStaticArrangements();
    expect(adapterPort.toDomain).toHaveBeenCalledTimes(
      staticArrangements.length
    );
  });

  it("passes each raw static arrangement to toDomain", () => {
    const adapterPort = makeAdapterPort();
    makeProvider(adapterPort).getStaticArrangements();
    for (const arrangement of staticArrangements) {
      expect(adapterPort.toDomain).toHaveBeenCalledWith(arrangement);
    }
  });

  it("returns the values produced by toDomain — not the raw configs", () => {
    const domainResult = makeDomainArrangement("custom");
    const adapterPort = makeAdapterPort({
      toDomain: vi.fn().mockReturnValue(domainResult),
    });
    const results = makeProvider(adapterPort).getStaticArrangements();
    expect(results.every((r: any) => r === domainResult)).toBe(true);
  });

  it("calls toDomain on every invocation — result is not cached", () => {
    const adapterPort = makeAdapterPort();
    const provider = makeProvider(adapterPort);
    provider.getStaticArrangements();
    provider.getStaticArrangements();
    expect(adapterPort.toDomain).toHaveBeenCalledTimes(
      staticArrangements.length * 2
    );
  });
});

// ─── getRawStaticArrangements ─────────────────────────────────────────────────

describe("getRawStaticArrangements", () => {
  it("returns the staticArrangements array directly", () => {
    expect(makeProvider().getRawStaticArrangements()).toBe(staticArrangements);
  });

  it("does not call the adapter port's toDomain", () => {
    const adapterPort = makeAdapterPort();
    makeProvider(adapterPort).getRawStaticArrangements();
    expect(adapterPort.toDomain).not.toHaveBeenCalled();
  });

  it("returns a non-empty array", () => {
    expect(makeProvider().getRawStaticArrangements().length).toBeGreaterThan(0);
  });

  it("returns the same reference on successive calls", () => {
    const provider = makeProvider();
    expect(provider.getRawStaticArrangements()).toBe(
      provider.getRawStaticArrangements()
    );
  });
});

// ─── getSectionName ───────────────────────────────────────────────────────────

describe("getSectionName", () => {
  it("returns the exact value from SectionNames for every key", () => {
    const provider = makeProvider();
    for (const key of Object.keys(SectionNames) as Array<
      keyof typeof SectionNames
    >) {
      expect(provider.getSectionName(key)).toBe(SectionNames[key]);
    }
  });

  it("returns 'Apocalypse' for the Apocalypse key", () => {
    expect(makeProvider().getSectionName("Apocalypse")).toBe("Apocalypse");
  });

  it("returns 'Letters' for the Letters key", () => {
    expect(makeProvider().getSectionName("Letters")).toBe("Letters");
  });

  it("returns 'History' for the History key", () => {
    expect(makeProvider().getSectionName("History")).toBe("History");
  });

  it("returns 'Gospels' for the Gospels key", () => {
    expect(makeProvider().getSectionName("Gospels")).toBe("Gospels");
  });

  it("returns 'Prophets' for the Prophets key", () => {
    expect(makeProvider().getSectionName("Prophets")).toBe("Prophets");
  });

  it("returns 'Wisdom' for the Wisdom key", () => {
    expect(makeProvider().getSectionName("Wisdom")).toBe("Wisdom");
  });

  it("returns 'Law' for the Law key", () => {
    expect(makeProvider().getSectionName("Law")).toBe("Law");
  });

  it("returns 'Writings' for the Writings key", () => {
    expect(makeProvider().getSectionName("Writings")).toBe("Writings");
  });

  it("returns 'Torah' for the Torah key", () => {
    expect(makeProvider().getSectionName("Torah")).toBe("Torah");
  });

  it("returns 'Chronological NT' for the ChronologicalNT key", () => {
    expect(makeProvider().getSectionName("ChronologicalNT")).toBe(
      "Chronological NT"
    );
  });

  it("returns 'Chronological OT' for the ChronologicalOT key", () => {
    expect(makeProvider().getSectionName("ChronologicalOT")).toBe(
      "Chronological OT"
    );
  });

  it("covers all keys defined in SectionNames", () => {
    const provider = makeProvider();
    const keys = Object.keys(SectionNames) as Array<keyof typeof SectionNames>;
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(provider.getSectionName(key)).toBeDefined();
    }
  });
});
