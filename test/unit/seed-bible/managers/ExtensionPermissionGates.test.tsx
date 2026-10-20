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
import { render } from "preact";
import type { ExtensionManager } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { ExtensionMeta } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { buildSandboxCsp } from "@packages/seed-bible/seed-bible/managers/ExtensionSandboxManager";
import type { BibleSelectedVerse } from "@packages/seed-bible/seed-bible/managers/BibleReadingManager";
import {
  defineExtension,
  type SandboxContext,
  type SandboxReadingPosition,
  type SandboxSelectedVerse,
} from "@packages/seed-bible/seed-bible/extensions";
import {
  expandSandboxPermissions,
  SANDBOX_PERMISSION_INFO,
  SANDBOX_PERMISSIONS,
  type SandboxHostMessage,
  type SandboxPermission,
} from "@packages/seed-bible/seed-bible/extensions/protocol";
import {
  createRawFrame,
  createSharedSession,
  useSandboxHarness,
} from "./sandboxHarness";

/*
 * Every feature a permission unlocks, checked under every way a sandboxed
 * extension can end up with — or without — that permission. Each case
 * checks all the gated features, not just the one under test, so granting
 * one permission is also shown not to unlock anything else.
 */

const JOHN_3_16: BibleSelectedVerse = {
  bookId: "JHN",
  chapterNumber: 3,
  translationId: "BSB",
  verse: { number: 16 } as BibleSelectedVerse["verse"],
};

/** What the probe extension saw, for one run of its `main`. */
interface ProbeRecord {
  sb: SandboxContext | null;
  ready: boolean;
  askResults: unknown[];
  toolSelections: SandboxSelectedVerse[][];
  viewPositions: (SandboxReadingPosition | null)[];
}

type Observed = "enabled" | "disabled" | `inconsistent: ${string}`;

