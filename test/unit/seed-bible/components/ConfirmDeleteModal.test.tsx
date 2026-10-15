import { render } from "preact";
import { act } from "preact/test-utils";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { openConfirmDeleteModal } from "@packages/seed-bible/seed-bible/components/ConfirmDeleteModal/ConfirmDeleteModal";
import {
  I18nProvider,
  createI18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers";

describe("openConfirmDeleteModal", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("deletes once when Delete is tapped again while the first delete is running", async () => {
    const modals = createModalManager();
    let finishDelete: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishDelete = resolve;
        })
    );
    const toast = vi.fn();

    openConfirmDeleteModal(modals, {
      id: "delete-thing",
      title: "Delete thing?",
      message: () => "Delete this thing?",
      onConfirm,
      failedMessage: () => "Couldn't delete the thing.",
      toast,
    });

    const modal = modals.modals.value.find((m) => m.id === "delete-thing");
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

    const deleteButton = container.querySelector(
      ".sb-session-settings-end"
    ) as HTMLButtonElement;
    const cancelButton = container.querySelector(
      ".sb-session-settings-cancel"
    ) as HTMLButtonElement;

    act(() => {
      deleteButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      deleteButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(deleteButton.disabled).toBe(true);
    expect(cancelButton.disabled).toBe(true);

    await act(async () => {
      finishDelete();
      await Promise.resolve();
    });

    expect(toast).not.toHaveBeenCalled();
    expect(modals.modals.value.some((m) => m.id === "delete-thing")).toBe(
      false
    );
  });
});
