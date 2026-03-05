import path from "node:path";
import {
  ClassDeclaration,
  ClassExpression,
  Node,
  Project,
  PropertyDeclaration,
  SyntaxKind,
  TypeFormatFlags,
} from "ts-morph";

type Stats = {
  filesScanned: number;
  filesUpdated: number;
  classesScanned: number;
  classesUpdated: number;
  propertiesAdded: number;
  propertiesTyped: number;
};

const TARGET_GLOBS = [
  "packages/**/*.ts",
  "packages/**/*.tsx",
  "packages/**/*.js",
  "packages/**/*.jsx",
];

function isDryRun(): boolean {
  return process.argv.slice(2).includes("--dry-run");
}

function toRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
}

function isAssignmentOperator(kind: SyntaxKind): boolean {
  return (
    kind === SyntaxKind.EqualsToken ||
    kind === SyntaxKind.PlusEqualsToken ||
    kind === SyntaxKind.MinusEqualsToken ||
    kind === SyntaxKind.AsteriskEqualsToken ||
    kind === SyntaxKind.AsteriskAsteriskEqualsToken ||
    kind === SyntaxKind.SlashEqualsToken ||
    kind === SyntaxKind.PercentEqualsToken ||
    kind === SyntaxKind.AmpersandEqualsToken ||
    kind === SyntaxKind.BarEqualsToken ||
    kind === SyntaxKind.CaretEqualsToken ||
    kind === SyntaxKind.LessThanLessThanEqualsToken ||
    kind === SyntaxKind.GreaterThanGreaterThanEqualsToken ||
    kind === SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken ||
    kind === SyntaxKind.BarBarEqualsToken ||
    kind === SyntaxKind.AmpersandAmpersandEqualsToken ||
    kind === SyntaxKind.QuestionQuestionEqualsToken
  );
}

function getThisPropertyName(expression: Node): string | null {
  if (
    Node.isPropertyAccessExpression(expression) &&
    expression.getExpression().getKind() === SyntaxKind.ThisKeyword
  ) {
    const nameNode = expression.getNameNode();
    if (Node.isIdentifier(nameNode) || Node.isPrivateIdentifier(nameNode)) {
      return nameNode.getText();
    }
    return expression.getName();
  }

  if (
    Node.isElementAccessExpression(expression) &&
    expression.getExpression().getKind() === SyntaxKind.ThisKeyword
  ) {
    const argument = expression.getArgumentExpression();
    if (!argument) {
      return null;
    }

    if (
      Node.isStringLiteral(argument) ||
      Node.isNoSubstitutionTemplateLiteral(argument)
    ) {
      return argument.getLiteralText();
    }
  }

  return null;
}

