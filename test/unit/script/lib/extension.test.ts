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

  // Constraints such as `minimum` are planned but unknown here today; the
  // uploaded meta has to carry them through rather than drop them.
  it("keeps keys it doesn't know about on a setting", () => {
    const result = ExtensionMetaSchema.safeParse(
      meta({ greetingSize: { type: "number", default: 1.5, minimum: 1 } })
    );

    expect(result.success).toBe(true);
    expect(result.data?.settings?.greetingSize).toEqual({
      type: "number",
      default: 1.5,
      minimum: 1,
    });
  });
});
