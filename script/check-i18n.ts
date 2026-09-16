import {
  checkI18n,
  EXEMPT_KEYS,
  fixUnusedKeys,
  formatFindings,
} from "./lib/checkI18n";

const args = new Set(process.argv.slice(2));
const projectRoot = process.cwd();

let findings = checkI18n(projectRoot, { exemptKeys: EXEMPT_KEYS });

if (args.has("--fix")) {
  const rewritten = fixUnusedKeys(projectRoot, findings);
  for (const file of rewritten) console.log(`fixed ${file}`);
  findings = checkI18n(projectRoot, { exemptKeys: EXEMPT_KEYS });
}

if (findings.length > 0) {
  console.log(formatFindings(findings));
  console.log(`\n${findings.length} i18n warnings`);
}

// Warnings never fail the build today; --strict is for when the backlog is
// cleared and these should start blocking.
process.exit(args.has("--strict") && findings.length > 0 ? 1 : 0);
