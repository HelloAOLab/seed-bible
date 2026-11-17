import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// A sandboxed extension's build packs everything it imports into one file, so
// whatever the SDK imports, every extension carries, and whatever
// `seed-bible/components` imports, every extension that uses a component
// does. These are the app's heavy pieces neither may reach: the i18n manager
// brings all 24 locales with its language loader (6.4 MB), and zod another
// 110 KB.
const FORBIDDEN = [
  { pattern: /^i18n\/I18nManager\.tsx$/, why: "the app's i18n manager" },
  { pattern: /^i18n\/index\.tsx$/, why: "the app's i18n manager" },
  { pattern: /^i18n\/[a-z-]+\.json$/, why: "a locale file" },
  { pattern: /^npm:zod$/, why: "zod" },
];

const appDir = path.resolve(
  __dirname,
  "../../../../packages/seed-bible/seed-bible"
);

/** The entries a sandboxed extension bundles, and a few modules each must reach. */
const ENTRIES = [
  {
    name: "seed-bible/extensions",
    file: "extensions/index.tsx",
    reaches: ["extensions/protocol.ts", "i18n/I18nContext.tsx", "npm:i18next"],
  },
  {
    name: "seed-bible/components",
    file: "components/index.tsx",
    reaches: [
      "components/CloseButton/CloseButton.tsx",
      "i18n/I18nContext.tsx",
      "npm:i18next",
    ],
  },
];

// Imports that put code in the bundle: not `import type` / `export type`.
const STATIC_IMPORT =
  /^\s*(?:import|export)\s+(?!type\b)(?:[^"';]*?\bfrom\s*)?["']([^"']+)["']/gm;
const DYNAMIC_IMPORT = /\bimport\(\s*["']([^"']+)["']\s*\)/g;

/** `seed-bible`'s own entry points, as `packages/seed-bible/vite.config.ts` maps them. */
const SELF_ENTRIES: Record<string, string> = {
  "seed-bible": "app/api.tsx",
  "seed-bible/managers": "managers/index.tsx",
  "seed-bible/components": "components/index.tsx",
  "seed-bible/i18n": "i18n/index.tsx",
  "seed-bible/extensions": "extensions/index.tsx",
  "seed-bible/extensions/testing": "extensions/testing.tsx",
};
const packagesDir = path.resolve(appDir, "../..");

/** Where an import leads: a file in the repo, or an npm package by name. */
function resolveImport(from: string, specifier: string): string | null {
  if (specifier.startsWith(".")) {
    return resolveFile(path.resolve(path.dirname(from), specifier));
  }
  // The repo's path alias, as `tsconfig.json` defines it.
  if (specifier.startsWith("@packages/")) {
    return resolveFile(
      path.join(packagesDir, specifier.slice("@packages/".length))
    );
  }
  const entry = SELF_ENTRIES[specifier];
  if (entry) {
    return path.join(appDir, entry);
  }
  const parts = specifier.split("/");
  return `npm:${specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]}`;
}

function resolveFile(base: string): string | null {
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    path.join(base, "index.tsx"),
    path.join(base, "index.ts"),
  ];
  return (
    candidates.find(
      (candidate) =>
        /\.(tsx?|json|css)$/.test(candidate) && existsSync(candidate)
    ) ?? null
  );
}

const toName = (file: string) =>
  file.startsWith("npm:")
    ? file
    : path.relative(appDir, file).split(path.sep).join("/");

/** Every module the entry reaches, each with the module that first imported it. */
function importGraph(start: string): Map<string, string | null> {
  const importedBy = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (!/\.tsx?$/.test(file)) {
      continue;
    }
    const source = readFileSync(file, "utf-8");
    const specifiers = [
      ...source.matchAll(STATIC_IMPORT),
      ...source.matchAll(DYNAMIC_IMPORT),
    ].map((match) => match[1]!);
    for (const specifier of specifiers) {
      const target = resolveImport(file, specifier);
      if (target && !importedBy.has(target)) {
        importedBy.set(target, file);
        queue.push(target);
      }
    }
  }
  return importedBy;
}

describe.each(ENTRIES)("$name", ({ file, reaches }) => {
  const entry = path.join(appDir, file);

  it("doesn't import the app's heavy modules", () => {
    const graph = importGraph(entry);
    const problems: string[] = [];
    for (const file of graph.keys()) {
      const name = toName(file);
      const rule = FORBIDDEN.find(({ pattern }) => pattern.test(name));
      if (!rule) {
        continue;
      }
      const chain: string[] = [];
      for (let at: string | null = file; at; at = graph.get(at) ?? null) {
        chain.push(toName(at));
      }
      problems.push(`${rule.why}: ${chain.join(" <- ")}`);
    }

    expect(problems).toEqual([]);
  });

  it("finds the modules it imports", () => {
    // Guards the check above against quietly reading nothing.
    const names = [...importGraph(entry).keys()].map(toName);
    expect(names).toEqual(expect.arrayContaining(reaches));
  });
});

describe("seed-bible/components", () => {
  // The app's global utility classes (`sr-only`, `flex-between`, ...) live
  // in a stylesheet only the app loads, so a sandboxed frame never gets them.
  // A shared component using one looks right in the app and broken in an
  // extension: it needs a rule of its own in its own CSS file.
  const utilityClasses = [
    ...readFileSync(
      path.join(appDir, "app/styles/utilities.inline.css"),
      "utf-8"
    ).matchAll(/^\.([a-z][\w-]*)/gm),
  ].map((match) => match[1]!);

  it("doesn't use the app's global utility classes", () => {
    const pattern = new RegExp(
      `(?<![\\w-])(${utilityClasses.join("|")})(?![\\w-])`,
      "g"
    );
    const problems: string[] = [];
    for (const file of importGraph(
      path.join(appDir, "components/index.tsx")
    ).keys()) {
      if (!/\.tsx$/.test(file)) continue;
      readFileSync(file, "utf-8")
        .split("\n")
        .forEach((line, index) => {
          if (!/className|class=/.test(line) && !/^\s*["'`]/.test(line)) return;
          for (const match of line.matchAll(pattern)) {
            problems.push(`${toName(file)}:${index + 1} uses .${match[1]}`);
          }
        });
    }

    expect(utilityClasses).toEqual(
      expect.arrayContaining(["sr-only", "flex-between"])
    );
    expect(problems).toEqual([]);
  });
});

describe("the import walk", () => {
  it("follows the repo's path alias and seed-bible's own entry points", () => {
    // Either route into I18nManager would bring every locale back, so the
    // walk has to see through both, not just relative imports.
    const dir = mkdtempSync(path.join(tmpdir(), "bundle-imports-"));
    try {
      const viaAlias = path.join(dir, "alias.ts");
      writeFileSync(
        viaAlias,
        'import { useI18n } from "@packages/seed-bible/seed-bible/i18n/I18nManager";\n'
      );
      const viaEntry = path.join(dir, "entry.ts");
      writeFileSync(viaEntry, 'import { useI18n } from "seed-bible/i18n";\n');

      expect([...importGraph(viaAlias).keys()].map(toName)).toContain(
        "i18n/I18nManager.tsx"
      );
      expect([...importGraph(viaEntry).keys()].map(toName)).toContain(
        "i18n/I18nManager.tsx"
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
