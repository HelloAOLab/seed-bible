import { render } from "preact";
import { act } from "preact/test-utils";
import { LoginModal } from "@packages/seed-bible/seed-bible/components/LoginModal/LoginModal";
import { YOUVERSION_OPEN_ID_PROVIDER } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  readPendingOpenIDLogin,
  writePendingOpenIDLogin,
} from "@packages/seed-bible/seed-bible/managers/OpenIDCallback";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Mock } from "vitest";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { pressAndRelease } from "../testUtils/pressAndRelease";
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

describe("LoginModal backdrop", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

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
    const overlay = container.querySelector<HTMLElement>(
      ".sb-footnote-modal-overlay"
    )!;
    const emailInput = container.querySelector<HTMLElement>(
      ".sb-login-modal input[type=email]"
    )!;
    expect(overlay).not.toBeNull();
    expect(emailInput).not.toBeNull();
    return { state, overlay, emailInput };
  }

  it("closes when the backdrop is clicked", async () => {
    const { state, overlay } = await renderOpenLogin();

    pressAndRelease(overlay, overlay);

    await vi.waitFor(() => expect(state.login.isLoginOpen.value).toBe(false));
  });

  it("stays open when a text selection in the email field is released over the backdrop", async () => {
    const { state, overlay, emailInput } = await renderOpenLogin();

    pressAndRelease(emailInput, overlay);
    await act(async () => {});

    expect(state.login.isLoginOpen.value).toBe(true);
    expect(container.querySelector(".sb-login-modal")).not.toBeNull();
  });
});

describe("LoginModal YouVersion sign-in", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let listOpenIDProviders: Mock;
  let requestOpenIDLogin: Mock;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    localStorage.removeItem("sb-openid-login-request");

    state = await createTestSeedBibleState();
    stubAuthServer(state);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    localStorage.removeItem("sb-openid-login-request");
  });

  function stubAuthServer(target: SeedBibleState) {
    listOpenIDProviders = vi.fn().mockResolvedValue({
      success: true,
      providers: [{ id: YOUVERSION_OPEN_ID_PROVIDER, name: "YouVersion" }],
    });
    requestOpenIDLogin = vi.fn().mockResolvedValue({
      success: true,
      // Same-page hash link: jsdom can follow it, unlike a real cross-site one.
      authorizationUrl: `${location.origin}${location.pathname}#youversion`,
      requestId: "oid-request-1",
    });
    Object.assign(target.os.client, {
      listOpenIDProviders,
      requestOpenIDLogin,
    });
  }

  function renderOpenModal(target: SeedBibleState = state) {
    target.login.isLoginOpen.value = true;
    act(() => {
      render(
        <TestHost state={target}>
          <LoginModal login={target.login} navigation={target.navigation} />
        </TestHost>,
        container
      );
    });
  }

  function youVersionButton(): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>(".sb-login-provider");
  }

  function errorText(): string | null | undefined {
    return container.querySelector(".sb-login-error")?.textContent;
  }

  function agreeToTerms() {
    const checkbox =
      container.querySelector<HTMLInputElement>("#sb-login-terms")!;
    act(() => {
      checkbox.click();
    });
  }

  it("offers YouVersion when the auth server has it configured", async () => {
    renderOpenModal();

    await waitFor(() => youVersionButton() !== null);
    expect(youVersionButton()?.textContent).toContain(
      "Continue with YouVersion"
    );
  });

  it("offers only email login when the server has no YouVersion provider", async () => {
    listOpenIDProviders.mockResolvedValue({ success: true, providers: [] });
    renderOpenModal();

    await waitFor(() => listOpenIDProviders.mock.calls.length > 0);
    await act(async () => {
      await Promise.resolve();
    });
    expect(youVersionButton()).toBeNull();
    expect(container.querySelector("#sb-login-email")).not.toBeNull();
  });

  it("offers only email login when the providers can't be loaded", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    listOpenIDProviders.mockRejectedValue(new TypeError("Failed to fetch"));
    renderOpenModal();

    await waitFor(() => warn.mock.calls.length > 0);
    expect(youVersionButton()).toBeNull();
    warn.mockRestore();
  });

  it("asks for the terms to be accepted before going to YouVersion", async () => {
    renderOpenModal();
    await waitFor(() => youVersionButton() !== null);

    act(() => {
      youVersionButton()!.click();
    });

    expect(requestOpenIDLogin).not.toHaveBeenCalled();
    expect(errorText()).toContain("agree to the terms");
  });

  it("saves the login request and heads to YouVersion", async () => {
    renderOpenModal();
    await waitFor(() => youVersionButton() !== null);
    agreeToTerms();

    act(() => {
      youVersionButton()!.click();
    });

    await waitFor(() => readPendingOpenIDLogin(localStorage) !== null);
    expect(requestOpenIDLogin).toHaveBeenCalledWith({
      provider: YOUVERSION_OPEN_ID_PROVIDER,
      comId: "seed-bible",
    });
    expect(readPendingOpenIDLogin(localStorage)?.requestId).toBe(
      "oid-request-1"
    );
    await waitFor(() => location.hash === "#youversion");
    expect(youVersionButton()?.textContent).toContain(
      "Redirecting to YouVersion"
    );
    expect(youVersionButton()?.disabled).toBe(true);
  });

  it("explains a refusal and lets the user try again", async () => {
    requestOpenIDLogin.mockResolvedValue({
      success: false,
      errorCode: "not_supported",
      errorMessage: "The given provider is not supported.",
    });
    renderOpenModal();
    await waitFor(() => youVersionButton() !== null);
    agreeToTerms();

    act(() => {
      youVersionButton()!.click();
    });

    await waitFor(() => errorText() != null);
    expect(errorText()).toContain("Something went wrong");
    expect(youVersionButton()?.disabled).toBe(false);
    expect(youVersionButton()?.textContent).toContain(
      "Continue with YouVersion"
    );
  });

  it("explains, on returning, that an email account already exists", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // What the callback page leaves when the auth server refuses the login.
    writePendingOpenIDLogin(localStorage, {
      requestId: "oid-request-1",
      returnUrl: "/",
      expireTimeMs: Date.now() + 60_000,
      error: {
        errorCode: "session_key_required_for_openid",
        errorMessage:
          "A valid session key is required to link this OpenID account to an existing user.",
      },
    });

    const returned = await createTestSeedBibleState();
    stubAuthServer(returned);
    expect(returned.login.isLoginOpen.value).toBe(true);
    renderOpenModal(returned);

    expect(errorText()).toContain("log in with your email address instead");
    // Shown once; it doesn't come back the next time the screen opens.
    expect(returned.login.openIDLoginError.value).toBeNull();
  });
});
