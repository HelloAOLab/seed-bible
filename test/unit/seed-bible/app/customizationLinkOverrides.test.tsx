import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  applyCustomizationLinkOverride,
  useCustomizationLinkOverrides,
  FAVICON_LINK_REL,
  APPLE_TOUCH_ICON_LINK_REL,
} from "@packages/seed-bible/seed-bible/app/customizationLinkOverrides";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

const TEST_REL = "sb-test-icon";

function appendDefaultLink(rel: string, href: string): HTMLLinkElement {
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  document.head.appendChild(link);
  return link;
}

describe("applyCustomizationLinkOverride", () => {
  afterEach(() => {
    document
      .querySelectorAll(`link[rel="${TEST_REL}"]`)
      .forEach((el) => el.remove());
  });

  it("is a no-op when no link with that rel exists", () => {
    expect(() =>
      applyCustomizationLinkOverride(TEST_REL, "https://a.example/logo.png")
    ).not.toThrow();
    expect(document.querySelector(`link[rel="${TEST_REL}"]`)).toBeNull();
  });

  it("updates the existing link's href in place, never adding a second one of the same rel", () => {
    const original = appendDefaultLink(TEST_REL, "/default.ico");

    applyCustomizationLinkOverride(TEST_REL, "https://a.example/logo.png");

    const matches = document.querySelectorAll(`link[rel="${TEST_REL}"]`);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toBe(original);
    expect((matches[0] as HTMLLinkElement).href).toBe(
      "https://a.example/logo.png"
    );
  });

  it("restores the original default href when url is null", () => {
    appendDefaultLink(TEST_REL, "/default.ico");

    applyCustomizationLinkOverride(TEST_REL, "https://a.example/logo.png");
    applyCustomizationLinkOverride(TEST_REL, null);

    const link = document.querySelector(
      `link[rel="${TEST_REL}"]`
    ) as HTMLLinkElement;
    expect(link.href).toContain("/default.ico");
  });
});

describe("useCustomizationLinkOverrides", () => {
  let container: HTMLDivElement;
  let faviconLink: HTMLLinkElement;
  let touchIconLink: HTMLLinkElement;

  function TestHost({ state }: { state: SeedBibleState }) {
    useCustomizationLinkOverrides(state);
    return null;
  }

  function mountWithLogo(logoUrl: string | null) {
    const customizationLogoUrl = signal(logoUrl);
    const state = {
      app: { customizationLogoUrl },
    } as unknown as SeedBibleState;

    act(() => {
      render(<TestHost state={state} />, container);
    });

    // Returned separately from `state`, whose `customizationLogoUrl` is typed
    // as a `ReadonlySignal` — this is the same underlying signal, just with
    // its `.value` writable for the test to drive.
    return customizationLogoUrl;
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    // Stands in for index.html's real default `<link>` elements — the
    // invariant `stripDefaultFaviconLinks`/this hook both rely on is that
    // exactly one of each already exists in the document.
    faviconLink = appendDefaultLink(
      FAVICON_LINK_REL,
      "/standalone/img/favicon.ico"
    );
    touchIconLink = appendDefaultLink(
      APPLE_TOUCH_ICON_LINK_REL,
      "/standalone/img/apple-touch-icon.png"
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    faviconLink.remove();
    touchIconLink.remove();
  });

  it("leaves the default favicon/apple-touch-icon alone when no customization logo is active", () => {
    mountWithLogo(null);

    expect(faviconLink.href).toContain("/standalone/img/favicon.ico");
    expect(touchIconLink.href).toContain(
      "/standalone/img/apple-touch-icon.png"
    );
    expect(
      document.querySelectorAll(`link[rel="${FAVICON_LINK_REL}"]`)
    ).toHaveLength(1);
  });

  // Reproduces the editor-preview gap from the review: opening your own
  // customization with an uploaded logo updates `customizationLogoUrl`
  // reactively, but nothing used to apply that to the DOM on the client —
  // the tab icon stayed whatever the served HTML had. This proves the tab
  // icon now tracks it live, the same way `document.title` already does —
  // and that it's a true replacement (one element, href swapped), not a
  // second link added alongside the default.
  it("replaces the default favicon and apple-touch-icon once a customization logo becomes active", () => {
    const customizationLogoUrl = mountWithLogo(null);

    act(() => {
      customizationLogoUrl.value = "https://example.com/logo.png";
    });

    expect(
      document.querySelectorAll(`link[rel="${FAVICON_LINK_REL}"]`)
    ).toHaveLength(1);
    expect(faviconLink.href).toBe("https://example.com/logo.png");
    expect(
      document.querySelectorAll(`link[rel="${APPLE_TOUCH_ICON_LINK_REL}"]`)
    ).toHaveLength(1);
    expect(touchIconLink.href).toBe("https://example.com/logo.png");
  });

  it("updates in place when the active logo changes (e.g. editing a different customization)", () => {
    const customizationLogoUrl = mountWithLogo("https://example.com/first.png");

    act(() => {
      customizationLogoUrl.value = "https://example.com/second.png";
    });

    expect(
      document.querySelectorAll(`link[rel="${FAVICON_LINK_REL}"]`)
    ).toHaveLength(1);
    expect(faviconLink.href).toBe("https://example.com/second.png");
  });

  it("restores the site default when the customization becomes inactive again", () => {
    const customizationLogoUrl = mountWithLogo("https://example.com/logo.png");
    expect(faviconLink.href).toBe("https://example.com/logo.png");

    act(() => {
      customizationLogoUrl.value = null;
    });

    expect(faviconLink.href).toContain("/standalone/img/favicon.ico");
    expect(touchIconLink.href).toContain(
      "/standalone/img/apple-touch-icon.png"
    );
  });
});
