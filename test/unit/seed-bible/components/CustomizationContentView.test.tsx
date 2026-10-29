import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CustomizationContentView } from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationContentView";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { contentChapterAddress } from "@packages/seed-bible/seed-bible/managers/customContent/schema";
import type { ChatProvider } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import {
  CONTENT_ITEM_MARKER,
  contentItemAddress,
  type ContentItem,
} from "@packages/seed-bible/seed-bible/managers/customContent/schema";
import type { ContentImportService } from "@packages/seed-bible/seed-bible/managers/customContent/importClient";
import type { ImportProgress } from "@packages/seed-bible/seed-bible/managers/customContent/importApi";
import { ContentLibraryError } from "@packages/seed-bible/seed-bible/managers/customContent/publish";
import {
  createApp,
  fakeRecordsServer,
  OWNER,
  waitForCondition,
  type FakeRecordsServer,
} from "../managers/testUtils/customContentApp";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

let container: HTMLDivElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  render(null, container);
  container.remove();
  vi.restoreAllMocks();
});

/** The owner, signed in, with a Custom Branding open in the editor. */
async function renderEditor(
  server: FakeRecordsServer,
  options: {
    importService?: ContentImportService;
    chatProviders?: ChatProvider[];
  } = {}
) {
  const app = createApp(server, {
    userId: OWNER,
    importService: options.importService,
    importPollMs: 5,
    chatProviders: options.chatProviders,
  });
  app.os.sessionKey.value = "vSK1.owner-session";
  const created = await app.customizations.create();
  app.customizations.startEditing(created.id);
  const toast = vi.fn();
  const state = {
    customizations: app.customizations,
    customContent: app.customContent,
    app: { toast, selectedTab: signal(null) },
  } as unknown as SeedBibleState;
  await act(() => {
    render(<CustomizationContentView state={state} />, container);
  });
  return { ...app, toast };
}

/** A button's visible label, without its icon's ligature name ("add"). */
function label(element: HTMLElement): string {
  const copy = element.cloneNode(true) as HTMLElement;
  copy
    .querySelectorAll(".material-symbols-outlined")
    .forEach((icon) => icon.remove());
  return copy.textContent?.trim() ?? "";
}

function button(name: string): HTMLButtonElement {
  const match = [...container.querySelectorAll("button")].find(
    (b) => label(b) === name
  );
  if (!match) {
    throw new Error(`No "${name}" button`);
  }
  return match;
}

async function click(target: HTMLElement) {
  await act(() => {
    target.click();
  });
}

