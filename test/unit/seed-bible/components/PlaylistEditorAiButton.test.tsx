import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import type { Mock } from "vitest";
import { PlaylistEditorAiButton } from "@packages/seed-bible/seed-bible/components/PlaylistEditor/PlaylistEditorAiButton";
import type {
  ChatProvider,
  ChatsManager,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function createMockProvider(
  id: string,
  name = id,
  supportsToolCalling = true
): ChatProvider {
  return {
    id,
    name,
    supportsSharedChats: false,
    supportsToolCalling,
  } as unknown as ChatProvider;
}

/** A fake `ChatsManager` exposing just the surface the AI button uses. */
function createMockChats(providers: ChatProvider[] = []) {
  const selectChat = vi.fn();
  const addParticipant = vi.fn();
  const createLocalSession = vi.fn((_history: { messages: unknown[] }) => ({
    id: "chat-1",
    addParticipant,
  }));
  const providersSignal = signal(providers);
  const chats = {
    chats: signal([]),
    createLocalSession,
    selectChat,
    providers: providersSignal,
    composerDraft: signal(""),
  } as unknown as ChatsManager;
  return {
    chats,
    createLocalSession,
    selectChat,
    addParticipant,
    providers: providersSignal,
  };
}

describe("PlaylistEditorAiButton", () => {
  let container: HTMLDivElement;
  let openChatPanel: Mock<() => void>;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    openChatPanel = vi.fn<() => void>();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const show = (chats: ChatsManager) =>
    act(() => {
      render(
        <PlaylistEditorAiButton chats={chats} openChatPanel={openChatPanel} />,
        container
      );
    });

  const aiButton = () =>
    container.querySelector<HTMLButtonElement>(".sb-discover-title-ai");

  it("hides when no agent can edit playlists", () => {
    const fixture = createMockChats();
    show(fixture.chats);
    expect(aiButton()).toBeNull();

    // An installed agent that cannot call tools still cannot edit the
    // playlist, so the button stays hidden.
    fixture.providers.value = [createMockProvider("bonfire", "Bonfire", false)];
    show(fixture.chats);
    expect(aiButton()).toBeNull();
    expect(fixture.createLocalSession).not.toHaveBeenCalled();
    expect(openChatPanel).not.toHaveBeenCalled();
  });

  it("with exactly one AI provider, adds it automatically without showing a menu", () => {
    const fixture = createMockChats([createMockProvider("provider-1")]);
    show(fixture.chats);

    expect(document.querySelector('[role="menu"]')).toBeNull();
    act(() => aiButton()!.click());

    expect(fixture.createLocalSession).toHaveBeenCalledTimes(1);
    const history = fixture.createLocalSession.mock.calls[0]![0];
    expect(history.messages).toHaveLength(1);
    expect(history.messages[0]).toMatchObject({
      authors: ["provider-1"],
      type: "text",
      text: "What do you want to add/change?",
    });
    expect(fixture.addParticipant).toHaveBeenCalledWith("provider-1");
    expect(fixture.selectChat).toHaveBeenCalledWith("chat-1");
    expect(openChatPanel).toHaveBeenCalledTimes(1);
  });

  it("with multiple AI providers, shows a menu and starts the chat with the selected one", () => {
    const fixture = createMockChats([
      createMockProvider("provider-1", "Provider One"),
      createMockProvider("provider-2", "Provider Two"),
    ]);
    show(fixture.chats);

    // Opening the menu doesn't create a chat by itself.
    act(() => aiButton()!.click());
    expect(fixture.createLocalSession).not.toHaveBeenCalled();

    // The menu opens in a portal outside the button.
    const menuItems = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    );
    expect(menuItems.map((item) => item.textContent)).toEqual([
      "Provider One",
      "Provider Two",
    ]);
    act(() => menuItems[1]!.click());

    expect(fixture.createLocalSession).toHaveBeenCalledTimes(1);
    expect(fixture.addParticipant).toHaveBeenCalledWith("provider-2");
    expect(fixture.selectChat).toHaveBeenCalledWith("chat-1");
    expect(openChatPanel).toHaveBeenCalledTimes(1);
  });

  it("leaves out AI providers that don't support tool calling", () => {
    const fixture = createMockChats([
      createMockProvider("provider-1", "Provider One"),
      createMockProvider("provider-2", "No Tools", false),
    ]);
    show(fixture.chats);

    // Only one tool-calling provider remains, so no menu shows.
    expect(document.querySelector('[role="menu"]')).toBeNull();
    act(() => aiButton()!.click());

    expect(fixture.addParticipant).toHaveBeenCalledWith("provider-1");
    expect(fixture.addParticipant).not.toHaveBeenCalledWith("provider-2");
  });
});
