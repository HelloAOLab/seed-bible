import { Project, SyntaxKind } from "ts-morph";
import { getTutorialStepTranslationKeys } from "../../../script/getTranslationUsageStats";

/**
 * Runs the extractor over every object literal in a snippet, the same way the
 * usage-stats walk does, and returns the keys it collected.
 */
function extractKeys(source: string): string[] {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("snippet.ts", source);

  return sourceFile
    .getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression)
    .flatMap((node) => getTutorialStepTranslationKeys(node));
}

describe("getTutorialStepTranslationKeys", () => {
  it("collects the title and body keys of a tutorial step", () => {
    expect(
      extractKeys(`
        const step = {
          id: "tabs",
          target: ".sb-sidebar-tabs-header",
          titleKey: "tutorial.tabsTitle",
          titleDefault: "Switch views",
          bodyKey: "tutorial.tabsBody",
          bodyDefault: "Move between reading and notes.",
        };
      `)
    ).toEqual(["tutorial.tabsTitle", "tutorial.tabsBody"]);
  });

  it("collects keys from every step in a list", () => {
    expect(
      extractKeys(`
        export const STEPS = [
          {
            id: "a",
            titleKey: "tutorial.aTitle",
            titleDefault: "A",
            bodyKey: "tutorial.aBody",
            bodyDefault: "a body",
          },
          {
            id: "b",
            titleKey: "tutorial.bTitle",
            titleDefault: "B",
            bodyKey: "tutorial.bBody",
            bodyDefault: "b body",
          },
        ];
      `)
    ).toEqual([
      "tutorial.aTitle",
      "tutorial.aBody",
      "tutorial.bTitle",
      "tutorial.bBody",
    ]);
  });

  it("reads keys written as template literals without substitutions", () => {
    expect(
      extractKeys(
        "const step = { titleKey: `tutorial.aTitle`, titleDefault: `A`," +
          " bodyKey: `tutorial.aBody`, bodyDefault: `a body` };"
      )
    ).toEqual(["tutorial.aTitle", "tutorial.aBody"]);
  });

  it("ignores unrelated objects that happen to have a titleKey", () => {
    expect(
      extractKeys(`
        const chartConfig = {
          titleKey: "revenue",
          bodyKey: "summary",
        };
      `)
    ).toEqual([]);
  });

  it("ignores a step-shaped object missing one of its default texts", () => {
    expect(
      extractKeys(`
        const step = {
          titleKey: "tutorial.aTitle",
          titleDefault: "A",
          bodyKey: "tutorial.aBody",
        };
      `)
    ).toEqual([]);
  });

  it("ignores an object with only one of the two key properties", () => {
    expect(
      extractKeys(`
        const banner = {
          titleKey: "promo.title",
          titleDefault: "Promo",
        };
      `)
    ).toEqual([]);
  });

  it("ignores computed keys it cannot resolve to a literal", () => {
    expect(
      extractKeys(`
        const suffix = "Title";
        const step = {
          titleKey: \`tutorial.\${suffix}\`,
          titleDefault: "A",
          bodyKey: "tutorial.aBody",
          bodyDefault: "a body",
        };
      `)
    ).toEqual([]);
  });
});