function normalizeType(typeText: string): string {
  let normalized = typeText.trim();

  while (/^\(.*\)$/u.test(normalized)) {
    const withoutParens = normalized.replace(/^\((.*)\)$/u, "$1").trim();
    if (withoutParens === normalized) {
      break;
    }
    normalized = withoutParens;
  }

  let arrayDepth = 0;
  while (normalized.endsWith("[]")) {
    arrayDepth += 1;
    normalized = normalized.slice(0, -2).trim();
  }

  const isStringLiteralType =
    /^"(?:[^"\\]|\\.)*"$/u.test(normalized) ||
    /^'(?:[^'\\]|\\.)*'$/u.test(normalized) ||
    /^`(?:[^`\\]|\\.)*`$/u.test(normalized);

  let baseType = normalized;
  if (isStringLiteralType) {
    baseType = "string";
  } else if (
    !normalized ||
    normalized === "any" ||
    normalized === "unknown" ||
    normalized === "never" ||
    normalized === "null" ||
    normalized === "undefined"
  ) {
    baseType = "any";
  }

  return `${baseType}${"[]".repeat(arrayDepth)}`;
}

function inferTypeFromExpression(expression: Node | undefined): string {
  if (!expression) {
    return "any";
  }

  const typeText = expression
    .getType()
    .getText(expression, TypeFormatFlags.NoTruncation);

  return normalizeType(typeText);
}

function getConstructorInferredTypes(
  classDecl: ClassDeclaration | ClassExpression
): Map<string, string> {
  const inferred = new Map<string, string>();
  const ctor = classDecl.getConstructors()[0];
  if (!ctor) {
    return inferred;
  }

  const assignments = ctor.getDescendantsOfKind(SyntaxKind.BinaryExpression);
  for (const assignment of assignments) {
    if (!isAssignmentOperator(assignment.getOperatorToken().getKind())) {
      continue;
    }

    const propertyName = getThisPropertyName(assignment.getLeft());
    if (!propertyName || inferred.has(propertyName)) {
      continue;
    }

    inferred.set(propertyName, inferTypeFromExpression(assignment.getRight()));
  }

  return inferred;
}

function getNearestClassLike(
  node: Node
): ClassDeclaration | ClassExpression | undefined {
  return node
    .getAncestors()
    .reverse()
    .find(
      (ancestor) =>
        Node.isClassDeclaration(ancestor) || Node.isClassExpression(ancestor)
    ) as ClassDeclaration | ClassExpression | undefined;
}

function collectThisPropertyNames(
  classDecl: ClassDeclaration | ClassExpression
): Set<string> {
  const names = new Set<string>();

  const propertyAccesses = classDecl.getDescendantsOfKind(
    SyntaxKind.PropertyAccessExpression
  );
  for (const expression of propertyAccesses) {
    if (expression.getExpression().getKind() !== SyntaxKind.ThisKeyword) {
      continue;
    }

    if (getNearestClassLike(expression) !== classDecl) {
      continue;
    }

    names.add(expression.getName());
  }

  const elementAccesses = classDecl.getDescendantsOfKind(
    SyntaxKind.ElementAccessExpression
  );
  for (const expression of elementAccesses) {
    if (expression.getExpression().getKind() !== SyntaxKind.ThisKeyword) {
      continue;
    }

    if (getNearestClassLike(expression) !== classDecl) {
      continue;
    }

    const argument = expression.getArgumentExpression();
    if (
      argument &&
      (Node.isStringLiteral(argument) ||
        Node.isNoSubstitutionTemplateLiteral(argument))
    ) {
      names.add(argument.getLiteralText());
    }
  }

  return names;
}

function isValidIdentifierName(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}

function getDeclarationName(property: PropertyDeclaration): string {
  const nameNode = property.getNameNode();
  if (Node.isIdentifier(nameNode)) {
    return nameNode.getText();
  }

  if (Node.isPrivateIdentifier(nameNode)) {
    return nameNode.getText();
  }

  if (
    Node.isStringLiteral(nameNode) ||
    Node.isNoSubstitutionTemplateLiteral(nameNode)
  ) {
    return nameNode.getLiteralText();
  }

  return property.getName();
}

function applyExplicitType(
  declaration: PropertyDeclaration,
  inferredType: string
): void {
  const typeText = inferredType || "any";
  const nameNode = declaration.getNameNode();

  if (Node.isPrivateIdentifier(nameNode)) {
    const name = nameNode.getText();
    const initializer = declaration.getInitializer();

    if (initializer) {
      declaration.replaceWithText(
        `${name}: ${typeText} = ${initializer.getText()};`
      );
      return;
    }

    declaration.replaceWithText(`${name}: ${typeText};`);
    return;
  }

  declaration.setType(typeText);
}

function processClass(
  classDecl: ClassDeclaration | ClassExpression,
  stats: Stats
): boolean {
  let changed = false;
  const inferredTypes = getConstructorInferredTypes(classDecl);
  const instancePropertyNames = collectThisPropertyNames(classDecl);

  const existingProperties = classDecl
    .getProperties()
    .filter((property) => !property.isStatic());
  const existingByName = new Map<string, PropertyDeclaration>();

  for (const property of existingProperties) {
    existingByName.set(getDeclarationName(property), property);
  }

  for (const [name, declaration] of existingByName.entries()) {
    if (declaration.getTypeNode()) {
      continue;
    }

    applyExplicitType(declaration, inferredTypes.get(name) ?? "any");
    stats.propertiesTyped += 1;
    changed = true;
  }

  const missingNames = [...instancePropertyNames].filter(
    (name) => !existingByName.has(name)
  );

  for (const name of missingNames) {
    if (!isValidIdentifierName(name)) {
      continue;
    }

    classDecl.insertProperty(0, {
      name,
      type: inferredTypes.get(name) ?? "any",
    });
    stats.propertiesAdded += 1;
    changed = true;
  }

  return changed;
}

async function run() {
  const dryRun = isDryRun();
  const project = new Project({
    tsConfigFilePath: path.resolve("tsconfig.json"),
  });

  const sourceFiles = TARGET_GLOBS.flatMap((pattern) =>
    project
      .getSourceFiles(pattern)
      .filter((sourceFile) => !sourceFile.isDeclarationFile())
  );

  const stats: Stats = {
    filesScanned: sourceFiles.length,
    filesUpdated: 0,
    classesScanned: 0,
    classesUpdated: 0,
    propertiesAdded: 0,
    propertiesTyped: 0,
  };

  const updatedFiles = new Set<string>();

  for (const sourceFile of sourceFiles) {
    let fileChanged = false;
    const classes = [
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ClassDeclaration),
      ...sourceFile.getDescendantsOfKind(SyntaxKind.ClassExpression),
    ];

    if (classes.length === 0) {
      continue;
    }

    for (const classDecl of classes) {
      stats.classesScanned += 1;
      const classChanged = processClass(classDecl, stats);
      if (classChanged) {
        stats.classesUpdated += 1;
        fileChanged = true;
      }
    }

    if (fileChanged) {
      stats.filesUpdated += 1;
      updatedFiles.add(toRelativePath(sourceFile.getFilePath()));
    }
  }

  if (!dryRun) {
    await project.save();
  }

  console.log(
    dryRun
      ? "Class property typing dry run complete."
      : "Class property typing complete."
  );
  console.log(JSON.stringify(stats, null, 2));

  if (updatedFiles.size > 0) {
    console.log("Updated files:");
    for (const filePath of [...updatedFiles].sort((a, b) =>
      a.localeCompare(b)
    )) {
      console.log(`- ${filePath}`);
    }
  }
}

await run();
