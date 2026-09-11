import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type ReadonlySignal } from "@preact/signals";
import {
  AIChatSettingsModalContent,
  openAIChatSettingsModal,
} from "@packages/mcp-extension/ext_MCP/main/AIChatSettingsModal";
import type {
  MCPManager,
  McpServerConfig,
  McpServerConnectionState,
} from "@packages/mcp-extension/ext_MCP/main/MCPManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Mock } from "vitest";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (
        key: string,
        options?: { defaultValue?: string } & Record<string, unknown>
      ) => {
        const template = options?.defaultValue ?? key;
        return options
          ? template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
              String(options[name] ?? "")
            )
          : template;
      },
      language: "en",
    }),
  };
});

function makeServer(overrides: Partial<McpServerConfig> = {}): McpServerConfig {
  return {
    id: "srv-1",
    name: "My Server",
    url: "https://mcp.test",
    enabled: true,
    ...overrides,
  };
}

function createMcpStub(overrides: {
  servers?: McpServerConfig[];
  connectionState?: Map<string, McpServerConnectionState>;
  addServer?: Mock;
}): MCPManager {
  return {
    servers: signal(overrides.servers ?? []) as ReadonlySignal<
      McpServerConfig[]
    >,
    connectionState: signal(
      overrides.connectionState ?? new Map()
    ) as ReadonlySignal<Map<string, McpServerConnectionState>>,
    tools: signal([]) as ReadonlySignal<never[]>,
    addServer: overrides.addServer ?? vi.fn().mockResolvedValue(undefined),
    removeServer: vi.fn().mockResolvedValue(undefined),
    updateServer: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
  };
}

