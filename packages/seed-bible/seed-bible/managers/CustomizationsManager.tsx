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
import type { ThemeColorKey, ThemeManager } from "./ThemeManager";

export const CUSTOMIZATION_MARKER = "publicRead:seedBibleCustomization";

const customizationColorKeySchema = z.enum([
  "primaryColor",
  "secondaryColor",
  "tertiaryColor",
  "textColor",
]);

export type CustomizationColorKey = z.infer<typeof customizationColorKeySchema>;

/** Maps a customization's color field to the `ThemeManager` override it drives. */
export const CUSTOMIZATION_THEME_KEYS: Record<
  CustomizationColorKey,
  ThemeColorKey
> = {
  primaryColor: "primaryColor",
  secondaryColor: "secondaryColor",
  tertiaryColor: "tertiaryColor",
  textColor: "fontColor",
};

const customizationColorsSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  tertiaryColor: z.string().optional(),
  textColor: z.string().optional(),
});

const customizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colors: customizationColorsSchema,
  logoUrl: z.url().max(1024).optional().nullable(),
  active: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type SeedBibleCustomization = z.infer<typeof customizationSchema>;

export interface CustomizationsManager {
  customizations: Signal<SeedBibleCustomization[]>;
  isLoading: Signal<boolean>;
  /** The customization currently applied to the live theme, if any. */
  activeCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /** The customization id the editor settings page should show. */
  editingCustomizationId: Signal<string | null>;
  load: () => Promise<void>;
  create: () => Promise<SeedBibleCustomization>;
  rename: (id: string, name: string) => Promise<void>;
  setColor: (
    id: string,
    key: CustomizationColorKey,
    value: string
  ) => Promise<void>;
  setActive: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  uploadLogo: (id: string, file: File) => Promise<void>;
  removeLogo: (id: string) => Promise<void>;
}

function applyColorsToTheme(
  theme: ThemeManager,
  colors: Partial<Record<CustomizationColorKey, string>>
): void {
  for (const key of customizationColorKeySchema.options) {
    const themeKey = CUSTOMIZATION_THEME_KEYS[key];
    const value = colors[key];
    if (value) {
      theme.setCustomColor(themeKey, value);
    } else {
      theme.resetCustomColor(themeKey);
    }
  }
}

function resetThemeColors(theme: ThemeManager): void {
  for (const key of customizationColorKeySchema.options) {
    theme.resetCustomColor(CUSTOMIZATION_THEME_KEYS[key]);
  }
}

export function createCustomizationsManager(
  os: CasualOSManager,
  login: LoginManager,
  theme: ThemeManager
): CustomizationsManager {
  const customizations = signal<SeedBibleCustomization[]>([]);
  const isLoading = signal(false);
  const editingCustomizationId = signal<string | null>(null);

  const activeCustomization = computed(
    () => customizations.value.find((c) => c.active) ?? null
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
        loaded.push(parsed.data);
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
    const currentVariables = theme.currentTheme.value.variables;
    const record: SeedBibleCustomization = {
      id: `customization_${uuid()}`,
      name: `Customization ${customizations.value.length + 1}`,
      colors: {
        primaryColor: currentVariables.primaryColor,
        secondaryColor: currentVariables.secondaryColor,
        tertiaryColor: currentVariables.tertiaryColor,
        textColor: currentVariables.fontColor,
      },
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

  const rename = async (id: string, name: string): Promise<void> => {
    await updateRecord(id, (record) => ({
      ...record,
      name,
      updatedAt: Date.now(),
    }));
  };

  const setColor = async (
    id: string,
    key: CustomizationColorKey,
    value: string
  ): Promise<void> => {
    const updated = await updateRecord(id, (record) => ({
      ...record,
      colors: { ...record.colors, [key]: value },
      updatedAt: Date.now(),
    }));

    if (updated?.active) {
      theme.setCustomColor(CUSTOMIZATION_THEME_KEYS[key], value);
    }
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

    const updated = await updateRecord(id, (record) => ({
      ...record,
      active: true,
      updatedAt: Date.now(),
    }));

    if (updated) {
      applyColorsToTheme(theme, updated.colors);
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
    resetThemeColors(theme);
  };

  const remove = async (id: string): Promise<void> => {
    const userId = login.userId.value;
    const existing = customizations.value.find((c) => c.id === id);
    if (!userId || !existing) {
      return;
    }

    await os.eraseData(userId, id);
    customizations.value = customizations.value.filter((c) => c.id !== id);

    if (existing.active) {
      resetThemeColors(theme);
    }
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

  return {
    customizations,
    isLoading,
    activeCustomization,
    editingCustomizationId,
    load,
    create,
    rename,
    setColor,
    setActive,
    deactivate,
    remove,
    uploadLogo,
    removeLogo,
  };
}
