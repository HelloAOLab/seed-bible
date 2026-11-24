import { render } from "preact";
import { act } from "preact/test-utils";
import { useState } from "preact/hooks";
import {
  FilterPills,
  type FilterPillOption,
} from "@packages/seed-bible/seed-bible/components/FilterPills/FilterPills";

const OPTIONS: FilterPillOption<string>[] = [
  { value: "all", label: "All" },
  { value: "notes", label: "Notes" },
  { value: "cross-references", label: "Cross Refs" },
];

/** Holds the selection, as a real caller does. */
function Pills({
  options = OPTIONS,
  onChange,
}: {
  options?: FilterPillOption<string>[];
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState("all");
  return (
    <FilterPills
      aria-label="Filters"
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("FilterPills", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      render(null, container);
    });
    container.remove();
    vi.restoreAllMocks();
  });

  const pills = () =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
    );
  const pillLabels = () => pills().map((pill) => pill.textContent);

  describe("selection", () => {
    it("marks the selected pill and lets Tab reach only that one", () => {
      act(() => {
        render(<Pills />, container);
      });

      expect(pillLabels()).toEqual(["All", "Notes", "Cross Refs"]);
      expect(pills().map((pill) => pill.getAttribute("aria-selected"))).toEqual(
        ["true", "false", "false"]
      );
      expect(pills().map((pill) => pill.tabIndex)).toEqual([0, -1, -1]);
      expect(
        container.querySelector('[role="tablist"]')?.getAttribute("aria-label")
      ).toBe("Filters");
    });

    it("reports the picked option and moves the selection to it", () => {
      const onChange = vi.fn();
      act(() => {
        render(<Pills onChange={onChange} />, container);
      });

      act(() => {
        pills()[2]!.click();
      });

      expect(onChange).toHaveBeenCalledWith("cross-references");
      expect(
        container.querySelector(".sb-filter-pill--selected")?.textContent
      ).toBe("Cross Refs");
      expect(pills().map((pill) => pill.tabIndex)).toEqual([-1, -1, 0]);
    });

    it("lets the first pill take focus when no option matches the value", () => {
      act(() => {
        render(
          <FilterPills options={OPTIONS} value="gone" onChange={() => {}} />,
          container
        );
      });

      expect(pills().map((pill) => pill.tabIndex)).toEqual([0, -1, -1]);
      expect(container.querySelector(".sb-filter-pill--selected")).toBeNull();
    });
  });

  describe("keyboard", () => {
    const press = (key: string) => {
      act(() => {
        document.activeElement!.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
        );
      });
    };
    const focused = () => (document.activeElement as HTMLElement).textContent;

    it("moves focus with the arrow keys, Home and End without picking", () => {
      const onChange = vi.fn();
      act(() => {
        render(<Pills onChange={onChange} />, container);
      });
      pills()[0]!.focus();

      press("ArrowRight");
      expect(focused()).toBe("Notes");
      press("ArrowRight");
      press("ArrowRight");
      expect(focused()).toBe("All");
      press("ArrowLeft");
      expect(focused()).toBe("Cross Refs");
      press("Home");
      expect(focused()).toBe("All");
      press("End");
      expect(focused()).toBe("Cross Refs");

      expect(onChange).not.toHaveBeenCalled();
    });

    it("follows the reading direction in right-to-left", () => {
      act(() => {
        render(<Pills />, container);
      });
      container.querySelector<HTMLElement>(
        ".sb-filter-pills-row"
      )!.style.direction = "rtl";
      pills()[0]!.focus();

      press("ArrowLeft");
      expect(focused()).toBe("Notes");
    });
  });

  describe("scroll arrows", () => {
    const START_LABEL = "Scroll filters toward start";
    const END_LABEL = "Scroll filters toward end";

    function getRow() {
      const row = container.querySelector<HTMLElement>(".sb-filter-pills-row");
      expect(row).not.toBeNull();
      return row!;
    }

    function getArrow(label: string) {
      return container.querySelector<HTMLButtonElement>(
        `button[aria-label="${label}"]`
      );
    }

    function setDimension(
      element: HTMLElement,
      property: "scrollWidth" | "clientWidth" | "scrollLeft",
      value: number
    ) {
      Object.defineProperty(element, property, {
        configurable: true,
        writable: true,
        value,
      });
    }

    function setRect(element: HTMLElement, left: number, right: number) {
      vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
        x: left,
        y: 0,
        left,
        right,
        top: 0,
        bottom: 32,
        width: right - left,
        height: 32,
        toJSON: () => ({}),
      } as DOMRect);
    }

    function configureOverflow(row: HTMLElement) {
      const wrapper = row.parentElement!;
      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }

    function renderPills(options = OPTIONS) {
      act(() => {
        render(<Pills options={options} />, container);
      });
    }

    it("shows arrows when filters overflow and hides them when they fit", () => {
      renderPills();

      const row = getRow();
      const wrapper = row.parentElement!;

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(getArrow(START_LABEL)).not.toBeNull();
      expect(getArrow(END_LABEL)).not.toBeNull();

      setDimension(row, "scrollWidth", 100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(getArrow(START_LABEL)).toBeNull();
      expect(getArrow(END_LABEL)).toBeNull();
    });

    it("marks the arrow as disabled at the current scroll boundary", () => {
      renderPills();
      const row = getRow();
      configureOverflow(row);
      setDimension(row, "scrollLeft", 0);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(getArrow(START_LABEL)?.getAttribute("aria-disabled")).toBe("true");
      expect(getArrow(END_LABEL)?.getAttribute("aria-disabled")).toBe("false");
      setDimension(row, "scrollLeft", 140);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(getArrow(START_LABEL)?.getAttribute("aria-disabled")).toBe(
        "false"
      );
      expect(getArrow(END_LABEL)?.getAttribute("aria-disabled")).toBe("true");
    });

    it("fades only the edges the arrows can still scroll toward", () => {
      renderPills();
      const row = getRow();
      const fades = () => ({
        left: row.hasAttribute("data-fade-left"),
        right: row.hasAttribute("data-fade-right"),
      });
      configureOverflow(row);

      setDimension(row, "scrollLeft", 0);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(fades()).toEqual({ left: false, right: true });

      setDimension(row, "scrollLeft", 70);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(fades()).toEqual({ left: true, right: true });

      setDimension(row, "scrollLeft", 140);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(fades()).toEqual({ left: true, right: false });

      // In right-to-left the start is on the right.
      row.style.direction = "rtl";
      setDimension(row, "scrollLeft", 0);
      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });
      expect(fades()).toEqual({ left: true, right: false });
      expect(getArrow(START_LABEL)?.getAttribute("aria-disabled")).toBe("true");
    });

    it("rechecks the arrows when the options change but their count stays the same", () => {
      renderPills();

      const row = getRow();
      const wrapper = row.parentElement!;
      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(getArrow(END_LABEL)).not.toBeNull();

      // Set the new size on the existing row BEFORE rerendering; Preact
      // reuses it because its structure is unchanged.
      setDimension(row, "scrollWidth", 100);
      renderPills([
        OPTIONS[0]!,
        OPTIONS[1]!,
        { value: "content", label: "Content" },
      ]);

      expect(getRow()).toBe(row);
      expect(pillLabels()).toEqual(["All", "Notes", "Content"]);
      // No resize event here: the change of options must trigger the check.
      expect(getArrow(START_LABEL)).toBeNull();
      expect(getArrow(END_LABEL)).toBeNull();
    });

    it("marks the correct arrows as disabled at RTL scroll boundaries", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      act(() => {
        render(<Pills />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-filter-pills-row");
      expect(row).not.toBeNull();

      const rtlRow = row!;
      rtlRow.style.direction = "rtl";

      const wrapper = rtlRow.parentElement!;
      setDimension(rtlRow, "scrollWidth", 240);
      setDimension(rtlRow, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      // RTL start boundary.
      setDimension(rtlRow, "scrollLeft", 0);

      act(() => {
        rtlRow.dispatchEvent(new Event("scroll"));
      });

      expect(
        parent
          .querySelector<HTMLButtonElement>(
            `button[aria-label="${START_LABEL}"]`
          )
          ?.getAttribute("aria-disabled")
      ).toBe("true");

      expect(
        parent
          .querySelector<HTMLButtonElement>(`button[aria-label="${END_LABEL}"]`)
          ?.getAttribute("aria-disabled")
      ).toBe("false");

      // RTL end boundary: browsers can report a negative scrollLeft.
      setDimension(rtlRow, "scrollLeft", -140);

      act(() => {
        rtlRow.dispatchEvent(new Event("scroll"));
      });

      expect(
        parent
          .querySelector<HTMLButtonElement>(
            `button[aria-label="${START_LABEL}"]`
          )
          ?.getAttribute("aria-disabled")
      ).toBe("false");

      expect(
        parent
          .querySelector<HTMLButtonElement>(`button[aria-label="${END_LABEL}"]`)
          ?.getAttribute("aria-disabled")
      ).toBe("true");
    });
    it("keeps the active chip visible when the arrows first appear", () => {
      renderPills();

      const row = getRow();
      const activeChip = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      ).find((chip) => chip.textContent === "Cross Refs");

      expect(activeChip).toBeDefined();

      act(() => {
        activeChip!.click();
      });

      expect(getArrow(END_LABEL)).toBeNull();

      setRect(row, 0, 100);
      setRect(activeChip!, 120, 170);
      configureOverflow(row);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      expect(getArrow(END_LABEL)).not.toBeNull();

      const updatedActiveChip = getRow().querySelector<HTMLElement>(
        ".sb-filter-pill--selected"
      );

      expect(updatedActiveChip).not.toBeNull();
      expect(updatedActiveChip!.getAttribute("aria-selected")).toBe("true");
      expect(row.scrollLeft).toBeGreaterThan(0);
    });
    it("does not scroll when a faded arrow is clicked at the scroll boundary", () => {
      renderPills();

      const row = getRow();
      configureOverflow(row);

      const chips = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      );

      setRect(row, 0, 100);

      // Make a chip genuinely visible outside the row's left boundary.
      chips.forEach((chip, index) => {
        setRect(chip, -80 + index * 50, -40 + index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", 0);

      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });

      const startArrow = getArrow(START_LABEL);

      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).toBe("true");

      act(() => {
        startArrow!.click();
      });

      expect(scrollBy).not.toHaveBeenCalled();
    });
    it("updates arrow state when the parent direction changes from LTR to RTL", () => {
      const parent = document.createElement("div");
      parent.dir = "ltr";
      container.appendChild(parent);

      const renderInParent = () => {
        act(() => {
          render(<Pills />, parent);
        });
      };

      renderInParent();

      const row = parent.querySelector<HTMLElement>(".sb-filter-pills-row")!;
      const wrapper = row.parentElement!;

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      parent.dir = "rtl";
      row.style.direction = "rtl";

      setDimension(row, "scrollLeft", -140);

      renderInParent();

      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });

      const startArrow = parent.querySelector<HTMLButtonElement>(
        `button[aria-label="${START_LABEL}"]`
      );

      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).not.toBe("true");
    });
    it("scrolls the selected pill into view when the options change", () => {
      renderPills();

      const row = getRow();
      const selected = row.querySelector<HTMLElement>(
        ".sb-filter-pill--selected"
      );
      expect(selected).not.toBeNull();

      setDimension(row, "scrollLeft", 0);
      setRect(row, 0, 100);
      setRect(selected!, 120, 160);

      renderPills([
        OPTIONS[0]!,
        OPTIONS[1]!,
        { value: "content", label: "Content" },
      ]);

      expect(row.scrollLeft).toBeGreaterThan(0);
    });

    it("scrolls toward the end when the end arrow is clicked in LTR", () => {
      renderPills();
      const row = getRow();
      configureOverflow(row);
      setRect(row, 0, 100);
      const chips = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      );
      // Place chips beyond the row's right edge.
      chips.forEach((chip, index) => {
        setRect(chip, index * 60, index * 60 + 50);
      });
      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;
      const endArrow = getArrow(END_LABEL);
      expect(endArrow).not.toBeNull();
      act(() => {
        endArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeGreaterThan(0);
    });

    it("scrolls toward the start when the start arrow is clicked in LTR", () => {
      renderPills();

      const row = getRow();
      configureOverflow(row);

      const pills = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      );

      setRect(row, 0, 100);
      pills.forEach((pill, index) => {
        setRect(pill, -50 + index * 50, -10 + index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", 100);

      act(() => {
        row.dispatchEvent(new Event("scroll"));
      });

      const startArrow = getArrow(START_LABEL);
      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).toBe("false");

      act(() => {
        startArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeLessThan(0);
    });

    it("scrolls toward the end when the end arrow is clicked in RTL", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      act(() => {
        render(<Pills />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-filter-pills-row")!;
      const wrapper = row.parentElement!;
      row.style.direction = "rtl";

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      const pills = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      );

      setRect(row, 0, 100);
      pills.forEach((pill, index) => {
        setRect(pill, -50 - index * 50, 10 - index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", 0);

      act(() => {
        window.dispatchEvent(new Event("resize"));
        row.dispatchEvent(new Event("scroll"));
      });

      const endArrow = parent.querySelector<HTMLButtonElement>(
        `button[aria-label="${END_LABEL}"]`
      );

      expect(endArrow).not.toBeNull();
      expect(endArrow!.getAttribute("aria-disabled")).toBe("false");

      act(() => {
        endArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeLessThan(0);
    });

    it("scrolls toward the start when the start arrow is clicked in RTL", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      act(() => {
        render(<Pills />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-filter-pills-row")!;
      const wrapper = row.parentElement!;
      row.style.direction = "rtl";

      setDimension(row, "scrollWidth", 240);
      setDimension(row, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      const pills = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      );

      setRect(row, 0, 100);
      pills.forEach((pill, index) => {
        setRect(pill, 110 + index * 50, 150 + index * 50);
      });

      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;

      setDimension(row, "scrollLeft", -100);

      act(() => {
        window.dispatchEvent(new Event("resize"));
        row.dispatchEvent(new Event("scroll"));
      });

      const startArrow = parent.querySelector<HTMLButtonElement>(
        `button[aria-label="${START_LABEL}"]`
      );

      expect(startArrow).not.toBeNull();
      expect(startArrow!.getAttribute("aria-disabled")).toBe("false");

      act(() => {
        startArrow!.click();
      });

      expect(scrollBy).toHaveBeenCalledTimes(1);
      expect(scrollBy.mock.calls[0]![0].left).toBeGreaterThan(0);
    });

    it("scrolls in the correct direction in RTL layout", () => {
      const parent = document.createElement("div");
      parent.dir = "rtl";
      container.appendChild(parent);

      act(() => {
        render(<Pills />, parent);
      });

      const row = parent.querySelector<HTMLElement>(".sb-filter-pills-row");
      expect(row).not.toBeNull();

      const rtlRow = row!;
      rtlRow.style.direction = "rtl";

      const wrapper = rtlRow.parentElement!;
      setDimension(rtlRow, "scrollWidth", 240);
      setDimension(rtlRow, "clientWidth", 100);
      setDimension(wrapper, "clientWidth", 100);

      const chips = Array.from(
        rtlRow.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      );

      expect(chips.length).toBeGreaterThan(0);

      // In RTL, the next chip toward the end is clipped on the left.
      setRect(rtlRow, 0, 100);
      setRect(chips[0]!, -40, 0);

      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      const scrollBy = vi.fn();
      rtlRow.scrollBy = scrollBy;

      act(() => {
        parent
          .querySelector<HTMLButtonElement>(
            `button[aria-label="${END_LABEL}"]`
          )!
          .dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });

      expect(scrollBy).toHaveBeenCalledWith(
        expect.objectContaining({ left: -40 })
      );
    });

    // The scroll is smooth, so a second click lands while the row hasn't
    // moved yet (the mocked `scrollBy` never moves it). It must step on from
    // where the first click is headed, not pick the same pill again.
    it("steps on another pill when the arrow is clicked again mid-scroll", () => {
      renderPills();
      const row = getRow();
      configureOverflow(row);
      setRect(row, 0, 100);
      const chips = Array.from(
        row.querySelectorAll<HTMLButtonElement>(".sb-filter-pill")
      );
      chips.forEach((chip, index) => {
        setRect(chip, index * 60, index * 60 + 50);
      });
      const scrollBy = vi.fn();
      row.scrollBy = scrollBy;
      const endArrow = getArrow(END_LABEL)!;

      act(() => endArrow.click());
      act(() => endArrow.click());

      // First click brings the second pill's end (110) to the edge (100);
      // the second, from there, brings the third's end (170) to it.
      expect(scrollBy.mock.calls.map(([options]) => options.left)).toEqual([
        10, 70,
      ]);
    });
  });
});
