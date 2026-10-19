import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { openExtensionPermissionsModal } from "@packages/seed-bible/seed-bible/components/ExtensionConsentModal/ExtensionPermissionsModal";
import { openExtensionConsentModal } from "@packages/seed-bible/seed-bible/components/ExtensionConsentModal/ExtensionConsentModal";
import type { SandboxPermissionSummary } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SandboxPermission } from "@packages/seed-bible/seed-bible/extensions/protocol";
import {
  I18nProvider,
  createI18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers";

describe("extension permission dialogs", () => {
  let container: HTMLDivElement;
  let modals: ModalManager;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    modals = createModalManager();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderLatestModal() {
    const modal = modals.modals.value.at(-1)!;
    act(() => {
      render(
        <I18nProvider
          i18n={createI18nManager(createNavigationManager(), ["en"])}
        >
          {modal.content({ t: (key) => key })}
        </I18nProvider>,
        container
      );
    });
  }

  describe("the Settings permissions view", () => {
    /**
     * Stands in for `ExtensionManager`'s permission API, applying a toggle the
     * way the real one does (restart aside).
     */
    function createExtensions(summary: SandboxPermissionSummary) {
      const sandboxPermissions = signal<
        Record<string, SandboxPermissionSummary>
      >({
        "ext.demo": summary,
      });
      const setOptionalPermission = vi.fn(
        async (id: string, permission: SandboxPermission, enabled: boolean) => {
          const current = sandboxPermissions.value[id]!;
          sandboxPermissions.value = {
            [id]: {
              ...current,
              granted: enabled
                ? [...current.granted, permission]
                : current.granted.filter((p) => p !== permission),
            },
          };
          return true;
        }
      );
      return { sandboxPermissions, setOptionalPermission };
    }

    it("locks the required permissions and offers a switch for each optional one", () => {
      const extensions = createExtensions({
        required: ["reading:selection"],
        optional: ["notes:write", "reading:history"],
        granted: ["reading:selection", "notes:write"],
        network: ["api.example.com"],
        sourceHost: "files.example.com",
      });
      openExtensionPermissionsModal(modals, extensions, "ext.demo", "Demo");
      renderLatestModal();

      const switches = [
        ...container.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"]'
        ),
      ];
      expect(switches.map((s) => s.checked)).toEqual([true, false]);
      // One switch per optional permission, none for the required one.
      expect(switches).toHaveLength(2);
      expect(container.textContent).toContain("api.example.com");
      // Only the high-risk one (notes:write) carries a warning.
      expect(
        container.querySelectorAll(".sb-extension-consent-warning")
      ).toHaveLength(1);
    });

    it("turns an optional permission on and off through the extension manager", async () => {
      const extensions = createExtensions({
        required: [],
        optional: ["reading:history"],
        granted: [],
        network: [],
        sourceHost: "files.example.com",
      });
      openExtensionPermissionsModal(modals, extensions, "ext.demo", "Demo");
      renderLatestModal();
      const toggle = container.querySelector<HTMLInputElement>(
        'input[type="checkbox"]'
      )!;

      await act(async () => {
        toggle.click();
      });

      expect(extensions.setOptionalPermission).toHaveBeenCalledWith(
        "ext.demo",
        "reading:history",
        true
      );
      expect(
        container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
          .checked
      ).toBe(true);
    });
  });

  describe("the consent dialog", () => {
    it("warns about high-risk permissions only", () => {
      void openExtensionConsentModal(modals, {
        extensionId: "ext.demo",
        title: "Demo",
        description: "",
        sourceHost: "files.example.com",
        version: null,
        reason: "request",
        permissions: ["highlights:write", "reading:position"],
        network: [],
        newPermissions: ["highlights:write", "reading:position"],
        newNetwork: [],
        optionalPermissions: [],
      });
      renderLatestModal();

      const warned = [
        ...container.querySelectorAll(".sb-extension-consent-high-risk"),
      ];
      expect(warned).toHaveLength(1);
      expect(
        container.querySelectorAll(".sb-extension-consent-list li")
      ).toHaveLength(2);
    });
  });
});
