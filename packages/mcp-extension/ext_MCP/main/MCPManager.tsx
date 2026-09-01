import { computed, effect, signal, type ReadonlySignal } from "@preact/signals";
import * as z from "zod/v4";
import type { ZodStandardJSONSchemaPayload } from "zod/v4/core";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { AIProviderFunctionTool } from "@packages/seed-bible/seed-bible/managers/AIManager";

/**
 * Schema for one user-configured MCP server. `headers` carries any auth the
 * server needs (e.g. `{ Authorization: "Bearer ..." }|`) — only remote,
 * HTTP-reachable MCP servers (StreamableHTTP, with a legacy-SSE fallback)
 * are supported, since the whole AI chat call chain runs client-side in the
 * browser with no backend to proxy a local/stdio MCP server through.
 */
export const mcpServerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean(),
});

export type McpServerConfig = z.infer<typeof mcpServerSchema>;

export const mcpServersPayloadSchema = z.object({
  servers: z.array(mcpServerSchema),
});

export type McpServersPayload = z.infer<typeof mcpServersPayloadSchema>;

const STORAGE_ADDRESS = "mcp-servers";

export type McpServerConnectionStatus =
  | "connecting"
  | "connected"
  | "error"
  | "disabled";

export interface McpServerConnectionState {
  status: McpServerConnectionStatus;
  error?: string;
  toolCount?: number;
  /**
   * True once the connection fell back to the legacy SSE transport. Browser
   * `EventSource` (what SSE uses) can't send custom headers, so a
   * configured auth header won't reach a server that only supports SSE.
   */
  usingSseFallback?: boolean;
}

interface LiveConnection {
  client: { close: () => Promise<void> };
  tools: AIProviderFunctionTool[];
}

