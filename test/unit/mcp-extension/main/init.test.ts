import { signal, type ReadonlySignal } from "@preact/signals";
import type { Mock } from "vitest";
import initMCPExtension, {
  buildMcpChatContext,
} from "@packages/mcp-extension/ext_MCP/main/init";
import { AIChatSettingsModalContent } from "@packages/mcp-extension/ext_MCP/main/AIChatSettingsModal";
import type {
  MCPManager,
  McpServerConfig,
  McpServerConnectionState,
} from "@packages/mcp-extension/ext_MCP/main/MCPManager";
import type { AIProviderFunctionTool } from "@packages/seed-bible/seed-bible/managers/AIManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  getExtensionExports,
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";

function makeTool(name: string): AIProviderFunctionTool {
  return {
    name,
    type: "function",
    description: `${name} tool`,
    parameters: {} as AIProviderFunctionTool["parameters"],
    function: async () => "ok",
  };
}

function createMcpStub(overrides: {
  tools?: AIProviderFunctionTool[];
}): MCPManager {
  return {
    servers: signal<McpServerConfig[]>([]) as ReadonlySignal<McpServerConfig[]>,
    connectionState: signal(new Map()) as ReadonlySignal<
      Map<string, McpServerConnectionState>
    >,
    tools: signal(overrides.tools ?? []) as ReadonlySignal<
      AIProviderFunctionTool[]
    >,
    addServer: vi.fn(),
    removeServer: vi.fn(),
    updateServer: vi.fn(),
    dispose: vi.fn(),
  };
}

function createFakeContext(): SeedBibleState & {
  extensions: { registerSettingsPanel: Mock };
} {
  return {
    os: {} as unknown as SeedBibleState["os"],
    login: { userId: signal(null) } as unknown as SeedBibleState["login"],
    chats: { addContext: vi.fn(), removeContext: vi.fn() },
    extensions: { registerSettingsPanel: vi.fn(() => vi.fn()) },
  } as unknown as SeedBibleState & {
    extensions: { registerSettingsPanel: Mock };
  };
}

describe("initMCPExtension", () => {
  afterEach(() => {
    unregisterExtension("mcp-extension");
  });

  it("registers a settings panel for the mcp-extension id, so it's reachable from Settings → Extensions", () => {
    const context = createFakeContext();
    setupExtensionContext(context);

    initMCPExtension();

    expect(context.extensions.registerSettingsPanel).toHaveBeenCalledWith(
      "mcp-extension",
      expect.any(Function)
    );
  });

  it("wires the registered panel to render AIChatSettingsModalContent with this extension's own mcp manager", () => {
    const context = createFakeContext();
    setupExtensionContext(context);

    initMCPExtension();

    const exports = getExtensionExports<{ mcp: MCPManager }>("mcp-extension");
    const [, render] = context.extensions.registerSettingsPanel.mock
      .calls[0] as [string, () => unknown];
    const vnode = render() as { type: unknown; props: { mcp: MCPManager } };

    expect(vnode.type).toBe(AIChatSettingsModalContent);
    expect(vnode.props.mcp).toBe(exports?.mcp);
  });

  it("unregisters the settings panel when the extension is uninstalled", () => {
    const context = createFakeContext();
    const unregisterPanel = vi.fn();
    context.extensions.registerSettingsPanel.mockReturnValue(unregisterPanel);
    setupExtensionContext(context);

    initMCPExtension();
    unregisterExtension("mcp-extension");

    expect(unregisterPanel).toHaveBeenCalledTimes(1);
  });
});

describe("buildMcpChatContext", () => {
  it("always carries a settingsAction, even with zero tools", () => {
    const mcp = createMcpStub({ tools: [] });
    const openSettings = vi.fn();

    const context = buildMcpChatContext(mcp, openSettings);

    expect(context.id).toBe("mcp-servers");
    expect(context.tools).toBeUndefined();
    expect(context.settingsAction).toBeDefined();
    context.settingsAction!.onClick();
    expect(openSettings).toHaveBeenCalledTimes(1);
  });

  it("includes the connected tools once there are any", () => {
    const mcp = createMcpStub({ tools: [makeTool("search")] });

    const context = buildMcpChatContext(mcp, vi.fn());

    expect(context.tools).toHaveLength(1);
    expect(context.tools![0]!.name).toBe("search");
  });

  it("labels the context and settings action under the mcp-extension i18n namespace", () => {
    const mcp = createMcpStub({ tools: [] });

    const context = buildMcpChatContext(mcp, vi.fn());

    expect(context.label).toMatchObject({ ns: "mcp-extension" });
    expect(context.settingsAction!.label).toMatchObject({
      ns: "mcp-extension",
    });
  });
});
