import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { FloatingReaderPanels } from "@packages/seed-bible/seed-bible/components/FloatingReaderPanels";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";

jest.mock("seed-bible.i18n.I18nManager", () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

jest.mock("seed-bible.components.ContextMenu", () => ({
  closeContextMenus: jest.fn(),
  ContextMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ComponentChildren;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} onClick={onClick} role="menuitem">
      {children}
    </button>
  ),
  ContextMenuWithButton: ({
    children,
    buttonClassName,
    anchorClassName,
    onClick,
    icon,
    ...props
  }: {
    children: ComponentChildren;
    buttonClassName?: string;
    anchorClassName?: string;
    onClick?: () => void;
    icon?: string;
  }) => (
    <div className={anchorClassName}>
      <button className={buttonClassName} onClick={onClick} {...props}>
        {icon}
      </button>
      <div>{children}</div>
    </div>
  ),
}));

describe("FloatingReaderPanels", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.useRealTimers();
  });

  it("creates a local chat from a provider and selects it", async () => {
    const state = await createTestSeedBibleState();
    state.chats.createLocalSession();
    state.chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: jest.fn(),
    });
    state.chats.isOpen.value = true;

    act(() => {
      render(<FloatingReaderPanels state={state} />, container);
    });

    const createButton = container.querySelector(
      ".sb-floating-chat-list-create-button"
    ) as HTMLButtonElement | null;
    expect(createButton).not.toBeNull();

    const providerOption = container.querySelector(
      ".sb-floating-chat-list-create-item"
    ) as HTMLButtonElement | null;
    expect(providerOption).not.toBeNull();
    expect(providerOption?.textContent).toBe("Helper AI");

    await act(async () => {
      providerOption?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(state.chats.chats.value).toHaveLength(2);
    expect(state.chats.chats.value[1]?.participants.value).toContainEqual(
      expect.objectContaining({
        id: "provider-1",
      })
    );
    expect(state.chats.selectedChat.value).not.toBeNull();
    expect(state.chats.selectedChat.value?.participants.value).toContainEqual(
      expect.objectContaining({
        id: "provider-1",
      })
    );
  });

  it("shows the create button when providers are available", async () => {
    const state = await createTestSeedBibleState();
    state.chats.createLocalSession();
    state.chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: jest.fn(),
    });
    state.chats.isOpen.value = true;

    await act(async () => {
      render(<FloatingReaderPanels state={state} />, container);
      await Promise.resolve();
    });

    expect(
      container.querySelector(".sb-floating-chat-list-create-anchor")
    ).not.toBeNull();
    expect(
      container.querySelector(".sb-floating-chat-list-create-button")
    ).not.toBeNull();
  });

  it("hides the create button when no providers are available", async () => {
    const state = await createTestSeedBibleState();
    state.chats.createLocalSession();
    state.chats.isOpen.value = true;

    await act(async () => {
      render(<FloatingReaderPanels state={state} />, container);
      await Promise.resolve();
    });

    expect(
      container.querySelector(".sb-floating-chat-list-create-button")
    ).toBeNull();
  });
});
