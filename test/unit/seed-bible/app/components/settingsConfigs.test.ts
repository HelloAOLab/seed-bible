import settingsConfigs from "@packages/seed-bible/app/components/settingsConfigs.json";

describe("settingsConfigs", () => {
  const presets = settingsConfigs.presets;
  const presetNames = Object.keys(presets);

  it("should have presets defined", () => {
    expect(presets).toBeDefined();
    expect(presetNames.length).toBeGreaterThan(0);
  });

  it("should contain expected preset names", () => {
    expect(presetNames).toContain("minimal");
    expect(presetNames).toContain("full");
  });

  describe("minimal preset", () => {
    const minimal = presets["minimal"];

    it("should disable panels", () => {
      expect(minimal.appSettings?.disablePanels).toBe(true);
    });

    it("should remove spaces", () => {
      expect(minimal.appSettings?.removeSpaces).toBe(true);
    });

    it("should have settings sections", () => {
      expect(minimal.sections).toBeDefined();
    });

    it("should have account header section", () => {
      expect(minimal.sections?.accountHeader).toBeDefined();
      expect(minimal.sections?.accountHeader?.enabled).toBe(true);
    });

    it("should have account options section with theme enabled", () => {
      expect(minimal.sections?.accountOptions?.items?.theme?.enabled).toBe(
        true
      );
    });

    it("should have preferences section with language enabled", () => {
      expect(minimal.sections?.preferences?.items?.language?.enabled).toBe(
        true
      );
    });
  });

  describe("full preset", () => {
    const full = presets["full"] as Record<string, any>;

    it("should exist", () => {
      expect(full).toBeDefined();
    });
  });

  describe("all presets", () => {
    it.each(presetNames)("preset '%s' should be a valid object", (name) => {
      const preset = presets[name as keyof typeof presets];
      expect(preset).toBeDefined();
      expect(typeof preset).toBe("object");
    });

    it.each(presetNames)(
      "preset '%s' should have consistent structure",
      (name) => {
        const preset = presets[name as keyof typeof presets] as Record<
          string,
          any
        >;
        // If a preset defines sections, they should be an object
        if (preset.sections) {
          expect(typeof preset.sections).toBe("object");
        }
      }
    );
  });

  describe("client branding presets", () => {
    it("reflection-ministries should have client branding", () => {
      const rm = presets["reflection-ministries"] as Record<string, any>;
      expect(rm.clientBranding).toBeDefined();
      expect(rm.clientBranding.enabled).toBe(true);
      expect(rm.clientBranding.clientName).toBe("Reflection-ministries");
    });

    it("client branding should have required fields when enabled", () => {
      for (const name of presetNames) {
        const preset = presets[name as keyof typeof presets] as Record<
          string,
          any
        >;
        if (preset.clientBranding?.enabled) {
          expect(preset.clientBranding.clientName).toBeDefined();
          expect(typeof preset.clientBranding.clientName).toBe("string");
        }
      }
    });
  });
});
