import "./AIChatSettingsModal.css";
import { useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import type {
  MCPManager,
  McpServerConfig,
  McpServerConnectionState,
} from "../../managers/MCPManager";
import { MaterialIcon } from "../icons";

const MODAL_ID = "ai-chat-settings";

/**
 * Opens the "AI Chat Settings" modal, where a user manages the MCP servers
 * whose tools are made available to every tool-calling-capable AI chat
 * participant. Reachable from the sparkle "Active AI context" menu on a
 * chat's header.
 */
export function openAIChatSettingsModal(state: SeedBibleState) {
  state.modals.openModal({
    id: MODAL_ID,
    title: {
      key: "ai-chat-settings-title",
      defaultValue: "AI Chat Settings",
    },
    content: () => <AIChatSettingsModalContent mcp={state.mcp} />,
  });
}

function statusIcon(status: McpServerConnectionState["status"] | undefined) {
  switch (status) {
    case "connected":
      return "check_circle";
    case "connecting":
      return "sync";
    case "error":
      return "error";
    case "disabled":
    default:
      return "power_off";
  }
}

function AIChatSettingsServerRow(props: {
  server: McpServerConfig;
  connection: McpServerConnectionState | undefined;
  onToggleEnabled: (enabled: boolean) => void;
  onRemove: () => void;
}) {
  const { server, connection, onToggleEnabled, onRemove } = props;
  const { t } = useI18n();
  const status = connection?.status;

  const statusLabel =
    status === "connected"
      ? t("mcp-server-status-connected", { defaultValue: "Connected" })
      : status === "connecting"
        ? t("mcp-server-status-connecting", { defaultValue: "Connecting…" })
        : status === "error"
          ? t("mcp-server-status-error", { defaultValue: "Connection failed" })
          : t("mcp-server-status-disabled", { defaultValue: "Disabled" });

  return (
    <li className="sb-extension-row">
      <div className="sb-extension-row-body">
        <span
          className={`material-symbols-outlined sb-extension-state-icon sb-mcp-server-status-icon-${status ?? "disabled"}`}
          title={statusLabel}
        >
          {statusIcon(status)}
        </span>
        <div className="sb-extension-row-content">
          <span className="sb-extension-name">{server.name}</span>
          <span className="sb-extension-description">{server.url}</span>
          {connection?.status === "connected" && (
            <span className="sb-extension-description">
              {t("ai-context-tool-count", {
                defaultValue: "{{count}} tools",
                count: connection.toolCount ?? 0,
              })}
            </span>
          )}
          {connection?.status === "connected" &&
            connection.usingSseFallback &&
            server.headers &&
            Object.keys(server.headers).length > 0 && (
              <span className="sb-mcp-server-warning">
                {t("mcp-server-auth-header-sse-warning", {
                  defaultValue:
                    "This server only supports the legacy SSE transport, which can't carry the auth header below — it may not have been applied.",
                })}
              </span>
            )}
          {connection?.status === "error" && connection.error && (
            <span className="sb-mcp-server-warning">
              {t("mcp-server-connect-error", {
                defaultValue: "Couldn't connect: {{error}}",
                error: connection.error,
              })}
            </span>
          )}
        </div>
        <div className="sb-extension-row-actions">
          <button
            type="button"
            className="sb-extension-row-action-button"
            onClick={() => onToggleEnabled(status === "disabled")}
            aria-label={
              status === "disabled"
                ? t("mcp-server-enable", { defaultValue: "Enable" })
                : t("mcp-server-disable", { defaultValue: "Disable" })
            }
            title={
              status === "disabled"
                ? t("mcp-server-enable", { defaultValue: "Enable" })
                : t("mcp-server-disable", { defaultValue: "Disable" })
            }
          >
            <MaterialIcon>
              {status === "disabled" ? "toggle_off" : "toggle_on"}
            </MaterialIcon>
          </button>
          <button
            type="button"
            className="sb-extension-row-action-button"
            onClick={onRemove}
            aria-label={t("mcp-server-remove", { defaultValue: "Remove" })}
            title={t("mcp-server-remove", { defaultValue: "Remove" })}
          >
            <MaterialIcon>delete</MaterialIcon>
          </button>
        </div>
      </div>
    </li>
  );
}

function AddMcpServerForm(props: { mcp: MCPManager }) {
  const { mcp } = props;
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [authHeader, setAuthHeader] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) {
      return;
    }

    let validUrl: string;
    try {
      validUrl = new URL(trimmedUrl).toString();
    } catch {
      setError(
        t("mcp-server-add-url-error", { defaultValue: "Enter a valid URL" })
      );
      return;
    }

    const trimmedAuthHeader = authHeader.trim();
    setIsAdding(true);
    try {
      await mcp.addServer({
        name: trimmedName,
        url: validUrl,
        headers: trimmedAuthHeader
          ? { Authorization: trimmedAuthHeader }
          : undefined,
      });
      setName("");
      setUrl("");
      setAuthHeader("");
      setError(null);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="sb-mcp-add-server-form">
      <input
        className="sb-settings-text-input"
        type="text"
        value={name}
        dir="auto"
        placeholder={t("mcp-server-name-placeholder", {
          defaultValue: "Server name",
        })}
        onInput={(event: Event) => {
          setName((event.currentTarget as HTMLInputElement).value);
        }}
      />
      <input
        className="sb-settings-text-input"
        type="url"
        value={url}
        dir="auto"
        placeholder={t("mcp-server-url-placeholder", {
          defaultValue: "https://example.com/mcp",
        })}
        onInput={(event: Event) => {
          setUrl((event.currentTarget as HTMLInputElement).value);
          setError(null);
        }}
      />
      <input
        className="sb-settings-text-input"
        type="text"
        value={authHeader}
        dir="auto"
        placeholder={t("mcp-server-auth-header-placeholder", {
          defaultValue: "Authorization header (optional)",
        })}
        onInput={(event: Event) => {
          setAuthHeader((event.currentTarget as HTMLInputElement).value);
        }}
      />
      <button
        type="button"
        className="sb-settings-save-button"
        onClick={() => void handleAdd()}
        disabled={!name.trim() || !url.trim() || isAdding}
      >
        {t("mcp-server-add", { defaultValue: "Add server" })}
      </button>
      {error ? <div className="sb-playlist-add-error">{error}</div> : null}
    </div>
  );
}

export function AIChatSettingsModalContent(props: { mcp: MCPManager }) {
  const { mcp } = props;
  const { t } = useI18n();
  const servers = mcp.servers.value;
  const connectionState = mcp.connectionState.value;

  return (
    <div className="sb-ai-chat-settings">
      <p className="sb-ai-chat-settings-description">
        {t("ai-chat-settings-description", {
          defaultValue:
            "Connect remote MCP servers to give AI chat participants access to their tools.",
        })}
      </p>
      {servers.length === 0 ? (
        <div className="sb-settings-empty-state">
          <p>
            {t("no-mcp-servers-configured", {
              defaultValue: "No MCP servers configured yet.",
            })}
          </p>
        </div>
      ) : (
        <ul className="sb-extensions-list">
          {servers.map((server) => (
            <AIChatSettingsServerRow
              key={server.id}
              server={server}
              connection={connectionState.get(server.id)}
              onToggleEnabled={(enabled) =>
                void mcp.updateServer(server.id, { enabled })
              }
              onRemove={() => void mcp.removeServer(server.id)}
            />
          ))}
        </ul>
      )}
      <AddMcpServerForm mcp={mcp} />
    </div>
  );
}
