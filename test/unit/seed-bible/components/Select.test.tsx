import { render } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import {
  Select,
  SelectField,
} from "@packages/seed-bible/seed-bible/components/Select/Select";
import { SearchableSelect } from "@packages/seed-bible/seed-bible/components/SearchableSelect/SearchableSelect";

describe("Select", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function dropdown() {
    return container.querySelector("select")!;
  }

  function choose(value: string) {
    act(() => {
      dropdown().value = value;
      dropdown().dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  const sizes = (
    <>
      <option value="small">Small</option>
      <option value="medium">Medium</option>
      <option value="large">Large</option>
    </>
  );

  it("shows the chosen option and hands over a newly chosen value", () => {
    function Size() {
      const [size, setSize] = useState("medium");
      return (
        <>
          <Select aria-label="UI size" value={size} onValueChange={setSize}>
            {sizes}
          </Select>
          <output>{size}</output>
        </>
      );
    }
    act(() => {
      render(<Size />, container);
    });
    expect(dropdown().value).toBe("medium");

    choose("large");

    expect(container.querySelector("output")!.textContent).toBe("large");
    expect(dropdown().value).toBe("large");
  });

  it("still calls a native onChange with the event", () => {
    const onChange = vi.fn();
    const onValueChange = vi.fn();
    act(() => {
      render(
        <Select
          aria-label="UI size"
          value="small"
          onChange={onChange}
          onValueChange={onValueChange}
        >
          {sizes}
        </Select>,
        container
      );
    });

    choose("large");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0]).toBeInstanceOf(Event);
    expect(onValueChange).toHaveBeenCalledWith("large");
  });

  it("offers every option it's given, including grouped ones", () => {
    act(() => {
      render(
        <Select aria-label="Font" value="serif">
          <option value="default">Default</option>
          <optgroup label="Serif">
            <option value="serif">Georgia</option>
            <option value="garamond">Garamond</option>
          </optgroup>
        </Select>,
        container
      );
    });

    expect(
      Array.from(dropdown().options).map((option) => option.textContent)
    ).toEqual(["Default", "Georgia", "Garamond"]);
    expect(container.querySelector("optgroup")!.label).toBe("Serif");
  });

  it("can stand alone, named by an aria-label", () => {
    act(() => {
      render(
        <Select aria-label="Book order" value="tanakh">
          <option value="traditional">Traditional</option>
          <option value="tanakh">Tanakh</option>
        </Select>,
        container
      );
    });

    expect(container.querySelector("label")).toBeNull();
    expect(dropdown().getAttribute("aria-label")).toBe("Book order");
  });

  it("tells screen readers when its choice is wrong", () => {
    act(() => {
      render(
        <Select aria-label="Size" invalid value="small">
          {sizes}
        </Select>,
        container
      );
    });

    expect(dropdown().getAttribute("aria-invalid")).toBe("true");
  });

  it("doesn't change while disabled", () => {
    const onValueChange = vi.fn();
    act(() => {
      render(
        <Select
          aria-label="Size"
          value="small"
          disabled
          onValueChange={onValueChange}
        >
          {sizes}
        </Select>,
        container
      );
    });

    expect(dropdown().disabled).toBe(true);
  });

  it("puts className on the element around the dropdown, for placement", () => {
    act(() => {
      render(
        <Select aria-label="Size" className="sb-place-me" value="small">
          {sizes}
        </Select>,
        container
      );
    });

    expect(container.firstElementChild!.classList.contains("sb-place-me")).toBe(
      true
    );
    expect(dropdown().classList.contains("sb-place-me")).toBe(false);
  });

  it("hands an inline selectRef the element once, though it's a new function each render", () => {
    const received: (HTMLSelectElement | null)[] = [];
    function Parent(props: { count: number }) {
      return (
        <Select
          aria-label={`Size ${props.count}`}
          value="small"
          selectRef={(element) => {
            received.push(element);
          }}
        >
          {sizes}
        </Select>
      );
    }
    act(() => {
      render(<Parent count={1} />, container);
    });
    act(() => {
      render(<Parent count={2} />, container);
    });

    expect(received).toEqual([dropdown()]);
  });
});

