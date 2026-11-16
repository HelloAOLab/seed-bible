import { existsSync, readFileSync } from "node:fs";
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

function resolveRelative(from: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(from), specifier);
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
      let target: string | null;
      if (specifier.startsWith(".")) {
        target = resolveRelative(file, specifier);
      } else {
        // The package name, without any subpath.
        const parts = specifier.split("/");
        target = `npm:${specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]}`;
      }
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
