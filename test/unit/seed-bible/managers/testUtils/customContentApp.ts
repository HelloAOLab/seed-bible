import { createCustomContentManager } from "@packages/seed-bible/seed-bible/managers/CustomContentManager";
import type { ChatProvider } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { ContentImportService } from "@packages/seed-bible/seed-bible/managers/customContent/importClient";
import { createCustomizationsManager } from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";
import { createCustomizationVariantSelectionsManager } from "@packages/seed-bible/seed-bible/managers/CustomizationVariantSelectionsManager";
import { createCustomizationExtensionPreferencesManager } from "@packages/seed-bible/seed-bible/managers/CustomizationExtensionPreferencesManager";
import { createDiscoverManager } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SettingsManager } from "@packages/seed-bible/seed-bible/managers/SettingsManager";
import { createTheme } from "@packages/seed-bible/seed-bible/managers/ThemeManager";
import { signal } from "@preact/signals";

export const OWNER = "user-1";

interface StoredEntry {
  data: unknown;
  markers: string[];
}

/**
 * The records server, in memory: just enough of CasualOS's record and data
 * behavior (owned records, markers, not-found errors) for the managers to
 * run against, so tests check what ends up stored rather than which calls
 * were made.
 */
/** CasualOS's default limit on one data entry (`maxItemSizeInBytes`). */
const MAX_ITEM_BYTES = 500_000;

export function fakeRecordsServer() {
  const records = new Map<string, Map<string, StoredEntry>>([
    [OWNER, new Map()],
  ]);
  const failNextCreate = { code: null as string | null };
  const failWritesTo = new Set<string>();

  function attach(os: CasualOSManager) {
    vi.spyOn(os, "createRecord").mockImplementation(async (recordName) => {
      if (failNextCreate.code) {
        const errorCode = failNextCreate.code;
        failNextCreate.code = null;
        return { success: false, errorCode, errorMessage: errorCode } as never;
      }
      if (records.has(recordName)) {
        return {
          success: false,
          errorCode: "record_already_exists",
          errorMessage: "exists",
        } as never;
      }
      records.set(recordName, new Map());
      return { success: true } as never;
    });
    vi.spyOn(os, "recordData").mockImplementation(
      async (recordKey, address, data, options) => {
        const record = records.get(recordKey);
        if (!record || failWritesTo.has(address)) {
          return {
            success: false,
            errorCode: record ? "server_error" : "record_not_found",
            errorMessage: "refused",
          } as never;
        }
        if (
          new TextEncoder().encode(JSON.stringify(data)).length > MAX_ITEM_BYTES
        ) {
          return {
            success: false,
            errorCode: "subscription_limit_reached",
            errorMessage:
              "The size of the item is larger than the subscription allows.",
          } as never;
        }
        record.set(address, {
          data: structuredClone(data),
          markers: options.marker ? [options.marker] : [],
        });
        return { success: true, recordName: recordKey, address } as never;
      }
    );
    vi.spyOn(os, "getData").mockImplementation(async (recordName, address) => {
      const entry = records.get(recordName)?.get(address);
      if (!entry) {
        return {
          success: false,
          errorCode: "data_not_found",
          errorMessage: "not found",
        } as never;
      }
      return {
        success: true,
        data: structuredClone(entry.data),
        publisherId: OWNER,
        subjectId: OWNER,
        recordName,
        markers: entry.markers,
      } as never;
    });
    vi.spyOn(os, "eraseData").mockImplementation(async (recordKey, address) => {
      const record = records.get(recordKey);
      if (!record?.delete(address)) {
        return {
          success: false,
          errorCode: "data_not_found",
          errorMessage: "not found",
        } as never;
      }
      return { success: true, recordName: recordKey, address } as never;
    });
    vi.spyOn(os, "listAllDataByMarker").mockImplementation(
      async (recordName, marker) => ({
        success: true,
        items: [...(records.get(recordName)?.entries() ?? [])]
          .filter(([, entry]) => entry.markers.includes(marker))
          .map(([address, entry]) => ({
            address,
            data: structuredClone(entry.data),
          })),
      })
    );
  }

  return { records, attach, failNextCreate, failWritesTo };
}

function loginAs(userId: string | null): LoginManager {
  return {
    userId: signal(userId),
    profile: signal(null),
    cachedProfile: signal(null),
    localConfig: signal({}),
    sessionEnded: signal(null),
    isProfileLoading: signal(false),
    isSavingProfile: signal(false),
    userInfo: signal(
      userId ? { id: userId, email: "owner@example.com" } : null
    ),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    getUserProfile: vi.fn().mockResolvedValue(null),
    hydrateLocalConfig: vi.fn(),
  } as unknown as LoginManager;
}

function settingsStub(): SettingsManager {
  return {
    settings: signal({
      themeId: "light",
      customTheme: {},
      customHighlights: {},
    }),
    setThemeId: vi.fn(),
    setCustomTheme: vi.fn(),
    setCustomHighlights: vi.fn(),
    resetTextColors: vi.fn(),
  } as unknown as SettingsManager;
}

/** One running app: the real managers, talking to `server` through `os`. */
export type FakeRecordsServer = ReturnType<typeof fakeRecordsServer>;

export function createApp(
  server: FakeRecordsServer,
  options: {
    userId: string | null;
    href?: string;
    importService?: ContentImportService | null;
    importPollMs?: number;
    /** Chat providers, as extensions would register them. */
    chatProviders?: ChatProvider[];
  }
) {
  const os = CasualOSManager();
  server.attach(os);
  const login = loginAs(options.userId);
  const navigation = createNavigationManager({
    initialHref: options.href ?? "http://localhost/",
  });
  const customizations = createCustomizationsManager(
    os,
    login,
    createTheme(settingsStub()),
    navigation,
    createCustomizationVariantSelectionsManager(os, login),
    createCustomizationExtensionPreferencesManager(os, login)
  );
  const discover = createDiscoverManager();
  const modals = createModalManager();
  const customContent = createCustomContentManager({
    os,
    login,
    customizations,
    discover,
    modals,
    importService: options.importService,
    importPollMs: options.importPollMs,
    chats: { providers: signal(options.chatProviders ?? []) },
  });
  return { os, customizations, discover, modals, customContent };
}

export async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 2000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}
