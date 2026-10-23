import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { AddExtensionFromLink } from "@packages/seed-bible/seed-bible/components/SettingsPage/SettingsPage";
import { I18nProvider } from "@packages/seed-bible/seed-bible/i18n";
import type { I18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";

describe("AddExtensionFromLink", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  /** Translations show as their key, plus any count. */
  const i18n = {
    i18n: {
      t: (key: string, options?: { count?: number }) =>
        options?.count === undefined ? key : `${key}:${options.count}`,
    },
    language: signal("en"),
  } as unknown as I18nManager;

  function show(onAdd: (url: string) => Promise<number | null>) {
    act(() => {
      render(
        <I18nProvider i18n={i18n}>
          <AddExtensionFromLink onAdd={onAdd} />
        </I18nProvider>,
        container
      );
    });
    const input = container.querySelector("input")!;
    const status = () =>
      container.querySelector(".sb-extension-add-link-status")!.textContent;
    const submit = async (url: string) => {
      await act(async () => {
        input.value = url;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => {
        container
          .querySelector("form")!
          .dispatchEvent(new Event("submit", { cancelable: true }));
      });
    };
    return { input, status, submit };
  }

  it("adds the link's extensions and says how many", async () => {
    const onAdd = vi.fn(async () => 2);
    const view = show(onAdd);
    expect(view.status()).toBe("extension-add-link-hint");

    await view.submit("  https://ext.example.com/set.json ");

    expect(onAdd).toHaveBeenCalledWith("https://ext.example.com/set.json");
    await vi.waitFor(() =>
      expect(view.status()).toBe("extension-add-link-added:2")
    );
    expect(view.input.value).toBe("");
  });

  it("says when nothing could be found at the link, and keeps it to fix", async () => {
    const view = show(async () => null);

    await view.submit("https://ext.example.com/typo.json");

    await vi.waitFor(() =>
      expect(view.status()).toBe("extension-add-link-failed")
    );
    expect(view.input.value).toBe("https://ext.example.com/typo.json");
  });

  it("does nothing for an empty link", async () => {
    const onAdd = vi.fn(async () => 1);
    const view = show(onAdd);

    await view.submit("   ");

    expect(onAdd).not.toHaveBeenCalled();
    expect(container.querySelector("button")!.disabled).toBe(true);
  });
});
