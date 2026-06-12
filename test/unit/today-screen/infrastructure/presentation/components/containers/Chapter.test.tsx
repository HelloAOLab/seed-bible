import { render } from "preact";
import { act } from "preact/test-utils";
import {
  Chapter,
  type Props,
} from "todayScreen.infrastructure.presentation.components.containers.Chapter";

type UserData = Props["usersData"][number];

const MaterialIcon = ({
  children,
  className,
}: {
  children: string;
  className?: string;
}) => <span className={`material-icon ${className ?? ""}`}>{children}</span>;

function makeUser(overrides: Partial<UserData> = {}): UserData {
  return {
    name: "Alice",
    pictureUrl: undefined,
    color: "rgb(10, 20, 30)",
    icon: "person",
    MaterialIcon,
    ...overrides,
  };
}

describe("Chapter", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(props: Partial<Props> = {}) {
    const fullProps: Props = {
      number: 1,
      usersData: [],
      handleClick: jest.fn(),
      ...props,
    };
    act(() => render(<Chapter {...fullProps} />, container));
    return fullProps;
  }

  function chapterEl() {
    return container.querySelector<HTMLDivElement>(".filtered-reading-chapter");
  }

  function iconDivs() {
    // .filtered-reading-chapter > div (wrapper) > div (Icon) ...
    const wrapper = chapterEl()!.querySelector(":scope > div");
    return wrapper
      ? Array.from(wrapper.querySelectorAll<HTMLDivElement>(":scope > div"))
      : [];
  }

  describe("structure", () => {
    it("renders the chapter number", () => {
      setup({ number: 42 });
      expect(chapterEl()!.textContent).toBe("42");
    });

    it("does not add the highlighted class or icons when there are no users", () => {
      setup({ usersData: [] });
      expect(chapterEl()!.className).not.toContain(
        "filtered-reading-chapter-highlighted"
      );
      expect(chapterEl()!.querySelector(":scope > div")).toBeNull();
    });

    it("adds the highlighted class and an icons wrapper when there are users", () => {
      setup({ usersData: [makeUser()] });
      expect(chapterEl()!.className).toContain(
        "filtered-reading-chapter-highlighted"
      );
      expect(chapterEl()!.querySelector(":scope > div")).not.toBeNull();
    });

    it("renders one icon per user", () => {
      setup({
        usersData: [makeUser(), makeUser({ name: "Bob" }), makeUser()],
      });
      expect(iconDivs()).toHaveLength(3);
    });
  });

  describe("user icon rendering", () => {
    it("renders the MaterialIcon with the icon name and a colored background when there is no picture", () => {
      setup({ usersData: [makeUser({ icon: "star", color: "rgb(1, 2, 3)" })] });
      const icon = iconDivs()[0]!;
      expect(icon.style.backgroundColor).toBe("rgb(1, 2, 3)");
      const materialIcon = icon.querySelector(".material-icon");
      expect(materialIcon).not.toBeNull();
      expect(materialIcon!.textContent).toBe("star");
      expect(icon.querySelector("img")).toBeNull();
    });

    it("renders an img (and no background color) when the user has a picture", () => {
      setup({
        usersData: [makeUser({ pictureUrl: "https://example.com/a.png" })],
      });
      const icon = iconDivs()[0]!;
      expect(icon.style.backgroundColor).toBe("");
      const img = icon.querySelector("img");
      expect(img).not.toBeNull();
      expect(img!.getAttribute("src")).toBe("https://example.com/a.png");
      expect(icon.querySelector(".material-icon")).toBeNull();
    });

    it("renders a mix of picture and icon users", () => {
      setup({
        usersData: [
          makeUser({ pictureUrl: "https://example.com/a.png" }),
          makeUser({ icon: "face" }),
        ],
      });
      const icons = iconDivs();
      expect(icons[0]!.querySelector("img")).not.toBeNull();
      expect(icons[1]!.querySelector(".material-icon")!.textContent).toBe(
        "face"
      );
    });
  });

  describe("interaction", () => {
    it("calls handleClick when the chapter is clicked", () => {
      const props = setup({ usersData: [] });
      act(() => chapterEl()!.click());
      expect(props.handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
