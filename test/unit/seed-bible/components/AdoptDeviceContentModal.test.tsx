import { render } from "preact";
import { act } from "preact/test-utils";
import { createAdoptionPrompt } from "@packages/seed-bible/seed-bible/components/AdoptDeviceContentModal/AdoptDeviceContentModal";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let str = (options?.defaultValue as string | undefined) ?? key;
        for (const [optionKey, value] of Object.entries(options ?? {})) {
          if (optionKey === "defaultValue") continue;
          str = str.replaceAll(`{{${optionKey}}}`, String(value));
        }
        return str;
      },
      language: "en",
    }),
  };
});

function renderOpenModal(modals: ReturnType<typeof createModalManager>) {
  const modal = modals.modals.value[0];
  if (!modal) throw new Error("no modal open");
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() =>
    render(
      modal.content({ t: (k, o) => (o?.defaultValue as string) ?? k }),
      host
    )
  );
  return host;
}

function buttonNamed(host: HTMLElement, label: string) {
  return [...host.querySelectorAll("button")].find(
    (b) => b.textContent === label
  );
}

describe("createAdoptionPrompt()", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("opens one dialog for both kinds and answers every caller", async () => {
    const modals = createModalManager();
    const ask = createAdoptionPrompt(modals);

    const highlights = ask("user-1", "highlights");
    const notes = ask("user-1", "notes");
    expect(modals.modals.value).toHaveLength(1);

    const host = renderOpenModal(modals);
    expect(host.textContent).toContain("highlights and notes");
    act(() => buttonNamed(host, "Add to account")?.click());

    await expect(highlights).resolves.toBe("add");
    await expect(notes).resolves.toBe("add");
    expect(modals.modals.value).toEqual([]);
  });

  it("resolves 'discard' from the Don't add button", async () => {
    const modals = createModalManager();
    const answer = createAdoptionPrompt(modals)("user-1", "notes");
    const host = renderOpenModal(modals);
    expect(host.textContent).toContain("storing notes that");

    act(() => buttonNamed(host, "Don't add")?.click());

    await expect(answer).resolves.toBe("discard");
  });

  it("resolves 'keep' when the dialog is closed without choosing", async () => {
    const modals = createModalManager();
    const answer = createAdoptionPrompt(modals)("user-1", "highlights");

    modals.closeModal("adopt-device-content");

    await expect(answer).resolves.toBe("keep");
  });

  it("can ask again after an earlier prompt was answered", async () => {
    const modals = createModalManager();
    const ask = createAdoptionPrompt(modals);

    const first = ask("user-1", "highlights");
    modals.closeModal("adopt-device-content");
    await expect(first).resolves.toBe("keep");

    const second = ask("user-2", "highlights");
    expect(modals.modals.value).toHaveLength(1);
    act(() => buttonNamed(renderOpenModal(modals), "Don't add")?.click());

    await expect(second).resolves.toBe("discard");
  });
});
