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

  describe("sensitive settings", () => {
    const sensitiveMeta = (
      settings: unknown,
      sensitive: unknown = {
        exampleApi: {
          host: "api.example.com",
          requestMapping: {
            "headers.authorization.bearer": "apiKey",
            "body.client_id": "clientId",
          },
        },
      }
    ) => ({ ...meta(settings), sensitive });

    const sensitiveProblems = (settings: unknown, sensitive?: unknown) => {
      const result = ExtensionMetaSchema.safeParse(
        sensitiveMeta(settings, sensitive)
      );
      expect(result.success).toBe(false);
      if (result.success) {
        return [];
      }
      return result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      );
    };

    const bothSettings = {
      apiKey: { type: "string", sensitive: "exampleApi" },
      clientId: { type: "string", sensitive: "exampleApi" },
    };

    it("accepts several settings that share one sensitive destination", () => {
      const result = ExtensionMetaSchema.safeParse(sensitiveMeta(bothSettings));

      expect(result.success).toBe(true);
      expect(result.data?.sensitive?.exampleApi?.host).toBe("api.example.com");
    });

    it("rejects a setting that names a destination the manifest doesn't declare", () => {
      expect(
        sensitiveProblems({
          ...bothSettings,
          other: { type: "string", sensitive: "missing" },
        })
      ).toContain(
        'settings.other.sensitive: names "missing", which isn\'t declared in the sensitive section'
      );
    });

    it("rejects a sensitive setting that no requestMapping entry sends", () => {
      expect(
        sensitiveProblems({
          ...bothSettings,
          unused: { type: "string", sensitive: "exampleApi" },
        })
      ).toContain(
        "settings.unused.sensitive: isn't used by any requestMapping entry in sensitive.exampleApi"
      );
    });

    it("rejects a mapping to an undeclared setting or to an ordinary one", () => {
      const issues = sensitiveProblems({
        apiKey: { type: "string", sensitive: "exampleApi" },
        clientId: { type: "string" },
      });

      expect(issues).toContain(
        'sensitive.exampleApi.requestMapping.body.client_id: maps to setting "clientId", which must declare "sensitive": "exampleApi"'
      );
      expect(
        sensitiveProblems({
          apiKey: { type: "string", sensitive: "exampleApi" },
        })
      ).toContain(
        'sensitive.exampleApi.requestMapping.body.client_id: maps to setting "clientId", which isn\'t declared'
      );
    });

    // Anything in the manifest is public, so a default or a list of choices
    // would give the secret away.
    it("rejects a default or enum on a sensitive setting", () => {
      const issues = sensitiveProblems({
        apiKey: { type: "string", sensitive: "exampleApi", default: "abc" },
        clientId: { type: "string", sensitive: "exampleApi", enum: ["a"] },
      });

      expect(issues).toContain(
        "settings.apiKey.default: a sensitive setting can't declare default"
      );
      expect(issues).toContain(
        "settings.clientId.enum: a sensitive setting can't declare enum"
      );
    });

    // Without this a sensitive number would be stored as an ordinary,
    // publicly readable value.
    it("rejects sensitive on a setting that isn't a string", () => {
      expect(
        sensitiveProblems({
          ...bothSettings,
          count: { type: "number", sensitive: "exampleApi" },
        })
      ).toContain(
        "settings.count.sensitive: only string settings can be sensitive, but this setting is a number"
      );
    });

    it("rejects a host with a scheme or path, and a property proxies can't fill", () => {
      const issues = sensitiveProblems(bothSettings, {
        exampleApi: {
          host: "https://api.example.com/v1",
          requestMapping: {
            "headers.x-forwarded-for": "apiKey",
            "body.client_id": "clientId",
          },
        },
      });

      expect(
        issues.some((issue) => issue.startsWith("sensitive.exampleApi.host:"))
      ).toBe(true);
      expect(
        issues.some((issue) =>
          issue.startsWith(
            "sensitive.exampleApi.requestMapping.headers.x-forwarded-for:"
          )
        )
      ).toBe(true);
    });

    it("accepts a host with a port", () => {
      const result = ExtensionMetaSchema.safeParse(
        sensitiveMeta(bothSettings, {
          exampleApi: {
            host: "example.com:8443",
            requestMapping: {
              "headers.authorization": "apiKey",
              "body.client_id": "clientId",
            },
          },
        })
      );

      expect(result.success).toBe(true);
    });

    // Visibility is the viewer's choice alone.
    it("rejects a visibility declared by the extension", () => {
      const withVisibility = (visibility: unknown) =>
        ExtensionMetaSchema.safeParse(
          sensitiveMeta(bothSettings, {
            exampleApi: {
              host: "api.example.com",
              visibility,
              requestMapping: {
                "headers.authorization.bearer": "apiKey",
                "body.client_id": "clientId",
              },
            },
          })
        ).success;

      expect(withVisibility(undefined)).toBe(true);
      expect(withVisibility("private")).toBe(false);
      expect(withVisibility("public")).toBe(false);
    });
  });
});
