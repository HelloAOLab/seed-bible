import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { CustomizationContentView } from "@packages/seed-bible/seed-bible/components/CustomizationEditPane/CustomizationContentView";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { contentChapterAddress } from "@packages/seed-bible/seed-bible/managers/customContent/schema";
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
async function renderEditor(server: FakeRecordsServer) {
  const app = createApp(server, { userId: OWNER });
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
    expect(customContent.manifest.value?.chapters).toEqual({});
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
});
