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

  it("renders the letter's copy and inline links", async () => {
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

    expect(container.textContent).toContain("About Seed Bible");
    expect(container.textContent).toContain(
      "Seed Bible is a Bible for building a life in Scripture"
    );
    expect(container.textContent).toContain(
      "Seed Bible is built and maintained by AO Lab"
    );
    expect(container.textContent).toContain("Thank you!");
    expect(container.textContent).toContain("In Christ alone,");
    expect(container.textContent).toContain("The AO Lab Team");

    const releaseNotesLink = Array.from(container.querySelectorAll("a")).find(
      (a) => a.textContent === "latest release notes"
    );
    expect(releaseNotesLink?.getAttribute("href")).toBe(
      "https://github.com/HelloAOLab/seed-bible/blob/main/CHANGELOG.md"
    );
    expect(releaseNotesLink?.getAttribute("target")).toBe("_blank");
    expect(releaseNotesLink?.getAttribute("rel")).toBe("noopener noreferrer");

    const tutorialsButton = Array.from(
      container.querySelectorAll(".sb-about-inline-action")
    ).find((el) => el.textContent === "tutorials");
    expect(tutorialsButton).toBeDefined();
  });

  it("starts the in-app tutorial when the inline tutorials link is clicked", async () => {
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

    const tutorialsButton = container.querySelector(
      ".sb-about-inline-action"
    ) as HTMLButtonElement;
    act(() => {
      tutorialsButton.click();
    });

    expect(state.tutorial.running.value).toBe(true);
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
    expect(openPassageButton.textContent).toBe("Open a passage");

    act(() => {
      openPassageButton.click();
    });

    // `setOpen` awaits a translation-catalog sync before flipping `isOpen`.
    await waitFor(() => state.selector.isOpen.value === true);
    expect(state.selector.slot.value).toBe(state.tabsLayout.slots.value[0]);
  });

  it("renders the Donate and Join Discord buttons as external links", async () => {
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
  });
});
