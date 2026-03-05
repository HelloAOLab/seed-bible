import path from "node:path";
import { Node, Project, SyntaxKind } from "ts-morph";
import ts from "typescript";

type FixRecord = {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  parameterName: string;
};

type SkipRecord = {
  filePath: string;
  lineNumber: number;
  columnNumber: number;
  reason: string;
};

type Summary = {
  targetCode: number;
  diagnosticsSeen: number;
  fixesApplied: number;
  skipped: number;
  dryRun: boolean;
  fixes: FixRecord[];
  skippedItems: SkipRecord[];
};

const TARGET_CODE = 7006;

function isDryRun(): boolean {
  return process.argv.slice(2).includes("--dry-run");
}

function toRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function getParameterName(parameter: Node): string {
  if (!Node.isParameterDeclaration(parameter)) {
    return "<unknown>";
  }

  const nameNode = parameter.getNameNode();
  if (Node.isIdentifier(nameNode)) {
    return nameNode.getText();
  }

  if (Node.isObjectBindingPattern(nameNode)) {
    return `{ ${nameNode.getText()} }`;
  }

  if (Node.isArrayBindingPattern(nameNode)) {
    return `[ ${nameNode.getText()} ]`;
  }

  return parameter.getName();
}

function findParameterNode(node: Node | undefined): Node | undefined {
  if (!node) {
    return undefined;
  }

  if (Node.isParameterDeclaration(node)) {
    return node;
  }

  return node.getFirstAncestorByKind(SyntaxKind.Parameter);
}

function flattenMessageText(
  messageText: string | ts.DiagnosticMessageChain
): string {
  return ts.flattenDiagnosticMessageText(messageText, "\n").trim();
}

function extractParameterNameFromMessage(message: string): string | null {
  const match = message.match(
    /Parameter '([^']+)' implicitly has an 'any' type/u
  );
  return match?.[1] ?? null;
}

function getFunctionLikeAncestor(node: Node | undefined): Node | undefined {
  if (!node) {
    return undefined;
  }

  if (
    Node.isFunctionDeclaration(node) ||
    Node.isFunctionExpression(node) ||
    Node.isArrowFunction(node) ||
    Node.isMethodDeclaration(node) ||
    Node.isConstructorDeclaration(node)
  ) {
    return node;
  }

  return node.getFirstAncestor(
    (ancestor) =>
      Node.isFunctionDeclaration(ancestor) ||
      Node.isFunctionExpression(ancestor) ||
      Node.isArrowFunction(ancestor) ||
      Node.isMethodDeclaration(ancestor) ||
      Node.isConstructorDeclaration(ancestor)
  );
}

function parameterContainsName(
  parameter: import("ts-morph").ParameterDeclaration,
  name: string
): boolean {
  if (parameter.getName() === name) {
    return true;
  }

  const nameNode = parameter.getNameNode();
  if (Node.isIdentifier(nameNode)) {
    return nameNode.getText() === name;
  }

  return nameNode
    .getDescendantsOfKind(SyntaxKind.Identifier)
    .some((identifier) => identifier.getText() === name);
}