async function type(label: string, value: string) {
  const labelElement = [...container.querySelectorAll("label")].find(
    (l) => l.textContent?.trim() === label
  );
  const input = container.querySelector<HTMLInputElement>(
    `#${labelElement?.htmlFor}`
  );
  if (!input) {
    throw new Error(`No field labelled "${label}"`);
  }
  await act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function createLibrary() {
  await click(button("Create content library"));
  await waitForCondition(() => container.textContent!.includes("Add content"));
}

describe("CustomizationContentView", () => {
  it("creates a library, then publishes an item to the chapters it covers", async () => {
    const server = fakeRecordsServer();
    const { customContent } = await renderEditor(server);

    await createLibrary();
    await click(button("Add content"));
    await type("Link", "https://gracecommunity.org/sermons/the-good-shepherd");
    await type("Title", "The Good Shepherd");
    await type("Passages it covers", "John 10:1-18; Psalm 23");

    expect(container.textContent).toContain(
      "Shows on: John 10:1-18; Psalms 23"
    );
    await click(button("Publish"));
    await waitForCondition(() => container.textContent!.includes("Published"));

    expect(container.textContent).toContain("The Good Shepherd");
    const record = server.records.get(customContent.recordName.value!)!;
    expect(record.has(contentChapterAddress("JHN", 10))).toBe(true);
    expect(record.has(contentChapterAddress("PSA", 23))).toBe(true);
  });

  it("won't publish a passage it doesn't recognize, and says which one", async () => {
    const server = fakeRecordsServer();
    await renderEditor(server);

    await createLibrary();
    await click(button("Add content"));
    await type("Link", "https://gracecommunity.org/sermons/x");
    await type("Title", "A sermon");
    await type("Passages it covers", "John 99");

    expect(container.textContent).toContain(
      "Not a passage we recognize: John 99"
    );
    expect(button("Publish").disabled).toBe(true);
    expect(button("Save draft").disabled).toBe(true);
  });

  it("keeps an item without passages as a draft that can't be published yet", async () => {
    const server = fakeRecordsServer();
    const { customContent } = await renderEditor(server);

    await createLibrary();
    await click(button("Add content"));
    await type("Link", "https://gracecommunity.org/sermons/x");
    await type("Title", "Notes for later");
    expect(button("Publish").disabled).toBe(true);
    await click(button("Save draft"));
    await waitForCondition(() => container.textContent!.includes("Draft"));

    expect(button("Publish").disabled).toBe(true);
    expect(customContent.chapterIndex.value?.chapters).toEqual({});
  });

  it("explains a plan limit instead of creating the library", async () => {
    const server = fakeRecordsServer();
    const { customizations } = await renderEditor(server);
    server.failNextCreate.code = "subscription_limit_reached";

    await click(button("Create content library"));
    await waitForCondition(() =>
      container.textContent!.includes("Your plan doesn't allow another record")
    );
    expect(
      customizations.editingCustomization.value?.contentRecordName
    ).toBeUndefined();
  });

  it("shows which chapters have content, book by book", async () => {
    const server = fakeRecordsServer();
    const { customContent } = await renderEditor(server);
    await createLibrary();
    for (const [url, book, chapter] of [
      ["https://example.org/shepherd", "JHN", 10],
      ["https://example.org/jude", "JUD", 1],
    ] as const) {
      await act(async () => {
        await customContent.saveItem(
          {
            url,
            title: url,
            description: "",
            categoryIds: [],
            references: [{ book, chapter, source: "owner", confidence: 1 }],
          },
          { publish: true }
        );
      });
    }

    expect(container.textContent).toContain("Content on 2 of 1,189 chapters.");
    await click(button("Show by book"));
    const row = (name: string) =>
      [...container.querySelectorAll(".sb-ccl-coverage-book")].find(
        (li) => li.querySelector(".sb-ccl-coverage-name")?.textContent === name
      );
    expect(row("John")?.textContent).toContain("1 of 21");
    expect(
      [...row("John")!.querySelectorAll("[data-covered]")].map((square) =>
        square.getAttribute("aria-label")
      )
    ).toEqual(["John 10: 1 items"]);
    expect(row("Genesis")?.hasAttribute("data-empty")).toBe(true);

    // Jude's only chapter is covered, so it has no gaps to show.
    await click(button("Only books with gaps"));
    expect(row("Jude")).toBeUndefined();
    expect(row("John")).toBeDefined();
  });

  describe("bulk import", () => {
    /** The import worker, as far as the editor can tell: it answers like the real API. */
    function stubImportService() {
      let progress: ImportProgress | null = null;
      const update = (patch: Partial<ImportProgress>) => {
        progress = { ...progress!, ...patch };
        return progress;
      };
      const service = {
        startImport: vi.fn(async (_key: string, request) => {
          progress = {
            id: "import-1",
            contentRecordName: request.contentRecordName,
            status: "running",
            total: request.items.length,
            queued: request.items.length,
            running: 0,
            done: 0,
            failed: 0,
            skipped: 0,
            createdAt: 1,
            updatedAt: 1,
          };
          return progress;
        }),
        getImport: vi.fn(async () => progress!),
        findActiveImport: vi.fn(async () => null),
        cancelImport: vi.fn(async () => update({ status: "cancelled" })),
        resumeImport: vi.fn(async () => update({ status: "running" })),
        publish: vi.fn(),
      } satisfies ContentImportService;
      return { service, update };
    }

    async function typeLinks(text: string) {
      const textarea = container.querySelector<HTMLTextAreaElement>(
        "#sb-ccl-import-links"
      )!;
      await act(() => {
        textarea.value = text;
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }

    it("isn't offered when no import service is set up", async () => {
      const server = fakeRecordsServer();
      await renderEditor(server);
      await createLibrary();
      expect(container.querySelector("#sb-ccl-import-links")).toBeNull();
    });

    it("imports pasted links, shows progress, and can be cancelled", async () => {
      const server = fakeRecordsServer();
      const { service } = stubImportService();
      await renderEditor(server, { importService: service });
      await createLibrary();

      await typeLinks(
        "https://example.org/a\nnot a link\nhttps://www.example.org/a/\nhttps://example.org/b"
      );
      await click(button("Import links"));
      await waitForCondition(() =>
        container.textContent!.includes("2 links are being imported.")
      );
      expect(service.startImport.mock.calls[0]![1].items).toEqual([
        { url: "https://example.org/a" },
        { url: "https://example.org/b" },
      ]);
      expect(container.textContent).toContain(
        "1 were already in your library or listed twice."
      );
      expect(container.textContent).toContain(
        "1 weren't links and were left out."
      );
      expect(container.textContent).toContain("Importing 0 of 2 · 0 failed");

      await click(button("Cancel import"));
      await waitForCondition(() =>
        container.textContent!.includes(
          "Import stopped after adding 0 links for review."
        )
      );
    });

    it("offers to continue an import that paused when the session ended", async () => {
      const server = fakeRecordsServer();
      const { service, update } = stubImportService();
      await renderEditor(server, { importService: service });
      await createLibrary();
      await typeLinks("https://example.org/a");
      await click(button("Import links"));

      update({ status: "paused_signin" });
      await waitForCondition(() =>
        container.textContent!.includes("because your session ended")
      );
      await click(button("Continue"));
      await waitForCondition(() =>
        container.textContent!.includes("Importing 0 of 1")
      );
      expect(service.resumeImport).toHaveBeenCalledWith(
        "vSK1.owner-session",
        "import-1"
      );
    });

    it("explains when another import is already running", async () => {
      const server = fakeRecordsServer();
      const { service } = stubImportService();
      service.startImport.mockRejectedValueOnce(
        new ContentLibraryError("import_running", "busy")
      );
      const { toast } = await renderEditor(server, { importService: service });
      await createLibrary();
      await typeLinks("https://example.org/a");
      await click(button("Import links"));
      await waitForCondition(() => toast.mock.calls.length > 0);
      expect(toast).toHaveBeenCalledWith(
        "An import is already running for this library. Wait for it to finish, or cancel it."
      );
    });
  });

  describe("AI suggestions", () => {
    const agent: ChatProvider = {
      id: "agent",
      name: "Grace Agent",
      supportsSharedChats: false,
      generateResponse: () => null,
      classifyContent: async () => ({
        categoryIds: [],
        passages: [{ reference: "Psalm 46", confidence: 0.6 }],
        suggestedCategories: ["Holy Week"],
      }),
    };
    const chatOnly: ChatProvider = {
      id: "chat-only",
      name: "Chat only",
      supportsSharedChats: false,
      generateResponse: () => null,
    };

    async function select(id: string, value: string) {
      const element = container.querySelector<HTMLSelectElement>(`#${id}`)!;
      await act(() => {
        element.value = value;
        element.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }

    it("offers only agents that can suggest, and saves the choice", async () => {
      const server = fakeRecordsServer();
      const { customContent } = await renderEditor(server, {
        chatProviders: [agent, chatOnly],
      });
      await createLibrary();

      const options = [
        ...container.querySelectorAll("#sb-ccl-classifier option"),
      ].map((o) => o.textContent);
      expect(options).toEqual([
        "No AI: only passages named in the content",
        "Grace Agent",
      ]);
      const autoPublish = [
        ...container.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"]'
        ),
      ].find((input) =>
        input.parentElement?.textContent?.includes("without further review")
      )!;
      expect(autoPublish.disabled).toBe(true);

      await select("sb-ccl-classifier", "agent");
      await waitForCondition(
        () => customContent.manifest.value?.classifierProviderId === "agent"
      );
      expect(autoPublish.disabled).toBe(false);
    });

    it("says so when the chosen agent's extension is turned off", async () => {
      const server = fakeRecordsServer();
      const { customContent } = await renderEditor(server);
      await createLibrary();
      await act(() => customContent.setClassifier("agent"));
      expect(container.textContent).toContain(
        "The chosen agent isn't available."
      );
    });

    it("marks passages the owner should check, and offers suggested categories", async () => {
      const server = fakeRecordsServer();
      const { customContent } = await renderEditor(server, {
        chatProviders: [agent],
      });
      await createLibrary();
      await act(() => customContent.setClassifier("agent"));
      const recordName = customContent.recordName.value!;
      const item: ContentItem = {
        id: "a",
        url: "https://example.org/a",
        status: "needs_review",
        title: "Be Still",
        description: "Notes on Psalm 23.",
        categoryIds: [],
        references: [],
        createdAt: 1,
        updatedAt: 1,
      };
      server.records.get(recordName)!.set(contentItemAddress("a"), {
        data: item,
        markers: [CONTENT_ITEM_MARKER],
      });
      await act(() => customContent.openLibrary(recordName));
      await waitForCondition(() =>
        container.textContent!.includes("Suggest with Grace Agent for 1 items")
      );
      // Nothing is asked of the AI until the owner presses the button.
      expect(
        container.querySelectorAll(".sb-ccl-ref-ai, .sb-ccl-ref-unsure")
      ).toHaveLength(0);
      await click(button("Suggest with Grace Agent for 1 items"));

      await waitForCondition(() =>
        container.textContent!.includes(
          "Suggested category: Holy Week (1 items)"
        )
      );
      const chips = [...container.querySelectorAll(".sb-ccl-ref")];
      expect(chips.map((chip) => chip.getAttribute("title"))).toEqual([
        "Named in the content",
        "Suggested, 60% sure. Please check it.",
      ]);
      expect(chips[1]!.textContent).toContain("Psalms 46 ?");

      const suggestion =
        container.querySelector<HTMLElement>(".sb-ccl-suggestion")!;
      await click(
        [...suggestion.querySelectorAll("button")].find(
          (b) => b.textContent === "Add"
        )!
      );
      await waitForCondition(() =>
        customContent.manifest.value!.categories.some(
          (c) => c.name === "Holy Week"
        )
      );
      expect(container.textContent).not.toContain("Suggested category:");
    });

    it("shows a bulk run's progress and can stop it", async () => {
      const server = fakeRecordsServer();
      const answers: (() => void)[] = [];
      const slowAgent: ChatProvider = {
        ...agent,
        classifyContent: () =>
          new Promise((resolve) => {
            answers.push(() => resolve({ categoryIds: [], passages: [] }));
          }),
      };
      const { customContent } = await renderEditor(server, {
        chatProviders: [slowAgent],
      });
      await createLibrary();
      await act(() => customContent.setClassifier("agent"));
      const recordName = customContent.recordName.value!;
      for (const id of ["a", "b", "c"]) {
        server.records.get(recordName)!.set(contentItemAddress(id), {
          data: {
            id,
            url: `https://example.org/${id}`,
            status: "needs_review",
            title: id,
            description: "",
            categoryIds: [],
            references: [],
            createdAt: 1,
            updatedAt: 1,
          } satisfies ContentItem,
          markers: [CONTENT_ITEM_MARKER],
        });
      }
      await act(() => customContent.openLibrary(recordName));
      await waitForCondition(() =>
        container.textContent!.includes("Suggest with Grace Agent for 3 items")
      );

      await click(button("Suggest with Grace Agent for 3 items"));
      await waitForCondition(() =>
        container.textContent!.includes("Asking Grace Agent: 0 of 3 · 0 failed")
      );
      await click(button("Stop"));
      await act(() => answers.splice(0).forEach((answer) => answer()));
      await waitForCondition(() =>
        container.textContent!.includes("Suggest with Grace Agent for 1 items")
      );
      expect(container.textContent).toContain(
        "AI suggestions finished for 2 items, 0 failed."
      );
    });
  });
});