function makeServerId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `mcp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface MCPManager {
  /** Configured MCP servers for the current user. Empty when logged out. */
  servers: ReadonlySignal<McpServerConfig[]>;

  /** Live connection status per server id. */
  connectionState: ReadonlySignal<Map<string, McpServerConnectionState>>;

  /** The combined tool list across every connected, enabled server. */
  tools: ReadonlySignal<AIProviderFunctionTool[]>;

  /**
   * Adds a new MCP server and attempts to connect to it. Requires the user
   * to be logged in; no-ops (with a warning) otherwise.
   */
  addServer: (input: {
    name: string;
    url: string;
    headers?: Record<string, string>;
  }) => Promise<void>;

  /** Removes a server and closes its connection, if any. */
  removeServer: (id: string) => Promise<void>;

  /**
   * Updates a server's fields (e.g. toggling `enabled`) and reconnects or
   * disconnects it as needed. No-op if `id` is unknown.
   */
  updateServer: (
    id: string,
    patch: Partial<
      Pick<McpServerConfig, "name" | "url" | "headers" | "enabled">
    >
  ) => Promise<void>;

  /**
   * Stops the login-driven load effect and closes every live connection.
   * Call this when the extension is uninstalled.
   */
  dispose: () => void;
}

export function createMCPManager(
  os: CasualOSManager,
  login: LoginManager
): MCPManager {
  const servers = signal<McpServerConfig[]>([]);
  const connectionState = signal<Map<string, McpServerConnectionState>>(
    new Map()
  );
  const loadedUserId = signal<string | null>(null);
  const toolsVersion = signal(0);

  const liveConnections = new Map<string, LiveConnection>();
  const latestAttemptToken = new Map<string, symbol>();

  // Bumped by every write to `servers.value` (the initial load, and each
  // mutator). `loadServers` is async — a mutator can run and persist while a
  // load is still in flight, in which case the mutator's result is the more
  // recent state and the load must not clobber it once it finally resolves.
  let stateVersion = 0;

  const readServers: ReadonlySignal<McpServerConfig[]> = computed(
    () => servers.value
  );
  const readConnectionState: ReadonlySignal<
    Map<string, McpServerConnectionState>
  > = computed(() => connectionState.value);

  const setConnectionState = (id: string, state: McpServerConnectionState) => {
    const next = new Map(connectionState.value);
    next.set(id, state);
    connectionState.value = next;
  };

  const clearConnectionState = (id: string) => {
    const next = new Map(connectionState.value);
    next.delete(id);
    connectionState.value = next;
  };

  const bumpToolsVersion = () => {
    toolsVersion.value++;
  };

  /**
   * Closes and forgets any live connection for `id`, and invalidates any
   * connect attempt for it that's still in flight (so a stale attempt that
   * finishes after this call can't resurrect a connection for a server that
   * was just removed/disabled/reconfigured).
   */
  const closeConnection = async (id: string): Promise<void> => {
    latestAttemptToken.set(id, Symbol());
    const existing = liveConnections.get(id);
    if (!existing) return;
    liveConnections.delete(id);
    bumpToolsVersion();
    try {
      await existing.client.close();
    } catch (err) {
      console.warn(`Failed to close MCP connection for server ${id}.`, err);
    }
  };

  const connectServer = async (server: McpServerConfig): Promise<void> => {
    await closeConnection(server.id);

    if (!server.enabled) {
      setConnectionState(server.id, { status: "disabled" });
      return;
    }

    let url: URL;
    try {
      url = new URL(server.url);
    } catch {
      setConnectionState(server.id, {
        status: "error",
        error: "Enter a valid server URL.",
      });
      return;
    }

    const token = Symbol();
    latestAttemptToken.set(server.id, token);
    const isStale = () => latestAttemptToken.get(server.id) !== token;
    setConnectionState(server.id, { status: "connecting" });

    try {
      // Fetched here (rather than imported statically) so the SDK isn't
      // pulled in until a server is actually being connected to — being
      // part of this extension already keeps it out of the core app bundle
      // regardless, but this still avoids paying for it before it's needed.
      const { Client, StreamableHTTPClientTransport, SSEClientTransport } =
        await import("@modelcontextprotocol/client");
      if (isStale()) return;

      const clientInfo = { name: "seed-bible", version: "1.0.0" };
      const transportOptions = server.headers
        ? { requestInit: { headers: server.headers } }
        : undefined;

      let usingSseFallback = false;
      let client = new Client(clientInfo);
      try {
        await client.connect(
          new StreamableHTTPClientTransport(url, transportOptions)
        );
      } catch {
        // StreamableHTTP failed (unsupported by the server, or a transient
        // error) — fall back to the legacy SSE transport, per the MCP SDK's
        // own documented fallback sequence.
        client = new Client(clientInfo);
        await client.connect(new SSEClientTransport(url));
        usingSseFallback = true;
      }

      if (isStale()) {
        await client.close().catch(() => undefined);
        return;
      }

      // `listTools` can paginate; a single page covers ordinary MCP
      // servers, so pagination isn't implemented for this first version.
      const { tools: mcpTools } = await client.listTools();

      if (isStale()) {
        await client.close().catch(() => undefined);
        return;
      }

      const tools: AIProviderFunctionTool[] = mcpTools.map((tool) => ({
        name: `${server.name}:${tool.name}`,
        type: "function",
        description: tool.description ?? "",
        parameters:
          tool.inputSchema as unknown as ZodStandardJSONSchemaPayload<unknown>,
        function: async (args: unknown) =>
          client.callTool({
            name: tool.name,
            arguments: args as Record<string, unknown> | undefined,
          }),
      }));

      liveConnections.set(server.id, { client, tools });
      bumpToolsVersion();
      setConnectionState(server.id, {
        status: "connected",
        toolCount: tools.length,
        usingSseFallback,
      });
    } catch (err) {
      if (isStale()) return;
      setConnectionState(server.id, {
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const closeAllConnections = async (): Promise<void> => {
    const ids = [...liveConnections.keys()];
    await Promise.all(ids.map((id) => closeConnection(id)));
    latestAttemptToken.clear();
    connectionState.value = new Map();
  };

  const loadServers = async (userId: string): Promise<void> => {
    const versionAtStart = stateVersion;
    const data = await os.getData(userId, STORAGE_ADDRESS);
    if (loadedUserId.value !== userId && login.userId.value !== userId) {
      return;
    }
    if (stateVersion !== versionAtStart) {
      // A mutator (addServer/removeServer/updateServer) ran and persisted
      // its own state while this load was in flight — that's the more
      // recent state, so leave it alone and just mark this user as loaded.
      loadedUserId.value = userId;
      return;
    }

    let nextServers: McpServerConfig[] = [];
    if (data && data.success && data.data) {
      const parsed = mcpServersPayloadSchema.safeParse(data.data);
      if (parsed.success) {
        nextServers = parsed.data.servers;
      } else {
        console.warn("Failed to parse MCP servers payload:", parsed.error);
      }
    }

    servers.value = nextServers;
    stateVersion++;
    loadedUserId.value = userId;
    for (const server of nextServers) {
      void connectServer(server);
    }
  };

  const persist = async (nextServers: McpServerConfig[]): Promise<void> => {
    const userId = login.userId.value;
    if (!userId) {
      console.warn("Cannot persist MCP servers: user is not authenticated.");
      return;
    }
    const payload = mcpServersPayloadSchema.parse({ servers: nextServers });
    // MCP server configs can carry auth headers/tokens, so — unlike
    // bookmarks/highlights/playlists, which pass `marker: "publicRead"` —
    // this record must stay on the default (private) marker.
    await os.recordData(userId, STORAGE_ADDRESS, payload, {});
  };

  const stopLoginEffect = effect(() => {
    const userId = login.userId.value;
    if (!userId) {
      servers.value = [];
      loadedUserId.value = null;
      void closeAllConnections();
      return;
    }
    if (loadedUserId.value === userId) {
      return;
    }
    void loadServers(userId);
  });

  const readTools: ReadonlySignal<AIProviderFunctionTool[]> = computed(() => {
    // `liveConnections` is a plain Map (not a signal) since its entries hold
    // non-serializable client handles; `toolsVersion` is the reactive proxy
    // that tells this computed when to re-derive from it.
    void toolsVersion.value;
    return [...liveConnections.values()].flatMap((c) => c.tools);
  });

  const addServer: MCPManager["addServer"] = async (input) => {
    const userId = login.userId.value;
    if (!userId) {
      console.warn("Cannot add an MCP server: user is not authenticated.");
      return;
    }
    const newServer: McpServerConfig = {
      id: makeServerId(),
      name: input.name,
      url: input.url,
      headers: input.headers,
      enabled: true,
    };
    const next = [...servers.value, newServer];
    servers.value = next;
    stateVersion++;
    await persist(next);
    void connectServer(newServer);
  };

  const removeServer: MCPManager["removeServer"] = async (id) => {
    const next = servers.value.filter((server) => server.id !== id);
    if (next.length === servers.value.length) {
      return;
    }
    servers.value = next;
    stateVersion++;
    await persist(next);
    await closeConnection(id);
    clearConnectionState(id);
  };

  const updateServer: MCPManager["updateServer"] = async (id, patch) => {
    const existing = servers.value.find((server) => server.id === id);
    if (!existing) return;
    const updated: McpServerConfig = { ...existing, ...patch };
    const next = servers.value.map((server) =>
      server.id === id ? updated : server
    );
    servers.value = next;
    stateVersion++;
    await persist(next);
    void connectServer(updated);
  };

  const dispose = () => {
    stopLoginEffect();
    void closeAllConnections();
  };

  return {
    servers: readServers,
    connectionState: readConnectionState,
    tools: readTools,
    addServer,
    removeServer,
    updateServer,
    dispose,
  };
}
