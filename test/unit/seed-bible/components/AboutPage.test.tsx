import { render } from "preact";
import { act } from "preact/test-utils";
import { AboutPage } from "@packages/seed-bible/seed-bible/components/AboutPage/AboutPage";
import { buildReadingPath } from "@packages/seed-bible/seed-bible/managers/ReadingUrlPath";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe("AboutPage", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders the primer's headings and start-reading link", async () => {
    jsdom.reconfigure({ url: "https://example.com/en/about" });
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <AboutPage state={state} />
        </TestHost>,
        container
      );
    });

    expect(container.textContent).toContain("About the Seed Bible");
    expect(container.textContent).toContain("What is the Seed Bible?");
    expect(container.textContent).toContain("Why we're building it");
    expect(container.textContent).toContain("What it can do");

    const cta = container.querySelector(".sb-about-cta");
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe(
      buildReadingPath({
        language: "en",
        translationId: "AAB",
        bookId: "GEN",
        chapter: 1,
      })
    );
  });
});
