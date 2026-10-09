import { render } from "preact";
import { act } from "preact/test-utils";
import { AboutPage } from "@packages/seed-bible/seed-bible/components/AboutPage/AboutPage";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
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

  it("renders the intro, the mission and a card per feature under one page heading", async () => {
    jsdom.reconfigure({
      url: "https://example.com/en/about?useFreeBibleAPI=true",
    });
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <AboutPage state={state} />
        </TestHost>,
        container
      );
    });

    const content = container.querySelector(".sb-about-content")!;
    const headings = Array.from(content.querySelectorAll("h1, h2")).map(
      (heading) => [heading.tagName, heading.textContent]
    );
    expect(headings).toEqual([
      ["H1", "About the Seed Bible"],
      ["H2", "Why we're building it"],
      ["H2", "Read Together"],
      ["H2", "Playlists"],
      ["H2", "Sessions"],
      ["H2", "Shared Reading"],
      ["H2", "Notes & Highlights"],
    ]);
    expect(content.textContent).toContain(
      "A free Bible reading app that brings Scripture, study tools, and your own notes and highlights together in one place"
    );
    expect(content.textContent).toContain(
      "We believe everyone should be able to read and return to God's word without cost or friction."
    );
  });

  it("opens the Bible selector, bound to the current slot, when 'Open a passage' is clicked", async () => {
    jsdom.reconfigure({
      url: "https://example.com/en/about?useFreeBibleAPI=true",
    });
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <AboutPage state={state} />
        </TestHost>,
        container
      );
    });

    expect(state.selector.isOpen.value).toBe(false);

    const openPassageButton = Array.from(
      container.querySelectorAll(".sb-about-action-primary")
    )[0] as HTMLButtonElement;
    expect(openPassageButton.textContent).toContain("Open a passage");

    act(() => {
      openPassageButton.click();
    });

    // `setOpen` awaits a translation-catalog sync before flipping `isOpen`.
    await waitFor(() => state.selector.isOpen.value === true);
    expect(state.selector.slot.value).toBe(state.tabsLayout.slots.value[0]);
  });

  it("starts the in-app tutorial when the Tutorials button is clicked", async () => {
    jsdom.reconfigure({
      url: "https://example.com/en/about?useFreeBibleAPI=true",
    });
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <AboutPage state={state} />
        </TestHost>,
        container
      );
    });

    expect(state.tutorial.running.value).toBe(false);

    const tutorialsButton = Array.from(
      container.querySelectorAll("button.sb-about-action-secondary")
    ).find((el) => el.textContent?.includes("Tutorials")) as HTMLButtonElement;
    act(() => {
      tutorialsButton.click();
    });

    expect(state.tutorial.running.value).toBe(true);
  });

  it("renders the Donate, Join Discord and Release Notes buttons as external links", async () => {
    jsdom.reconfigure({
      url: "https://example.com/en/about?useFreeBibleAPI=true",
    });
    const state = await createTestSeedBibleState();

    act(() => {
      render(
        <TestHost state={state}>
          <AboutPage state={state} />
        </TestHost>,
        container
      );
    });

    const secondaryActions = Array.from(
      container.querySelectorAll(".sb-about-action-secondary")
    );
    const donate = secondaryActions.find((a) => a.textContent === "Donate");
    const discord = secondaryActions.find(
      (a) => a.textContent === "Join Discord"
    );
    const releaseNotes = secondaryActions.find((a) =>
      a.textContent?.includes("Release Notes")
    );

    expect(donate?.getAttribute("href")).toBe(
      "https://better.giving/marketplace/1118469"
    );
    expect(donate?.getAttribute("target")).toBe("_blank");
    expect(donate?.getAttribute("rel")).toBe("noopener noreferrer");

    expect(discord?.getAttribute("href")).toBe(
      "https://discord.com/invite/NbEZMCJmqC"
    );
    expect(discord?.getAttribute("target")).toBe("_blank");
    expect(discord?.getAttribute("rel")).toBe("noopener noreferrer");

    expect(releaseNotes?.getAttribute("href")).toBe(
      "https://github.com/HelloAOLab/seed-bible/blob/main/CHANGELOG.md"
    );
    expect(releaseNotes?.getAttribute("target")).toBe("_blank");
    expect(releaseNotes?.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
