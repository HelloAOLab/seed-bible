import { render } from "preact";
import { act } from "preact/test-utils";
import {
  LegalDialog,
  type LegalDocument,
} from "@packages/seed-bible/seed-bible/components/LegalDialog/LegalDialog";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe.each<{
  document: LegalDocument;
  title: string;
  anchor: string;
  heading: string;
}>([
  {
    document: "terms-of-service",
    title: "Terms of service",
    anchor: "ao-lab-web-services-terms-of-service",
    heading: "AO Lab Web Services Terms of Service",
  },
  {
    document: "privacy-policy",
    title: "Privacy policy",
    anchor: "ao-lab-web-services-privacy-policy",
    heading: "AO Lab Web Services Privacy Policy",
  },
  {
    document: "code-of-conduct",
    title: "Code of conduct",
    anchor: "ao-lab-web-services-acceptable-use-policy",
    heading: "AO Lab Web Services Acceptable Use Policy",
  },
])(
  "LegalDialog: $document",
  ({ document: legalDocument, title, anchor, heading }) => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
    });

    afterEach(() => {
      render(null, container);
      container.remove();
    });

    const open = async (onClose = vi.fn()) => {
      const state = await createTestSeedBibleState();
      act(() => {
        render(
          <TestHost state={state}>
            <LegalDialog document={legalDocument} onClose={onClose} />
          </TestHost>,
          container
        );
      });
    };

    it("loads and shows its text", async () => {
      await open();

      // Regression guard: the text is imported from a path relative to this
      // component's folder. A wrong path once made the import fail silently,
      // leaving the window empty with no error.
      await waitFor(() =>
        Boolean(container.querySelector(".sb-legal-dialog-content")?.innerHTML)
      );

      const content = container.querySelector(".sb-legal-dialog-content");
      expect(content?.innerHTML).toContain(anchor);
      expect(content?.textContent).toContain(heading);
    });

    it("is a dialog named by its title that closes on Escape", async () => {
      const onClose = vi.fn();
      await open(onClose);

      const dialog = container.querySelector<HTMLElement>('[role="dialog"]')!;
      expect(dialog.getAttribute("aria-modal")).toBe("true");
      const titleId = dialog.getAttribute("aria-labelledby")!;
      expect(document.getElementById(titleId)?.textContent).toBe(title);
      expect(dialog.contains(document.activeElement)).toBe(true);

      act(() => {
        dialog.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  }
);
