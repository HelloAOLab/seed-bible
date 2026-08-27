import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildDiscoveredContentList } from "./lib/discoveredContentList";

const DEFAULT_OUTPUT_PATH = path.resolve(
  "packages/default-content-extension/ext_DefaultContent/discoveredContent.json"
);

function printUsage(): void {
  console.log(
    "Usage: pnpm update-discovered-content-list <path-to-csv> [--out=<path>]"
  );
  console.log("");
  console.log(
    'Reads a "Seed Bible Discover Content Master List" CSV export (columns:'
  );
  console.log(
    "Name, Author, Bible Reference, URL, Description) and writes the JSON file"
  );
  console.log("the default content extension's discover provider reads.");
  console.log("");
  console.log(`Default output: ${DEFAULT_OUTPUT_PATH}`);
  console.log("");
  console.log("Example:");
  console.log(
    '  pnpm update-discovered-content-list "C:\\Users\\kally\\Downloads\\Seed Bible Discover Content Master List  - Sheet1.csv"'
  );
}

function parseArgValue(flag: string): string | null {
  const prefix = `${flag}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const csvPath = process.argv[2];
  if (!csvPath || csvPath.startsWith("--")) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const outArg = parseArgValue("--out");
  const outputPath = outArg ? path.resolve(outArg) : DEFAULT_OUTPUT_PATH;

  const csvText = await readFile(path.resolve(csvPath), "utf-8");
  const { items, warnings } = await buildDiscoveredContentList(csvText);

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(items, null, 2) + "\n", "utf-8");

  console.log(
    `Wrote ${items.length} discovered content item(s) to ${outputPath}` +
      (warnings.length > 0 ? ` (${warnings.length} warning(s) above)` : "")
  );
}

main().catch((error) => {
  console.error("Failed to update discovered content list:", error);
  process.exitCode = 1;
});