function resolveParameterFromDiagnostic(
  sourceFile: import("ts-morph").SourceFile,
  start: number,
  length: number | undefined,
  message: string
): import("ts-morph").ParameterDeclaration | undefined {
  const nodeAtStart = sourceFile.getDescendantAtPos(start);
  const direct = findParameterNode(nodeAtStart);
  if (direct && Node.isParameterDeclaration(direct)) {
    return direct;
  }

  if (start > 0) {
    const previous = findParameterNode(
      sourceFile.getDescendantAtPos(start - 1)
    );
    if (previous && Node.isParameterDeclaration(previous)) {
      return previous;
    }
  }

  const parameterNameFromMessage = extractParameterNameFromMessage(message);
  const functionLike = getFunctionLikeAncestor(nodeAtStart);
  if (parameterNameFromMessage && functionLike) {
    const isFunctionWithParameters =
      Node.isFunctionDeclaration(functionLike) ||
      Node.isFunctionExpression(functionLike) ||
      Node.isArrowFunction(functionLike) ||
      Node.isMethodDeclaration(functionLike) ||
      Node.isConstructorDeclaration(functionLike);

    if (isFunctionWithParameters) {
      const parameters = functionLike.getParameters();

      const byName = parameters.find(
        (parameter: import("ts-morph").ParameterDeclaration) =>
          parameterContainsName(parameter, parameterNameFromMessage)
      );

      if (byName) {
        return byName;
      }

      const untypedParameters = parameters.filter(
        (parameter: import("ts-morph").ParameterDeclaration) =>
          !parameter.getTypeNode()
      );

      if (untypedParameters.length > 0) {
        const nearestUntyped = untypedParameters.slice().sort((a, b) => {
          const aDistance = Math.min(
            Math.abs(a.getStart() - start),
            Math.abs(a.getEnd() - start)
          );
          const bDistance = Math.min(
            Math.abs(b.getStart() - start),
            Math.abs(b.getEnd() - start)
          );
          return aDistance - bDistance;
        })[0];

        if (nearestUntyped) {
          return nearestUntyped;
        }
      }
    }
  }

  const end = start + Math.max(1, length ?? 1);
  const parameters = sourceFile.getDescendantsOfKind(SyntaxKind.Parameter);

  for (const parameter of parameters) {
    const pStart = parameter.getStart();
    const pEnd = parameter.getEnd();
    if (pStart <= start && start <= pEnd) {
      return parameter;
    }

    const overlaps = pStart < end && start < pEnd;
    if (overlaps) {
      return parameter;
    }
  }

  if (parameterNameFromMessage) {
    const matchingUntyped = parameters.filter(
      (parameter: import("ts-morph").ParameterDeclaration) =>
        !parameter.getTypeNode() &&
        parameterContainsName(parameter, parameterNameFromMessage)
    );

    if (matchingUntyped.length === 1) {
      return matchingUntyped[0];
    }

    if (matchingUntyped.length > 1) {
      return matchingUntyped.slice().sort((a, b) => {
        const aDistance = Math.min(
          Math.abs(a.getStart() - start),
          Math.abs(a.getEnd() - start)
        );
        const bDistance = Math.min(
          Math.abs(b.getStart() - start),
          Math.abs(b.getEnd() - start)
        );
        return aDistance - bDistance;
      })[0];
    }
  }

  let closest: import("ts-morph").ParameterDeclaration | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const parameter of parameters) {
    const nameNode = parameter.getNameNode();
    const distance = Math.min(
      Math.abs(nameNode.getStart() - start),
      Math.abs(nameNode.getEnd() - start)
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closest = parameter;
    }
  }

  if (closestDistance <= 2) {
    return closest;
  }

  return undefined;
}

async function run() {
  const dryRun = isDryRun();
  const project = new Project({
    tsConfigFilePath: path.resolve("tsconfig.json"),
  });

  const diagnostics = project
    .getPreEmitDiagnostics()
    .filter((diagnostic) => diagnostic.getCode() === TARGET_CODE);

  const summary: Summary = {
    targetCode: TARGET_CODE,
    diagnosticsSeen: diagnostics.length,
    fixesApplied: 0,
    skipped: 0,
    dryRun,
    fixes: [],
    skippedItems: [],
  };

  const fixedKeys = new Set<string>();

  for (const diagnostic of diagnostics) {
    const sourceFile = diagnostic.getSourceFile();
    const start = diagnostic.getStart();
    const length = diagnostic.compilerObject.length;
    const message = flattenMessageText(diagnostic.compilerObject.messageText);

    if (!sourceFile || start == null) {
      summary.skipped += 1;
      summary.skippedItems.push({
        filePath: sourceFile
          ? toRelativePath(sourceFile.getFilePath())
          : "<unknown>",
        lineNumber: 0,
        columnNumber: 0,
        reason: "Missing source file or diagnostic position",
      });
      continue;
    }

    const parameterNode = resolveParameterFromDiagnostic(
      sourceFile,
      start,
      length,
      message
    );
    const lineAndColumn = sourceFile.getLineAndColumnAtPos(start);
    const relativeFilePath = toRelativePath(sourceFile.getFilePath());

    if (!parameterNode || !Node.isParameterDeclaration(parameterNode)) {
      summary.skipped += 1;
      summary.skippedItems.push({
        filePath: relativeFilePath,
        lineNumber: lineAndColumn.line,
        columnNumber: lineAndColumn.column,
        reason: "Unable to resolve parameter declaration",
      });
      continue;
    }

    const key = `${sourceFile.getFilePath()}:${parameterNode.getStart()}`;
    if (fixedKeys.has(key)) {
      continue;
    }

    fixedKeys.add(key);

    if (parameterNode.getTypeNode()) {
      summary.skipped += 1;
      summary.skippedItems.push({
        filePath: relativeFilePath,
        lineNumber: lineAndColumn.line,
        columnNumber: lineAndColumn.column,
        reason: "Parameter already has explicit type",
      });
      continue;
    }

    parameterNode.setType("any");
    summary.fixesApplied += 1;
    summary.fixes.push({
      filePath: relativeFilePath,
      lineNumber: lineAndColumn.line,
      columnNumber: lineAndColumn.column,
      parameterName: getParameterName(parameterNode),
    });
  }

  if (!dryRun) {
    await project.save();
  }

  console.log(dryRun ? "TS7006 dry run complete." : "TS7006 fix complete.");
  console.log(JSON.stringify(summary, null, 2));
}

await run();
