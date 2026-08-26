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
import type { CustomizationExtensionPreferencesManager } from "./CustomizationExtensionPreferencesManager";
import {
  filterValidColorOverrides,
  type BibleThemeVariables,
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
    /**
     * IDs of extensions this customization installs automatically while
     * active. Every id must reference the app's own known extension
     * catalog — never a URL or other free-form identity, since install
     * happens with no confirmation step. Only ever written from the
     * checklist in CustomizationEditSettingsView.
     */
    extensionIds: z.array(z.string()).default([]),
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
  /** Extension ids this customization installs automatically while active. */
  extensionIds: string[];
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

export interface CustomizationColorGroup {
  id: string;
  title: string;
  fields: { key: ThemeColorKey; label: string }[];
}

export const CUSTOMIZATION_COLOR_GROUPS: CustomizationColorGroup[] = [
  {
    id: "brand",
    title: "Brand",
    fields: [
      { key: "primaryColor", label: "Primary" },
      { key: "secondaryColor", label: "Secondary" },
      { key: "tertiaryColor", label: "Tertiary" },
      { key: "linkColor", label: "Link" },
      { key: "linkVisitedColor", label: "Visited link" },
    ],
  },
  {
    id: "surfaces",
    title: "Surfaces",
    fields: [
      { key: "background", label: "App background" },
      { key: "readerBackground", label: "Reader background" },
      { key: "sidebarBackground", label: "Sidebar background" },
      { key: "readerToolbarBackground", label: "Reader toolbar background" },
      {
        key: "readerToolbarFloatingButtonBackground",
        label: "Floating button background",
      },
    ],
  },
  {
    id: "text",
    title: "Text",
    fields: [
      { key: "fontColor", label: "Text" },
      { key: "readerFontColor", label: "Reader text" },
      { key: "sidebarFontColor", label: "Sidebar text" },
      { key: "bookTitleFontColor", label: "Book title" },
      { key: "chapterHeadingFontColor", label: "Chapter heading" },
      { key: "verseFontColor", label: "Verse" },
      { key: "readerToolbarFontColor", label: "Reader toolbar text" },
      {
        key: "readerToolbarFloatingButtonFontColor",
        label: "Floating button text",
      },
    ],
  },
  {
    id: "selection",
    title: "Verse selection",
    fields: [
      {
        key: "selectedVerseTextDecorationColor",
        label: "Selected verse decoration",
      },
    ],
  },
];

export const CUSTOMIZATION_COLOR_FIELDS: {
  key: ThemeColorKey;
  label: string;
}[] = CUSTOMIZATION_COLOR_GROUPS.flatMap((group) => group.fields);

function buildVariant(
  name: string,
  currentVariables: BibleThemeVariables
): CustomizationThemeVariant {
  const now = Date.now();
  const primaryColor = currentVariables.primaryColor;
  const themes: ThemeOverrides = {
    primaryColor,
    secondaryColor: lightenColor(primaryColor, SECONDARY_LIGHTEN_AMOUNT),
    tertiaryColor: lightenColor(primaryColor, TERTIARY_LIGHTEN_AMOUNT),
  };
  for (const field of CUSTOMIZATION_COLOR_FIELDS) {
    if (
      field.key === "primaryColor" ||
      field.key === "secondaryColor" ||
      field.key === "tertiaryColor"
    ) {
      continue;
    }
    const value = currentVariables[field.key];
    if (typeof value === "string" && value.length > 0) {
      themes[field.key] = value;
    }
  }
  return {
    id: `variant_${uuid()}`,
    name,
    themes,
    createdAt: now,
    updatedAt: now,
  };
}

export interface CustomizationsManager {
  customizations: Signal<SeedBibleCustomization[]>;
  isLoading: Signal<boolean>;
  /** The customization currently applied to the live theme, if any. Prefers the in-progress edit draft over the persisted record when they're the same customization, so unsaved color edits preview live. */
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
   * The extension ids that should be installed while the active
   * customization is in effect: its own declared `extensionIds`, unioned
   * with any extras the viewer added for it via
   * `addExtensionToActiveCustomization`. Empty when nothing is active.
   */
  activeExtensionIds: ReadonlySignal<string[]>;
  /**
   * A customization loaded via the `?customization={recordName}.{id}` share
   * link, if any. Takes priority over the signed-in user's own active
   * customization in `activeCustomization`.
   */
  linkedCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /**
   * The local, unpersisted draft of the customization currently open in the
   * editor settings pages, or null when none is open. Edits accumulate here
   * and are only written to CasualOS by `saveEditingCustomization`.
   */
  editingCustomization: Signal<SeedBibleCustomization | null>;
  /** The variant id the variant editor settings page should show. */
  editingVariantId: Signal<string | null>;
  load: () => Promise<void>;
  /** Loads a customization by its `{recordName}.{id}` locator into `linkedCustomization`. */
  loadByLocator: (locator: string) => Promise<void>;
  create: () => Promise<SeedBibleCustomization>;
  /** Seeds `editingCustomization` from the persisted record with this id. No-ops if not found. */
  startEditing: (id: string) => void;
  /** Clears `editingCustomization` and `editingVariantId`, discarding any unsaved edits. */
  stopEditing: () => void;
  /** Persists `editingCustomization` and upserts it into `customizations`. No-op if there's no draft or the user is signed out. */
  saveEditingCustomization: () => Promise<void>;
  setActive: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Uploads the file immediately, then stages the resulting URL onto the open draft only — call `saveEditingCustomization` to persist it. */
  uploadLogo: (file: File) => Promise<void>;
  /** A shareable link that auto-loads this customization via `loadByLocator`. */
  getShareLink: (customization: SeedBibleCustomization) => string;
  // Synchronous, draft-only mutators. Each no-ops if `editingCustomization` is null.
  updateEditingName: (name: string) => void;
  removeEditingLogo: () => void;
  /** Adds a new variant to the draft, seeded from the current live theme. */
  addEditingVariant: () => CustomizationThemeVariant | null;
  renameEditingVariant: (variantId: string, name: string) => void;
  setEditingVariantColor: (
    variantId: string,
    key: ThemeColorKey,
    value: string
  ) => void;
  setEditingDefaultVariant: (variantId: string) => void;
  /** Removes a variant from the draft. No-op if it's the only remaining variant. */
  removeEditingVariant: (variantId: string) => void;
  /** Persists the viewer's variant choice for the currently active customization. No-op if none is active. */
  selectActiveVariant: (variantId: string) => Promise<void>;
  /** Toggles an extension id on the draft's base `extensionIds` list. No-op with no open draft. */
  toggleEditingExtensionId: (extensionId: string) => void;
  /** Adds an extra extension id to the viewer's own preferences for the active customization. No-op if none is active. */
  addExtensionToActiveCustomization: (extensionId: string) => Promise<void>;
  /** Removes an extra extension id from the viewer's own preferences for the active customization. No-op if none is active or the id isn't one of the viewer's extras. */
  removeExtensionFromActiveCustomization: (
    extensionId: string
  ) => Promise<void>;
}

export function createCustomizationsManager(
  os: CasualOSManager,
  login: LoginManager,
  theme: ThemeManager,
  navigation: NavigationManager,
  variantSelections: CustomizationVariantSelectionsManager,
  extensionPreferences: CustomizationExtensionPreferencesManager
): CustomizationsManager {
  const customizations = signal<SeedBibleCustomization[]>([]);
  const isLoading = signal(false);
  const editingCustomization = signal<SeedBibleCustomization | null>(null);
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

  const activeCustomization = computed<SeedBibleCustomization | null>(() => {
    if (linkedCustomization.value) {
      return linkedCustomization.value;
    }
    const own = customizations.value.find((c) => c.active) ?? null;
    if (!own) {
      return null;
    }
    // Prefer the in-progress edit draft for display purposes, so unsaved
    // color/variant edits preview live on the app while it's still active —
    // "don't save after every change" is about the network write, not the
    // live preview. Nothing is persisted here; only saveEditingCustomization
    // writes to CasualOS.
    const draft = editingCustomization.value;
    return draft && draft.id === own.id ? draft : own;
  });

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

  const activeExtensionIds = computed<string[]>(() => {
    const customization = activeCustomization.value;
    if (!customization) {
      return [];
    }
    const locator = activeCustomizationLocator.value;
    const extra = locator
      ? extensionPreferences.getExtraExtensionIds(locator)
      : [];
    return Array.from(new Set([...customization.extensionIds, ...extra]));
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
      extensionIds: [],
    };

    await persist(userId, record);
    customizations.value = [...customizations.value, record];
    return record;
  };

  const startEditing = (id: string): void => {
    const existing = customizations.value.find((c) => c.id === id);
    if (!existing) {
      return;
    }
    editingCustomization.value = existing;
  };

  const stopEditing = (): void => {
    editingCustomization.value = null;
    editingVariantId.value = null;
  };

  const saveEditingCustomization = async (): Promise<void> => {
    const userId = login.userId.value;
    const current = editingCustomization.value;
    if (!userId || !current) {
      return;
    }

    const saved: SeedBibleCustomization = { ...current, updatedAt: Date.now() };
    await persist(userId, saved);
    customizations.value = customizations.value.some((c) => c.id === saved.id)
      ? customizations.value.map((c) => (c.id === saved.id ? saved : c))
      : [...customizations.value, saved];
    editingCustomization.value = saved;
  };

  // Only used by setActive/deactivate/remove, which stay immediate (they're
  // one-click actions, not staged field edits).
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

  const updateEditingName = (name: string): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = { ...current, name, updatedAt: Date.now() };
  };

  const addEditingVariant = (): CustomizationThemeVariant | null => {
    const current = editingCustomization.value;
    if (!current) {
      return null;
    }

    const baseName = theme.basePresetTheme.value.name;
    const usedNames = new Set(current.variants.map((v) => v.name));
    const name = usedNames.has(baseName)
      ? `Variant ${current.variants.length + 1}`
      : baseName;
    const variant = buildVariant(name, theme.currentTheme.value.variables);

    editingCustomization.value = {
      ...current,
      variants: [...current.variants, variant],
      updatedAt: Date.now(),
    };
    return variant;
  };

  const renameEditingVariant = (variantId: string, name: string): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((v) =>
        v.id === variantId ? { ...v, name, updatedAt: Date.now() } : v
      ),
      updatedAt: Date.now(),
    };
  };

  const setEditingVariantColor = (
    variantId: string,
    key: ThemeColorKey,
    value: string
  ): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      variants: current.variants.map((variant) => {
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
      }),
      updatedAt: Date.now(),
    };
  };

  const setEditingDefaultVariant = (variantId: string): void => {
    const current = editingCustomization.value;
    if (!current || !current.variants.some((v) => v.id === variantId)) {
      return;
    }
    editingCustomization.value = {
      ...current,
      defaultVariantId: variantId,
      updatedAt: Date.now(),
    };
  };

  const removeEditingVariant = (variantId: string): void => {
    const current = editingCustomization.value;
    if (!current || current.variants.length <= 1) {
      return;
    }
    if (!current.variants.some((v) => v.id === variantId)) {
      return;
    }

    const remaining = current.variants.filter((v) => v.id !== variantId);
    const nextDefaultVariantId =
      current.defaultVariantId === variantId
        ? remaining[0]!.id
        : current.defaultVariantId;

    editingCustomization.value = {
      ...current,
      variants: remaining,
      defaultVariantId: nextDefaultVariantId,
      updatedAt: Date.now(),
    };
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
      if (editingCustomization.value?.id === previouslyActive.id) {
        editingCustomization.value = {
          ...editingCustomization.value,
          active: false,
        };
      }
    }

    await updateRecord(id, (record) => ({
      ...record,
      active: true,
      updatedAt: Date.now(),
    }));
    if (editingCustomization.value?.id === id) {
      editingCustomization.value = {
        ...editingCustomization.value,
        active: true,
      };
    }
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
    if (editingCustomization.value?.id === id) {
      editingCustomization.value = {
        ...editingCustomization.value,
        active: false,
      };
    }
  };

  const remove = async (id: string): Promise<void> => {
    const userId = login.userId.value;
    const existing = customizations.value.find((c) => c.id === id);
    if (!userId || !existing) {
      return;
    }

    await os.eraseData(userId, id);
    customizations.value = customizations.value.filter((c) => c.id !== id);
    if (editingCustomization.value?.id === id) {
      editingCustomization.value = null;
    }
  };

  const uploadLogo = async (file: File): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) {
      throw new Error("Cannot upload a logo while signed out.");
    }
    if (!editingCustomization.value) {
      return;
    }

    const result = await os.recordFile(userId, file, {
      mimeType: file.type,
      marker: CUSTOMIZATION_MARKER,
    });
    if (result.success === false) {
      throw new Error("Failed to upload logo.");
    }

    // Re-read after the await: editing may have been cancelled while the
    // upload was in flight. Only stage the URL onto the draft — the record
    // itself isn't persisted until saveEditingCustomization() is called.
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      logoUrl: result.url,
      updatedAt: Date.now(),
    };
  };

  const removeEditingLogo = (): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    editingCustomization.value = {
      ...current,
      logoUrl: null,
      updatedAt: Date.now(),
    };
  };

  const toggleEditingExtensionId = (extensionId: string): void => {
    const current = editingCustomization.value;
    if (!current) {
      return;
    }
    const has = current.extensionIds.includes(extensionId);
    editingCustomization.value = {
      ...current,
      extensionIds: has
        ? current.extensionIds.filter((id) => id !== extensionId)
        : [...current.extensionIds, extensionId],
      updatedAt: Date.now(),
    };
  };

  const addExtensionToActiveCustomization = async (
    extensionId: string
  ): Promise<void> => {
    const locator = activeCustomizationLocator.value;
    if (!locator) {
      return;
    }
    await extensionPreferences.addExtraExtensionId(locator, extensionId);
  };

  const removeExtensionFromActiveCustomization = async (
    extensionId: string
  ): Promise<void> => {
    const locator = activeCustomizationLocator.value;
    if (!locator) {
      return;
    }
    await extensionPreferences.removeExtraExtensionId(locator, extensionId);
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
    activeExtensionIds,
    linkedCustomization,
    editingCustomization,
    editingVariantId,
    load,
    loadByLocator,
    create,
    startEditing,
    stopEditing,
    saveEditingCustomization,
    setActive,
    deactivate,
    remove,
    uploadLogo,
    getShareLink,
    updateEditingName,
    removeEditingLogo,
    addEditingVariant,
    renameEditingVariant,
    setEditingVariantColor,
    setEditingDefaultVariant,
    removeEditingVariant,
    selectActiveVariant,
    toggleEditingExtensionId,
    addExtensionToActiveCustomization,
    removeExtensionFromActiveCustomization,
  };
}
