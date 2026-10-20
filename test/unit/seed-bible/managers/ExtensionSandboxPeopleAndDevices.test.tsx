// Real i18next isn't initialized in unit tests; the manager only needs to
// register translations and read the language.
vi.mock(
  "@packages/seed-bible/seed-bible/i18n/I18nManager",
  async (original) => ({
    ...(await original<object>()),
    addTranslations: vi.fn(),
    i18n: { language: "en", on: () => {} },
  })
);
import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { I18nProvider } from "@packages/seed-bible/seed-bible/i18n";
import type { I18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { ExtensionManager } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { ExtensionMeta } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import {
  defineExtension,
  type SandboxContext,
  type SandboxError,
} from "@packages/seed-bible/seed-bible/extensions";
import type { SandboxPermission } from "@packages/seed-bible/seed-bible/extensions/protocol";
import {
  createRawFrame,
  createSharedSession,
  useSandboxHarness,
} from "./sandboxHarness";

/*
 * The features behind the permissions that involve other people (friends,
 * shared sessions) or the device (speech, the clipboard, CasualOS portals,
 * the microphone and camera). Whether each is gated by its permission is
 * covered in `ExtensionPermissionGates.test.tsx`; this is what each does
 * once granted.
 */
describe("sandboxed extensions: people and devices", () => {
  const h = useSandboxHarness();
  let manager: ExtensionManager;

  beforeEach(() => {
    manager = h.createManager();
    h.host.userId.value = "user-1";
    h.host.profile.value = { name: "Ruth", pictureUrl: null };
  });

  /**
   * Installs an extension with `permissions` granted: required when the
   * policy allows it, otherwise allowed in Settings.
   */
  async function install(
    id: string,
    permissions: SandboxPermission[],
    meta: Partial<ExtensionMeta> = {}
  ): Promise<SandboxContext> {
    const runs: SandboxContext[] = [];
    const { SANDBOX_PERMISSION_INFO } =
      await import("@packages/seed-bible/seed-bible/extensions/protocol");
    const required = permissions.filter(
      (p) => SANDBOX_PERMISSION_INFO[p].requirable
    );
    const optional = permissions.filter(
      (p) => !SANDBOX_PERMISSION_INFO[p].requirable
    );
    expect(
      await manager.loadExtension(
        await h.publish(defineExtension({ main: (sb) => void runs.push(sb) }), {
          id,
          permissions: required,
          optionalPermissions: optional,
          ...meta,
        })
      )
    ).toBe(true);
    await vi.waitFor(() => expect(runs).toHaveLength(1));
    for (const permission of optional) {
      const before = runs.length;
      expect(await manager.setOptionalPermission(id, permission, true)).toBe(
        true
      );
      await vi.waitFor(() => expect(runs).toHaveLength(before + 1));
    }
    return runs.at(-1)!;
  }

  const codeOf = (promise: Promise<unknown>) =>
    promise.then(
      () => "ok",
      (err: SandboxError) => err.code
    );

  /** The user is clicking inside the extension's (only) frame. */
  function userIsInExtension(id: string) {
    h.setUserActivation(true);
    h.focusedFrame = h.frames.find((frame) => frame.extensionId === id)!;
  }

  /** Waits until every message the host has already sent this frame is in. */
  const flush = (sb: SandboxContext) => sb.storage.keys();

  describe("friends", () => {
    it("lists friends by name, with ids that match their own identity in the extension", async () => {
      h.host.friends.value = [
        { userId: "user-2", name: "Naomi", pictureUrl: "https://p/n.png" },
      ];
      const sb = await install("ext.friends", ["friends:read"]);
      const friends = await sb.friends.list();
      const ruth = sb.identity.value;

      // What the same extension sees as Naomi's own identity on her device.
      h.host.userId.value = "user-2";
      await vi.waitFor(() => expect(sb.identity.value).not.toBe(ruth));
      expect(friends).toEqual([
        { id: sb.identity.value, name: "Naomi", pictureUrl: "https://p/n.png" },
      ]);
      expect(JSON.stringify(friends)).not.toContain("user-2");
    });

    it("gives each extension different ids for the same friend", async () => {
      h.host.friends.value = [
        { userId: "user-2", name: "Naomi", pictureUrl: null },
      ];
      const a = await install("ext.friends-a", ["friends:read"]);
      const b = await install("ext.friends-b", ["friends:read"]);

      const [[fromA], [fromB]] = [
        await a.friends.list(),
        await b.friends.list(),
      ];

      expect(fromA!.id).not.toBe(fromB!.id);
    });

    it("lists no one when signed out", async () => {
      h.host.friends.value = [
        { userId: "user-2", name: "Naomi", pictureUrl: null },
      ];
      const sb = await install("ext.friends-out", ["friends:read"]);
      h.host.userId.value = null;

      expect(await sb.friends.list()).toEqual([]);
    });
  });

  describe("shared sessions", () => {
    const joinSession = () => {
      h.host.reading.value = {
        ...h.host.reading.value,
        tab: {
          ...h.host.reading.value.tab,
          sharedSession: createSharedSession([
            {
              userId: "user-1",
              connectionId: "c1",
              name: "Ruth",
              isSelf: true,
            },
            {
              userId: "user-2",
              connectionId: "c2",
              name: "Naomi",
              isHost: true,
            },
            { userId: null, connectionId: "c3", isActive: false },
          ]),
        },
      };
    };

    it("shows who's in the current tab's session, without their real ids", async () => {
      const sb = await install("ext.session", ["session:read"]);
      expect(sb.session.current.value).toBeNull();

      joinSession();
      await flush(sb);

      const participants = sb.session.current.value!.participants;
      expect(participants).toEqual([
        {
          id: sb.identity.value,
          name: "Ruth",
          isHost: false,
          isActive: true,
          isYou: true,
        },
        {
          id: expect.stringMatching(/^[0-9a-f]{32}$/),
          name: "Naomi",
          isHost: true,
          isActive: true,
          isYou: false,
        },
        {
          id: expect.stringMatching(/^[0-9a-f]{32}$/),
          name: null,
          isHost: false,
          isActive: false,
          isYou: false,
        },
      ]);
      expect(JSON.stringify(participants)).not.toMatch(/user-2|c3/);
    });

    it("goes back to null when the user leaves the session", async () => {
      const sb = await install("ext.session-leave", ["session:read"]);
      joinSession();
      await flush(sb);
      expect(sb.session.current.value).not.toBeNull();

      h.host.reading.value = {
        ...h.host.reading.value,
        tab: { ...h.host.reading.value.tab, sharedSession: null },
      };
      await flush(sb);

      expect(sb.session.current.value).toBeNull();
    });

    it("doesn't tell a frame without the permission that there's a session", async () => {
      const raw = createRawFrame();
      await manager.loadExtension(
        await h.publish(raw, { id: "ext.session-raw" })
      );
      await raw.call("storage.keys", {});

      joinSession();
      await raw.call("storage.keys", {});

      expect(
        raw.messages.some((m) => m.type === "state" && m.state.session !== null)
      ).toBe(false);
    });
  });

  describe("reading aloud", () => {
    it("reads the chosen verses in the translation's language, only when the user asked", async () => {
      const sb = await install("ext.reader", ["audio:playback"]);
      const ref = {
        translationId: "BSB",
        bookId: "JHN",
        chapter: 1,
        fromVerse: 2,
      };

      expect(await codeOf(sb.audio.readAloud(ref))).toBe("invalid_request");
      expect(h.host.speech.runs).toEqual([]);

      userIsInExtension("ext.reader");
      const done = sb.audio.readAloud(ref);
      await vi.waitFor(() => expect(sb.audio.speaking.value).toBe(true));

      expect(h.host.speech.runs).toEqual([
        { verses: [{ number: 2, text: "was the Word." }], lang: "en" },
      ]);
      h.host.speech.finish();
      expect(await done).toEqual({ finished: true });
      await flush(sb);
      expect(sb.audio.speaking.value).toBe(false);
    });

    it("reports it stopped when the extension stops it", async () => {
      const sb = await install("ext.stopper", ["audio:playback"]);
      userIsInExtension("ext.stopper");
      const done = sb.audio.readAloud({
        translationId: "BSB",
        bookId: "JHN",
        chapter: 1,
      });
      await vi.waitFor(() => expect(h.host.speech.isSpeaking.value).toBe(true));

      await sb.audio.stop();

      expect(await done).toEqual({ finished: false });
      expect(h.host.speech.isSpeaking.value).toBe(false);
    });

    it("reports it stopped when something else starts speaking", async () => {
      const sb = await install("ext.interrupted", ["audio:playback"]);
      userIsInExtension("ext.interrupted");
      const done = sb.audio.readAloud({
        translationId: "BSB",
        bookId: "JHN",
        chapter: 1,
      });
      await vi.waitFor(() => expect(h.host.speech.isSpeaking.value).toBe(true));

      // The user presses the app's own listen button.
      h.host.speech.textToSpeech.speak([{ number: 1, text: "Psalm" }], {
        lang: "en",
      });

      expect(await done).toEqual({ finished: false });
    });

    it("can't stop speech it didn't start", async () => {
      const sb = await install("ext.meddler", ["audio:playback"]);
      h.host.speech.textToSpeech.speak([{ number: 1, text: "Psalm" }], {
        lang: "en",
      });

      await sb.audio.stop();

      expect(h.host.speech.isSpeaking.value).toBe(true);
    });

    it("stops its speech when the extension is uninstalled", async () => {
      const sb = await install("ext.gone-quiet", ["audio:playback"]);
      userIsInExtension("ext.gone-quiet");
      void sb.audio.readAloud({
        translationId: "BSB",
        bookId: "JHN",
        chapter: 1,
      });
      await vi.waitFor(() => expect(h.host.speech.isSpeaking.value).toBe(true));

      manager.unloadExtension("ext.gone-quiet");

      expect(h.host.speech.isSpeaking.value).toBe(false);
    });
  });

  describe("the clipboard", () => {
    it("copies text only right after the user interacts with the extension", async () => {
      const sb = await install("ext.copier", ["clipboard:write"]);

      expect(await codeOf(sb.clipboard.writeText("unprompted"))).toBe(
        "invalid_request"
      );
      userIsInExtension("ext.copier");
      await sb.clipboard.writeText("John 3:16");

      expect(h.host.clipboard).toEqual(["John 3:16"]);
    });

    it("says so when the browser won't copy", async () => {
      const sb = await install("ext.copy-blocked", ["clipboard:write"]);
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async () => {
            throw new DOMException("Denied", "NotAllowedError");
          },
        },
        configurable: true,
      });
      userIsInExtension("ext.copy-blocked");

      expect(await codeOf(sb.clipboard.writeText("x"))).toBe("unavailable");
    });
  });

  describe("CasualOS portals", () => {
    /** Renders the pane the host opened, and returns its iframe. */
    function showPane(paneId: string) {
      const container = document.createElement("div");
      document.body.appendChild(container);
      // `act` runs the portal's effects, which listen for its messages.
      act(() => {
        render(
          <>
            {
              h.host.panes.panes.value
                .find((pane) => pane.id === paneId)!
                .component() as ComponentChildren
            }
          </>,
          container
        );
      });
      return {
        iframe: container.querySelector("iframe")!,
        remove: () => {
          render(null, container);
          container.remove();
        },
      };
    }

    it("shows a pattern in a pane the host draws and labels, outside the sandbox", async () => {
      const sb = await install("ext.portal", ["embed:casualos"]);

      const portal = await sb.portals.open({
        pattern: { name: "verse-map" },
        portalType: "map",
        query: { mapData: "jhn" },
        placement: "floating",
        title: "Map",
      });
      const shown = showPane(portal.paneId);
      const src = new URL(shown.iframe.src);

      expect(portal.paneId).toMatch(/^sandbox:ext\.portal:/);
      expect(src.origin).toBe("https://ao.bot");
      expect(src.searchParams.get("pattern")).toBe("verse-map");
      expect(src.searchParams.get("mapPortal")).toBe("home");
      expect(src.searchParams.get("mapData")).toBe("jhn");
      expect(src.searchParams.get("inst")).toMatch(/^sandbox-ext\.portal-/);
      // It's the app's own portal iframe, not one of the extension's frames.
      expect(shown.iframe.getAttribute("sandbox")).toBeNull();
      expect(h.frames).toHaveLength(1);
      shown.remove();
    });

    it("doesn't let the query change which instance or pattern loads", async () => {
      const raw = createRawFrame();
      await manager.loadExtension(
        await h.publish(raw, {
          id: "ext.portal-query",
          permissions: ["embed:casualos"],
        })
      );

      for (const key of ["inst", "pattern", "patternAux", "gridPortal"]) {
        const response = await raw.call("portals.open", {
          pattern: { name: "p" },
          portalType: "grid",
          placement: "side",
          title: "P",
          query: { [key]: "elsewhere" },
        });
        expect(response).toMatchObject({
          ok: false,
          error: { code: "invalid_request" },
        });
      }
      const insecure = await raw.call("portals.open", {
        pattern: { aux: "http://example.com/p.aux" },
        portalType: "grid",
        placement: "side",
        title: "P",
      });
      expect(insecure).toMatchObject({ ok: false });
      expect(h.host.panes.panes.value).toEqual([]);
    });

    it("passes messages between the extension and its portal", async () => {
      const sb = await install("ext.portal-talk", ["embed:casualos"]);
      const portal = await sb.portals.open({
        pattern: { name: "p" },
        portalType: "grid",
        placement: "side",
        title: "P",
      });
      const received: unknown[] = [];
      portal.onMessage((message) => received.push(message));
      const shown = showPane(portal.paneId);
      const sent = vi.spyOn(shown.iframe.contentWindow!, "postMessage");

      await portal.send({ type: "hello" });
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { id: "reply" },
          origin: "https://ao.bot",
          source: shown.iframe.contentWindow,
        })
      );
      // Not from its portal: ignored.
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { id: "forged" },
          origin: "https://evil.example",
          source: shown.iframe.contentWindow,
        })
      );

      expect(sent).toHaveBeenCalledWith({ type: "hello" }, "https://ao.bot");
      await vi.waitFor(() => expect(received).toEqual([{ id: "reply" }]));
      shown.remove();
    });

    it("can only message its own portals", async () => {
      const owner = await install("ext.portal-owner", ["embed:casualos"]);
      const portal = await owner.portals.open({
        pattern: { name: "p" },
        portalType: "grid",
        placement: "side",
        title: "P",
      });
      const raw = createRawFrame();
      await manager.loadExtension(
        await h.publish(raw, {
          id: "ext.portal-raw",
          permissions: ["embed:casualos"],
        })
      );

      const another = await raw.call("portals.send", {
        paneId: portal.paneId,
        message: "hijack",
      });
      const ownPane = await raw.call("panes.open", {
        view: "v",
        placement: "side",
        title: "V",
      });
      const notAPortal = await raw.call("portals.send", {
        paneId: (ownPane as { value: { paneId: string } }).value.paneId,
        message: "x",
      });

      expect(another).toMatchObject({
        ok: false,
        error: { code: "not_found" },
      });
      expect(notAPortal).toMatchObject({
        ok: false,
        error: { code: "unavailable" },
      });
    });
  });

  describe("the microphone and camera", () => {
    /** Renders the host's capture dialog. */
    async function showDialog() {
      await vi.waitFor(() =>
        expect(h.host.modals.modals.value).toHaveLength(1)
      );
      const modal = h.host.modals.modals.value[0]!;
      const container = document.createElement("div");
      document.body.appendChild(container);
      // Translations show as their keys.
      const i18n = {
        i18n: { t: (key: string) => key },
        language: signal("en"),
      } as unknown as I18nManager;
      render(
        <I18nProvider i18n={i18n}>
          {modal.content({ t: (k: string) => k })}
        </I18nProvider>,
        container
      );
      const button = (label: string) =>
        [...container.querySelectorAll("button")].find(
          (b) => b.textContent === label
        );
      return {
        modal,
        container,
        button,
        press: async (label: string) => {
          await vi.waitFor(() => expect(button(label)).toBeTruthy());
          button(label)!.click();
        },
        remove: () => {
          render(null, container);
          container.remove();
        },
      };
    }

    const text = async (blob: Blob | null) =>
      blob ? new TextDecoder().decode(await blob.arrayBuffer()) : null;

    it("records only after the user presses Record, and hands over just the recording", async () => {
      const sb = await install("ext.recorder", ["device:microphone"]);
      userIsInExtension("ext.recorder");

      const recording = sb.devices.recordAudio();
      const dialog = await showDialog();
      expect(dialog.modal.title).toBe("Title of ext.recorder");
      expect(dialog.container.textContent).toContain(
        "extension-capture-audio-intro"
      );
      await vi.waitFor(() => expect(h.host.capture.state.on).toBe(1));
      expect(h.host.capture.state.recording).toBe(false);

      await dialog.press("extension-capture-record");
      await vi.waitFor(() => expect(h.host.capture.state.recording).toBe(true));
      await dialog.press("extension-capture-stop");

      const blob = await recording;
      expect(blob?.type).toBe("audio/webm");
      expect(await text(blob)).toBe("audio-bytes");
      expect(h.host.capture.state.on).toBe(0);
      expect(h.host.modals.modals.value).toEqual([]);
      dialog.remove();
    });

    it("takes one photo when the user presses the button", async () => {
      const sb = await install("ext.camera", ["device:camera"]);
      userIsInExtension("ext.camera");

      const photo = sb.devices.takePhoto();
      const dialog = await showDialog();
      await dialog.press("extension-capture-take");

      const blob = await photo;
      expect(blob?.type).toBe("image/jpeg");
      expect(await text(blob)).toBe("photo-bytes");
      expect(h.host.capture.opened).toEqual(["photo"]);
      expect(h.host.capture.state.on).toBe(0);
      dialog.remove();
    });

    it("gives the extension nothing, and turns the device off, when the user cancels", async () => {
      const sb = await install("ext.cancelled", ["device:microphone"]);
      userIsInExtension("ext.cancelled");

      const recording = sb.devices.recordAudio();
      const dialog = await showDialog();
      await dialog.press("extension-capture-record");
      await dialog.press("extension-capture-cancel");

      expect(await recording).toBeNull();
      dialog.remove();
      expect(h.host.capture.state.on).toBe(0);
    });

    it("only opens right after the user interacts with the extension, one at a time", async () => {
      const sb = await install("ext.eager", ["device:microphone"]);

      expect(await codeOf(sb.devices.recordAudio())).toBe("invalid_request");
      expect(h.host.modals.modals.value).toEqual([]);

      userIsInExtension("ext.eager");
      const first = sb.devices.recordAudio();
      const dialog = await showDialog();
      expect(await codeOf(sb.devices.recordAudio())).toBe("limit_exceeded");

      dialog.modal.onDismiss!();
      expect(await first).toBeNull();
      dialog.remove();
    });

    it("rejects when the browser won't open the device", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      h.host.capture.state.fail = "NotAllowedError";
      const sb = await install("ext.blocked", ["device:camera"]);
      userIsInExtension("ext.blocked");

      const photo = sb.devices.takePhoto();
      const dialog = await showDialog();

      expect(await codeOf(photo)).toBe("unavailable");
      expect(h.host.modals.modals.value).toEqual([]);
      dialog.remove();
    });

    it("closes the dialog and turns the device off when the extension is uninstalled", async () => {
      const sb = await install("ext.removed", ["device:microphone"]);
      userIsInExtension("ext.removed");

      void sb.devices.recordAudio().catch(() => {});
      const dialog = await showDialog();
      await vi.waitFor(() => expect(h.host.capture.state.on).toBe(1));

      manager.unloadExtension("ext.removed");
      expect(h.host.modals.modals.value).toEqual([]);
      // The app stops rendering a closed modal, which unmounts the dialog.
      dialog.remove();

      expect(h.host.capture.state.on).toBe(0);
    });
  });
});
