import { render } from "preact";
import { act } from "preact/test-utils";
import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { openConfirmDeleteModal } from "@packages/seed-bible/seed-bible/components/ConfirmDeleteModal/ConfirmDeleteModal";
import {
  I18nProvider,
  createI18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers";

const MODAL_ID = "delete-thing";

describe("openConfirmDeleteModal", () => {
  let container: HTMLDivElement;
  let modals: ModalManager;
  let finishDelete: () => void;
  let onConfirm: () => Promise<void>;
  let toast: (message: string) => void;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    modals = createModalManager();
    finishDelete = () => {};
    onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        })
    );
    toast = vi.fn();
  });

  afterEach(async () => {
    // Running deletes are tracked outside the modal, so one a test left
    // unfinished would disable Delete in the tests after it.
    await finishTheDelete();
    render(null, container);
    container.remove();
  });

  /** Opens the modal and renders it, as the modal host would. */
  function openAndRender() {
    openConfirmDeleteModal(modals, {
      id: MODAL_ID,
      title: "Delete thing?",
      message: () => "Delete this thing?",
      onConfirm,
      failedMessage: () => "Couldn't delete the thing.",
      toast,
    });
    const modal = modals.modals.value.find((m) => m.id === MODAL_ID);
    act(() => {
      render(
        <I18nProvider
          i18n={createI18nManager(createNavigationManager(), ["en"])}
        >
          {modal!.content({
            t: (key, options) => (options?.defaultValue as string) ?? key,
          })}
        </I18nProvider>,
        container
      );
    });
    return {
      deleteButton: container.querySelector(
        ".sb-session-settings-end"
      ) as HTMLButtonElement,
      cancelButton: container.querySelector(
        ".sb-session-settings-cancel"
      ) as HTMLButtonElement,
    };
  }

  function click(button: HTMLButtonElement) {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  async function finishTheDelete() {
    await act(async () => {
      finishDelete();
      await Promise.resolve();
      await Promise.resolve();
    });
  }

  it("deletes once when Delete is tapped again while the first delete is running", async () => {
    const { deleteButton, cancelButton } = openAndRender();

    act(() => {
      click(deleteButton);
      click(deleteButton);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(deleteButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);

    await finishTheDelete();

    expect(toast).not.toHaveBeenCalled();
    expect(modals.modals.value.some((m) => m.id === MODAL_ID)).toBe(false);
  });

  it("shows a spinner in place of the trash can while the delete is running", async () => {
    const { deleteButton } = openAndRender();
    const icon = () => deleteButton.querySelector(".material-symbols-outlined");
    expect(icon()!.textContent).toBe("delete");
    expect(deleteButton.querySelector(".sb-spinner")).toBeNull();

    act(() => {
      click(deleteButton);
    });

    expect(deleteButton.querySelector(".sb-spinner")).not.toBeNull();
    expect(icon()!.textContent).toBe("progress_activity");
    expect(deleteButton.getAttribute("aria-busy")).toBe("true");
    // The label stays, so the button keeps its width and says what's running.
    expect(deleteButton.textContent).toMatch(/progress_activity\s*delete$/i);

    await finishTheDelete();

    expect(modals.modals.value.some((m) => m.id === MODAL_ID)).toBe(false);
  });

  it("can't be closed with its X or backdrop while the delete is running", async () => {
    const { deleteButton } = openAndRender();
    const isOpen = () => modals.modals.value.some((m) => m.id === MODAL_ID);

    act(() => {
      click(deleteButton);
    });
    // What the X button and the backdrop do.
    act(() => {
      modals.dismissModal(MODAL_ID);
    });
    expect(isOpen()).toBe(true);

    await finishTheDelete();

    expect(isOpen()).toBe(false);
  });

  it("goes back to the trash can when the delete fails", async () => {
    onConfirm = vi.fn(() => Promise.reject(new Error("offline")));
    const { deleteButton } = openAndRender();

    await act(async () => {
      click(deleteButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(toast).toHaveBeenCalledWith("Couldn't delete the thing.");
    expect(deleteButton.querySelector(".sb-spinner")).toBeNull();
  });

  it("deletes once when the modal is closed and reopened while the first delete is running", async () => {
    act(() => {
      click(openAndRender().deleteButton);
    });

    // What the modal's X button does.
    act(() => {
      modals.closeModal(MODAL_ID);
      render(null, container);
    });

    const reopened = openAndRender();
    expect(reopened.deleteButton.disabled).toBe(true);
    expect(reopened.cancelButton.disabled).toBe(true);

    act(() => {
      click(reopened.deleteButton);
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await finishTheDelete();

    expect(toast).not.toHaveBeenCalled();
    expect(modals.modals.value.some((m) => m.id === MODAL_ID)).toBe(false);
  });
});
