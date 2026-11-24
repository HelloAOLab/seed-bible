import { render } from "preact";
import { act } from "preact/test-utils";
import { IconButton } from "@packages/seed-bible/seed-bible/components/IconButton/IconButton";
import { TooltipTrigger } from "@packages/seed-bible/seed-bible/components/TooltipTrigger/TooltipTrigger";

type PointerInit = {
  pointerType?: string;
  clientX?: number;
  clientY?: number;
};

function pointer(element: Element, type: string, init: PointerInit = {}) {
  act(() => {
    element.dispatchEvent(
      new PointerEvent(type, {
        pointerType: "mouse",
        bubbles: type !== "pointerenter" && type !== "pointerleave",
        ...init,
      })
    );
  });
}

const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

const tooltipText = () =>
  document.body.querySelector(".sb-tooltip")?.textContent ?? null;

// The "moving along a row" window is shared by the whole page, so each test
// starts its fake clock well after the previous test's tooltip went away.
let clock = 1_000_000;

describe("tooltips on icon buttons", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    clock += 60_000;
    vi.useFakeTimers({ now: clock });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
  });

  function renderButtons(onClick = vi.fn()) {
    act(() => {
      render(
        <div>
          <IconButton icon="bookmark" label="Bookmark" onClick={onClick} />
          <IconButton icon="share" label="Share" />
        </div>,
        container
      );
    });
    const buttons = container.querySelectorAll("button");
    return { first: buttons[0]!, second: buttons[1]!, onClick };
  }

  describe("with a mouse", () => {
    it("shows the label after a short rest, not straight away", () => {
      const { first } = renderButtons();

      pointer(first, "pointerenter");
      wait(300);
      expect(tooltipText()).toBeNull();

      wait(250);
      expect(tooltipText()).toBe("Bookmark");
    });

    it("never shows a label for a pointer that only passes over", () => {
      const { first } = renderButtons();

      pointer(first, "pointerenter");
      wait(300);
      pointer(first, "pointerleave");
      wait(1000);

      expect(tooltipText()).toBeNull();
    });

    it("hides the label when the pointer leaves", () => {
      const { first } = renderButtons();
      pointer(first, "pointerenter");
      wait(600);
      expect(tooltipText()).toBe("Bookmark");

      pointer(first, "pointerleave");

      expect(tooltipText()).toBeNull();
    });

    it("shows the next button's label at once while moving along a row", () => {
      const { first, second } = renderButtons();
      pointer(first, "pointerenter");
      wait(600);

      pointer(first, "pointerleave");
      pointer(second, "pointerenter");

      expect(tooltipText()).toBe("Share");
    });

    it("goes back to waiting once the pointer has been away a while", () => {
      const { first, second } = renderButtons();
      pointer(first, "pointerenter");
      wait(600);
      pointer(first, "pointerleave");
      wait(1000);

      pointer(second, "pointerenter");

      expect(tooltipText()).toBeNull();
      wait(600);
      expect(tooltipText()).toBe("Share");
    });

    it("hides the label on a click, which has answered the question", () => {
      const { first } = renderButtons();
      pointer(first, "pointerenter");
      wait(600);

      pointer(first, "pointerdown");

      expect(tooltipText()).toBeNull();
    });

    it("keeps the label out of the page's accessible text", () => {
      const { first } = renderButtons();
      pointer(first, "pointerenter");
      wait(600);

      expect(
        document.body.querySelector(".sb-tooltip [aria-hidden='true']")
      ).not.toBeNull();
      expect(first.getAttribute("aria-label")).toBe("Bookmark");
      expect(first.hasAttribute("aria-describedby")).toBe(false);
    });
  });

  describe("with the keyboard", () => {
    // jsdom decides :focus-visible from earlier simulated input, so a test's
    // answer would depend on the tests before it. A browser answers true for
    // Tab and arrow-key focus and false for focus from a click.
    function setFocusVisible(visible: boolean) {
      const matches = Element.prototype.matches;
      vi.spyOn(Element.prototype, "matches").mockImplementation(function (
        this: Element,
        selector: string
      ) {
        return selector === ":focus-visible"
          ? visible
          : matches.call(this, selector);
      });
    }

    afterEach(() => vi.restoreAllMocks());

    it("shows nothing for focus that came from a click or tap", () => {
      setFocusVisible(false);
      const { first } = renderButtons();

      act(() => first.focus());
      wait(1000);

      expect(tooltipText()).toBeNull();
    });

    it("shows the label after a short rest on a tabbed-to button, and hides it on Escape", () => {
      setFocusVisible(true);
      const { first } = renderButtons();
      act(() => first.focus());
      wait(600);
      expect(tooltipText()).toBe("Bookmark");

      act(() => {
        first.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });

      expect(tooltipText()).toBeNull();
    });

    it.each(["Enter", " "])(
      "hides the label when %j presses the button",
      (key) => {
        setFocusVisible(true);
        const { first } = renderButtons();
        act(() => first.focus());
        wait(600);
        expect(tooltipText()).toBe("Bookmark");

        act(() => {
          first.dispatchEvent(
            new KeyboardEvent("keydown", { key, bubbles: true })
          );
        });

        expect(tooltipText()).toBeNull();
      }
    );

    it("hides the label when focus moves away", () => {
      setFocusVisible(true);
      const { first, second } = renderButtons();
      act(() => first.focus());
      wait(600);
      expect(tooltipText()).toBe("Bookmark");

      act(() => second.focus());

      expect(
        [...document.body.querySelectorAll(".sb-tooltip")].map(
          (tip) => tip.textContent
        )
      ).not.toContain("Bookmark");
    });
  });

  describe("with a finger", () => {
    it("doesn't open the browser's own menu while the hold is still waiting", () => {
      const { first } = renderButtons();
      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(420);

      const menu = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
      });
      act(() => void first.dispatchEvent(menu));

      expect(menu.defaultPrevented).toBe(true);
    });

    it("leaves a mouse right-click's menu alone", () => {
      const { first } = renderButtons();

      const menu = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
      });
      act(() => void first.dispatchEvent(menu));

      expect(menu.defaultPrevented).toBe(false);
    });

    it("lets a keyboard press through shortly after a hold", () => {
      const { first, onClick } = renderButtons();
      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(550);
      pointer(first, "pointerup", { pointerType: "touch" });

      wait(400);
      act(() => first.click());

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("shows the label after holding, and the lift doesn't press the button", () => {
      const { first, onClick } = renderButtons();

      pointer(first, "pointerdown", {
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
      });
      wait(550);
      expect(tooltipText()).toBe("Bookmark");

      pointer(first, "pointerup", { pointerType: "touch" });
      act(() => first.click());

      expect(onClick).not.toHaveBeenCalled();
    });

    it("lets the next tap through after a hold", () => {
      const { first, onClick } = renderButtons();
      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(550);
      pointer(first, "pointerup", { pointerType: "touch" });
      act(() => first.click());

      pointer(first, "pointerdown", { pointerType: "touch" });
      pointer(first, "pointerup", { pointerType: "touch" });
      act(() => first.click());

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("keeps the label up for a moment after the finger lifts, then removes it", () => {
      const { first } = renderButtons();
      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(550);
      pointer(first, "pointerup", { pointerType: "touch" });

      wait(1000);
      expect(tooltipText()).toBe("Bookmark");
      wait(700);
      expect(tooltipText()).toBeNull();
    });

    it("treats a quick tap as a tap: no label, and the button works", () => {
      const { first, onClick } = renderButtons();

      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(150);
      pointer(first, "pointerup", { pointerType: "touch" });
      act(() => first.click());
      wait(1000);

      expect(tooltipText()).toBeNull();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("shows nothing for a finger that moves off to scroll", () => {
      const { first } = renderButtons();

      pointer(first, "pointerdown", {
        pointerType: "touch",
        clientX: 10,
        clientY: 10,
      });
      pointer(first, "pointermove", {
        pointerType: "touch",
        clientX: 10,
        clientY: 60,
      });
      wait(1000);

      expect(tooltipText()).toBeNull();
    });

    it("doesn't open the browser's own menu over a held button", () => {
      const { first } = renderButtons();
      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(550);

      const menu = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
      });
      act(() => void first.dispatchEvent(menu));

      expect(menu.defaultPrevented).toBe(true);
    });

    it("ignores the hover that a tap sends on some phones", () => {
      const { first } = renderButtons();

      pointer(first, "pointerenter", { pointerType: "touch" });
      wait(1000);

      expect(tooltipText()).toBeNull();
    });
  });

  describe("one label at a time", () => {
    it("takes the label that is up down when another button's label shows", () => {
      const { first, second } = renderButtons();
      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(550);
      pointer(first, "pointerup", { pointerType: "touch" });
      expect(tooltipText()).toBe("Bookmark");

      pointer(second, "pointerenter");
      wait(600);

      const labels = [...document.body.querySelectorAll(".sb-tooltip")].map(
        (tip) => tip.textContent
      );
      expect(labels).toEqual(["Share"]);
    });

    it("still makes the next button wait while an unrelated label is up", () => {
      const { first, second } = renderButtons();
      pointer(first, "pointerdown", { pointerType: "touch" });
      wait(550);
      pointer(first, "pointerup", { pointerType: "touch" });

      pointer(second, "pointerenter");
      wait(100);

      const labels = [...document.body.querySelectorAll(".sb-tooltip")].map(
        (tip) => tip.textContent
      );
      expect(labels).not.toContain("Share");
    });
  });

  describe("a button that becomes disabled", () => {
    function renderSend(disabled: boolean) {
      act(() => {
        render(
          <IconButton icon="send" label="Send" disabled={disabled} />,
          container
        );
      });
      return container.querySelector("button")!;
    }

    it("takes its label down when it turns disabled while the label shows", () => {
      const button = renderSend(false);
      pointer(button, "pointerenter");
      wait(600);
      expect(tooltipText()).toBe("Send");

      renderSend(true);

      expect(tooltipText()).toBeNull();
    });

    it("keeps the browser's own tooltip, not a styled one, while disabled", () => {
      const button = renderSend(true);

      pointer(button, "pointerenter");
      wait(600);
      pointer(button, "pointerdown", { pointerType: "touch" });
      wait(600);

      expect(tooltipText()).toBeNull();
      expect(button.getAttribute("title")).toBe("Send");
    });

    it("drops the browser title once it is enabled again", () => {
      renderSend(true);
      const button = renderSend(false);

      // An empty title shows nothing in a browser.
      expect(button.title).toBe("");
    });
  });

  describe("an icon button's other behavior", () => {
    it("still calls the caller's own handlers", () => {
      const onFocus = vi.fn();
      const onPointerEnter = vi.fn();
      act(() => {
        render(
          <IconButton
            icon="add"
            label="Add"
            onFocus={onFocus}
            onPointerEnter={onPointerEnter}
          />,
          container
        );
      });
      const button = container.querySelector("button")!;

      act(() => button.focus());
      pointer(button, "pointerenter");

      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onPointerEnter).toHaveBeenCalledTimes(1);
    });

    it("adds nothing to the page around the button", () => {
      renderButtons();

      expect(
        [...container.firstElementChild!.children].map((c) => c.tagName)
      ).toEqual(["BUTTON", "BUTTON"]);
    });

    it("removes the label if the button goes away while it shows", () => {
      const { first } = renderButtons();
      pointer(first, "pointerenter");
      wait(600);
      expect(tooltipText()).toBe("Bookmark");

      act(() => render(null, container));

      expect(tooltipText()).toBeNull();
    });
  });
});

