import { render } from "preact";
import { act } from "preact/test-utils";
import { CodeOfConductModal } from "@packages/seed-bible/seed-bible/components/CodeOfConductModal/CodeOfConductModal";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe("CodeOfConductModal", () => {
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
          <CodeOfConductModal isOpen={false} onClose={vi.fn()} />
        </TestHost>,
        container
      );
    });

    expect(container.querySelector(".sb-tos-modal")).toBeNull();
  });

  it("loads and renders the real code of conduct text when opened", async () => {
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <CodeOfConductModal isOpen={true} onClose={vi.fn()} />
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
      "ao-lab-web-services-acceptable-use-policy"
    );
    expect(content?.textContent).toContain(
      "AO Lab Web Services Acceptable Use Policy"
    );
  });
});
