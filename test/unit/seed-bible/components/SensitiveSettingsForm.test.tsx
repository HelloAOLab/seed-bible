import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  SensitiveSettingsForm,
  UnusedSensitiveSettingsList,
} from "@packages/seed-bible/seed-bible/components/ExtensionSettingsForm/SensitiveSettingsForm";
import { mockTranslate } from "../testUtils/mockI18n";

describe("SensitiveSettingsForm", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const renderForm = (saveResult = true, stored = false) => {
    const setKeys = signal<string[]>([]);
    const onSave = vi.fn(
      async (
        _proxyId: string,
        values: Record<string, string>,
        _options: { host?: string; visibility?: string }
      ) => {
        if (saveResult) {
          setKeys.value = Object.keys(values).filter((key) => values[key]);
        }
        return saveResult;
      }
    );
    const onClear = vi.fn(async () => {
      setKeys.value = [];
      return true;
    });
    act(() => {
      render(
        <SensitiveSettingsForm
          extensionId="ext-1"
          settings={{
            greeting: { type: "string" },
            apiKey: { type: "string", sensitive: "exampleApi" },
            clientId: { type: "string", sensitive: "exampleApi" },
          }}
          sensitive={{
            exampleApi: {
              host: "api.example.com",
              requestMapping: {
                "headers.authorization.bearer": "apiKey",
                "body.client_id": "clientId",
              },
            },
          }}
          getDestination={() => ({
            host: "api.example.com",
            visibility: "private",
          })}
          hasStored={() => stored || setKeys.value.length > 0}
          isSet={(key) => setKeys.value.includes(key)}
          onSave={onSave}
          onClear={onClear}
          t={mockTranslate}
        />,
        container
      );
    });
    return { onSave, onClear };
  };

  const input = (key: string) =>
    container.querySelector<HTMLInputElement>(
      `#sb-extension-setting-ext-1-${key}`
    )!;
  const hostInput = () =>
    container.querySelector<HTMLInputElement>(
      "#sb-extension-sensitive-ext-1-exampleApi-host"
    )!;
  const visibilitySelect = () =>
    container.querySelector<HTMLSelectElement>(
      "#sb-extension-sensitive-ext-1-exampleApi-visibility"
    )!;

  const typeInto = (element: HTMLInputElement, text: string) => {
    act(() => {
      element.value = text;
      element.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };
  const type = (key: string, text: string) => typeInto(input(key), text);

  const button = (label: string) =>
    [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent === label
    );

  const click = async (label: string) => {
    await act(async () => {
      button(label)!.click();
      await Promise.resolve();
    });
  };

  it("says when the active Customization provides a value the viewer hasn't set", () => {
    act(() => {
      render(
        <SensitiveSettingsForm
          extensionId="ext-1"
          settings={{
            apiKey: { type: "string", sensitive: "exampleApi" },
            clientId: { type: "string", sensitive: "exampleApi" },
          }}
          sensitive={{
            exampleApi: {
              host: "api.example.com",
              requestMapping: {
                "headers.authorization.bearer": "apiKey",
                "body.client_id": "clientId",
              },
            },
          }}
          getDestination={() => ({
            host: "api.example.com",
            visibility: "private",
          })}
          hasStored={() => false}
          isSet={() => false}
          isProvided={(key) => key === "apiKey"}
          onSave={vi.fn()}
          onClear={vi.fn()}
          t={mockTranslate}
        />,
        container
      );
    });

    const notes = Array.from(
      container.querySelectorAll(".sb-settings-field-row")
    ).map((row) => row.textContent ?? "");
    expect(notes.find((text) => text.includes("apiKey"))).toContain(
      "Provided by the customization"
    );
    expect(notes.find((text) => text.includes("clientId"))).toContain(
      "Not set"
    );
  });

  it("describes a Customization's public proxy as one everyone using it shares", () => {
    act(() => {
      render(
        <SensitiveSettingsForm
          scope="customization"
          extensionId="ext-1"
          settings={{ apiKey: { type: "string", sensitive: "exampleApi" } }}
          sensitive={{
            exampleApi: {
              host: "api.example.com",
              requestMapping: { "headers.authorization.bearer": "apiKey" },
            },
          }}
          getDestination={() => ({
            host: "api.example.com",
            visibility: "public",
          })}
          hasStored={() => false}
          isSet={() => false}
          onSave={vi.fn()}
          onClear={vi.fn()}
          t={mockTranslate}
        />,
        container
      );
    });

    expect(visibilitySelect().value).toBe("public");
    expect(container.textContent).toContain(
      "Everyone using this customization sends requests with these values"
    );
    expect(visibilitySelect().selectedOptions[0]?.textContent).toBe(
      "Everyone using this customization"
    );
  });

  it("shows only the destination's sensitive settings, masked", () => {
    renderForm();

    expect(input("apiKey").type).toBe("password");
    expect(input("clientId").type).toBe("password");
    expect(input("greeting")).toBeNull();
    expect(container.textContent).toContain("api.example.com");
    expect(container.textContent).toContain("Not set");
    expect(button("Save")!.disabled).toBe(true);
  });

  it("saves the group's typed values together, then shows them as set without the value", async () => {
    const { onSave } = renderForm();

    type("apiKey", "secret-key");
    type("clientId", "client-123");
    await click("Save");

    expect(onSave).toHaveBeenCalledWith(
      "exampleApi",
      { apiKey: "secret-key", clientId: "client-123" },
      { host: "api.example.com", visibility: "private" }
    );
    expect(input("apiKey").value).toBe("");
    expect(container.textContent).not.toContain("secret-key");
    expect(container.textContent).not.toContain("Not set");
    expect(button("Replace")).toBeDefined();
    expect(container.textContent).toContain(
      "Saving replaces every value above"
    );
  });

  it("clears the group", async () => {
    const { onClear } = renderForm();
    type("apiKey", "secret-key");
    await click("Save");

    await click("Clear");

    expect(onClear).toHaveBeenCalledWith("exampleApi");
    expect(button("Clear")).toBeUndefined();
  });

  it("keeps what was typed and reports a failed save", async () => {
    renderForm(false);

    type("apiKey", "secret-key");
    await click("Save");

    expect(input("apiKey").value).toBe("secret-key");
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("saves the host and visibility the viewer picked along with the values", async () => {
    const { onSave } = renderForm();

    expect(hostInput().value).toBe("api.example.com");
    typeInto(hostInput(), "Proxy.Example.org");
    act(() => {
      visibilitySelect().value = "public";
      visibilitySelect().dispatchEvent(new Event("change", { bubbles: true }));
    });
    type("apiKey", "secret-key");
    await click("Save");

    expect(onSave).toHaveBeenCalledWith(
      "exampleApi",
      { apiKey: "secret-key" },
      { host: "proxy.example.org", visibility: "public" }
    );
  });

  it("won't save to a host that isn't a host name", () => {
    renderForm();

    typeInto(hostInput(), "https://proxy.example.org/v1");
    type("apiKey", "secret-key");

    expect(button("Save")!.disabled).toBe(true);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it("offers to clear values saved for an older version of the extension", async () => {
    const { onClear } = renderForm(true, true);

    expect(container.textContent).toContain("Not set");
    expect(container.textContent).toContain(
      "Values saved for an earlier version of this extension"
    );
    await click("Clear");

    expect(onClear).toHaveBeenCalledWith("exampleApi");
  });

  it("lists secrets no extension uses, each with its own Clear", async () => {
    const onClear = vi.fn(async () => true);
    act(() => {
      render(
        <UnusedSensitiveSettingsList
          unused={[
            { extensionId: "gone-ext", proxyId: "api", host: "api.gone.com" },
          ]}
          getExtensionTitle={(id) => `Title of ${id}`}
          onClear={onClear}
          t={mockTranslate}
        />,
        container
      );
    });

    expect(container.textContent).toContain(
      "Title of gone-ext: sent to api.gone.com"
    );
    await click("Clear");

    expect(onClear).toHaveBeenCalledWith("gone-ext", "api");
  });

  it("shows nothing when every saved secret is still in use", () => {
    act(() => {
      render(
        <UnusedSensitiveSettingsList
          unused={[]}
          getExtensionTitle={(id) => id}
          onClear={vi.fn()}
          t={mockTranslate}
        />,
        container
      );
    });

    expect(container.innerHTML).toBe("");
  });
});
