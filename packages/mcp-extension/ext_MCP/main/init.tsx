import { effect } from "@preact/signals";
import { registerExtension, type SeedBibleState } from "seed-bible";
import type { IdentifiedLocalChatContext } from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import { createMCPManager, type MCPManager } from "./MCPManager";
import { openAIChatSettingsModal } from "./AIChatSettingsModal";

export const MCP_CHAT_CONTEXT_ID = "mcp-servers";

/**
 * Builds the `ChatsManager` context this extension contributes: every
 * connected server's tools (undefined when there are none yet), plus a
 * `settingsAction` that's always present so the "MCP servers" row — and its
 * settings gear — is reachable from the chat header as soon as this
 * extension is installed, not just once a server is configured.
 */
export function buildMcpChatContext(
  mcp: MCPManager,
  openSettings: () => void
): IdentifiedLocalChatContext {
  const tools = mcp.tools.value;
  return {
    id: MCP_CHAT_CONTEXT_ID,
    label: {
      key: "mcp-servers-chat-context",
      defaultValue: "MCP servers",
      ns: "mcp-extension",
    },
    tools: tools.length > 0 ? tools : undefined,
    settingsAction: {
      label: {
        key: "ai-chat-settings-menu-item",
        defaultValue: "AI Chat Settings",
        ns: "mcp-extension",
      },
      onClick: openSettings,
    },
  };
}

export default function initMCPExtension() {
  registerExtension({
    id: "mcp-extension",
    init: function* (context: SeedBibleState) {
      const mcp = createMCPManager(context.os, context.login);

      // Exposes every connected server's tools to every AI chat via
      // `ChatsManager`, the same mechanism `PlaylistManager` uses while a
      // playlist is open for editing — any tool-calling-capable chat
      // provider picks these up automatically.
      const stopWiring = effect(() => {
        context.chats.addContext(
          buildMcpChatContext(mcp, () => openAIChatSettingsModal(context, mcp))
        );
      });

      yield () => {
        stopWiring();
        context.chats.removeContext(MCP_CHAT_CONTEXT_ID);
        mcp.dispose();
      };

      return { mcp };
    },
  });
}
