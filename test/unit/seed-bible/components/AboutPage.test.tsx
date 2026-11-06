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

  it("renders each card's title with its own description, in reading order, under one page heading", async () => {
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

    const cards = Array.from(
      container.querySelectorAll(".sb-about-content .sb-about-card")
    ).map((card) => {
      const heading = card.querySelector("h1, h2")!;
      return [
        heading.tagName,
        heading.textContent,
        card.querySelector("p")?.textContent,
      ];
    });
    expect(cards).toEqual([
      [
        "H1",
        "About Seed Bible",
        "A Bible for those you do life with. Read and study Scripture together, online, on any device, in dozens of languages.",
      ],
      [
        "H2",
        "Why we're building it",
        "We believe access to God's Word should stay simple and dependable. Seed Bible is free forever, with no ads, no paywall, and nothing between you and Scripture.",
      ],
      [
        "H2",
        "Read Together",
        "Faith is meant to be lived together. Seed Bible is built for reading Scripture with your family, your closest friends, and your house church.",
      ],
      [
        "H2",
        "Playlists",
        "Gather passages, links, and videos into a path through Scripture to walk through or share.",
      ],
      [
        "H2",
        "Community Reading",
        "See which chapters your friends have been reading, and stay in the Word together, even on different schedules.",
      ],
      [
        "H2",
        "Sessions",
        "Read live with your group, wherever each of you is. Everyone follows along in their heart language.",
      ],
      [
        "H2",
        "Notes & Highlights",
        "Highlight what speaks to you and write down what you're learning. Your friends' notes show up right in the passage too.",
      ],
    ]);
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

  it("starts the in-app tutorial when the 'Take a tour' button is clicked", async () => {
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

    const tourButton = Array.from(
      container.querySelectorAll("button.sb-about-action-secondary")
    ).find((el) =>
      el.textContent?.includes("Take a tour")
    ) as HTMLButtonElement;
    act(() => {
      tourButton.click();
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
