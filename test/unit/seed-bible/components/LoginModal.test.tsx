import { render } from "preact";
import { act } from "preact/test-utils";
import { LoginModal } from "@packages/seed-bible/seed-bible/components/LoginModal/LoginModal";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe("LoginModal logo", () => {
  let container: HTMLDivElement;
  let restoreImage: (() => void) | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    restoreImage?.();
    render(null, container);
    container.remove();
  });

  function stubImageLoad(result: { complete: boolean; naturalWidth: number }) {
    restoreImage?.();
    const proto = HTMLImageElement.prototype;
    const completeDesc = Object.getOwnPropertyDescriptor(proto, "complete");
    const widthDesc = Object.getOwnPropertyDescriptor(proto, "naturalWidth");
    Object.defineProperty(proto, "complete", {
      configurable: true,
      get: () => result.complete,
    });
    Object.defineProperty(proto, "naturalWidth", {
      configurable: true,
      get: () => result.naturalWidth,
    });
    restoreImage = () => {
      if (completeDesc) {
        Object.defineProperty(proto, "complete", completeDesc);
      }
      if (widthDesc) {
        Object.defineProperty(proto, "naturalWidth", widthDesc);
      }
      restoreImage = null;
    };
  }

  async function renderOpenLogin() {
    const state = await createTestSeedBibleState();
    act(() => {
      state.login.isLoginOpen.value = true;
      render(
        <TestHost state={state}>
          <LoginModal login={state.login} navigation={state.navigation} />
        </TestHost>,
        container
      );
    });
  }

  function logoImage() {
    const img = container.querySelector<HTMLImageElement>(".sb-login-logo img");
    expect(img).not.toBeNull();
    return img!;
  }

  it("renders the Seed Bible logo without the broken fallback", async () => {
    stubImageLoad({ complete: true, naturalWidth: 3128 });
    await renderOpenLogin();

    const img = logoImage();
    expect(img.alt).toBe("Seed Bible");
    expect(img.parentElement?.classList.contains("is-broken")).toBe(false);
  });

  it("shows the alt text when the logo fails to load", async () => {
    stubImageLoad({ complete: false, naturalWidth: 0 });
    await renderOpenLogin();

    const img = logoImage();
    act(() => {
      img.dispatchEvent(new Event("error"));
    });

    expect(img.alt).toBe("Seed Bible");
    expect(img.parentElement?.classList.contains("is-broken")).toBe(true);
  });

  it("treats an image that already failed before the handler attached as broken", async () => {
    stubImageLoad({ complete: true, naturalWidth: 0 });
    await renderOpenLogin();

    const img = logoImage();
    expect(img.alt).toBe("Seed Bible");
    expect(img.parentElement?.classList.contains("is-broken")).toBe(true);
  });
});
