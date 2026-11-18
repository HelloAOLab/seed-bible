import { render } from "preact";
import { act } from "preact/test-utils";
import { TermsOfServiceModal } from "@packages/seed-bible/seed-bible/components/TermsOfServiceModal/TermsOfServiceModal";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe("TermsOfServiceModal", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders nothing when closed", async () => {
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <TermsOfServiceModal isOpen={false} onClose={vi.fn()} />
        </TestHost>,
        container
      );
    });

    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("loads and renders the real terms of service text when opened", async () => {
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <TermsOfServiceModal isOpen={true} onClose={vi.fn()} />
        </TestHost>,
        container
      );
    });

    // Regression guard: the modal lazily imports its policy bundle relative
    // to its own folder. An off-by-one path once made that import reject
    // silently, leaving this content area permanently empty with no error.
    await waitFor(() =>
      Boolean(container.querySelector(".sb-tos-content")?.innerHTML)
    );

    const content = container.querySelector(".sb-tos-content");
    expect(content?.innerHTML).toContain(
      "ao-lab-web-services-terms-of-service"
    );
    expect(content?.textContent).toContain(
      "AO Lab Web Services Terms of Service"
    );
  });

  it("is a dialog named by its title that closes on Escape", async () => {
    const state = await createTestSeedBibleState();
    const onClose = vi.fn();

    act(() => {
      render(
        <TestHost state={state}>
          <TermsOfServiceModal isOpen={true} onClose={onClose} />
        </TestHost>,
        container
      );
    });

    const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const titleId = dialog.getAttribute("aria-labelledby")!;
    expect(document.getElementById(titleId)?.textContent).toBe(
      "Terms of service"
    );
    expect(dialog.contains(document.activeElement)).toBe(true);

    act(() => {
      dialog.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
