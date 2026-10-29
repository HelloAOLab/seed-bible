import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CustomizationContentView } from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationContentView";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { contentChapterAddress } from "@packages/seed-bible/seed-bible/managers/customContent/schema";
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
  options: { importService?: ContentImportService } = {}
) {
  const app = createApp(server, {
    userId: OWNER,
    importService: options.importService,
    importPollMs: 5,
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
});
