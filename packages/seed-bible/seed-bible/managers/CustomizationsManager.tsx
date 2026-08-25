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
import {
  filterValidColorOverrides,
  type ThemeColorKey,
  type ThemeManager,
  type ThemeOverrides,
} from "./ThemeManager";

export const CUSTOMIZATION_MARKER = "publicRead:seedBibleCustomization";

const customizationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  themes: z.record(z.string(), z.string()),
  logoUrl: z.url().max(1024).optional().nullable(),
  active: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export interface SeedBibleCustomization {
  id: string;
  name: string;
  /** Color overrides in the same shape as `ThemeManager`'s own `ThemeOverrides`. */
  themes: ThemeOverrides;
  logoUrl?: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CustomizationsManager {
  customizations: Signal<SeedBibleCustomization[]>;
  isLoading: Signal<boolean>;
  /** The customization currently applied to the live theme, if any. */
  activeCustomization: ReadonlySignal<SeedBibleCustomization | null>;
  /**
   * The active customization's colors, session-only: layered on top of the
   * rendered theme by `SeedBibleStateManager`, never written to
   * `SettingsManager` — a refresh always reverts to the user's real theme.
   */
  activeThemeOverrides: ReadonlySignal<ThemeOverrides>;
  /** The customization id the editor settings page should show. */
  editingCustomizationId: Signal<string | null>;
  load: () => Promise<void>;
  create: () => Promise<SeedBibleCustomization>;
  rename: (id: string, name: string) => Promise<void>;
  setColor: (id: string, key: ThemeColorKey, value: string) => Promise<void>;
  setActive: (id: string) => Promise<void>;
  deactivate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  uploadLogo: (id: string, file: File) => Promise<void>;
  removeLogo: (id: string) => Promise<void>;
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

  const activeThemeOverrides = computed<ThemeOverrides>(
    () => activeCustomization.value?.themes ?? {}
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
          themes: filterValidColorOverrides(parsed.data.themes),
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
    const currentVariables = theme.currentTheme.value.variables;
    const record: SeedBibleCustomization = {
      id: `customization_${uuid()}`,
      name: `Customization ${customizations.value.length + 1}`,
      themes: {
        primaryColor: currentVariables.primaryColor,
        secondaryColor: currentVariables.secondaryColor,
        tertiaryColor: currentVariables.tertiaryColor,
        fontColor: currentVariables.fontColor,
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
    key: ThemeColorKey,
    value: string
  ): Promise<void> => {
    await updateRecord(id, (record) => ({
      ...record,
      themes: { ...record.themes, [key]: value },
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

  return {
    customizations,
    isLoading,
    activeCustomization,
    activeThemeOverrides,
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
