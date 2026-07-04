import type { Mock } from "vitest";
import { ArrangementAdapter } from "../../../../../../packages/seed-bible-utils/infrastructure/adapters/arrangement/ArrangementAdapter";
import type {
  ArrangementInfoConfig,
  SectionInfoConfig,
} from "../../../../../../packages/seed-bible-utils/infrastructure/models/arrangement";
import type { SectionInfoMapper } from "../../../../../../packages/seed-bible-utils/infrastructure/mappers/SectionInfoMapper";
import type { SectionInfo } from "../../../../../../packages/seed-bible-utils/domain/models/arrangement";

// ─── factories ────────────────────────────────────────────────────────────────

const makeSectionConfig = (name = "Pentateuch"): SectionInfoConfig => ({
  name,
  color: "#ff0000",
  books: [],
});

const makeTestamentConfig = (
  name = "Old Testament",
  sections: SectionInfoConfig[] = [makeSectionConfig()]
): any => ({ name, sections });

const makeArrangementConfig = (
  name = "Standard",
  testaments: any[] = [makeTestamentConfig()]
): ArrangementInfoConfig => ({ name, testaments });

const makeSectionInfo = (overrides: Partial<SectionInfo> = {}): SectionInfo =>
  ({
    name: "Pentateuch",
    color: "#ff0000",
    books: [],
    path: { arrangementName: "Standard", testamentIndex: 0, sectionIndex: 0 },
    ...overrides,
  }) as SectionInfo;

const makeMapperPort = (
  toDomainFn: Mock = vi.fn().mockReturnValue(makeSectionInfo())
): SectionInfoMapper =>
  ({ toDomain: toDomainFn }) as unknown as SectionInfoMapper;

const makeAdapter = (mapperPort = makeMapperPort()) => {
  const adapter = new ArrangementAdapter();
  adapter.setSectionInfoMapperPort(mapperPort);
  return adapter;
};

// ─── setSectionInfoMapperPort / guard ─────────────────────────────────────────

describe("setSectionInfoMapperPort", () => {
  it("throws when toDomain is called before the port is set", () => {
    const adapter = new ArrangementAdapter();
    expect(() => adapter.toDomain(makeArrangementConfig())).toThrow(
      "ArrangementAdapter: sectionInfoMapperPort not set. Call setSectionInfoMapperPort before toDomain."
    );
  });

  it("does not throw after the port is set", () => {
    const adapter = makeAdapter();
    expect(() => adapter.toDomain(makeArrangementConfig())).not.toThrow();
  });
});

// ─── toDomain — top-level shape ───────────────────────────────────────────────

describe("toDomain — top-level shape", () => {
  it("preserves the arrangement name from the config", () => {
    const result = makeAdapter().toDomain(makeArrangementConfig("MyBible"));
    expect(result.name).toBe("MyBible");
  });

  it("returns as many testaments as the config has", () => {
    const config = makeArrangementConfig("Standard", [
      makeTestamentConfig("OT"),
      makeTestamentConfig("NT"),
    ]);
    expect(makeAdapter().toDomain(config).testaments).toHaveLength(2);
  });

  it("returns an empty testaments array when the config has none", () => {
    const result = makeAdapter().toDomain(makeArrangementConfig("Empty", []));
    expect(result.testaments).toEqual([]);
  });
});

// ─── toDomain — testament-level shape ────────────────────────────────────────

describe("toDomain — testament-level shape", () => {
  it("preserves the testament name", () => {
    const config = makeArrangementConfig("Standard", [
      makeTestamentConfig("New Testament"),
    ]);
    expect(makeAdapter().toDomain(config).testaments[0]!.name).toBe(
      "New Testament"
    );
  });

  it("preserves an optional testament color", () => {
    const testament = { ...makeTestamentConfig("OT"), color: "#aabbcc" };
    const config = makeArrangementConfig("Standard", [testament]);
    expect((makeAdapter().toDomain(config).testaments[0] as any).color).toBe(
      "#aabbcc"
    );
  });

  it("returns as many sections as the mapper produces for that testament", () => {
    const config = makeArrangementConfig("Standard", [
      makeTestamentConfig("OT", [
        makeSectionConfig("Law"),
        makeSectionConfig("History"),
        makeSectionConfig("Poetry"),
      ]),
    ]);
    const toDomainFn = vi
      .fn()
      .mockReturnValueOnce(makeSectionInfo({ name: "Law" }))
      .mockReturnValueOnce(makeSectionInfo({ name: "History" }))
      .mockReturnValueOnce(makeSectionInfo({ name: "Poetry" }));
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    expect(adapter.toDomain(config).testaments[0]!.sections).toHaveLength(3);
  });

  it("returns an empty sections array when the testament has none", () => {
    const config = makeArrangementConfig("Standard", [
      makeTestamentConfig("NT", []),
    ]);
    expect(makeAdapter().toDomain(config).testaments[0]!.sections).toEqual([]);
  });
});

