import { render } from "preact";
import { act } from "preact/test-utils";
import { LoginModal } from "@packages/seed-bible/seed-bible/components/LoginModal/LoginModal";
import { YOUVERSION_OPEN_ID_PROVIDER } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { Mock } from "vitest";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe("LoginModal", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let listOpenIDProviders: Mock;
  let requestOpenIDLogin: Mock;
  let completeOAuthLogin: Mock;
  let openSpy: Mock;
  let popup: { closed: boolean; close: () => void; location: { href: string } };

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    state = await createTestSeedBibleState();

    listOpenIDProviders = vi.fn().mockResolvedValue({
      success: true,
      providers: [{ id: YOUVERSION_OPEN_ID_PROVIDER, name: "YouVersion" }],
    });
    requestOpenIDLogin = vi.fn().mockResolvedValue({
      success: true,
      authorizationUrl: "https://login.youversion.com/authorize",
      requestId: "oid-request-1",
    });
    completeOAuthLogin = vi.fn().mockResolvedValue({
      success: false,
      errorCode: "not_completed",
      errorMessage: "The login request has not been completed.",
    });
    Object.assign(state.os.client, {
      listOpenIDProviders,
      requestOpenIDLogin,
      completeOAuthLogin,
    });

    popup = {
      closed: false,
      close() {
        this.closed = true;
      },
      location: { href: "" },
    };
    openSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => popup as unknown as Window) as Mock;
  });

  afterEach(() => {
    openSpy.mockRestore();
    render(null, container);
    container.remove();
  });

  function renderOpenModal() {
    state.login.isLoginOpen.value = true;
    act(() => {
      render(
        <TestHost state={state}>
          <LoginModal login={state.login} navigation={state.navigation} />
        </TestHost>,
        container
      );
    });
  }

  function youVersionButton(): HTMLButtonElement | null {
    return container.querySelector<HTMLButtonElement>(".sb-login-provider");
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

  it("asks for the terms to be accepted before opening YouVersion", async () => {
    renderOpenModal();
    await waitFor(() => youVersionButton() !== null);

    act(() => {
      youVersionButton()!.click();
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(container.querySelector(".sb-login-error")?.textContent).toContain(
      "agree to the terms"
    );
  });

  it("opens YouVersion's sign-in page and waits for it", async () => {
    renderOpenModal();
    await waitFor(() => youVersionButton() !== null);
    agreeToTerms();

    act(() => {
      youVersionButton()!.click();
    });

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(requestOpenIDLogin).toHaveBeenCalledWith({
      provider: YOUVERSION_OPEN_ID_PROVIDER,
    });
    await waitFor(
      () => popup.location.href === "https://login.youversion.com/authorize"
    );
    expect(youVersionButton()?.textContent).toContain("Waiting for YouVersion");
    expect(youVersionButton()?.disabled).toBe(true);

    // Dismissing the login screen abandons the attempt.
    await act(async () => {
      await state.login.cancelLogin();
    });
    expect(popup.closed).toBe(true);
  });

  it("explains a blocked sign-in window", async () => {
    openSpy.mockImplementation(() => null);
    renderOpenModal();
    await waitFor(() => youVersionButton() !== null);
    agreeToTerms();

    act(() => {
      youVersionButton()!.click();
    });

    await waitFor(() => container.querySelector(".sb-login-error") !== null);
    expect(container.querySelector(".sb-login-error")?.textContent).toContain(
      "allow pop-ups"
    );
    expect(youVersionButton()?.disabled).toBe(false);
  });

  it("explains that an email account already exists", async () => {
    completeOAuthLogin.mockResolvedValue({
      success: false,
      errorCode: "session_key_required_for_openid",
      errorMessage:
        "A valid session key is required to link this OpenID account to an existing user.",
    });
    renderOpenModal();
    await waitFor(() => youVersionButton() !== null);
    agreeToTerms();

    act(() => {
      youVersionButton()!.click();
    });

    await waitFor(
      () => container.querySelector(".sb-login-error") !== null,
      5000
    );
    expect(container.querySelector(".sb-login-error")?.textContent).toContain(
      "log in with your email address instead"
    );
  });
});
