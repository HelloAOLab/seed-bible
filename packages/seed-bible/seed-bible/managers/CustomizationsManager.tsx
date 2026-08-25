import * as z from "zod/v4";
import { v4 as uuid } from "uuid";
import {
  computed,
  signal,
  type ReadonlySignal,
  type Signal,
} from "@preact/signals";
import type { CasualOSManager } from "./OsManager";
import type { LoginManager } from "./LoginManager";
import type { NavigationManager } from "./NavigationManager";
import type { CustomizationVariantSelectionsManager } from "./CustomizationVariantSelectionsManager";
import {
  filterValidColorOverrides,
  type ThemeColorKey,
  type ThemeManager,
  type ThemeOverrides,
} from "./ThemeManager";

export const CUSTOMIZATION_MARKER = "publicRead:seedBibleCustomization";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.round(Math.min(255, Math.max(0, c)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

function rgbToHsl([r, g, b]: [number, number, number]): [
  number,
  number,
  number,
] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) {
    return [0, 0, l];
  }
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) {
    h = ((gn - bn) / d) % 6;
  } else if (max === gn) {
    h = (bn - rn) / d + 2;
  } else {
    h = (rn - gn) / d + 4;
  }
  h *= 60;
  if (h < 0) {
    h += 360;
  }
  return [h, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): [
  number,
  number,
  number,
] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255];
}

/** Lightens a hex color toward white by `amount` (0-1) of its remaining headroom. */
export function lightenColor(hex: string, amount: number): string {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb([h, s, l + (1 - l) * amount]));
}

export const SECONDARY_LIGHTEN_AMOUNT = 0.35;
export const TERTIARY_LIGHTEN_AMOUNT = 0.55;

const customizationVariantSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  themes: z.record(z.string(), z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const customizationSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    variants: z.array(customizationVariantSchema).min(1),
    defaultVariantId: z.string().min(1),
    logoUrl: z.url().max(1024).optional().nullable(),
    active: z.boolean(),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .refine((r) => r.variants.some((v) => v.id === r.defaultVariantId), {
    message: "defaultVariantId must reference an existing variant",
  });

export interface CustomizationThemeVariant {
  id: string;
  name: string;
  /** Color overrides in the same shape as `ThemeManager`'s own `ThemeOverrides`. */
  themes: ThemeOverrides;
  createdAt: number;
  updatedAt: number;
}

export interface SeedBibleCustomization {
  id: string;
  name: string;
  /** Named theme variants (e.g. a "Light" and "Dark" pair) authored for this customization. Always has at least 1 entry. */
  variants: CustomizationThemeVariant[];
  /** The variant id shown to a viewer who hasn't picked one for this customization yet. Always references an entry in `variants`. */
  defaultVariantId: string;
  logoUrl?: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

function buildCustomizationLocator(recordName: string, id: string): string {
  return `${recordName}.${id}`;
}

function narrowVariants(
  variants: {
    id: string;
    name: string;
    themes: Record<string, string>;
    createdAt: number;
    updatedAt: number;
  }[]
): CustomizationThemeVariant[] {
  return variants.map((variant) => ({
    ...variant,
    themes: filterValidColorOverrides(variant.themes),
  }));
}

function buildVariant(
  name: string,
  currentVariables: { primaryColor: string; fontColor: string }
): CustomizationThemeVariant {
  const now = Date.now();
  const primaryColor = currentVariables.primaryColor;
  return {
    id: `variant_${uuid()}`,
    name,
    themes: {
      primaryColor,
      secondaryColor: lightenColor(primaryColor, SECONDARY_LIGHTEN_AMOUNT),
      tertiaryColor: lightenColor(primaryColor, TERTIARY_LIGHTEN_AMOUNT),
      fontColor: currentVariables.fontColor,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export interface CustomizationsManager {
  customizations: Signal<SeedBibleCustomization[]>;
  isLoading: Signal<boolean>;
  /** The customization currently applied to the live theme, if any. */
  activeCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /** The variant of the active customization currently in effect (viewer's own pick, else the customization's default, else its first variant). */
  activeVariant: ReadonlySignal<CustomizationThemeVariant | null>;
  /**
   * The active variant's colors, session-only: layered on top of the
   * rendered theme by `SeedBibleStateManager`, never written to
   * `SettingsManager` — a refresh always reverts to the user's real theme.
   */
  activeThemeOverrides: ReadonlySignal<ThemeOverrides>;
  /**
   * A customization loaded via the `?customization={recordName}.{id}` share
   * link, if any. Takes priority over the signed-in user's own active
   * customization in `activeCustomization`.
   */
  linkedCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /** The customization id the editor settings page should show. */
  editingCustomizationId: Signal<string | null>;
  /** The variant id the variant editor settings page should show. */
  editingVariantId: Signal<string | null>;
  load: () => Promise<void>;
  /** Loads a customization by its `{recordName}.{id}` locator into `linkedCustomization`. */
  loadByLocator: (locator: string) => Promise<void>;
  create: () => Promise<SeedBibleCustomization>;
  rename: (id: string, name: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  uploadLogo: (id: string, file: File) => Promise<void>;
  removeLogo: (id: string) => Promise<void>;
  /** A shareable link that auto-loads this customization via `loadByLocator`. */
  getShareLink: (customization: SeedBibleCustomization) => string;
  /** Adds a new variant seeded from the current live theme. */
  addVariant: (
    customizationId: string
  ) => Promise<CustomizationThemeVariant | null>;
  renameVariant: (
    customizationId: string,
    variantId: string,
    name: string
  ) => Promise<void>;
  setVariantColor: (
    customizationId: string,
    variantId: string,
    key: ThemeColorKey,
    value: string
  ) => Promise<void>;
  setDefaultVariant: (
    customizationId: string,
    variantId: string
  ) => Promise<void>;
  /** Removes a variant. No-ops if it's the only remaining variant on the customization. */
  removeVariant: (customizationId: string, variantId: string) => Promise<void>;
  /** Persists the viewer's variant choice for the currently active customization. No-op if none is active. */
  selectActiveVariant: (variantId: string) => Promise<void>;
}

export function createCustomizationsManager(
  os: CasualOSManager,
  login: LoginManager,
  theme: ThemeManager,
  navigation: NavigationManager,
  variantSelections: CustomizationVariantSelectionsManager
): CustomizationsManager {
  const customizations = signal<SeedBibleCustomization[]>([]);
  const isLoading = signal(false);
  const editingCustomizationId = signal<string | null>(null);
  const editingVariantId = signal<string | null>(null);
  const linkedCustomization = signal<SeedBibleCustomization | null>(null);
  const linkedCustomizationLocator = signal<string | null>(null);

  const loadByLocator = async (locator: string): Promise<void> => {
    // `id` is always `customization_<uuid>` (no dots); split on the LAST dot
    // so a recordName that happens to contain one still parses correctly.
    const dotIndex = locator.lastIndexOf(".");
    if (dotIndex <= 0 || dotIndex === locator.length - 1) {
      console.warn("Invalid customization locator:", locator);
      return;
    }
    const recordName = locator.slice(0, dotIndex);
    const id = locator.slice(dotIndex + 1);

    try {
      const result = await os.getData(recordName, id);
      if (!result.success || !result.data) {
        console.warn("Customization not found for locator:", locator);
        return;
      }
      const parsed = customizationSchema.safeParse(result.data);
      if (!parsed.success) {
        console.warn(
          "Invalid customization record for locator:",
          locator,
          parsed.error
        );
        return;
      }
      linkedCustomization.value = {
        ...parsed.data,
        variants: narrowVariants(parsed.data.variants),
      };
      linkedCustomizationLocator.value = locator;
    } catch (error) {
      console.error(
        "Failed to load customization from locator:",
        locator,
        error
      );
    }
  };

  const initialLocator =
    navigation.initialUrl.searchParams.get("customization");
  if (initialLocator) {
    void loadByLocator(initialLocator);
  }

  const activeCustomization = computed(
    () =>
      linkedCustomization.value ??
      customizations.value.find((c) => c.active) ??
      null
  );

  const activeCustomizationLocator = computed<string | null>(() => {
    if (linkedCustomization.value) {
      return linkedCustomizationLocator.value;
    }
    const own = customizations.value.find((c) => c.active);
    if (!own) {
      return null;
    }
    const recordName = login.userId.value;
    return recordName ? buildCustomizationLocator(recordName, own.id) : null;
  });

  const activeVariant = computed<CustomizationThemeVariant | null>(() => {
    const customization = activeCustomization.value;
    if (!customization) {
      return null;
    }
    const locator = activeCustomizationLocator.value;
    const selectedId = locator
      ? variantSelections.getSelectedVariantId(locator)
      : null;
    const byId = (id: string | null | undefined) =>
      id ? customization.variants.find((v) => v.id === id) : undefined;
    return (
      byId(selectedId) ??
      byId(customization.defaultVariantId) ??
      customization.variants[0] ??
      null
    );
  });

  const activeThemeOverrides = computed<ThemeOverrides>(
    () => activeVariant.value?.themes ?? {}
  );

  const load = async () => {
    const userId = login.userId.value;
    if (!userId) {
      customizations.value = [];
      return;
    }

    isLoading.value = true;
    try {
      const result = await os.listAllDataByMarker(userId, CUSTOMIZATION_MARKER);
      const loaded: SeedBibleCustomization[] = [];
      for (const item of result.items) {
        const parsed = customizationSchema.safeParse(item.data);
        if (!parsed.success) {
          console.warn("Skipping invalid customization record:", parsed.error);
          continue;
        }
        loaded.push({
          ...parsed.data,
          variants: narrowVariants(parsed.data.variants),
        });
      }
      customizations.value = loaded;
    } catch (error) {
      console.error("Failed to load customizations:", error);
    } finally {
      isLoading.value = false;
    }
  };

  const persist = async (
    userId: string,
    record: SeedBibleCustomization
  ): Promise<void> => {
    await os.recordData(userId, record.id, record, {
      marker: CUSTOMIZATION_MARKER,
    });
  };

  const create = async (): Promise<SeedBibleCustomization> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Cannot create a customization while signed out.");
    }

    const now = Date.now();
    const variant = buildVariant(
      theme.basePresetTheme.value.name,
      theme.currentTheme.value.variables
    );
    const record: SeedBibleCustomization = {
      id: `customization_${uuid()}`,
      name: `Customization ${customizations.value.length + 1}`,
      variants: [variant],
      defaultVariantId: variant.id,
      logoUrl: null,
      active: false,
      createdAt: now,
      updatedAt: now,
    };

    await persist(userId, record);
    customizations.value = [...customizations.value, record];
    return record;
  };

  const updateRecord = async (
    id: string,
    patch: (record: SeedBibleCustomization) => SeedBibleCustomization
  ): Promise<SeedBibleCustomization | null> => {
    const userId = login.userId.value;
    const existing = customizations.value.find((c) => c.id === id);
    if (!userId || !existing) {
      return null;
    }

    const updated = patch(existing);
    await persist(userId, updated);
    customizations.value = customizations.value.map((c) =>
      c.id === id ? updated : c
    );
    return updated;
  };

  const updateVariants = async (
    customizationId: string,
    patch: (
      variants: CustomizationThemeVariant[]
    ) => CustomizationThemeVariant[]
  ): Promise<SeedBibleCustomization | null> =>
    updateRecord(customizationId, (record) => ({
      ...record,
      variants: patch(record.variants),
      updatedAt: Date.now(),
    }));

  const rename = async (id: string, name: string): Promise<void> => {
    await updateRecord(id, (record) => ({
      ...record,
      name,
      updatedAt: Date.now(),
    }));
  };

  const addVariant = async (
    customizationId: string
  ): Promise<CustomizationThemeVariant | null> => {
    const existing = customizations.value.find((c) => c.id === customizationId);
    if (!existing) {
      return null;
    }

    const baseName = theme.basePresetTheme.value.name;
    const usedNames = new Set(existing.variants.map((v) => v.name));
    const name = usedNames.has(baseName)
      ? `Variant ${existing.variants.length + 1}`
      : baseName;
    const variant = buildVariant(name, theme.currentTheme.value.variables);

    await updateVariants(customizationId, (variants) => [...variants, variant]);
    return variant;
  };

  const renameVariant = async (
    customizationId: string,
    variantId: string,
    name: string
  ): Promise<void> => {
    await updateVariants(customizationId, (variants) =>
      variants.map((v) =>
        v.id === variantId ? { ...v, name, updatedAt: Date.now() } : v
      )
    );
  };

  const setVariantColor = async (
    customizationId: string,
    variantId: string,
    key: ThemeColorKey,
    value: string
  ): Promise<void> => {
    await updateVariants(customizationId, (variants) =>
      variants.map((variant) => {
        if (variant.id !== variantId) {
          return variant;
        }
        if (key !== "primaryColor") {
          return {
            ...variant,
            themes: { ...variant.themes, [key]: value },
            updatedAt: Date.now(),
          };
        }

        // Secondary/tertiary follow the primary color as long as they still
        // match its lightened derivation — the moment a user manually picks
        // one, it stops matching and is left alone on future primary edits.
        const previousPrimary = variant.themes.primaryColor;
        const nextThemes: ThemeOverrides = {
          ...variant.themes,
          primaryColor: value,
        };
        if (
          previousPrimary &&
          variant.themes.secondaryColor ===
            lightenColor(previousPrimary, SECONDARY_LIGHTEN_AMOUNT)
        ) {
          nextThemes.secondaryColor = lightenColor(
            value,
            SECONDARY_LIGHTEN_AMOUNT
          );
        }
        if (
          previousPrimary &&
          variant.themes.tertiaryColor ===
            lightenColor(previousPrimary, TERTIARY_LIGHTEN_AMOUNT)
        ) {
          nextThemes.tertiaryColor = lightenColor(
            value,
            TERTIARY_LIGHTEN_AMOUNT
          );
        }

        return { ...variant, themes: nextThemes, updatedAt: Date.now() };
      })
    );
  };

  const setDefaultVariant = async (
    customizationId: string,
    variantId: string
  ): Promise<void> => {
    const existing = customizations.value.find((c) => c.id === customizationId);
    if (!existing || !existing.variants.some((v) => v.id === variantId)) {
      return;
    }
    await updateRecord(customizationId, (record) => ({
      ...record,
      defaultVariantId: variantId,
      updatedAt: Date.now(),
    }));
  };

  const removeVariant = async (
    customizationId: string,
    variantId: string
  ): Promise<void> => {
    const existing = customizations.value.find((c) => c.id === customizationId);
    if (!existing || existing.variants.length <= 1) {
      return;
    }
    if (!existing.variants.some((v) => v.id === variantId)) {
      return;
    }

    const remaining = existing.variants.filter((v) => v.id !== variantId);
    const nextDefaultVariantId =
      existing.defaultVariantId === variantId
        ? remaining[0]!.id
        : existing.defaultVariantId;

    await updateRecord(customizationId, (record) => ({
      ...record,
      variants: remaining,
      defaultVariantId: nextDefaultVariantId,
      updatedAt: Date.now(),
    }));
  };

  const setActive = async (id: string): Promise<void> => {
    const target = customizations.value.find((c) => c.id === id);
    if (!target) {
      return;
    }

    const previouslyActive = customizations.value.find(
      (c) => c.active && c.id !== id
    );
    if (previouslyActive) {
      await updateRecord(previouslyActive.id, (record) => ({
        ...record,
        active: false,
        updatedAt: Date.now(),
      }));
    }

    await updateRecord(id, (record) => ({
      ...record,
      active: true,
      updatedAt: Date.now(),
    }));
  };

  const deactivate = async (id: string): Promise<void> => {
    const existing = customizations.value.find((c) => c.id === id);
    if (!existing?.active) {
      return;
    }

    await updateRecord(id, (record) => ({
      ...record,
      active: false,
      updatedAt: Date.now(),
    }));
  };

  const remove = async (id: string): Promise<void> => {
    const userId = login.userId.value;
    const existing = customizations.value.find((c) => c.id === id);
    if (!userId || !existing) {
      return;
    }

    await os.eraseData(userId, id);
    customizations.value = customizations.value.filter((c) => c.id !== id);
  };

  const uploadLogo = async (id: string, file: File): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Cannot upload a logo while signed out.");
    }

    const result = await os.recordFile(userId, file, {
      mimeType: file.type,
      marker: CUSTOMIZATION_MARKER,
    });
    if (result.success === false) {
      throw new Error("Failed to upload logo.");
    }

    await updateRecord(id, (record) => ({
      ...record,
      logoUrl: result.url,
      updatedAt: Date.now(),
    }));
  };

  const removeLogo = async (id: string): Promise<void> => {
    await updateRecord(id, (record) => ({
      ...record,
      logoUrl: null,
      updatedAt: Date.now(),
    }));
  };

  const getShareLink = (customization: SeedBibleCustomization): string => {
    const recordName = login.userId.value ?? "";
    return navigation.linkToQuery({
      customization: buildCustomizationLocator(recordName, customization.id),
    });
  };

  const selectActiveVariant = async (variantId: string): Promise<void> => {
    const locator = activeCustomizationLocator.value;
    if (!locator) {
      return;
    }
    await variantSelections.selectVariant(locator, variantId);
  };

  return {
    customizations,
    isLoading,
    activeCustomization,
    activeVariant,
    activeThemeOverrides,
    linkedCustomization,
    editingCustomizationId,
    editingVariantId,
    load,
    loadByLocator,
    create,
    rename,
    setActive,
    deactivate,
    remove,
    uploadLogo,
    removeLogo,
    getShareLink,
    addVariant,
    renameVariant,
    setVariantColor,
    setDefaultVariant,
    removeVariant,
    selectActiveVariant,
  };
}
