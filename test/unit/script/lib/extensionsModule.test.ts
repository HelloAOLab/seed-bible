import { describe, expect, it } from "vitest";
import {
  generateEntryModuleSource,
  generateLocaleModuleSource,
  listExtensionLanguages,
  parseLocaleModuleId,
  trimMeta,
  RESOLVED_LOCALE_PREFIX,
  type DiscoveredExtension,
} from "../../../../script/lib/extensionsModule";

const apologist: DiscoveredExtension = {
  folder: "apologist-extension",
  meta: {
    id: "ext_Apologist",
    autoinstall: true,
    translations: {
      en: { title: "Apologist", description: "AI for seekers" },
      es: { title: "Apologista", description: "IA para buscadores" },
      // A key beyond title/description, to prove it is not inlined anywhere.
      de: { title: "Apologet", description: "KI", "some-other-key": "nope" },
    },
  },
};

const bonfire: DiscoveredExtension = {
  folder: "bonfire-extension",
  meta: {
    id: "ext_Bonfire",
    dependencies: ["ext_Apologist"],
    translations: {
      en: { title: "Bonfire", description: "Gather round" },
      // No Spanish, and a language no other extension has.
      gn: { title: "Tata", description: "Ñembyaty" },
    },
  },
};

const extensions = [apologist, bonfire];

describe("trimMeta", () => {
  it("keeps only what the boot path needs", () => {
    expect(trimMeta(apologist.meta)).toEqual({
      id: "ext_Apologist",
      // English stays inline as i18next's fallback; every other language is
      // fetched per chunk.
      translations: {
        en: { title: "Apologist", description: "AI for seekers" },
      },
      autoinstall: true,
    });
    expect(trimMeta(bonfire.meta)).toEqual({
      id: "ext_Bonfire",
      translations: {
        en: { title: "Bonfire", description: "Gather round" },
      },
      dependencies: ["ext_Apologist"],
    });
  });

  it("omits dependencies and autoinstall when absent rather than emitting undefined", () => {
    const trimmed = trimMeta({ id: "ext_X", translations: {} });
    expect(Object.keys(trimmed).sort()).toEqual(["id", "translations"]);
  });

  it("degrades to the id when an extension has no English block", () => {
    // Malformed extension.json, but failing the build over it helps nobody.
    expect(trimMeta({ id: "ext_X", translations: {} }).translations).toEqual({
      en: { title: "ext_X", description: "" },
    });
  });
});

describe("listExtensionLanguages", () => {
  it("returns the union across extensions, sorted", () => {
    // Extensions do not all carry the same languages: es is Apologist-only,
    // gn is Bonfire-only.
    expect(listExtensionLanguages(extensions)).toEqual([
      "de",
      "en",
      "es",
      "gn",
    ]);
  });

  it("handles an extension with no translations", () => {
    expect(
      listExtensionLanguages([
        { folder: "x", meta: { id: "ext_X", translations: {} } },
      ])
    ).toEqual([]);
  });
});

describe("generateLocaleModuleSource", () => {
  it("emits every extension's title and description for that language", () => {
    const source = generateLocaleModuleSource(extensions, "en");
    expect(source).toContain('"ext_Apologist"');
    expect(source).toContain('"Apologist"');
    expect(source).toContain('"ext_Bonfire"');
    expect(source).toContain('"Gather round"');
  });

  it("omits extensions that have nothing for the language", () => {
    // Bonfire has no Spanish; it must be absent, not present as undefined.
    const source = generateLocaleModuleSource(extensions, "es");
    expect(source).toContain('"ext_Apologist"');
    expect(source).not.toContain("ext_Bonfire");
    expect(source).not.toContain("undefined");
  });

  it("carries only title and description, not other translation keys", () => {
    const source = generateLocaleModuleSource(extensions, "de");
    expect(source).toContain('"Apologet"');
    expect(source).not.toContain("some-other-key");
  });

  it("emits a valid empty module for an unknown language", () => {
    expect(generateLocaleModuleSource(extensions, "zz")).toBe(
      "export default {};\n"
    );
  });
});

describe("generateEntryModuleSource", () => {
  const source = generateEntryModuleSource(extensions, "seed-bible");

  it("inlines English only, not the other languages", () => {
    // This is the regression that mattered: all 77 languages used to ship in
    // the entry chunk, at 138 KB (72.5 KB gzipped). English alone is ~1.8 KB
    // and earns its place as the i18next fallback.
    expect(source).toContain("AI for seekers");
    expect(source).toContain("Gather round");
    expect(source).not.toContain("Apologista");
    expect(source).not.toContain("Apologet");
    expect(source).not.toContain("Tata");
  });

  it("keeps the ids, dependencies and autoinstall flags the boot path needs", () => {
    expect(source).toContain('"id":"ext_Apologist"');
    expect(source).toContain('"autoinstall":true');
    expect(source).toContain('"dependencies":["ext_Apologist"]');
  });

  it("exposes one lazy loader per language except the inlined English", () => {
    for (const lang of ["de", "es", "gn"]) {
      expect(source).toContain(
        `"${lang}": () => import("virtual:@extensions/locale/${lang}")`
      );
    }
    // Nothing to fetch for English — it is already in this chunk.
    expect(source).not.toContain('"en": () => import(');
  });

  it("defers each extension's code and full translations to dynamic imports", () => {
    expect(source).toContain(
      'import("@packages/apologist-extension/extension.json")'
    );
    expect(source).toContain('import("@packages/bonfire-extension/index")');
  });

  it("names the set", () => {
    expect(source).toContain('id: "seed-bible"');
  });
});

describe("parseLocaleModuleId", () => {
  it("extracts the language from a resolved locale id", () => {
    expect(parseLocaleModuleId(`${RESOLVED_LOCALE_PREFIX}es`)).toBe("es");
    expect(parseLocaleModuleId(`${RESOLVED_LOCALE_PREFIX}fil`)).toBe("fil");
    expect(parseLocaleModuleId(`${RESOLVED_LOCALE_PREFIX}pt-BR`)).toBe("pt-BR");
  });

  it("ignores ids belonging to other modules", () => {
    expect(parseLocaleModuleId("\0virtual:@extensions")).toBeNull();
    expect(parseLocaleModuleId("/src/main.tsx")).toBeNull();
  });

  it("rejects malformed language subtags", () => {
    // Guards against a stray id making the plugin emit a module for it.
    expect(
      parseLocaleModuleId(`${RESOLVED_LOCALE_PREFIX}../secret`)
    ).toBeNull();
    expect(parseLocaleModuleId(`${RESOLVED_LOCALE_PREFIX}`)).toBeNull();
    expect(parseLocaleModuleId(`${RESOLVED_LOCALE_PREFIX}toolong`)).toBeNull();
  });
});