describe("TooltipTrigger", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    clock += 60_000;
    vi.useFakeTimers({ now: clock });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
  });

  it("puts the label on a hand-built icon button and names it", () => {
    act(() => {
      render(
        <TooltipTrigger label="Close">
          <button className="mine">x</button>
        </TooltipTrigger>,
        container
      );
    });
    const button = container.querySelector("button")!;

    expect(button.getAttribute("aria-label")).toBe("Close");
    pointer(button, "pointerenter");
    wait(600);
    expect(tooltipText()).toBe("Close");
  });

  it("leaves a tap alone and shows nothing when there is no label to show", () => {
    const onClick = vi.fn();
    act(() => {
      render(
        <TooltipTrigger>
          <button onClick={onClick}>x</button>
        </TooltipTrigger>,
        container
      );
    });
    const button = container.querySelector("button")!;

    pointer(button, "pointerdown", { pointerType: "touch" });
    wait(800);
    pointer(button, "pointerup", { pointerType: "touch" });
    act(() => button.click());
    pointer(button, "pointerenter");
    wait(800);

    expect(tooltipText()).toBeNull();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps the wrapped element's conditional children where they were", () => {
    const view = (open: boolean) =>
      act(() => {
        render(
          <TooltipTrigger label="Go">
            <button>
              {open && <i className="badge" />}
              <i className="icon" />
            </button>
          </TooltipTrigger>,
          container
        );
      });
    view(false);
    const icon = container.querySelector(".icon");

    view(true);

    expect(container.querySelector(".badge")).not.toBeNull();
    expect(container.querySelector(".icon")).toBe(icon);
  });

  it("gives a disabled element the browser's tooltip instead of a styled one", () => {
    act(() => {
      render(
        <TooltipTrigger label="Go">
          <button disabled>x</button>
        </TooltipTrigger>,
        container
      );
    });
    const button = container.querySelector("button")!;

    pointer(button, "pointerenter");
    wait(600);

    expect(button.getAttribute("title")).toBe("Go");
    expect(tooltipText()).toBeNull();
  });

  it("keeps an accessible name the element already has", () => {
    act(() => {
      render(
        <TooltipTrigger label="Close">
          <button aria-label="Close this pane">x</button>
        </TooltipTrigger>,
        container
      );
    });

    expect(container.querySelector("button")!.getAttribute("aria-label")).toBe(
      "Close this pane"
    );
  });

  it("leaves the element's own handlers and classes alone and adds no wrapper", () => {
    const onClick = vi.fn();
    act(() => {
      render(
        <div id="row">
          <TooltipTrigger label="Close">
            <button className="mine" onClick={onClick}>
              x
            </button>
          </TooltipTrigger>
        </div>,
        container
      );
    });
    const row = container.querySelector("#row")!;
    const button = row.querySelector("button")!;

    act(() => button.click());

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button.className).toBe("mine");
    expect(row.children).toHaveLength(1);
  });
});
