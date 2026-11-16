import { render } from "preact";
import { signal } from "@preact/signals";
import { act } from "preact/test-utils";
import { useReplyToLabel } from "@packages/seed-bible/seed-bible/components/Discover/useReplyToLabel";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  I18nProvider,
  createI18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers";

function Label(props: { authorId: string; login: LoginManager }) {
  return <span>{useReplyToLabel(props.authorId, props.login)}</span>;
}

describe("useReplyToLabel", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  /** Signed in as `me`, with each author's profile name as given. */
  function loginAs(me: string, names: Record<string, string>) {
    return {
      userId: signal(me),
      getUserProfile: vi.fn(async (userId: string) => ({
        name: names[userId] ?? "",
      })),
    } as unknown as LoginManager;
  }

  async function labelFor(authorId: string, login: LoginManager) {
    await act(async () => {
      render(
        <I18nProvider
          i18n={createI18nManager(createNavigationManager(), ["en"])}
        >
          <Label authorId={authorId} login={login} />
        </I18nProvider>,
        container
      );
    });
    // Lets the profile request settle, so a label is checked once it's known.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(login.getUserProfile).toHaveBeenCalledWith(authorId);
    return container.textContent;
  }

  // The profile cache is shared for the whole session, so each test uses
  // author ids no other test reads.
  it("names the author of someone else's note", async () => {
    const login = loginAs("me-1", { "reply-label-ana": "Ana" });

    expect(await labelFor("reply-label-ana", login)).toBe("Reply to Ana");
  });

  it("says just Reply for the user's own note, even though they have a name", async () => {
    const login = loginAs("reply-label-me", { "reply-label-me": "Me" });

    expect(await labelFor("reply-label-me", login)).toBe("Reply");
  });

  it("says just Reply when the author has no name", async () => {
    const login = loginAs("me-2", {});

    expect(await labelFor("reply-label-nameless", login)).toBe("Reply");
  });
});