describe("permission gates", () => {
  const h = useSandboxHarness();
  const probes = new Map<string, ProbeRecord>();
  let manager: ExtensionManager;

  beforeEach(() => {
    probes.clear();
    manager = h.createManager();
    // Signed in, so features that need an account aren't refused for that.
    h.host.userId.value = "user-1";
    h.host.profile.value = { name: "Ruth", pictureUrl: null };
    h.host.readingEvents.push({
      bookId: "RUT",
      chapter: 1,
      userId: "user-1",
      start: 100,
      end: 200,
    });
    h.host.saves.value = [
      {
        id: "save-existing",
        translationId: "BSB",
        bookId: "RUT",
        chapterNumber: 1,
        createdAt: 1,
        categories: ["Saved"],
      },
    ];
  });

  /**
   * An extension that exposes every gated feature for the test to poke: a
   * verse tool that records the selection it's given, a toolbar tool that
   * asks for `ask`, and a view that records the reading position it sees.
   */
  function probeExtension(id: string, ask: SandboxPermission) {
    return defineExtension({
      main: async (sb) => {
        const record: ProbeRecord = {
          sb,
          ready: false,
          askResults: [],
          toolSelections: [],
          viewPositions: [],
        };
        probes.set(id, record);
        await sb.tools.registerVerseToolbarTool({
          id: "probe-verse",
          title: "Probe",
          icon: { material: "science" },
          onSelect: ({ selection }) =>
            void record.toolSelections.push(selection),
        });
        await sb.tools.registerToolbarTool({
          id: "ask",
          title: "Ask",
          icon: { material: "lock_open" },
          onSelect: async () => {
            record.askResults.push(
              await sb.permissions
                .request(ask)
                .catch((err: { code: string }) => err.code)
            );
          },
        });
        record.ready = true;
      },
      views: {
        probe: ({ sb }) => {
          probes.get(id)!.viewPositions.push(sb.reading.position.value);
          return null;
        },
      },
    });
  }

  async function installProbe(
    id: string,
    ask: SandboxPermission,
    meta: Partial<ExtensionMeta>
  ) {
    probes.delete(id);
    const installed = await manager.loadExtension(
      await h.publish(probeExtension(id, ask), { id, ...meta })
    );
    expect(installed).toBe(true);
    await vi.waitFor(() => expect(probes.get(id)?.ready).toBe(true));
  }

  /** The user selects the probe's "Ask" tool and answers the request. */
  async function ask(id: string, answer: boolean | "invalid_request") {
    h.consent.mockImplementation(async (request) =>
      request.reason === "request" ? answer === true : true
    );
    h.setUserActivation(true);
    const record = probes.get(id)!;
    const before = record.askResults.length;
    h.host.surfaces.toolbar.get(`sandbox:${id}:ask`)!.onSelect!();
    await vi.waitFor(() => expect(record.askResults).toHaveLength(before + 1));
    expect(record.askResults.at(-1)).toBe(answer);
    h.setUserActivation(false);
    h.consent.mockImplementation(async () => true);
  }

  /** A page reload: the extension stops, and a fresh manager starts it again. */
  function reloadPage(id: string) {
    h.reload(id);
    manager = h.createManager();
  }

  /** Waits until every message the host has already sent this frame is in. */
  const flush = (sb: SandboxContext) => sb.storage.keys();

  const FEATURES: {
    name: string;
    permission: SandboxPermission;
    probe: (record: ProbeRecord) => Promise<Observed>;
  }[] = [
    {
      name: "sb.reading.position follows the reader",
      permission: "reading:position",
      probe: async ({ sb }) => {
        const chapter = h.host.reading.value.chapterNumber! + 1;
        h.host.reading.value = {
          ...h.host.reading.value,
          chapterNumber: chapter,
        };
        await flush(sb!);
        const position = sb!.reading.position.value;
        if (position?.chapterNumber === chapter) return "enabled";
        if (position === null) return "disabled";
        return `inconsistent: ${JSON.stringify(position)}`;
      },
    },
    {
      name: "sb.reading.selection follows the reader",
      permission: "reading:selection",
      probe: async ({ sb }) => {
        h.host.selectedVerses.value = [JOHN_3_16];
        await flush(sb!);
        const selection = sb!.reading.selection.value;
        h.host.selectedVerses.value = [];
        if (selection.length === 1 && selection[0]!.verse === 16) {
          return "enabled";
        }
        if (selection.length === 0) return "disabled";
        return `inconsistent: ${JSON.stringify(selection)}`;
      },
    },
    {
      name: "a tool's onSelect gets the selected verses",
      permission: "reading:selection",
      probe: async (record) => {
        h.host.selectedVerses.value = [JOHN_3_16];
        const before = record.toolSelections.length;
        h.host.surfaces.verse.get(
          `sandbox:${record.sb!.extensionId}:probe-verse`
        )!.onSelect!();
        await vi.waitFor(() =>
          expect(record.toolSelections).toHaveLength(before + 1)
        );
        h.host.selectedVerses.value = [];
        const selection = record.toolSelections.at(-1)!;
        if (selection.length === 1 && selection[0]!.verse === 16) {
          return "enabled";
        }
        if (selection.length === 0) return "disabled";
        return `inconsistent: ${JSON.stringify(selection)}`;
      },
    },
    {
      name: "sb.reading.open opens a passage",
      permission: "reading:navigate",
      probe: async ({ sb }) => {
        const before = h.host.openedReferences.length;
        const outcome = await sb!.reading
          .open({ bookId: "GEN", chapter: 1 })
          .then(
            () => "ok",
            (err: { code: string }) => err.code
          );
        const opened = h.host.openedReferences.length - before;
        if (outcome === "ok" && opened === 1) return "enabled";
        if (outcome === "permission_denied" && opened === 0) return "disabled";
        return `inconsistent: ${outcome}, opened ${opened}`;
      },
    },
    {
      name: "a pane's view sees the reading position",
      permission: "reading:position",
      probe: async (record) => {
        const pane = await record.sb!.panes.open({
          view: "probe",
          placement: "floating",
          title: "Probe",
        });
        const container = document.createElement("div");
        document.body.appendChild(container);
        const before = record.viewPositions.length;
        render(
          h.host.panes.panes.value
            .find((p) => p.id === pane.paneId)!
            .component(),
          container
        );
        await vi.waitFor(() =>
          expect(record.viewPositions).toHaveLength(before + 1)
        );
        render(null, container);
        container.remove();
        await pane.close();
        const position = record.viewPositions.at(-1);
        if (position?.bookId === "JHN") return "enabled";
        if (position === null) return "disabled";
        return `inconsistent: ${JSON.stringify(position)}`;
      },
    },
    {
      name: "a Discover provider is asked for the open chapter",
      permission: "reading:position",
      probe: async ({ sb }) => {
        const outcome = await sb!.discover
          .registerProvider({
            id: "probe-discover",
            title: "Probe",
            description: "",
            discover: (request) => [
              {
                type: "study-note",
                reference: { bookId: request.bookId, chapter: request.chapter },
                text: "probe",
              },
            ],
          })
          .then((handle) => handle, deniedCode);
        const asked = await discoveredBy("sandbox:ext.probe:probe-discover");
        if (typeof outcome !== "string") {
          await outcome.unregister();
        }
        if (typeof outcome !== "string" && asked === 1) return "enabled";
        if (outcome === "permission_denied" && asked === 0) return "disabled";
        return `inconsistent: ${String(outcome)}, ${asked} results`;
      },
    },
    {
      name: "sb.history.list reads the reading history",
      permission: "reading:history",
      probe: ({ sb }) =>
        readProbe(
          sb!.history.list({ from: 0, to: 1_000_000 }),
          (events) => events.length === 1 && events[0]!.bookId === "RUT"
        ),
    },
    {
      name: "sb.highlights.list reads highlights",
      permission: "highlights:read",
      probe: async ({ sb }) => {
        h.host.highlights.set("BSB/JHN/3", [{ verse: 16, colorId: "yellow" }]);
        return readProbe(
          sb!.highlights.list({
            translationId: "BSB",
            bookId: "JHN",
            chapter: 3,
          }),
          (highlights) => highlights.length === 1
        );
      },
    },
    {
      name: "sb.highlights.add adds a highlight",
      permission: "highlights:write",
      probe: ({ sb }) =>
        writeProbe(
          sb!.highlights.add({
            translationId: "BSB",
            bookId: "GEN",
            chapter: 1,
            verses: [1],
            colorId: "blue",
          }),
          () => h.host.highlights.get("BSB/GEN/1")?.length ?? 0
        ),
    },
    {
      name: "sb.notes.list reads notes",
      permission: "notes:read",
      probe: async ({ sb }) => {
        h.host.notes.set("JHN/3", [
          {
            id: "note-user",
            bookId: "JHN",
            chapterNumber: 3,
            data: { type: "comment", html: "<p>Mine</p>" },
          },
        ]);
        return readProbe(
          sb!.notes.list({ bookId: "JHN", chapter: 3 }),
          (notes) => notes.length === 1 && notes[0]!.text === "Mine"
        );
      },
    },
    {
      name: "sb.notes.create adds a note",
      permission: "notes:write",
      probe: ({ sb }) =>
        writeProbe(
          sb!.notes.create({ bookId: "GEN", chapter: 1, text: "Probe" }),
          () => h.host.notes.get("GEN/1")?.length ?? 0
        ),
    },
    {
      name: "sb.saves.list reads saves",
      permission: "saves:read",
      probe: ({ sb }) =>
        readProbe(sb!.saves.list(), (saves) => saves.length >= 1),
    },
    {
      name: "sb.saves.add adds a save",
      permission: "saves:write",
      probe: ({ sb }) =>
        writeProbe(
          sb!.saves.add({ translationId: "BSB", bookId: "GEN", chapter: 1 }),
          () => h.host.saves.value.length
        ),
    },
    {
      name: "sb.profile.get reads the profile",
      permission: "profile:read",
      probe: ({ sb }) =>
        readProbe(
          sb!.profile.get(),
          (profile) => profile?.name === "Ruth" && profile.userId === "user-1"
        ),
    },
    {
      name: "a chat provider answers a chat it's added to",
      permission: "chat:respond",
      probe: ({ sb }) => chatProbe(sb!, false),
    },
    {
      name: "a chat provider answers in a shared chat",
      permission: "chat:shared",
      probe: ({ sb }) => chatProbe(sb!, true),
    },
    {
      name: "sb.friends.list reads the friends list",
      permission: "friends:read",
      probe: ({ sb }) => {
        h.host.friends.value = [
          { userId: "user-2", name: "Naomi", pictureUrl: null },
        ];
        return readProbe(
          sb!.friends.list(),
          (friends) => friends.length === 1 && friends[0]!.name === "Naomi"
        );
      },
    },
    {
      name: "sb.session.current follows the shared session",
      permission: "session:read",
      probe: async ({ sb }) => {
        const tab = h.host.reading.value.tab;
        h.host.reading.value = {
          ...h.host.reading.value,
          tab: {
            ...tab,
            sharedSession: createSharedSession([
              { userId: "user-1", connectionId: "c1", isSelf: true },
              { userId: "user-2", connectionId: "c2", name: "Naomi" },
            ]),
          },
        };
        await flush(sb!);
        const session = sb!.session.current.value;
        h.host.reading.value = { ...h.host.reading.value, tab };
        if (session?.participants.length === 2) return "enabled";
        if (session === null) return "disabled";
        return `inconsistent: ${JSON.stringify(session)}`;
      },
    },
    {
      name: "sb.audio.readAloud reads a chapter aloud",
      permission: "audio:playback",
      probe: async ({ sb }) => {
        const runs = h.host.speech.runs;
        const before = runs.length;
        let settled = false;
        const outcome = interacting(sb!, () =>
          sb!.audio.readAloud({
            translationId: "BSB",
            bookId: "JHN",
            chapter: 1,
          })
        )
          .then(() => "ok", deniedCode)
          .finally(() => {
            settled = true;
          });
        await vi.waitFor(() =>
          expect(settled || runs.length > before).toBe(true)
        );
        const spoke = runs.length > before;
        h.host.speech.finish();
        const result = await outcome;
        if (result === "ok" && spoke) return "enabled";
        if (result === "permission_denied" && !spoke) return "disabled";
        return `inconsistent: ${result}, spoke: ${spoke}`;
      },
    },
    {
      name: "sb.clipboard.writeText copies text",
      permission: "clipboard:write",
      probe: ({ sb }) =>
        writeProbe(
          interacting(sb!, () => sb!.clipboard.writeText("probe")),
          () => h.host.clipboard.length
        ),
    },
    {
      name: "sb.portals.open shows a CasualOS portal",
      permission: "embed:casualos",
      probe: async ({ sb }) => {
        const before = h.host.panes.panes.value.length;
        const outcome = await sb!.portals
          .open({
            pattern: { name: "probe-pattern" },
            portalType: "grid",
            placement: "floating",
            title: "Portal",
          })
          .then((portal) => portal, deniedCode);
        const opened = h.host.panes.panes.value.length - before;
        if (typeof outcome !== "string") {
          await outcome.close();
          if (opened === 1) return "enabled";
        }
        if (outcome === "permission_denied" && opened === 0) return "disabled";
        return `inconsistent: ${String(outcome)}, opened ${opened}`;
      },
    },
    {
      name: "sb.devices.recordAudio shows the recording dialog",
      permission: "device:microphone",
      probe: ({ sb }) =>
        captureProbe(sb!, () => sb!.devices.recordAudio({ maxSeconds: 5 })),
    },
    {
      name: "sb.devices.takePhoto shows the camera dialog",
      permission: "device:camera",
      probe: ({ sb }) => captureProbe(sb!, () => sb!.devices.takePhoto()),
    },
  ];

  /**
   * Runs `action` while the user is clicking inside the extension's frame,
   * for features that only work right after the user interacts with it.
   */
  async function interacting<T>(
    sb: SandboxContext,
    action: () => Promise<T>
  ): Promise<T> {
    h.setUserActivation(true);
    h.focusedFrame = h.frames.find(
      (frame) => frame.extensionId === sb.extensionId && !frame.container
    )!;
    const result = action();
    // Handled by the caller; this only keeps it from counting as unhandled
    // while the call is in flight.
    result.catch(() => {});
    // The host checks as soon as the call arrives.
    await sb.storage.keys();
    h.setUserActivation(false);
    h.focusedFrame = null;
    return result;
  }

  /** Enabled when the host's capture dialog opens (the user then cancels it). */
  async function captureProbe(
    sb: SandboxContext,
    capture: () => Promise<Blob | null>
  ): Promise<Observed> {
    let settled = false;
    const outcome = interacting(sb, capture)
      .then((blob) => ({ blob }), deniedCode)
      .finally(() => {
        settled = true;
      });
    await vi.waitFor(() =>
      expect(settled || h.host.modals.modals.value.length > 0).toBe(true)
    );
    const dialog = h.host.modals.modals.value[0];
    dialog?.onDismiss?.();
    const result = await outcome;
    if (dialog && typeof result !== "string" && result.blob === null) {
      return "enabled";
    }
    if (result === "permission_denied" && !dialog) return "disabled";
    return `inconsistent: ${JSON.stringify(result)}, dialog: ${Boolean(dialog)}`;
  }

  const deniedCode = (err: { code: string }) => err.code;

  /** Enabled when the read succeeds as `check` expects; disabled when refused. */
  async function readProbe<T>(
    read: Promise<T>,
    check: (value: T) => boolean
  ): Promise<Observed> {
    const outcome = await read.then(
      (value) => ({ value }),
      (err: { code: string }) => err.code
    );
    if (typeof outcome === "string") {
      return outcome === "permission_denied"
        ? "disabled"
        : `inconsistent: ${outcome}`;
    }
    return check(outcome.value)
      ? "enabled"
      : `inconsistent: ${JSON.stringify(outcome.value)}`;
  }

  /** Enabled when the write succeeds and changes `count`; disabled when refused and it doesn't. */
  async function writeProbe(
    write: Promise<unknown>,
    count: () => number
  ): Promise<Observed> {
    const before = count();
    const outcome = await write.then(() => "ok", deniedCode);
    const changed = count() !== before;
    if (outcome === "ok" && changed) return "enabled";
    if (outcome === "permission_denied" && !changed) return "disabled";
    return `inconsistent: ${outcome}, changed: ${changed}`;
  }

  /** How many results the app's Discover got from `providerId` for John 3. */
  async function discoveredBy(providerId: string): Promise<number> {
    let count = 0;
    for await (const answer of h.host.discover.discover({
      translationId: "BSB",
      book: "JHN",
      chapter: 3,
      language: "en",
    })) {
      if (answer.providerId === providerId) {
        count += answer.results.length;
      }
    }
    return count;
  }

  async function chatProbe(
    sb: SandboxContext,
    shared: boolean
  ): Promise<Observed> {
    const providerId = shared ? "probe-shared-chat" : "probe-chat";
    const chatId = shared ? "chat-shared" : "chat-local";
    h.host.chats.chats.value = [{ id: chatId, isShared: shared }];
    const outcome = await sb.chats
      .registerProvider({
        id: providerId,
        name: "Probe",
        shared,
        respond: (request) => `heard ${request.messages.at(-1)?.text}`,
      })
      .then((handle) => handle, deniedCode);
    const provider = h.host.chatProviders.get(
      `sandbox:ext.probe:${providerId}`
    );
    const reply = provider
      ? await provider.generateResponse({
          chatId,
          participant: { id: "bot" } as never,
          participants: [],
          messages: [
            {
              type: "text",
              id: "m1",
              authors: ["user-1"],
              timeMs: 1,
              targets: true,
              text: "hi",
            },
          ],
        })
      : null;
    if (typeof outcome !== "string") {
      await outcome.unregister();
    }
    const answered =
      reply !== null && typeof reply === "object" && "text" in reply
        ? reply.text
        : null;
    if (typeof outcome !== "string" && answered === "heard hi") {
      return "enabled";
    }
    if (outcome === "permission_denied" && !provider) return "disabled";
    return `inconsistent: ${String(outcome)}, ${String(answered)}`;
  }

  /**
   * Gives an extension `permission` the most direct way its policy allows:
   * required at install when it can be, otherwise optional and allowed
   * when asked.
   */
  async function grantDirectly(id: string, permission: SandboxPermission) {
    if (SANDBOX_PERMISSION_INFO[permission].requirable) {
      await installProbe(id, permission, { permissions: [permission] });
    } else {
      await installProbe(id, permission, { optionalPermissions: [permission] });
      await ask(id, true);
    }
  }

  const PATHWAYS: {
    name: string;
    granted: boolean;
    /** Only for permissions a manifest may require. */
    requiredOnly?: boolean;
    setUp: (id: string, permission: SandboxPermission) => Promise<void>;
  }[] = [
    {
      name: "required by the manifest",
      granted: true,
      requiredOnly: true,
      setUp: (id, p) => installProbe(id, p, { permissions: [p] }),
    },
    {
      name: "optional, and allowed when the extension asked",
      granted: true,
      setUp: async (id, p) => {
        await installProbe(id, p, { optionalPermissions: [p] });
        await ask(id, true);
      },
    },
    {
      name: "optional, allowed when asked, and still granted after a reload",
      granted: true,
      setUp: async (id, p) => {
        await installProbe(id, p, { optionalPermissions: [p] });
        await ask(id, true);
        reloadPage(id);
        await installProbe(id, p, { optionalPermissions: [p] });
      },
    },
    {
      name: "optional, and never asked for",
      granted: false,
      setUp: (id, p) => installProbe(id, p, { optionalPermissions: [p] }),
    },
    {
      name: "optional, and declined when the extension asked",
      granted: false,
      setUp: async (id, p) => {
        await installProbe(id, p, { optionalPermissions: [p] });
        await ask(id, false);
      },
    },
    {
      name: "not in the manifest, even though the extension asked",
      granted: false,
      setUp: async (id, p) => {
        await installProbe(id, p, {});
        await ask(id, "invalid_request");
      },
    },
    {
      name: "granted only to another installed extension",
      granted: false,
      setUp: async (id, p) => {
        await grantDirectly("ext.other", p);
        await installProbe(id, p, {});
      },
    },
    {
      name: "granted to an earlier version that listed it, but not this one",
      granted: false,
      setUp: async (id, p) => {
        await grantDirectly(id, p);
        reloadPage(id);
        await installProbe(id, p, {});
      },
    },
    {
      name: "allowed when asked, then taken back in Settings",
      granted: false,
      setUp: async (id, p) => {
        await installProbe(id, p, { optionalPermissions: [p] });
        await ask(id, true);
        probes.delete(id);
        expect(await manager.setOptionalPermission(id, p, false)).toBe(true);
        await vi.waitFor(() => expect(probes.get(id)?.ready).toBe(true));
      },
    },
    {
      name: "allowed when asked, then the extension was uninstalled and reinstalled",
      granted: false,
      setUp: async (id, p) => {
        await installProbe(id, p, { optionalPermissions: [p] });
        await ask(id, true);
        manager.unloadExtension(id);
        await vi.waitFor(() =>
          expect(
            JSON.parse(localStorage.getItem("sb-extension-grants")!)[id]
          ).toHaveProperty("revokedAtMs")
        );
        await installProbe(id, p, { optionalPermissions: [p] });
      },
    },
    {
      name: "optional, never asked for, then turned on in Settings",
      granted: true,
      setUp: async (id, p) => {
        await installProbe(id, p, { optionalPermissions: [p] });
        probes.delete(id);
        expect(await manager.setOptionalPermission(id, p, true)).toBe(true);
        await vi.waitFor(() => expect(probes.get(id)?.ready).toBe(true));
      },
    },
  ];

  describe.each(SANDBOX_PERMISSIONS.map((permission) => ({ permission })))(
    "$permission",
    ({ permission }) => {
      const pathways = PATHWAYS.filter(
        (pathway) =>
          !pathway.requiredOnly ||
          SANDBOX_PERMISSION_INFO[permission].requirable
      );
      it.each(pathways)("$name", async (pathway) => {
        const id = "ext.probe";
        await pathway.setUp(id, permission);
        const record = probes.get(id)!;

        const observed: Record<string, Observed> = {};
        for (const feature of FEATURES) {
          observed[feature.name] = await feature.probe(record);
        }

        // Granting a permission also grants what it includes (writing
        // highlights includes reading them), and nothing else.
        const enabled = expandSandboxPermissions(
          pathway.granted ? [permission] : []
        );
        expect(observed).toEqual(
          Object.fromEntries(
            FEATURES.map((feature) => [
              feature.name,
              enabled.includes(feature.permission) ? "enabled" : "disabled",
            ])
          )
        );
      });

      if (!SANDBOX_PERMISSION_INFO[permission].requirable) {
        it("can't be required: an extension listing it under permissions doesn't install", async () => {
          vi.spyOn(console, "error").mockImplementation(() => undefined);
          const installed = await manager.loadExtension(
            await h.publish(probeExtension("ext.probe", permission), {
              id: "ext.probe",
              permissions: [permission],
            })
          );
          expect(installed).toBe(false);
          expect(h.consent).not.toHaveBeenCalled();
          expect(h.frames).toEqual([]);
        });
      }
    }
  );

  it("covers every permission with at least one feature", () => {
    const covered = new Set(FEATURES.map((feature) => feature.permission));
    expect(SANDBOX_PERMISSIONS.filter((p) => !covered.has(p))).toEqual([]);
  });

  it("gives a pane that was already open a permission granted after it opened", async () => {
    const id = "ext.probe";
    await installProbe(id, "reading:position", {
      optionalPermissions: ["reading:position"],
    });
    const record = probes.get(id)!;
    let viewSb: SandboxContext | null = null;
    // A second extension whose view keeps its `sb`, to read it later.
    await manager.loadExtension(
      await h.publish(
        defineExtension({
          main: (sb) =>
            void sb.panes.open({ view: "keep", placement: "side", title: "K" }),
          views: {
            keep: ({ sb }) => {
              viewSb = sb;
              return null;
            },
          },
        }),
        { id: "ext.view-first", optionalPermissions: ["reading:position"] }
      )
    );
    await vi.waitFor(() =>
      expect(
        h.host.panes.panes.value.some((p) =>
          p.id.startsWith("sandbox:ext.view-first:")
        )
      ).toBe(true)
    );
    const container = document.createElement("div");
    document.body.appendChild(container);
    render(
      h.host.panes.panes.value
        .find((p) => p.id.startsWith("sandbox:ext.view-first:"))!
        .component(),
      container
    );
    await vi.waitFor(() => expect(viewSb).toBeTruthy());
    expect(viewSb!.reading.position.value).toBeNull();

    // The user, inside that pane, allows the request it makes.
    h.focusedFrame = h.frames.at(-1)!;
    h.setUserActivation(true);
    expect(await viewSb!.permissions.request("reading:position")).toBe(true);

    expect(viewSb!.permissions.has("reading:position")).toBe(true);
    await vi.waitFor(() =>
      expect(viewSb!.reading.position.value?.bookId).toBe("JHN")
    );
    // The other extension, which never asked, still has nothing.
    expect(record.sb!.reading.position.value).toBeNull();
    render(null, container);
    container.remove();
  });

  describe("at the protocol level, without the SDK", () => {
    const stateMessages = (messages: SandboxHostMessage[]) =>
      messages.filter((m) => m.type === "state");

    it("sends a frame nothing gated in its first message unless it's granted", async () => {
      h.host.selectedVerses.value = [JOHN_3_16];
      const withNothing = createRawFrame();
      const withEverything = createRawFrame();
      await manager.loadExtension(
        await h.publish(withNothing, { id: "ext.raw-nothing" })
      );
      await manager.loadExtension(
        await h.publish(withEverything, {
          id: "ext.raw-everything",
          permissions: SANDBOX_PERMISSIONS.filter(
            (p) => SANDBOX_PERMISSION_INFO[p].requirable
          ),
        })
      );

      expect(withNothing.init!.granted).toEqual([]);
      expect(withNothing.init!.state.position).toBeNull();
      expect(withNothing.init!.state.selection).toEqual([]);
      expect(withEverything.init!.state.position).toMatchObject({
        bookId: "JHN",
        chapterNumber: 3,
      });
      expect(withEverything.init!.state.selection).toEqual([
        { bookId: "JHN", chapterNumber: 3, translationId: "BSB", verse: 16 },
      ]);
    });

    it("doesn't even tell a frame without the permission that the passage or selection changed", async () => {
      const withoutPermission = createRawFrame();
      const withPermission = createRawFrame();
      await manager.loadExtension(
        await h.publish(withoutPermission, { id: "ext.raw-without" })
      );
      await manager.loadExtension(
        await h.publish(withPermission, {
          id: "ext.raw-with",
          permissions: ["reading:position", "reading:selection"],
        })
      );
      // Messages already in flight from the install have arrived.
      await withoutPermission.call("storage.keys", {});
      await withPermission.call("storage.keys", {});
      const before = stateMessages(withoutPermission.messages).length;
      const beforeGranted = stateMessages(withPermission.messages).length;

      h.host.reading.value = { ...h.host.reading.value, chapterNumber: 9 };
      h.host.selectedVerses.value = [JOHN_3_16];
      await withoutPermission.call("storage.keys", {});
      await withPermission.call("storage.keys", {});

      expect(stateMessages(withoutPermission.messages)).toHaveLength(before);
      expect(stateMessages(withPermission.messages).length).toBeGreaterThan(
        beforeGranted
      );
      const latest = stateMessages(withPermission.messages).at(-1)!;
      expect(latest.type === "state" && latest.state).toMatchObject({
        position: { chapterNumber: 9 },
        selection: [{ verse: 16 }],
      });
    });

    it("ignores a frame that tells the host it has permissions", async () => {
      const raw = createRawFrame();
      await manager.loadExtension(await h.publish(raw, { id: "ext.raw-liar" }));
      await vi.waitFor(() => expect(raw.started).toBe(true));

      raw.send({ type: "permissions", granted: [...SANDBOX_PERMISSIONS] });
      raw.send({
        type: "state",
        state: {
          position: { translationId: "BSB", bookId: "GEN", chapterNumber: 1 },
        },
      });
      raw.send({ type: "result", id: 1, ok: true, value: { granted: true } });
      const response = await raw.call("reading.open", {
        bookId: "GEN",
        chapter: 1,
      });

      expect(response).toMatchObject({
        ok: false,
        error: { code: "permission_denied" },
      });
      expect(h.host.openedReferences).toEqual([]);
    });

    it("rejects requests for permissions that don't exist", async () => {
      const raw = createRawFrame();
      await manager.loadExtension(
        await h.publish(raw, {
          id: "ext.raw-bogus",
          optionalPermissions: ["reading:position"],
        })
      );
      await vi.waitFor(() => expect(raw.started).toBe(true));
      h.setUserActivation(true);
      h.focusedFrame = h.frames[0]!;

      const response = await raw.call("permissions.request", {
        permissions: ["account:everything"],
      });

      expect(response).toMatchObject({
        ok: false,
        error: { code: "invalid_request" },
      });
      expect(h.consent).toHaveBeenCalledTimes(1);
    });
  });

  describe("network hosts", () => {
    it("lets each frame reach only the hosts its manifest lists", async () => {
      await installProbe("ext.probe", "reading:position", {
        network: ["api.example.com"],
        optionalPermissions: ["reading:position"],
      });
      await ask("ext.probe", true);
      await probes.get("ext.probe")!.sb!.panes.open({
        view: "probe",
        placement: "side",
        title: "P",
      });
      const container = document.createElement("div");
      document.body.appendChild(container);
      render(h.host.panes.panes.value[0]!.component(), container);
      await vi.waitFor(() => expect(h.frames).toHaveLength(2));

      // Granting a permission doesn't widen what any frame can reach.
      for (const frame of h.frames) {
        expect(frame.network).toEqual(["api.example.com"]);
        const csp = buildSandboxCsp(frame.network);
        expect(csp).toContain("connect-src https://api.example.com;");
        expect(csp).toContain("img-src data: blob: https://api.example.com;");
      }
      render(null, container);
      container.remove();
    });

    it("lets a frame reach nothing when the manifest lists no hosts, including after an update drops one", async () => {
      await installProbe("ext.probe", "reading:position", {
        network: ["api.example.com"],
      });
      reloadPage("ext.probe");

      await installProbe("ext.probe", "reading:position", {});

      expect(h.frames).toHaveLength(1);
      expect(h.frames[0]!.network).toEqual([]);
      expect(buildSandboxCsp(h.frames[0]!.network)).toContain(
        "connect-src 'none'"
      );
    });
  });
});
