import { writeFile } from "node:fs/promises";
import path from "node:path";
import { Project } from "ts-morph";
import ts from "typescript";

type DiagnosticByCode = {
  code: number;
  count: number;
  category: "error" | "warning" | "suggestion" | "message";
  exampleMessage: string;
  issues: {
    filePath: string;
    lineNumber: number;
    columnNumber: number;
    message: string;
  }[];
};

type DiagnosticsReport = {
  generatedAt: string;
  totalIssues: number;
  uniqueCodes: number;
  byCode: DiagnosticByCode[];
};

const OUTPUT_PATH = path.resolve(
  "typings",
  "typescript_diagnostics_report.json"
);

function isInPackagesFolder(filePath: string): boolean {
  const relativePath = path
    .relative(process.cwd(), filePath)
    .replace(/\\/g, "/");
  return relativePath.startsWith("packages/");
}

function getCategoryName(
  category: ts.DiagnosticCategory
): DiagnosticByCode["category"] {
  switch (category) {
    case ts.DiagnosticCategory.Warning:
      return "warning";
    case ts.DiagnosticCategory.Suggestion:
      return "suggestion";
    case ts.DiagnosticCategory.Message:
      return "message";
    case ts.DiagnosticCategory.Error:
    default:
      return "error";
  }
}

function flattenMessageText(
  messageText: string | ts.DiagnosticMessageChain
): string {
  return ts.flattenDiagnosticMessageText(messageText, "\n").trim();
}

function markSourceFilesAsModulesInMemory(project: Project): number {
  const sourceFiles = project
    .getSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile());

  let updatedCount = 0;

  for (const sourceFile of sourceFiles) {
    const text = sourceFile.getFullText();
    if (/\bexport\s*\{\s*\}\s*;?\s*$/m.test(text)) {
      continue;
    }

    const trailingWhitespace = text.match(/\s*$/)?.[0] ?? "";
    const trimmed = text.slice(0, text.length - trailingWhitespace.length);
    sourceFile.replaceWithText(`${trimmed}\n\nexport {};\n`);
    updatedCount += 1;
  }

  return updatedCount;
}

async function reportDiagnostics() {
  const project = new Project({
    tsConfigFilePath: path.resolve("tsconfig.json"),
  });

  const updatedCount = markSourceFilesAsModulesInMemory(project);

  const diagnostics = project.getPreEmitDiagnostics();
  const packageDiagnostics = diagnostics.filter((diagnostic) => {
    const sourceFile = diagnostic.getSourceFile();
    if (!sourceFile) {
      return false;
    }

    return isInPackagesFolder(sourceFile.getFilePath());
  });

  const grouped = new Map<
    number,
    {
      count: number;
      category: DiagnosticByCode["category"];
      exampleMessage: string;
      issues: DiagnosticByCode["issues"];
    }
  >();

  for (const diagnostic of packageDiagnostics) {
    const compilerDiagnostic = diagnostic.compilerObject;
    const code = compilerDiagnostic.code;
    const message = flattenMessageText(compilerDiagnostic.messageText);
    const category = getCategoryName(compilerDiagnostic.category);
    const sourceFile = diagnostic.getSourceFile();

    if (!sourceFile) {
      continue;
    }

    const start = diagnostic.getStart();
    const lineAndColumn = sourceFile.getLineAndColumnAtPos(start ?? 0);
    const filePath = path
      .relative(process.cwd(), sourceFile.getFilePath())
      .replace(/\\/g, "/");

    const issue = {
      filePath,
      lineNumber: lineAndColumn.line,
      columnNumber: lineAndColumn.column,
      message,
    };

    const existing = grouped.get(code);
    if (!existing) {
      grouped.set(code, {
        count: 1,
        category,
        exampleMessage: message,
        issues: [issue],
      });
      continue;
    }

    existing.count += 1;
    existing.issues.push(issue);

    if (!existing.exampleMessage && message) {
      existing.exampleMessage = message;
    }
  }

  const byCode: DiagnosticByCode[] = [...grouped.entries()]
    .map(([code, value]) => ({
      code,
      count: value.count,
      category: value.category,
      exampleMessage: value.exampleMessage,
      issues: value.issues,
    }))
    .sort((a, b) => {
      if (a.count !== b.count) {
        return b.count - a.count;
      }
      return a.code - b.code;
    });

  const report: DiagnosticsReport = {
    generatedAt: new Date().toISOString(),
    totalIssues: packageDiagnostics.length,
    uniqueCodes: byCode.length,
    byCode,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Total issues: ${report.totalIssues}`);
  console.log(`Unique codes: ${report.uniqueCodes}`);
  console.log(`Marked as modules in-memory: ${updatedCount}`);
  console.log(
    `Wrote ${path.relative(process.cwd(), OUTPUT_PATH).replace(/\\/g, "/")}`
  );
}

await reportDiagnostics();
