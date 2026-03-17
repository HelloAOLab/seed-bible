import path from "node:path";
import { Project } from "ts-morph";

const rootDir = process.cwd();

const project = new Project({
  tsConfigFilePath: path.resolve(rootDir, "tsconfig.json"),
  skipAddingFilesFromTsConfig: true,
});

project.addSourceFilesAtPaths([
  "packages/seed-bible-refresh/**/*.{ts,tsx,cts,mts,d.ts}",
  "packages/seed-bible-refresh-example-extension/**/*.{ts,tsx,cts,mts,d.ts}",
  "test/**/seed-bible-refresh/**/*.{ts,tsx,cts,mts,d.ts}",
  "test/**/seed-bible-refresh-example-extension/**/*.{ts,tsx,cts,mts,d.ts}",
  "typings/**/*.d.ts",
]);

project.resolveSourceFileDependencies();

const allowedRoots = [
  path.resolve(rootDir, "packages/seed-bible-refresh"),
  path.resolve(rootDir, "packages/seed-bible-refresh-example-extension"),
  path.resolve(rootDir, "test", "unit", "seed-bible-refresh"),
  path.resolve(rootDir, "test", "unit", "seed-bible-refresh-example-extension"),
  path.resolve(rootDir, "test", "e2e", "seed-bible-refresh"),
  path.resolve(rootDir, "test", "e2e", "seed-bible-refresh-example-extension"),
];

const normalizePath = (filePath: string) =>
  path.resolve(filePath).toLowerCase();

const isAllowedPath = (filePath: string) => {
  const normalized = normalizePath(filePath);
  return allowedRoots.some((root) => {
    const normalizedRoot = normalizePath(root);
    return (
      normalized === normalizedRoot ||
      normalized.startsWith(`${normalizedRoot}${path.sep}`)
    );
  });
};

const diagnostics = project.getPreEmitDiagnostics().filter((diagnostic) => {
  const sourceFile = diagnostic.getSourceFile();
  if (!sourceFile) {
    return true;
  }

  return isAllowedPath(sourceFile.getFilePath());
});

if (diagnostics.length > 0) {
  const text = project.formatDiagnosticsWithColorAndContext(diagnostics);
  process.stderr.write(`${text.endsWith("\n") ? text : `${text}\n`}`);
  process.exit(1);
}

process.exit(0);
