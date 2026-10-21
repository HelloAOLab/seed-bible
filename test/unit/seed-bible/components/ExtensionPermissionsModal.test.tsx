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
import type { SandboxConsentRequest } from "@packages/seed-bible/seed-bible/managers/ExtensionPermissions";
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
    function renderConsent() {
      const modal = modals.modals.value.at(-1)!;
      act(() => {
        render(
          <I18nProvider
            i18n={createI18nManager(createNavigationManager(), ["en"])}
          >
            {modal.content({ t: (key) => key })}
            {modal.footer?.({ t: (key) => key })}
          </I18nProvider>,
          container
        );
      });
    }

    function ask(request: Partial<SandboxConsentRequest> = {}) {
      const answer = openExtensionConsentModal(modals, {
        extensionId: "ext.verse-art",
        title: "Verse Art",
        description: "Turns verses into art.",
        sourceHost: "ext.example.com",
        version: "1.2.0",
        reason: "install",
        permissions: ["reading:position"],
        network: ["api.verseart.app"],
        newPermissions: ["reading:position"],
        newNetwork: ["api.verseart.app"],
        optionalPermissions: ["highlights:write", "notes:read"],
        ...request,
      });
      renderConsent();
      return answer;
    }

    /** Each section's heading and its cards: each card's title and lines. */
    function sections() {
      return [
        ...container.querySelectorAll(".sb-extension-consent-section"),
      ].map((section) => ({
        title: section.querySelector("h4")!.textContent,
        cards: [...section.querySelectorAll(".sb-extension-consent-card")].map(
          (card) => ({
            title: card.querySelector(".sb-extension-consent-card-title")!
              .textContent,
            lines: [
              ...card.querySelectorAll(".sb-extension-consent-lines li"),
            ].map((line) => line.textContent),
          })
        ),
      }));
    }

    const button = (label: string) =>
      [...container.querySelectorAll("button")].find(
        (b) => b.textContent === label
      )!;

    it("groups what it gets now and what it may ask for later, by what each touches", () => {
      void ask();

      expect(sections()).toEqual([
        {
          title: "Right away",
          cards: [
            {
              title: "Your reading",
              lines: ["See which passage you're reading"],
            },
            {
              title: "The internet",
              lines: ["Connect to api.verseart.app"],
            },
          ],
        },
        {
          title: "Only if you agree later",
          cards: [
            {
              title: "Your highlights, notes and saves",
              lines: [
                "Add and remove your highlightsSensitive",
                "Read your notesSensitive",
              ],
            },
          ],
        },
      ]);
      expect(container.textContent).toContain(
        "Version 1.2.0 · from ext.example.com"
      );
      expect(container.textContent).toContain("Turns verses into art.");
      expect(container.textContent).toContain(
        "Seed Bible hasn't reviewed this extension."
      );
    });

    it("installs only when Install is chosen", async () => {
      const answer = ask();

      act(() => button("Install").click());

      await expect(answer).resolves.toBe(true);
      expect(modals.modals.value).toEqual([]);
    });

    it("declines on Cancel, or when the dialog is closed", async () => {
      const cancelled = ask();
      act(() => button("Cancel").click());
      await expect(cancelled).resolves.toBe(false);

      const dismissed = ask({ extensionId: "ext.other" });
      act(() => modals.modals.value.at(-1)!.onDismiss!());
      await expect(dismissed).resolves.toBe(false);
    });

    it("lists only what an update adds", () => {
      void ask({
        reason: "update",
        permissions: ["reading:position", "reading:history"],
        newPermissions: ["reading:history"],
        newNetwork: [],
        optionalPermissions: [],
      });

      expect(sections()).toEqual([
        {
          title: "New in this version",
          cards: [
            { title: "Your reading", lines: ["See your reading history"] },
          ],
        },
      ]);
      expect(button("Allow")).toBeDefined();
    });

    describe("when a running extension asks for more", () => {
      function askForMore(
        permissions: SandboxPermission[],
        alreadyAllowed = {
          permissions: ["reading:position"] as SandboxPermission[],
          network: ["api.verseart.app"],
        }
      ) {
        return ask({
          reason: "request",
          permissions,
          network: [],
          newPermissions: permissions,
          newNetwork: [],
          optionalPermissions: [],
          alreadyAllowed,
        });
      }

      const text = (selector: string) =>
        [...container.querySelectorAll(selector)].map(
          (element) => element.textContent
        );

      it("says what one permission would let it do, and what it still couldn't", () => {
        void askForMore(["highlights:write"]);

        expect(text(".sb-extension-request-title")).toEqual([
          "Verse Art wants access to your highlights",
        ]);
        expect(text(".sb-extension-request-badge")).toEqual(["Sensitive"]);
        expect(text(".sb-extension-request-will li")).toEqual([
          "checkAdd and remove your highlightsSensitive",
        ]);
        // Notes and saves first: they're beside highlights.
        expect(text(".sb-extension-request-wont li")).toEqual([
          "closeRead your notes",
          "closeAdd notes, and change or delete the ones it added",
          "closeAdd and remove your saves",
        ]);
        expect(text(".sb-extension-request-already li")).toEqual([
          "See which passage you're reading",
          "Connect to api.verseart.app",
        ]);
        expect(button("Allow")).toBeDefined();
        expect(button("Not now")).toBeDefined();
      });

      it("never says it lacks something it has, or that what it's asking for includes", () => {
        void askForMore(["notes:write"], {
          permissions: ["profile:read"],
          network: [],
        });

        const wont = text(".sb-extension-request-wont li");
        expect(wont).not.toContain("closeRead your notes");
        expect(wont).not.toContain("closeSee your name and profile picture");
      });

      it("sums up several at once", () => {
        void askForMore(["highlights:write", "notes:read", "device:camera"]);

        expect(text(".sb-extension-request-title")).toEqual([
          "Verse Art wants access to your highlights, your notes, and your camera",
        ]);
        expect(text(".sb-extension-request-count")).toEqual([
          "3 permissions, 3 of them sensitive",
        ]);
        expect(text(".sb-extension-request-will li")).toHaveLength(3);
        expect(
          container.querySelectorAll(".sb-extension-request-icon")
        ).toHaveLength(3);
        expect(
          container.querySelector(".sb-extension-request-already")
        ).toBeNull();
      });

      it("stacks a few icons and counts the rest", () => {
        void askForMore([
          "highlights:write",
          "notes:read",
          "device:camera",
          "device:microphone",
          "embed:casualos",
        ]);

        expect(text(".sb-extension-request-icon")).toEqual([
          "ink_highlighter",
          "sticky_note_2",
          "photo_camera",
          "+2",
        ]);
      });

      it("only mentions sensitivity when something is", () => {
        void askForMore(["audio:playback", "clipboard:write"]);

        expect(text(".sb-extension-request-count")).toEqual(["2 permissions"]);
      });

      it("calls a CasualOS view what the user sees, not CasualOS", () => {
        void askForMore(["embed:casualos"]);

        expect(text(".sb-extension-request-title")).toEqual([
          "Verse Art wants access to maps and 3D experiences",
        ]);
      });

      it("grants all of it on Allow, and none on Not now", async () => {
        const allowed = askForMore(["highlights:write", "notes:read"]);
        act(() => button("Allow").click());
        await expect(allowed).resolves.toBe(true);

        const declined = askForMore(["highlights:write", "notes:read"]);
        act(() => button("Not now").click());
        await expect(declined).resolves.toBe(false);
      });
    });

    it("says so when it gets nothing", () => {
      void ask({
        permissions: [],
        network: [],
        newPermissions: [],
        newNetwork: [],
        optionalPermissions: [],
        version: null,
      });

      expect(sections()).toEqual([]);
      expect(container.textContent).toContain(
        "It won't have access to any of your information."
      );
      expect(container.textContent).toContain("From ext.example.com");
    });
  });
});