// ─── toDomain — mapper delegation ────────────────────────────────────────────

describe("toDomain — mapper delegation", () => {
  it("calls toDomain on the mapper for each section", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(
      makeArrangementConfig("Standard", [
        makeTestamentConfig("OT", [
          makeSectionConfig("Law"),
          makeSectionConfig("History"),
        ]),
      ])
    );
    expect(toDomainFn).toHaveBeenCalledTimes(2);
  });

  it("passes the section config as the first argument to the mapper", () => {
    const section = makeSectionConfig("Prophets");
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(
      makeArrangementConfig("Standard", [makeTestamentConfig("OT", [section])])
    );
    expect(toDomainFn).toHaveBeenCalledWith(section, expect.anything());
  });

  it("passes the arrangement name in the path", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(makeArrangementConfig("CustomBible"));
    expect(toDomainFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ arrangementName: "CustomBible" })
    );
  });

  it("passes testamentIndex=0 for the first testament", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(makeArrangementConfig());
    expect(toDomainFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ testamentIndex: 0 })
    );
  });

  it("passes testamentIndex=1 for the second testament", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(
      makeArrangementConfig("Standard", [
        makeTestamentConfig("OT"),
        makeTestamentConfig("NT"),
      ])
    );
    expect(toDomainFn).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ testamentIndex: 1 })
    );
  });

  it("passes sectionIndex=0 for the first section", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(makeArrangementConfig());
    expect(toDomainFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ sectionIndex: 0 })
    );
  });

  it("passes sectionIndex=1 for the second section within a testament", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(
      makeArrangementConfig("Standard", [
        makeTestamentConfig("OT", [
          makeSectionConfig("Law"),
          makeSectionConfig("History"),
        ]),
      ])
    );
    expect(toDomainFn).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ sectionIndex: 1 })
    );
  });

  it("uses the value returned by the mapper as the section — not the original config", () => {
    const domainSection = makeSectionInfo({ name: "MappedSection" });
    const toDomainFn = vi.fn().mockReturnValue(domainSection);
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    const result = adapter.toDomain(makeArrangementConfig());
    expect(result.testaments[0]!.sections[0]).toBe(domainSection);
  });
});

// ─── toDomain — multi-testament / multi-section indices ──────────────────────

describe("toDomain — multi-testament and multi-section index correctness", () => {
  it("assigns correct (testamentIndex, sectionIndex) pairs for 2×2 grid", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(
      makeArrangementConfig("Standard", [
        makeTestamentConfig("OT", [
          makeSectionConfig("Law"),
          makeSectionConfig("History"),
        ]),
        makeTestamentConfig("NT", [
          makeSectionConfig("Gospels"),
          makeSectionConfig("Epistles"),
        ]),
      ])
    );

    expect(toDomainFn).toHaveBeenCalledTimes(4);
    expect(toDomainFn).toHaveBeenNthCalledWith(1, expect.anything(), {
      arrangementName: "Standard",
      testamentIndex: 0,
      sectionIndex: 0,
    });
    expect(toDomainFn).toHaveBeenNthCalledWith(2, expect.anything(), {
      arrangementName: "Standard",
      testamentIndex: 0,
      sectionIndex: 1,
    });
    expect(toDomainFn).toHaveBeenNthCalledWith(3, expect.anything(), {
      arrangementName: "Standard",
      testamentIndex: 1,
      sectionIndex: 0,
    });
    expect(toDomainFn).toHaveBeenNthCalledWith(4, expect.anything(), {
      arrangementName: "Standard",
      testamentIndex: 1,
      sectionIndex: 1,
    });
  });

  it("resets sectionIndex to 0 at the start of each testament", () => {
    const toDomainFn = vi.fn().mockReturnValue(makeSectionInfo());
    const adapter = makeAdapter(makeMapperPort(toDomainFn));
    adapter.toDomain(
      makeArrangementConfig("Standard", [
        makeTestamentConfig("OT", [makeSectionConfig("Law")]),
        makeTestamentConfig("NT", [makeSectionConfig("Gospels")]),
      ])
    );
    // both calls should have sectionIndex=0
    expect(toDomainFn).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({ sectionIndex: 0 })
    );
    expect(toDomainFn).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      expect.objectContaining({ sectionIndex: 0 })
    );
  });
});
