import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { signal } from "@preact/signals";
import type { Mock, Mocked } from "vitest";

vi.mock("@modelcontextprotocol/client", () => {
  const connect = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const listTools = vi.fn().mockResolvedValue({ tools: [] });
  const callTool = vi.fn().mockResolvedValue({ content: [] });

  const Client = vi.fn().mockImplementation(function () {
    return { connect, close, listTools, callTool };
  });
  const StreamableHTTPClientTransport = vi.fn();
  const SSEClientTransport = vi.fn();

  return {
    __esModule: true,
    Client,
    StreamableHTTPClientTransport,
    SSEClientTransport,
    __mock: {
      Client,
      connect,
      close,
      listTools,
      callTool,
      StreamableHTTPClientTransport,
      SSEClientTransport,
    },
  };
});

let createMCPManager: typeof import("@packages/mcp-extension/ext_MCP/main/MCPManager").createMCPManager;
let toStrictJsonSchema: typeof import("@packages/mcp-extension/ext_MCP/main/MCPManager").toStrictJsonSchema;
let stripNullOptionalArgs: typeof import("@packages/mcp-extension/ext_MCP/main/MCPManager").stripNullOptionalArgs;

interface McpMock {
  Client: Mock;
  connect: Mock;
  close: Mock;
  listTools: Mock;
  callTool: Mock;
  StreamableHTTPClientTransport: Mock;
  SSEClientTransport: Mock;
}

async function getMcpMock(): Promise<McpMock> {
  const mocked = (await vi.importMock("@modelcontextprotocol/client")) as {
    __mock: McpMock;
  };
  return mocked.__mock;
}

