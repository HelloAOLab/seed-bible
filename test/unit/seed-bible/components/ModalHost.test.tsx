import { render } from "preact";
import { act } from "preact/test-utils";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { pressAndRelease } from "../testUtils/pressAndRelease";
import { TestHost } from "./TestHost";

describe("ModalHost", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function renderWithModal() {
    const state = await createTestSeedBibleState();
    const manager = createModalManager();
    act(() => {
      manager.openModal({
        title: "Settings",
        content: () => <input className="test-input" />,
      });
    });
    act(() => {
      render(
        <TestHost state={state}>
          <ModalHost manager={manager} />
        </TestHost>,
        container
      );
    });
    const overlay = container.querySelector(
      ".sb-footnote-modal-overlay"
    ) as HTMLElement;
    const input = container.querySelector(".test-input") as HTMLElement;
    return { manager, overlay, input };
  }

  it("closes when the overlay is clicked", async () => {
    const { manager, overlay } = await renderWithModal();

    pressAndRelease(overlay, overlay);

    expect(manager.modals.value).toHaveLength(0);
  });

  it("stays open when a drag starts in an input and is released over the overlay", async () => {
    const { manager, overlay, input } = await renderWithModal();

    pressAndRelease(input, overlay);

    expect(manager.modals.value).toHaveLength(1);
    expect(container.querySelector(".test-input")).not.toBeNull();
  });

  it("stays open when the modal body is clicked", async () => {
    const { manager, input } = await renderWithModal();

    pressAndRelease(input, input);

    expect(manager.modals.value).toHaveLength(1);
  });

  it("hides the close button and shows the footer when asked", async () => {
    const state = await createTestSeedBibleState();
    const manager = createModalManager();
    act(() => {
      manager.openModal({
        title: "Step",
        content: () => <p>Body</p>,
        footer: () => <button className="test-footer">Next</button>,
        showCloseButton: false,
        useCasualOSApp: false,
      });
    });
    act(() => {
      render(
        <TestHost state={state}>
          <ModalHost manager={manager} />
        </TestHost>,
        container
      );
    });

    expect(container.querySelector(".sb-footnote-modal-close")).toBeNull();
    expect(
      container.querySelector(".sb-footnote-modal-footer .test-footer")
    ).not.toBeNull();
  });

  it("shows the close button and no footer by default", async () => {
    await renderWithModal();

    expect(container.querySelector(".sb-footnote-modal-close")).not.toBeNull();
    expect(container.querySelector(".sb-footnote-modal-footer")).toBeNull();
  });
});
