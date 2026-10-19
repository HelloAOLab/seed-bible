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

  afterEach(() => {
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
