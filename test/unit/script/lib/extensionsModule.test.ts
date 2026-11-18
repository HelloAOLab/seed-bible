import { describe, expect, it } from "vitest";
import {
  generateEntryModuleSource,
  generateLocaleModuleSource,
  listExtensionLanguages,
  parseLocaleModuleId,
  trimMeta,
  RESOLVED_LOCALE_PREFIX,
  type DiscoveredExtension,
  type ExtensionMetaFile,
} from "../../../../script/lib/extensionsModule";

const apologist: DiscoveredExtension = {
  dir: "/repo/packages/apologist-extension",
  importBase: "@packages/apologist-extension",
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
  dir: "/repo/packages/bonfire-extension",
  importBase: "@packages/bonfire-extension",
  meta: {
    id: "ext_Bonfire",
    dependencies: ["ext_Apologist"],
    settings: {
      apiKey: { type: "string" },
      maxEmbers: { type: "number", default: 3 },
    },
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
      settings: {
        apiKey: { type: "string" },
        maxEmbers: { type: "number", default: 3 },
      },
    });
  });

  it("omits dependencies, autoinstall and settings when absent rather than emitting undefined", () => {
    const trimmed = trimMeta({ id: "ext_X", translations: {} });
    expect(Object.keys(trimmed).sort()).toEqual(["id", "translations"]);
  });

  it("keeps media and only the English caption strings needed by the page", () => {
    const meta: ExtensionMetaFile = {
      ...apologist.meta,
      icon: "icon.svg",
      screenshots: [
        { src: "one.png", caption: "overview" },
        { src: "two.webp" },
      ],
      translations: {
        en: {
          title: "Example",
          description: "Example",
          overview: "Overview",
          private: "Deferred",
        },
        es: { title: "Ejemplo", description: "Ejemplo", overview: "Vista" },
      },
    };
    expect(trimMeta(meta)).toEqual({
      id: meta.id,
      autoinstall: true,
      icon: "icon.svg",
      screenshots: meta.screenshots,
      translations: {
        en: { title: "Example", description: "Example", overview: "Overview" },
      },
    });
    expect(
      generateLocaleModuleSource([{ ...apologist, meta }], "es")
    ).not.toContain("Vista");
  });

  it("keeps an explicitly empty screenshot list", () => {
    expect(
      trimMeta({ ...apologist.meta, screenshots: [] }).screenshots
    ).toEqual([]);
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
        {
          dir: "/repo/packages/x",
          importBase: "@packages/x",
          meta: { id: "ext_X", translations: {} },
        },
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

  it("inlines an extension's settings definitions, since they're structural rather than per-locale text", () => {
    expect(source).toContain('"apiKey":{"type":"string"}');
    expect(source).toContain('"maxEmbers":{"type":"number","default":3}');
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

  it("imports an external extension's entry by its real file name", () => {
    // A `/@fs/` URL gets no extension resolution, so `.../index` alone would
    // fail to load (the dev server answers with the app's HTML instead).
    const external: DiscoveredExtension = {
      dir: "/home/dev/my-ext",
      importBase: "/@fs/home/dev/my-ext",
      entryFile: "index.ts",
      meta: {
        id: "my-ext",
        translations: { en: { title: "Mine", description: "Out of tree" } },
      },
    };
    const externalSource = generateEntryModuleSource([external], "seed-bible");
    expect(externalSource).toContain('import("/@fs/home/dev/my-ext/index.ts")');
    expect(externalSource).toContain(
      'import("/@fs/home/dev/my-ext/extension.json")'
    );
  });

  it("names the set", () => {
    expect(source).toContain('id: "seed-bible"');
  });
});

describe("generateEntryModuleSource for the SSR build", () => {
  const source = generateEntryModuleSource(extensions, "seed-bible", {
    serverBuild: true,
  });

  it("imports no extension code, translations or list strings", () => {
    expect(source).not.toContain("import(");
  });

  it("still inlines the metas the extension list is built from", () => {
    expect(source).toContain('"id":"ext_Apologist"');
    expect(source).toContain('"dependencies":["ext_Apologist"]');
    expect(source).toContain("AI for seekers");
  });

  it("rejects with a clear error if an extension is loaded anyway", async () => {
    const module = (await import(
      `data:text/javascript,${encodeURIComponent(source)}`
    )) as {
      default: {
        extensions: {
          import: () => Promise<unknown>;
          loadFullTranslations: () => Promise<unknown>;
        }[];
        loadListTranslations: Record<string, unknown>;
      };
    };
    const [first] = module.default.extensions;

    await expect(first!.import()).rejects.toThrow(
      "ext_Apologist is not available in the SSR bundle"
    );
    await expect(first!.loadFullTranslations()).rejects.toThrow(
      "ext_Apologist's translations are not available in the SSR bundle"
    );
    expect(module.default.loadListTranslations).toEqual({});
  });
});

describe("generated media assets", () => {
  it.each([false, true])(
    "imports media with safe literals (serverBuild: %s)",
    async (serverBuild) => {
      const icon = 'icon"\\\u2028.svg';
      const caption = 'caption"\u2029';
      const meta: ExtensionMetaFile = {
        ...apologist.meta,
        icon,
        screenshots: [{ src: "shots/one.png", caption }, { src: "two.webp" }],
        translations: {
          en: {
            title: 'Title "quoted"',
            description: "Description",
            [caption]: 'Look "here"\u2028',
            deferred: "Do not inline",
          },
          es: { title: "Ejemplo", description: "Ejemplo", [caption]: "Vista" },
        },
      };
      const source = generateEntryModuleSource(
        [
          { ...apologist, meta },
          { ...bonfire, meta: { ...bonfire.meta, icon: "other.svg" } },
        ],
        "seed-bible",
        { serverBuild }
      );
      const specifier = JSON.stringify(
        `${apologist.importBase}/${icon}?url`
      ).replace(/\u2028/g, "\\u2028");
      expect(source).toContain(`import asset_0 from ${specifier};`);
      expect(source).toContain(
        'import asset_1 from "@packages/apologist-extension/shots/one.png?url";'
      );
      expect(source).toContain(
        'import asset_2 from "@packages/apologist-extension/two.webp?url";'
      );
      expect(source).toContain(
        'import asset_3 from "@packages/bonfire-extension/other.svg?url";'
      );
      expect(source).toContain('"icon":asset_0');
      expect(source).not.toContain("Do not inline");
      expect(source).not.toContain("Vista");
      expect(source).not.toContain("\u2028");
      expect(source).not.toContain("\u2029");

      // Substitute the public paths Vite supplies, then evaluate the generated JS.
      const runnable = source.replace(
        /^import (asset_\d+) from .*;$/gm,
        (_, identifier: string) =>
          `const ${identifier} = "/assets/${identifier}";`
      );
      const module = (await import(
        `data:text/javascript,${encodeURIComponent(runnable)}`
      )) as {
        default: { extensions: { meta: ExtensionMetaFile }[] };
      };
      expect(module.default.extensions[0]!.meta).toEqual({
        ...trimMeta(meta),
        icon: "/assets/asset_0",
        screenshots: [
          { src: "/assets/asset_1", caption },
          { src: "/assets/asset_2" },
        ],
      });
      expect(module.default.extensions[1]!.meta.icon).toBe("/assets/asset_3");
    }
  );
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
