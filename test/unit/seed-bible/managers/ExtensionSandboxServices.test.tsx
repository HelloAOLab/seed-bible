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
import type { ExtensionManager } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { ExtensionMeta } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { buildSandboxCsp } from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxManager";
import { SensitiveSettingsError } from "@packages/seed-bible/seed-bible/managers/ExtensionSensitiveSettings";
import {
  defineExtension,
  SandboxError,
  type SandboxContext,
} from "@packages/seed-bible/seed-bible/extensions";
import {
  SANDBOX_PERMISSION_INFO,
  SANDBOX_PERMISSIONS,
  type SandboxPermission,
} from "@packages/seed-bible/seed-bible/extensions/protocol";
import { createRawFrame, sourced, useSandboxHarness } from "./sandboxHarness";

describe("sandboxed extension services", () => {
  const h = useSandboxHarness();
  let manager: ExtensionManager;

  beforeEach(() => {
    manager = h.createManager();
    h.host.userId.value = "user-1";
    h.host.profile.value = { name: "Ruth", pictureUrl: null };
  });

  /**
   * Installs an extension and returns its `sb`. `latest()` follows
   * restarts: a Settings change restarts the extension, and its main code
   * gets a fresh `sb`.
   */
  async function install(
    meta: Partial<ExtensionMeta> & { id: string },
    views: Parameters<typeof defineExtension>[0]["views"] = {}
  ) {
    const runs: SandboxContext[] = [];
    expect(
      await manager.loadExtension(
        await h.publish(
          defineExtension({
            main: (sb) => void runs.push(sb),
            views,
          }),
          meta
        )
      )
    ).toBe(true);
    await vi.waitFor(() => expect(runs).toHaveLength(1));
    return { sb: runs[0]!, runs, latest: () => runs.at(-1)! };
  }

  const codeOf = (promise: Promise<unknown>) =>
    promise.then(
      () => "ok",
      (err: SandboxError) => err.code
    );

  /**
   * Grants an optional permission the way a user in Settings would, and
   * resolves with the restarted extension's `sb`.
   */
  async function allowInSettings(
    extension: Awaited<ReturnType<typeof install>>,
    id: string,
    permission: SandboxPermission
  ) {
    const before = extension.runs.length;
    expect(await manager.setOptionalPermission(id, permission, true)).toBe(
      true
    );
    await vi.waitFor(() => expect(extension.runs).toHaveLength(before + 1));
    return extension.latest();
  }

  describe("which permissions can be required", () => {
    it("never lets a high-risk permission be required", () => {
      for (const permission of SANDBOX_PERMISSIONS) {
        const info = SANDBOX_PERMISSION_INFO[permission];
        if (info.risk === "high") {
          expect({ permission, requirable: info.requirable }).toEqual({
            permission,
            requirable: false,
          });
        }
      }
    });

    it("makes writing, private notes, identity, other people and the microphone and camera optional-only", () => {
      const optionalOnly = SANDBOX_PERMISSIONS.filter(
        (p) => !SANDBOX_PERMISSION_INFO[p].requirable
      );
      expect(optionalOnly.sort()).toEqual(
        [
          "chat:shared",
          "device:camera",
          "device:microphone",
          "friends:read",
          "highlights:write",
          "notes:read",
          "notes:write",
          "profile:read",
          "saves:write",
          "session:read",
        ].sort()
      );
    });

    it("tells the developer to list an optional-only permission as optional", async () => {
      const errors = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      expect(
        await manager.loadExtension(
          await h.publish(defineExtension({}), {
            id: "ext.wrong-list",
            permissions: ["notes:write"],
          })
        )
      ).toBe(false);
      expect(String(errors.mock.calls[0])).toContain("optionalPermissions");
    });
  });

  describe("notes", () => {
    it("stores what it writes as escaped text, marked as the extension's", async () => {
      const extension = await install({
        id: "ext.notes",
        optionalPermissions: ["notes:write"],
      });
      const sb = await allowInSettings(
        extension,
        sourced("ext.notes"),
        "notes:write"
      );

      const { id } = await sb.notes.create({
        bookId: "JHN",
        chapter: 3,
        verses: [16],
        text: "<img src=x onerror=alert(1)>\n\nSecond",
      });

      const stored = h.host.notes.get("JHN/3")!.find((n) => n.id === id)!;
      expect(stored.data.html).toBe(
        "<p>&lt;img src=x onerror=alert(1)&gt;</p><p>Second</p>"
      );
      expect(stored.data.tags).toEqual([`extension:${sourced("ext.notes")}`]);
      expect(stored.verseNumbers).toEqual([16]);
      expect(stored.data.userId).toBe("user-1");
    });

    it("changes and deletes the notes it added", async () => {
      const extension = await install({
        id: "ext.notes-edit",
        optionalPermissions: ["notes:write"],
      });
      const sb = await allowInSettings(
        extension,
        sourced("ext.notes-edit"),
        "notes:write"
      );
      const { id } = await sb.notes.create({
        bookId: "JHN",
        chapter: 3,
        text: "One",
      });

      await sb.notes.update({ id, bookId: "JHN", chapter: 3, text: "Two" });
      expect(h.host.notes.get("JHN/3")![0]!.data.html).toBe("<p>Two</p>");
      await sb.notes.delete({ id, bookId: "JHN", chapter: 3 });

      expect(h.host.notes.get("JHN/3")).toEqual([]);
    });

    it("can't change or delete a note the user wrote", async () => {
      h.host.notes.set("JHN/3", [
        {
          id: "users-own",
          bookId: "JHN",
          chapterNumber: 3,
          data: { type: "comment", html: "<p>Mine</p>" },
        },
      ]);
      const extension = await install({
        id: "ext.notes-own",
        optionalPermissions: ["notes:write"],
      });
      const sb = await allowInSettings(
        extension,
        sourced("ext.notes-own"),
        "notes:write"
      );

      expect(
        await codeOf(
          sb.notes.update({
            id: "users-own",
            bookId: "JHN",
            chapter: 3,
            text: "Changed",
          })
        )
      ).toBe("permission_denied");
      expect(
        await codeOf(
          sb.notes.delete({ id: "users-own", bookId: "JHN", chapter: 3 })
        )
      ).toBe("permission_denied");
      expect(h.host.notes.get("JHN/3")).toEqual([
        expect.objectContaining({
          id: "users-own",
          data: { type: "comment", html: "<p>Mine</p>" },
        }),
      ]);
    });

    it("reads notes as plain text, and says which it added", async () => {
      h.host.notes.set("JHN/3", [
        {
          id: "a",
          bookId: "JHN",
          chapterNumber: 3,
          verseNumber: 16,
          endVerseNumber: 17,
          data: { type: "comment", html: "<p>One</p><p>Two</p>" },
        },
        {
          id: "b",
          bookId: "JHN",
          chapterNumber: 3,
          data: {
            type: "comment",
            html: "<p>Ext</p>",
            tags: [`extension:${sourced("ext.reader")}`],
          },
        },
      ]);
      const extension = await install({
        id: "ext.reader",
        optionalPermissions: ["notes:read"],
      });
      const sb = await allowInSettings(
        extension,
        sourced("ext.reader"),
        "notes:read"
      );

      expect(await sb.notes.list({ bookId: "JHN", chapter: 3 })).toEqual([
        expect.objectContaining({
          id: "a",
          verses: [16, 17],
          text: "One\nTwo",
          addedByThisExtension: false,
        }),
        expect.objectContaining({ id: "b", addedByThisExtension: true }),
      ]);
    });

    it("needs the user to be signed in to write", async () => {
      h.host.userId.value = null;
      const extension = await install({
        id: "ext.signed-out",
        optionalPermissions: ["notes:write"],
      });
      const sb = await allowInSettings(
        extension,
        sourced("ext.signed-out"),
        "notes:write"
      );

      expect(
        await codeOf(sb.notes.create({ bookId: "JHN", chapter: 3, text: "x" }))
      ).toBe("unavailable");
      expect(await sb.notes.list({ bookId: "JHN", chapter: 3 })).toEqual([]);
      expect(h.host.notes.size).toBe(0);
    });
  });

  describe("highlights and saves", () => {
    it("only adds highlights in the theme's colors", async () => {
      const extension = await install({
        id: "ext.colors",
        optionalPermissions: ["highlights:write"],
      });
      const sb = await allowInSettings(
        extension,
        sourced("ext.colors"),
        "highlights:write"
      );

      expect(await sb.highlights.colors()).toEqual(["yellow", "blue"]);
      expect(
        await codeOf(
          sb.highlights.add({
            translationId: "BSB",
            bookId: "JHN",
            chapter: 3,
            verses: [16],
            colorId: "evil'); background: url(x",
          })
        )
      ).toBe("invalid_request");
      expect(
        await codeOf(
          sb.highlights.add({
            translationId: "BSB",
            bookId: "JHN",
            chapter: 3,
            verses: [16],
            colorId: "magenta",
          })
        )
      ).toBe("invalid_request");
      expect(h.host.highlights.get("BSB/JHN/3")).toBeUndefined();
    });

    it("doesn't save when signed out, rather than asking the user to sign in", async () => {
      h.host.userId.value = null;
      const extension = await install({
        id: "ext.saver",
        optionalPermissions: ["saves:write"],
      });
      const sb = await allowInSettings(
        extension,
        sourced("ext.saver"),
        "saves:write"
      );

      expect(
        await codeOf(
          sb.saves.add({ translationId: "BSB", bookId: "JHN", chapter: 3 })
        )
      ).toBe("unavailable");
      expect(h.host.saves.value).toEqual([]);
    });
  });

  describe("reading history and Bible text", () => {
    it("reads at most a year of history at a time", async () => {
      const { sb } = await install({
        id: "ext.history",
        permissions: ["reading:history"],
      });
      const year = 366 * 24 * 60 * 60 * 1000;

      expect(await codeOf(sb.history.list({ from: 0, to: year + 1 }))).toBe(
        "invalid_request"
      );
      expect(await codeOf(sb.history.list({ from: 10, to: 5 }))).toBe(
        "invalid_request"
      );
    });

    it("reads public Bible text without any permission", async () => {
      const { sb } = await install({ id: "ext.bible" });

      expect(
        await sb.bible.chapter({
          translationId: "BSB",
          bookId: "JHN",
          chapter: 1,
        })
      ).toEqual({
        verses: [
          { number: 1, text: "In the beginning" },
          { number: 2, text: "was the Word." },
        ],
      });
    });
  });

  describe("identity", () => {
    it("gives each extension its own stable id for the user, never the real one", async () => {
      const { sb: a } = await install({ id: "ext.id-a" });
      const { sb: b } = await install({ id: "ext.id-b" });

      const idA = a.identity.value;
      expect(idA).toMatch(/^[0-9a-f]{32}$/);
      expect(idA).not.toContain("user-1");
      expect(b.identity.value).not.toBe(idA);

      h.reload(sourced("ext.id-a"));
      manager = h.createManager();
      const { sb: again } = await install({ id: "ext.id-a" });
      expect(again.identity.value).toBe(idA);
    });

    it("is null when signed out, and follows sign-in", async () => {
      h.host.userId.value = null;
      const { sb } = await install({ id: "ext.id-signin" });
      expect(sb.identity.value).toBeNull();

      h.host.userId.value = "user-2";

      await vi.waitFor(() =>
        expect(sb.identity.value).toMatch(/^[0-9a-f]{32}$/)
      );
    });
  });

  describe("Discover providers", () => {
    async function discover() {
      const answers = [];
      for await (const answer of h.host.discover.discover({
        translationId: "BSB",
        book: "JHN",
        chapter: 3,
        language: "en",
      })) {
        answers.push(answer);
      }
      return answers.flatMap((answer) => answer.results);
    }

    it("shows results as data, and only images from hosts the user approved", async () => {
      const selected: string[] = [];
      const { sb } = await install({
        id: "ext.discover",
        permissions: ["reading:position"],
        network: ["img.example.com"],
      });
      await sb.discover.registerProvider({
        id: "p",
        title: "Probe",
        description: "",
        discover: () => [
          {
            type: "content",
            id: "approved",
            title: "Approved image",
            description: "",
            reference: { bookId: "JHN", chapter: 3 },
            image: "https://img.example.com/a.png",
          },
          {
            type: "content",
            id: "tracker",
            title: "Tracking pixel",
            description: "",
            reference: { bookId: "JHN", chapter: 3 },
            image: "https://tracker.example.net/pixel.gif",
          },
        ],
        onSelect: (resultId) => void selected.push(resultId),
      });

      const results = await discover();

      expect(results).toEqual([
        expect.objectContaining({
          title: "Approved image",
          image: "https://img.example.com/a.png",
          author: "Title of ext.discover",
        }),
        expect.objectContaining({ title: "Tracking pixel", image: undefined }),
      ]);
      (results[0] as { onClick: () => void }).onClick();
      await vi.waitFor(() => expect(selected).toEqual(["approved"]));
    });

    it("shows nothing from a provider that answers with something malformed", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const { sb } = await install({
        id: "ext.bad-discover",
        permissions: ["reading:position"],
      });
      await sb.discover.registerProvider({
        id: "p",
        title: "Bad",
        description: "",
        discover: () => [{ type: "content", title: "<script>" }] as never,
      });

      expect(await discover()).toEqual([]);
    });

    it("removes its providers when it's uninstalled", async () => {
      const { sb } = await install({
        id: "ext.discover-gone",
        permissions: ["reading:position"],
      });
      await sb.discover.registerProvider({
        id: "p",
        title: "P",
        description: "",
        discover: () => [],
      });
      expect(h.host.discover.providers.value).toHaveLength(1);

      manager.unloadExtension(sourced("ext.discover-gone"));

      expect(h.host.discover.providers.value).toEqual([]);
    });
  });

  describe("chat providers", () => {
    it("doesn't pass a shared chat to a provider without chat:shared", async () => {
      const respond = vi.fn(() => "reply");
      const { sb } = await install({
        id: "ext.chat",
        permissions: ["chat:respond"],
      });
      await sb.chats.registerProvider({ id: "c", name: "Bot", respond });
      const provider = h.host.chatProviders.get(
        `sandbox:${sourced("ext.chat")}:c`
      )!;
      h.host.chats.chats.value = [{ id: "shared-1", isShared: true }];

      const reply = await provider.generateResponse({
        chatId: "shared-1",
        participant: { id: "bot" } as never,
        participants: [],
        messages: [],
      });

      expect(provider.supportsSharedChats).toBe(false);
      expect(reply).toBeNull();
      expect(respond).not.toHaveBeenCalled();
    });

    it("passes messages with their authors' names", async () => {
      let request: unknown = null;
      const { sb } = await install({
        id: "ext.chat-names",
        permissions: ["chat:respond"],
      });
      await sb.chats.registerProvider({
        id: "c",
        name: "Bot",
        respond: (r) => {
          request = r;
          return "ok";
        },
      });

      await h.host.chatProviders
        .get(`sandbox:${sourced("ext.chat-names")}:c`)!
        .generateResponse({
          chatId: "local",
          participant: { id: "bot" } as never,
          participants: [
            { id: "user-1", name: "Ruth" },
            { id: "bot", name: { key: "bot", defaultValue: "Bot" } },
          ] as never,
          messages: [
            {
              type: "text",
              id: "1",
              authors: ["user-1"],
              timeMs: 1,
              targets: true,
              text: "Hi",
            },
            {
              type: "text",
              id: "2",
              authors: ["bot"],
              timeMs: 2,
              targets: true,
              text: "Hello",
            },
            {
              type: "tool_call",
              id: "3",
              authors: ["bot"],
              timeMs: 3,
              targets: true,
              name: "x",
            },
          ],
        });

      expect(request).toEqual({
        providerId: "c",
        chatId: "local",
        shared: false,
        messages: [
          { author: "Ruth", fromThisProvider: false, text: "Hi", timeMs: 1 },
          { author: "Bot", fromThisProvider: true, text: "Hello", timeMs: 2 },
        ],
      });
    });

    it("stays quiet when the extension doesn't answer in time", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const { sb } = await install({
          id: "ext.chat-slow",
          permissions: ["chat:respond"],
        });
        await sb.chats.registerProvider({
          id: "c",
          name: "Slow",
          respond: () => new Promise<string>(() => {}),
        });

        const reply = h.host.chatProviders
          .get(`sandbox:${sourced("ext.chat-slow")}:c`)!
          .generateResponse({
            chatId: "local",
            participant: { id: "bot" } as never,
            participants: [],
            messages: [],
          });
        await vi.advanceTimersByTimeAsync(60_001);

        expect(await reply).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("dialogs", () => {
    it("opens one only right after the user interacts with the extension", async () => {
      const { sb } = await install({ id: "ext.dialog" });

      expect(
        await codeOf(sb.modals.alert({ title: "Hi", message: "Unprompted" }))
      ).toBe("invalid_request");
      expect(h.host.modals.modals.value).toEqual([]);

      h.setUserActivation(true);
      h.focusedFrame = h.frames[0]!;
      const closed = sb.modals.alert({ title: "Hi", message: "Asked for" });
      await vi.waitFor(() =>
        expect(h.host.modals.modals.value).toHaveLength(1)
      );
      const modal = h.host.modals.modals.value[0]!;
      expect(modal.title).toBe("Title of ext.dialog: Hi");
      expect(
        await codeOf(sb.modals.alert({ title: "2", message: "Again" }))
      ).toBe("limit_exceeded");

      modal.onDismiss!();

      await closed;
      expect(h.host.modals.modals.value).toEqual([]);
    });

    it("shows a view in its own frame", async () => {
      const { sb } = await install(
        { id: "ext.view-dialog" },
        { picker: () => null }
      );
      h.setUserActivation(true);
      h.focusedFrame = h.frames[0]!;

      void sb.modals.open({ title: "Pick", view: "picker", props: { n: 1 } });
      await vi.waitFor(() =>
        expect(h.host.modals.modals.value).toHaveLength(1)
      );
      const container = document.createElement("div");
      document.body.appendChild(container);
      render(
        <>{h.host.modals.modals.value[0]!.content({ t: (k: string) => k })}</>,
        container
      );

      await vi.waitFor(() => expect(h.frames).toHaveLength(2));
      expect(h.frames[1]!.init.mode).toMatchObject({
        kind: "view",
        view: "picker",
        surface: "modal",
        props: { n: 1 },
      });
      render(null, container);
      container.remove();
    });
  });

  describe("settings panels", () => {
    it("shows a view under Configure, only from main code, and removes it on uninstall", async () => {
      const { sb } = await install(
        { id: "ext.panel" },
        { settings: () => null }
      );

      await sb.settings.registerPanel("settings");

      expect(h.host.settingsPanels.has(sourced("ext.panel"))).toBe(true);
      const container = document.createElement("div");
      document.body.appendChild(container);
      render(
        <>
          {
            h.host.settingsPanels.get(
              sourced("ext.panel")
            )!() as ComponentChildren
          }
        </>,
        container
      );
      await vi.waitFor(() => expect(h.frames).toHaveLength(2));
      expect(h.frames[1]!.init.mode).toMatchObject({ surface: "settings" });
      render(null, container);
      container.remove();

      manager.unloadExtension(sourced("ext.panel"));
      expect(h.host.settingsPanels.has(sourced("ext.panel"))).toBe(false);
    });
  });

  describe("sensitive fetch", () => {
    it("sends requests through the extension's own sensitive settings", async () => {
      const { sb } = await install({ id: "ext.sensitive" });

      const response = await sb.sensitive.fetch({
        url: "https://api.example.com/v1",
        method: "POST",
        body: { q: 1 },
      });

      expect(response).toEqual({
        status: 200,
        ok: true,
        contentType: "text/plain",
        body: "sensitive ok",
      });
      expect(h.host.sensitiveFetches).toEqual([
        {
          extensionId: sourced("ext.sensitive"),
          request: {
            url: "https://api.example.com/v1",
            method: "POST",
            body: { q: 1 },
            proxy: undefined,
          },
        },
      ]);
    });

    it("reports why a sensitive request couldn't be made", async () => {
      h.host.sensitive.respond = async () => {
        throw new SensitiveSettingsError("not_set", "No API key saved.");
      };
      const { sb } = await install({ id: "ext.sensitive-fail" });

      const error = await sb.sensitive
        .fetch({ url: "https://api.example.com/v1" })
        .catch((err: SandboxError) => err);

      expect(error).toMatchObject({
        code: "unavailable",
        message: "not_set: No API key saved.",
      });
    });
  });

  describe("heartbeat", () => {
    it("stops an extension whose main frame stops answering, and tells the user", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      manager = h.createManager({ sandboxHeartbeatIntervalMs: 20 });
      const raw = createRawFrame();
      await manager.loadExtension(await h.publish(raw, { id: "ext.hung" }));
      await vi.waitFor(() => expect(raw.started).toBe(true));
      await raw.call("tools.register", {
        id: "t",
        surface: "toolbar",
        title: "T",
        icon: { material: "star" },
      });
      expect(h.host.surfaces.toolbar.size).toBe(1);

      await vi.waitFor(() => expect(h.host.surfaces.toolbar.size).toBe(0), {
        timeout: 2000,
      });
      expect(h.host.toasts).toEqual([
        'extension-stopped-responding {"name":"Title of ext.hung"}',
      ]);
      expect(h.frames).toEqual([]);
      // Stopped, not uninstalled: it starts again on the next page load.
      expect(
        manager.getExtensions().find((e) => e.id === sourced("ext.hung"))
          ?.installed
      ).toBe(true);
    });

    it("leaves a responsive extension running", async () => {
      manager = h.createManager({ sandboxHeartbeatIntervalMs: 20 });
      await install({ id: "ext.alive" });

      await new Promise((resolve) => setTimeout(resolve, 0));
      await vi.waitFor(
        () => {
          expect(h.frames).toHaveLength(1);
          expect(h.host.toasts).toEqual([]);
        },
        { timeout: 200 }
      );
    });
  });

  describe("fonts", () => {
    it("loads the app's fonts in frames, from Google Fonts only", async () => {
      await install({ id: "ext.fonts" });

      expect(h.frames[0]!.init.state.fontStylesheets).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^https:\/\/fonts\.googleapis\.com\/css2\?/),
        ])
      );
      const csp = buildSandboxCsp([]);
      expect(csp).toContain(
        "style-src 'unsafe-inline' https://fonts.googleapis.com;"
      );
      expect(csp).toContain("font-src data: https://fonts.gstatic.com;");
      expect(csp).toContain("connect-src 'none'");
    });
  });

  describe("permissions in Settings", () => {
    it("can't take back a required permission", async () => {
      await install({ id: "ext.req", permissions: ["reading:position"] });

      expect(
        await manager.setOptionalPermission(
          sourced("ext.req"),
          "reading:position",
          false
        )
      ).toBe(false);
      expect(
        manager.sandboxPermissions.value[sourced("ext.req")]!.granted
      ).toEqual(["reading:position"]);
    });

    it("takes back what includes a permission along with it", async () => {
      const extension = await install({
        id: "ext.hl",
        optionalPermissions: ["highlights:read", "highlights:write"],
      });
      await allowInSettings(extension, sourced("ext.hl"), "highlights:write");
      await allowInSettings(extension, sourced("ext.hl"), "highlights:read");

      const before = extension.runs.length;
      await manager.setOptionalPermission(
        sourced("ext.hl"),
        "highlights:read",
        false
      );
      await vi.waitFor(() => expect(extension.runs).toHaveLength(before + 1));

      expect(
        manager.sandboxPermissions.value[sourced("ext.hl")]!.granted
      ).toEqual([]);
      const sb = extension.latest();
      expect(
        await codeOf(
          sb.highlights.list({
            translationId: "BSB",
            bookId: "JHN",
            chapter: 3,
          })
        )
      ).toBe("permission_denied");
    });

    it("saves the change, so it holds after a reload", async () => {
      const meta = {
        id: "ext.persist",
        optionalPermissions: ["reading:position" as const],
      };
      const extension = await install(meta);
      await allowInSettings(
        extension,
        sourced("ext.persist"),
        "reading:position"
      );

      h.reload(sourced("ext.persist"));
      manager = h.createManager();
      const { sb } = await install(meta);

      expect(sb.permissions.has("reading:position")).toBe(true);
    });
  });
});
