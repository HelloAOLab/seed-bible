import { render } from "preact";
import { act } from "preact/test-utils";
import { useAnnotationAuthorProfile } from "@packages/seed-bible/seed-bible/components/Discover/useAnnotationAuthorProfile";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";

type Profile = { name?: string; pictureUrl?: string | null };

function Author(props: { userId: string; login: LoginManager }) {
  const { name, pictureUrl } = useAnnotationAuthorProfile(
    props.userId,
    props.login
  );
  return (
    <span data-picture={pictureUrl.value ?? ""}>{name.value || "(none)"}</span>
  );
}

describe("useAnnotationAuthorProfile", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const shown = () => container.querySelector("span");

  async function renderAuthor(userId: string, login: LoginManager) {
    await act(async () => {
      render(<Author userId={userId} login={login} />, container);
    });
  }

  // The profile cache is shared by every caller for the whole session, so each
  // test uses author ids no other test reads.
  it("stops showing the previous author once it's given one without a name", async () => {
    const profiles: Record<string, Profile> = {
      "author-with-name": {
        name: "Ana",
        pictureUrl: "https://example.com/a.png",
      },
      "author-without-name": { name: "" },
    };
    const login = {
      getUserProfile: vi.fn(async (userId: string) => profiles[userId]),
    } as unknown as LoginManager;

    await renderAuthor("author-with-name", login);
    expect(shown()?.textContent).toBe("Ana");
    expect(shown()?.dataset.picture).toBe("https://example.com/a.png");

    await renderAuthor("author-without-name", login);

    expect(shown()?.textContent).toBe("(none)");
    expect(shown()?.dataset.picture).toBe("");
  });

  it("asks again for an author whose profile couldn't be read", async () => {
    const getUserProfile = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ name: "Carla" });
    const login = { getUserProfile } as unknown as LoginManager;

    await renderAuthor("author-read-once-offline", login);
    expect(shown()?.textContent).toBe("(none)");

    render(null, container);
    await renderAuthor("author-read-once-offline", login);

    expect(shown()?.textContent).toBe("Carla");
    expect(getUserProfile).toHaveBeenCalledTimes(2);
  });

  it("reads each author's profile once for every row that shows them", async () => {
    const getUserProfile = vi.fn(async () => ({ name: "Dana" }));
    const login = { getUserProfile } as unknown as LoginManager;

    await renderAuthor("author-on-many-rows", login);
    render(null, container);
    await renderAuthor("author-on-many-rows", login);

    expect(shown()?.textContent).toBe("Dana");
    expect(getUserProfile).toHaveBeenCalledTimes(1);
  });
});
