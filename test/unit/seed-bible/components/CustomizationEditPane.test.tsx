import { signal } from "@preact/signals";
import { buildCustomizationTutorialSteps } from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationEditPane";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

/**
 * Fakes only the two `customizations` members a tutorial step's `onEnter`
 * actually touches — the same "as unknown as X" pattern
 * `TutorialManager.test.tsx` uses for its sibling managers.
 */
function createState(editingVariantId: string | null = null): {
  state: SeedBibleState;
  selectActiveVariant: ReturnType<typeof vi.fn>;
} {
  const selectActiveVariant = vi.fn().mockResolvedValue(undefined);
  const state = {
    customizations: {
      editingVariantId: signal(editingVariantId),
      selectActiveVariant,
    },
  } as unknown as SeedBibleState;
  return { state, selectActiveVariant };
}

describe("buildCustomizationTutorialSteps", () => {
  it("covers the customization fields, then every theme-editor section, in order", () => {
    const { state } = createState();

    const steps = buildCustomizationTutorialSteps(state, "variant-1");

    expect(steps.map((step) => step.id)).toEqual([
      "customization-tutorial-name",
      "customization-tutorial-logo",
      "customization-tutorial-themes",
      "customization-tutorial-variant-name",
      "customization-tutorial-base",
      "customization-tutorial-theme-group-brand",
      "customization-tutorial-theme-group-surfaces",
      "customization-tutorial-theme-group-text",
      "customization-tutorial-theme-group-selection",
      "customization-tutorial-fonts",
      "customization-tutorial-highlights",
    ]);
    expect(steps.map((step) => step.target)).toEqual([
      '[data-tutorial="customization-name"]',
      '[data-tutorial="customization-logo"]',
      '[data-tutorial="customization-themes"]',
      '[data-tutorial="theme-variant-name"]',
      '[data-tutorial="theme-base"]',
      '[data-tutorial="theme-group-brand"]',
      '[data-tutorial="theme-group-surfaces"]',
      '[data-tutorial="theme-group-text"]',
      '[data-tutorial="theme-group-selection"]',
      '[data-tutorial="theme-group-fonts"]',
      '[data-tutorial="theme-group-highlights"]',
    ]);
  });

  it("leaves the customization-level steps (name, logo, themes list) inert", () => {
    const { state, selectActiveVariant } = createState();

    const steps = buildCustomizationTutorialSteps(state, "variant-1");

    for (const step of steps.slice(0, 3)) {
      expect(step.onEnter).toBeUndefined();
      expect(step.onLeave).toBeUndefined();
    }
    expect(selectActiveVariant).not.toHaveBeenCalled();
  });

  it("deep-links into the target variant's theme editor when its step group is entered", () => {
    const { state, selectActiveVariant } = createState();
    const steps = buildCustomizationTutorialSteps(state, "variant-1");

    // First step of the theme-editor group.
    steps[3]!.onEnter?.();

    expect(state.customizations.editingVariantId.value).toBe("variant-1");
    expect(selectActiveVariant).toHaveBeenCalledWith("variant-1");
  });

  it("does not re-select the variant for a later step already inside the same group", () => {
    const { state, selectActiveVariant } = createState("variant-1");
    const steps = buildCustomizationTutorialSteps(state, "variant-1");

    // Enter the group, then clear the spy to isolate the next step's effect.
    steps[3]!.onEnter?.();
    selectActiveVariant.mockClear();

    steps[4]!.onEnter?.(); // "Base theme", still inside the group

    expect(selectActiveVariant).not.toHaveBeenCalled();
  });

  it("re-selects the variant on entry if editingVariantId had drifted to another one", () => {
    const { state, selectActiveVariant } = createState("some-other-variant");
    const steps = buildCustomizationTutorialSteps(state, "variant-1");

    steps[3]!.onEnter?.();

    expect(state.customizations.editingVariantId.value).toBe("variant-1");
    expect(selectActiveVariant).toHaveBeenCalledWith("variant-1");
  });

  it("defines onLeave for every theme-editor step, to restore the main editor on exit", () => {
    const { state } = createState();
    const steps = buildCustomizationTutorialSteps(state, "variant-1");

    for (const step of steps.slice(3)) {
      expect(step.onLeave).toBeDefined();
    }
  });
});
