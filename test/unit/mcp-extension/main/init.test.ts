import { signal, type ReadonlySignal } from "@preact/signals";
import { buildMcpChatContext } from "@packages/mcp-extension/ext_MCP/main/init";
import type {
  MCPManager,
  McpServerConfig,
  McpServerConnectionState,
} from "@packages/mcp-extension/ext_MCP/main/MCPManager";
import type { AIProviderFunctionTool } from "@packages/seed-bible/seed-bible/managers/AIManager";

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
