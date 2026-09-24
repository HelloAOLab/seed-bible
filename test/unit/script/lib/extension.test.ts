import { describe, expect, it } from "vitest";
import { ExtensionMetaSchema } from "../../../../script/lib/extension";

describe("ExtensionMetaSchema", () => {
  const meta = (settings?: unknown) => ({
    id: "example-extension",
    translations: { en: { title: "Example", description: "" } },
    ...(settings === undefined ? {} : { settings }),
  });

  it("accepts an extension that declares no settings", () => {
    expect(ExtensionMetaSchema.safeParse(meta()).success).toBe(true);
  });

  it("accepts each supported setting type with a matching default", () => {
    const result = ExtensionMetaSchema.safeParse(
      meta({
        greeting: { type: "string", default: "Hello" },
        greetingSize: { type: "number", default: 1.5 },
        showBanner: { type: "boolean", default: true },
        subtitle: { type: "string" },
      })
    );

    expect(result.success).toBe(true);
  });

  // Regression test: `settings` used to pass through unchecked, so a bad
  // extension.json only surfaced as a broken field when the form rendered it.
  it("rejects a setting whose type isn't one this app supports", () => {
    const result = ExtensionMetaSchema.safeParse(
      meta({ greeting: { type: "strnig", default: "Hello" } })
    );

    expect(result.success).toBe(false);
  });

  it("rejects a default that doesn't match the setting's type", () => {
    const result = ExtensionMetaSchema.safeParse(
      meta({ greetingSize: { type: "number", default: "1.5" } })
    );

    expect(result.success).toBe(false);
  });

  it("rejects a setting that declares no type at all", () => {
    const result = ExtensionMetaSchema.safeParse(
      meta({ greeting: { default: "Hello" } })
    );

    expect(result.success).toBe(false);
  });

  it("accepts number bounds and a whole-number step, and a string enum", () => {
    const result = ExtensionMetaSchema.safeParse(
      meta({
        repeatCount: {
          type: "number",
          default: 1,
          minimum: 1,
          maximum: 10,
          multipleOf: 1,
        },
        tone: {
          type: "string",
          default: "warm",
          enum: ["plain", "warm", "bold"],
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.data?.settings?.repeatCount).toMatchObject({
      minimum: 1,
      maximum: 10,
      multipleOf: 1,
    });
    expect(result.data?.settings?.tone).toMatchObject({
      enum: ["plain", "warm", "bold"],
    });
  });

  const problems = (settings: unknown) => {
    const result = ExtensionMetaSchema.safeParse(meta(settings));
    expect(result.success).toBe(false);
    if (result.success) {
      return [];
    }
    return result.error.issues.map((issue) => issue.message);
  };

  it("names the constraint a default breaks, instead of a generic failure", () => {
    expect(
      problems({
        repeatCount: { type: "number", default: 11, minimum: 1, maximum: 10 },
      })
    ).toContain("default 11 is greater than maximum 10");
    expect(
      problems({
        repeatCount: { type: "number", default: 0, minimum: 1, maximum: 10 },
      })
    ).toContain("default 0 is less than minimum 1");
    expect(
      problems({
        repeatCount: { type: "number", default: 1.5, multipleOf: 1 },
      })
    ).toContain("default 1.5 is not a multiple of 1");
    expect(
      problems({
        repeatCount: {
          type: "number",
          default: 11.5,
          minimum: 1,
          maximum: 10,
          multipleOf: 1,
        },
      })
    ).toEqual([
      "default 11.5 is greater than maximum 10",
      "default 11.5 is not a multiple of 1",
    ]);
    expect(
      problems({ tone: { type: "string", default: "loud", enum: ["warm"] } })
    ).toContain('default "loud" is not one of "warm"');
  });

  it("names a step, an inverted range, and an empty enum", () => {
    expect(
      problems({ repeatCount: { type: "number", multipleOf: 0 } })
    ).toContain("multipleOf must be a finite number greater than 0 (got 0)");
    expect(
      problems({ repeatCount: { type: "number", minimum: 10, maximum: 1 } })
    ).toContain("minimum 10 is greater than maximum 1");
    expect(problems({ tone: { type: "string", enum: [] } })).toContain(
      "enum must list at least one value"
    );
  });

  it("rejects a range that no multiple of the step can fall inside", () => {
    expect(
      problems({
        repeatCount: { type: "number", minimum: 1, maximum: 1, multipleOf: 2 },
      })
    ).toContain("no multiple of 2 lies between minimum 1 and maximum 1");
  });

  // Unknown keys still ride along, so a setting can carry a field this script
  // doesn't understand yet without it being stripped from the uploaded meta.
  it("keeps keys it doesn't know about on a setting", () => {
    const result = ExtensionMetaSchema.safeParse(
      meta({
        greetingSize: {
          type: "number",
          default: 1.5,
          markdownDescription: "How large",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.data?.settings?.greetingSize).toEqual({
      type: "number",
      default: 1.5,
      markdownDescription: "How large",
    });
  });
});