/** Polls until `check()` is true, or throws after `timeoutMs`. */
async function waitForCondition(
  check: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitForCondition timed out");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

function createTestLogin(userId: string | null): Mocked<LoginManager> {
  return {
    authBot: signal(null),
    sessionEnded: signal(null),
    userId: signal(userId),
    connectionId: "conn-1",
    profile: signal(null),
    cachedProfile: signal(null),
    localConfig: signal({}),
    profilePromise: null,
    isProfileLoading: signal(false),
    isSavingProfile: signal(false),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    getUserProfile: vi.fn().mockResolvedValue(null),
    uploadProfilePicture: vi.fn().mockResolvedValue(undefined),
    userInfo: signal({ id: userId ?? "user-1", email: "test@example.com" }),
    cancelLogin: vi.fn().mockResolvedValue(undefined),
    isLoginOpen: signal(false),
    requestLoginByEmail: vi
      .fn()
      .mockResolvedValue({ success: true, requestId: "req-1" }),
    submitLoginCode: vi.fn().mockResolvedValue({
      success: true,
      userInfo: { id: userId ?? "user-1", email: "test@example.com" },
    }),
  };
}

describe("createMCPManager", () => {
  let getDataMock: Mock;
  let recordDataMock: Mock;
  let os: CasualOSManager;
  let warnSpy: Mock;

  beforeAll(async () => {
    ({ createMCPManager, toStrictJsonSchema, stripNullOptionalArgs } =
      await import("@packages/mcp-extension/ext_MCP/main/MCPManager"));
  });

  beforeEach(async () => {
    os = CasualOSManager();
    getDataMock = vi.spyOn(os, "getData").mockResolvedValue({
      success: false,
      errorCode: "data_not_found",
      errorMessage: "Data not found",
    });
    recordDataMock = vi
      .spyOn(os, "recordData")
      .mockResolvedValue(undefined as never);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const mock = await getMcpMock();
    mock.Client.mockClear();
    mock.connect.mockReset().mockResolvedValue(undefined);
    mock.close.mockReset().mockResolvedValue(undefined);
    mock.listTools.mockReset().mockResolvedValue({ tools: [] });
    mock.callTool.mockReset().mockResolvedValue({ content: [] });
    mock.StreamableHTTPClientTransport.mockClear();
    mock.SSEClientTransport.mockClear();
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("starts empty when logged out", () => {
    const login = createTestLogin(null);

    const manager = createMCPManager(os, login);

    expect(manager.servers.value).toEqual([]);
    expect(getDataMock).not.toHaveBeenCalled();
  });

  it("addServer is not clobbered by the initial load-on-login when it's still in flight", async () => {
    // Regression test: `createMCPManager` kicks off an async load of the
    // user's persisted servers as soon as it sees a logged-in `userId`. If a
    // caller adds a server before that load's `getData` call resolves, the
    // load must not overwrite the newly-added (and already-persisted) server
    // when it finally completes.
    let resolveGetData!: (value: { success: boolean; data?: unknown }) => void;
    getDataMock.mockReturnValue(
      new Promise((resolve) => {
        resolveGetData = resolve;
      })
    );
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);

    await manager.addServer({ name: "Added first", url: "https://mcp.test" });
    expect(manager.servers.value).toHaveLength(1);

    // Now let the slow initial load resolve with "nothing persisted yet" —
    // it must not wipe out the server that was just added and persisted.
    resolveGetData({ success: false });
    await Promise.resolve();
    await Promise.resolve();

    expect(manager.servers.value).toHaveLength(1);
    expect(manager.servers.value[0]!.name).toBe("Added first");
  });

  it("addServer persists the new server and connects to it", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();
    mock.listTools.mockResolvedValue({
      tools: [
        {
          name: "search",
          description: "Searches things",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    });

    await manager.addServer({ name: "My Server", url: "https://mcp.test" });

    expect(manager.servers.value).toHaveLength(1);
    expect(manager.servers.value[0]!.name).toBe("My Server");
    expect(manager.servers.value[0]!.url).toBe("https://mcp.test");
    expect(recordDataMock).toHaveBeenCalledWith(
      "user-1",
      "mcp-servers",
      expect.objectContaining({
        servers: expect.arrayContaining([
          expect.objectContaining({ name: "My Server" }),
        ]),
      }),
      {}
    );

    await waitForCondition(
      () =>
        manager.connectionState.value.get(manager.servers.value[0]!.id)
          ?.status === "connected"
    );
    expect(mock.StreamableHTTPClientTransport).toHaveBeenCalledWith(
      new URL("https://mcp.test"),
      undefined
    );
  });

  it("does not use the publicRead marker (server configs may hold auth headers)", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);

    await manager.addServer({ name: "S", url: "https://mcp.test" });

    const call = recordDataMock.mock.calls[0]!;
    expect(call[3]).not.toHaveProperty("marker", "publicRead");
  });

  it("warns and does not persist when adding a server while logged out", async () => {
    const login = createTestLogin(null);
    const manager = createMCPManager(os, login);

    await manager.addServer({ name: "S", url: "https://mcp.test" });

    expect(manager.servers.value).toEqual([]);
    expect(recordDataMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("wraps MCP tools as AIProviderFunctionTool and exposes them via `tools`", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();
    mock.listTools.mockResolvedValue({
      tools: [
        {
          name: "search",
          description: "Searches things",
          inputSchema: { type: "object", properties: {} },
        },
      ],
    });
    mock.callTool.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });

    await manager.addServer({ name: "MyServer", url: "https://mcp.test" });

    await waitForCondition(() => manager.tools.value.length > 0);

    expect(manager.tools.value).toHaveLength(1);
    expect(manager.tools.value[0]!.name).toBe("MyServer:search");
    expect(manager.tools.value[0]!.description).toBe("Searches things");

    const result = await manager.tools.value[0]!.function({ q: "hi" });
    expect(mock.callTool).toHaveBeenCalledWith({
      name: "search",
      arguments: { q: "hi" },
    });
    expect(result).toEqual({ content: [{ type: "text", text: "ok" }] });
  });

  it("normalizes a tool's schema for OpenAI strict mode (which apologist-extension always requests)", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();
    mock.listTools.mockResolvedValue({
      tools: [
        {
          name: "search",
          description: "Searches things",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string" },
              limit: { type: "number" },
            },
            required: ["query"],
          },
        },
      ],
    });
    mock.callTool.mockResolvedValue({ content: [] });

    await manager.addServer({ name: "MyServer", url: "https://mcp.test" });
    await waitForCondition(() => manager.tools.value.length > 0);

    const parameters = manager.tools.value[0]!.parameters as {
      properties: Record<string, { type: string | string[] }>;
      required: string[];
      additionalProperties: boolean;
    };
    // additionalProperties:false and every property in `required` (strict
    // mode's requirements), but the originally-optional `limit` still
    // accepts `null` so the model can supply it while "skipping" it.
    expect(parameters.additionalProperties).toBe(false);
    expect(parameters.required).toEqual(
      expect.arrayContaining(["query", "limit"])
    );
    expect(parameters.properties.query!.type).toBe("string");
    expect(parameters.properties.limit!.type).toEqual(["number", "null"]);

    // Calling the tool with the optional arg explicitly nulled (as a
    // strict-mode model would, since it can't omit a required key) must not
    // forward that null to the real MCP server.
    await manager.tools.value[0]!.function({ query: "hi", limit: null });
    expect(mock.callTool).toHaveBeenCalledWith({
      name: "search",
      arguments: { query: "hi" },
    });
  });

  it("removeServer closes the connection and clears connection state", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();

    await manager.addServer({ name: "S", url: "https://mcp.test" });
    const serverId = manager.servers.value[0]!.id;
    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status !== "connecting"
    );

    await manager.removeServer(serverId);

    expect(manager.servers.value).toEqual([]);
    expect(manager.connectionState.value.has(serverId)).toBe(false);
    expect(mock.close).toHaveBeenCalled();
  });

  it("updateServer(enabled: false) disconnects without removing the server", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    await manager.addServer({ name: "S", url: "https://mcp.test" });
    const serverId = manager.servers.value[0]!.id;
    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status === "connected"
    );

    await manager.updateServer(serverId, { enabled: false });

    expect(manager.servers.value[0]!.enabled).toBe(false);
    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status === "disabled"
    );
  });

  it("falls back to SSE when the StreamableHTTP transport fails to connect", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();
    mock.connect
      .mockRejectedValueOnce(new Error("streamable http not supported"))
      .mockResolvedValueOnce(undefined);

    await manager.addServer({ name: "S", url: "https://mcp.test" });
    const serverId = manager.servers.value[0]!.id;

    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status === "connected"
    );
    expect(mock.SSEClientTransport).toHaveBeenCalledWith(
      new URL("https://mcp.test")
    );
    expect(manager.connectionState.value.get(serverId)?.usingSseFallback).toBe(
      true
    );
  });

  it("surfaces a connection error when both transports fail", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();
    mock.connect.mockRejectedValue(new Error("server unreachable"));

    await manager.addServer({ name: "S", url: "https://mcp.test" });
    const serverId = manager.servers.value[0]!.id;

    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status === "error"
    );
    expect(manager.connectionState.value.get(serverId)?.error).toContain(
      "server unreachable"
    );
  });

  it("surfaces an error for an invalid server URL without touching the MCP client", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();

    await manager.addServer({ name: "S", url: "not a url" });
    const serverId = manager.servers.value[0]!.id;

    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status === "error"
    );
    expect(mock.Client).not.toHaveBeenCalled();
  });

  it("loads persisted servers and connects to enabled ones on login", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: {
        servers: [
          {
            id: "srv-1",
            name: "Saved",
            url: "https://mcp.test",
            enabled: true,
          },
        ],
      },
    });
    const login = createTestLogin("user-1");

    const manager = createMCPManager(os, login);

    await waitForCondition(() => manager.servers.value.length === 1);
    expect(manager.servers.value[0]!.name).toBe("Saved");
    await waitForCondition(
      () => manager.connectionState.value.get("srv-1")?.status === "connected"
    );
  });

  it("falls back to an empty list when the persisted payload is invalid", async () => {
    getDataMock.mockResolvedValue({
      success: true,
      data: { servers: [{ id: "bad" }] },
    });
    const login = createTestLogin("user-1");

    const manager = createMCPManager(os, login);

    await waitForCondition(() => warnSpy.mock.calls.length > 0);
    expect(manager.servers.value).toEqual([]);
  });

  it("closes all connections and clears state on logout", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();

    await manager.addServer({ name: "S", url: "https://mcp.test" });
    await waitForCondition(
      () =>
        manager.connectionState.value.get(manager.servers.value[0]!.id)
          ?.status === "connected"
    );

    login.userId.value = null;

    await waitForCondition(() => manager.servers.value.length === 0);
    expect(mock.close).toHaveBeenCalled();
    await waitForCondition(() => manager.connectionState.value.size === 0);
  });

  it("dispose() stops the login effect and closes live connections", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();

    await manager.addServer({ name: "S", url: "https://mcp.test" });
    const serverId = manager.servers.value[0]!.id;
    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status === "connected"
    );

    manager.dispose();
    await waitForCondition(() => mock.close.mock.calls.length > 0);

    // Logging out after dispose must not throw or resurrect a load — the
    // login effect should no longer be running.
    login.userId.value = null;
    login.userId.value = "user-1";
    await Promise.resolve();
    await Promise.resolve();
    expect(getDataMock).toHaveBeenCalledTimes(1); // only the original load
  });

  it("passes a configured auth header through to the StreamableHTTP transport", async () => {
    const login = createTestLogin("user-1");
    const manager = createMCPManager(os, login);
    const mock = await getMcpMock();

    await manager.addServer({
      name: "S",
      url: "https://mcp.test",
      headers: { Authorization: "Bearer secret-token" },
    });
    const serverId = manager.servers.value[0]!.id;
    await waitForCondition(
      () => manager.connectionState.value.get(serverId)?.status === "connected"
    );

    expect(mock.StreamableHTTPClientTransport).toHaveBeenCalledWith(
      new URL("https://mcp.test"),
      { requestInit: { headers: { Authorization: "Bearer secret-token" } } }
    );
  });

  describe("toStrictJsonSchema", () => {
    it("marks every property required and disallows additional properties", () => {
      const result = toStrictJsonSchema({
        type: "object",
        properties: { a: { type: "string" }, b: { type: "number" } },
        required: ["a"],
      }) as {
        required: string[];
        additionalProperties: boolean;
        properties: Record<string, unknown>;
      };

      expect(result.required).toEqual(["a", "b"]);
      expect(result.additionalProperties).toBe(false);
      expect(result.properties.a).toEqual({ type: "string" });
    });

    it("extends a single-string type to allow null for an optional property", () => {
      const result = toStrictJsonSchema({
        type: "object",
        properties: { b: { type: "number" } },
        required: [],
      }) as { properties: { b: { type: string[] } } };

      expect(result.properties.b.type).toEqual(["number", "null"]);
    });

    it("appends to an existing anyOf instead of replacing it", () => {
      const result = toStrictJsonSchema({
        type: "object",
        properties: { b: { anyOf: [{ type: "string" }, { type: "number" }] } },
        required: [],
      }) as { properties: { b: { anyOf: unknown[] } } };

      expect(result.properties.b.anyOf).toEqual([
        { type: "string" },
        { type: "number" },
        { type: "null" },
      ]);
    });

    it("wraps a typeless schema (e.g. a bare $ref) in anyOf", () => {
      const result = toStrictJsonSchema({
        type: "object",
        properties: { b: { $ref: "#/definitions/Thing" } },
        required: [],
      }) as { properties: { b: { anyOf: unknown[] } } };

      expect(result.properties.b.anyOf).toEqual([
        { $ref: "#/definitions/Thing" },
        { type: "null" },
      ]);
    });

    it("recurses into nested object schemas", () => {
      const result = toStrictJsonSchema({
        type: "object",
        properties: {
          nested: {
            type: "object",
            properties: { inner: { type: "string" } },
            required: [],
          },
        },
        required: ["nested"],
      }) as {
        properties: {
          nested: { required: string[]; additionalProperties: boolean };
        };
      };

      expect(result.properties.nested.required).toEqual(["inner"]);
      expect(result.properties.nested.additionalProperties).toBe(false);
    });

    it("leaves non-object schemas alone", () => {
      expect(toStrictJsonSchema({ type: "string" })).toEqual({
        type: "string",
      });
      expect(toStrictJsonSchema(null)).toBeNull();
    });
  });

  describe("stripNullOptionalArgs", () => {
    it("drops null values for keys not in the required set", () => {
      const result = stripNullOptionalArgs(
        { query: "hi", limit: null },
        new Set(["query"])
      );
      expect(result).toEqual({ query: "hi" });
    });

    it("keeps a null value for a key that is actually required", () => {
      const result = stripNullOptionalArgs({ query: null }, new Set(["query"]));
      expect(result).toEqual({ query: null });
    });

    it("passes through undefined args unchanged", () => {
      expect(stripNullOptionalArgs(undefined, new Set())).toBeUndefined();
    });
  });
});