describe("AIChatSettingsModalContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("shows the empty state when no servers are configured", () => {
    const mcp = createMcpStub({ servers: [] });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    expect(
      container.querySelector(".sb-settings-empty-state")?.textContent
    ).toContain("No MCP servers configured yet.");
  });

  it("lists a configured server with its status and tool count", () => {
    const server = makeServer();
    const mcp = createMcpStub({
      servers: [server],
      connectionState: new Map([
        [server.id, { status: "connected", toolCount: 3 }],
      ]),
    });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    const row = container.querySelector(".sb-extension-row");
    expect(row?.textContent).toContain("My Server");
    expect(row?.textContent).toContain("https://mcp.test");
    expect(row?.textContent).toContain("3 tools");
  });

  it("shows the SSE + auth-header warning when a server with headers falls back to SSE", () => {
    const server = makeServer({ headers: { Authorization: "Bearer x" } });
    const mcp = createMcpStub({
      servers: [server],
      connectionState: new Map([
        [
          server.id,
          { status: "connected", toolCount: 1, usingSseFallback: true },
        ],
      ]),
    });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    expect(
      container.querySelector(".sb-mcp-server-warning")?.textContent
    ).toContain("legacy SSE transport");
  });

  it("does not show the SSE warning for a server with no auth headers", () => {
    const server = makeServer();
    const mcp = createMcpStub({
      servers: [server],
      connectionState: new Map([
        [
          server.id,
          { status: "connected", toolCount: 1, usingSseFallback: true },
        ],
      ]),
    });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    expect(container.querySelector(".sb-mcp-server-warning")).toBeNull();
  });

  it("shows a connect-error message with the underlying error text", () => {
    const server = makeServer();
    const mcp = createMcpStub({
      servers: [server],
      connectionState: new Map([
        [server.id, { status: "error", error: "server unreachable" }],
      ]),
    });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    expect(container.querySelector(".sb-mcp-server-warning")?.textContent).toBe(
      "Couldn't connect: server unreachable"
    );
  });

  it("calls updateServer to disable an enabled, connected server", () => {
    const server = makeServer();
    const mcp = createMcpStub({
      servers: [server],
      connectionState: new Map([[server.id, { status: "connected" }]]),
    });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    const [toggleButton] = container.querySelectorAll(
      ".sb-extension-row-action-button"
    );
    act(() => {
      (toggleButton as HTMLButtonElement).click();
    });

    expect(mcp.updateServer).toHaveBeenCalledWith(server.id, {
      enabled: false,
    });
  });

  it("calls updateServer to enable a disabled server", () => {
    const server = makeServer();
    const mcp = createMcpStub({
      servers: [server],
      connectionState: new Map([[server.id, { status: "disabled" }]]),
    });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    const [toggleButton] = container.querySelectorAll(
      ".sb-extension-row-action-button"
    );
    act(() => {
      (toggleButton as HTMLButtonElement).click();
    });

    expect(mcp.updateServer).toHaveBeenCalledWith(server.id, {
      enabled: true,
    });
  });

  it("calls removeServer when the remove button is clicked", () => {
    const server = makeServer();
    const mcp = createMcpStub({
      servers: [server],
      connectionState: new Map([[server.id, { status: "connected" }]]),
    });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    const buttons = container.querySelectorAll(
      ".sb-extension-row-action-button"
    );
    const removeButton = buttons[1] as HTMLButtonElement;
    act(() => {
      removeButton.click();
    });

    expect(mcp.removeServer).toHaveBeenCalledWith(server.id);
  });

  function fillAddForm(
    container: HTMLDivElement,
    values: {
      name?: string;
      url?: string;
      authHeader?: string;
    }
  ) {
    const inputs = container.querySelectorAll("input");
    const [nameInput, urlInput, authInput] = Array.from(inputs) as [
      HTMLInputElement,
      HTMLInputElement,
      HTMLInputElement,
    ];
    if (values.name !== undefined) {
      act(() => {
        nameInput.value = values.name!;
        nameInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    if (values.url !== undefined) {
      act(() => {
        urlInput.value = values.url!;
        urlInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    if (values.authHeader !== undefined) {
      act(() => {
        authInput.value = values.authHeader!;
        authInput.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
  }

  it("shows an inline error and does not call addServer for an invalid URL", async () => {
    const addServer = vi.fn().mockResolvedValue(undefined);
    const mcp = createMcpStub({ addServer });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    fillAddForm(container, { name: "S", url: "not a url" });

    const addButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    await act(async () => {
      addButton.click();
      await Promise.resolve();
    });

    expect(container.querySelector(".sb-playlist-add-error")?.textContent).toBe(
      "Enter a valid URL"
    );
    expect(addServer).not.toHaveBeenCalled();
  });

  it("adds a server with the entered name, URL, and auth header", async () => {
    const addServer = vi.fn().mockResolvedValue(undefined);
    const mcp = createMcpStub({ addServer });

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    fillAddForm(container, {
      name: "New Server",
      url: "https://mcp.example.com",
      authHeader: "Bearer secret",
    });

    const addButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    await act(async () => {
      addButton.click();
      await Promise.resolve();
    });

    expect(addServer).toHaveBeenCalledWith({
      name: "New Server",
      url: "https://mcp.example.com/",
      headers: { Authorization: "Bearer secret" },
    });
  });

  it("shows an error message when addServer fails", async () => {
    const addServer = vi.fn().mockRejectedValue(new Error("network error"));
    const mcp = createMcpStub({ addServer });
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    act(() => {
      render(<AIChatSettingsModalContent mcp={mcp} />, container);
    });

    fillAddForm(container, { name: "S", url: "https://mcp.test" });

    const addButton = container.querySelector(
      ".sb-settings-save-button"
    ) as HTMLButtonElement;
    await act(async () => {
      addButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(container.querySelector(".sb-playlist-add-error")?.textContent).toBe(
      "Couldn't add the server."
    );
    errorSpy.mockRestore();
  });
});

describe("openAIChatSettingsModal", () => {
  it("opens a modal with the AI Chat Settings title and content", () => {
    const openModal = vi.fn();
    const state = { modals: { openModal } } as unknown as SeedBibleState;
    const mcp = createMcpStub({});

    openAIChatSettingsModal(state, mcp);

    expect(openModal).toHaveBeenCalledTimes(1);
    const registration = openModal.mock.calls[0]![0];
    expect(registration.id).toBe("ai-chat-settings");
    expect(registration.title).toMatchObject({
      key: "ai-chat-settings-title",
      ns: "mcp-extension",
    });
  });
});