describe("SelectField", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function dropdown() {
    return container.querySelector("select")!;
  }

  function description() {
    return (dropdown().getAttribute("aria-describedby") ?? "")
      .split(" ")
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent)
      .join(" | ");
  }

  const options = (
    <>
      <option value="everyone">Everyone</option>
      <option value="hosts-only">Hosts only</option>
    </>
  );

  it("is named by its label, which controls the dropdown", () => {
    act(() => {
      render(
        <SelectField label="Viewing areas" value="everyone">
          {options}
        </SelectField>,
        container
      );
    });

    expect(dropdown().labels?.[0]?.textContent).toBe("Viewing areas");
    expect(dropdown().labels![0]!.control).toBe(dropdown());
  });

  it("reads a hint out with the dropdown", () => {
    act(() => {
      render(
        <SelectField
          label="Viewing areas"
          hint="Hosts only hides the other bars"
          value="everyone"
        >
          {options}
        </SelectField>,
        container
      );
    });

    expect(description()).toBe("Hosts only hides the other bars");
    expect(dropdown().getAttribute("aria-invalid")).toBeNull();
  });

  it("marks the dropdown wrong and announces the error", () => {
    act(() => {
      render(
        <SelectField
          label="Viewing areas"
          hint="Who sees the bars"
          error="Choose one"
          value=""
        >
          {options}
        </SelectField>,
        container
      );
    });

    expect(dropdown().getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector('[role="alert"]')!.textContent).toBe(
      "Choose one"
    );
    expect(description()).toBe("Who sees the bars | Choose one");
  });

  it("uses the id it's given, so other code can point at the dropdown", () => {
    act(() => {
      render(
        <SelectField id="sb-ui-size-select" label="UI size" value="everyone">
          {options}
        </SelectField>,
        container
      );
    });

    expect(dropdown().id).toBe("sb-ui-size-select");
    expect(dropdown().labels![0]!.htmlFor).toBe("sb-ui-size-select");
  });

  it("keeps a hidden label for screen readers", () => {
    act(() => {
      render(
        <SelectField label="Sort by" hideLabel value="everyone">
          {options}
        </SelectField>,
        container
      );
    });

    const label = dropdown().labels![0]!;
    expect(label.textContent).toBe("Sort by");
    expect(label.classList.contains("sb-visually-hidden")).toBe(true);
  });

  it("puts className on the whole field, for placement", () => {
    act(() => {
      render(
        <SelectField label="Size" className="sb-place-me" value="everyone">
          {options}
        </SelectField>,
        container
      );
    });

    expect(container.firstElementChild!.classList.contains("sb-place-me")).toBe(
      true
    );
  });
});

describe("SearchableSelect's label", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const languages = [
    { id: "en", label: "English" },
    { id: "es", label: "Español" },
  ];

  function renderPicker(label?: string) {
    act(() => {
      render(
        <SearchableSelect
          id="sb-language-select"
          label={label}
          value="en"
          options={languages}
          onChange={() => {}}
          searchPlaceholder="Search languages..."
          emptyLabel="No languages found"
        />,
        container
      );
    });
  }

  it("names the trigger for screen readers, not only by the language it shows", () => {
    renderPicker("Language");

    const trigger = container.querySelector("button")!;
    expect(trigger.id).toBe("sb-language-select");
    expect(trigger.labels?.[0]?.textContent).toBe("Language");
    expect(trigger.textContent).toContain("English");
  });

  it("works without a label, as before", () => {
    renderPicker();

    expect(container.querySelector("label")).toBeNull();
    expect(container.querySelector("button")!.textContent).toContain("English");
  });

  it("wears the same box as a Select, so both pickers match", () => {
    renderPicker("Language");

    const classes = container.querySelector("button")!.classList;
    expect(classes.contains("sb-text-input")).toBe(true);
    expect(classes.contains("sb-select-input")).toBe(true);
  });
});
