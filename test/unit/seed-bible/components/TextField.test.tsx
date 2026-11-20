import { render } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import {
  TextField,
  TextInput,
} from "@packages/seed-bible/seed-bible/components/TextField/TextField";

describe("TextField", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function box() {
    return container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      "input, textarea"
    )!;
  }

  function typeInto(text: string) {
    act(() => {
      box().value = text;
      box().dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  /** What a screen reader reads after the box's name: its described-by text. */
  function description() {
    return (box().getAttribute("aria-describedby") ?? "")
      .split(" ")
      .filter(Boolean)
      .map((id) => document.getElementById(id)?.textContent)
      .join(" | ");
  }

  it("is named by its label, which controls the box", () => {
    act(() => {
      render(<TextField label="Profile name" value="" />, container);
    });

    // A label that controls the box is what makes a click on it focus the
    // box in a browser (the test environment doesn't do that part itself).
    expect(box().labels?.[0]?.textContent).toBe("Profile name");
    expect(box().labels![0]!.control).toBe(box());
  });

  it("hands over what's typed, as text", () => {
    function Name() {
      const [name, setName] = useState("Craig");
      return (
        <>
          <TextField label="Profile name" value={name} onValueInput={setName} />
          <output>{name}</output>
        </>
      );
    }
    act(() => {
      render(<Name />, container);
    });

    typeInto("Craig family");

    expect(container.querySelector("output")!.textContent).toBe("Craig family");
    expect(box().value).toBe("Craig family");
  });

  it("still calls a native onInput with the event", () => {
    const onInput = vi.fn();
    const onValueInput = vi.fn();
    act(() => {
      render(
        <TextField
          label="Note"
          value=""
          onInput={onInput}
          onValueInput={onValueInput}
        />,
        container
      );
    });

    typeInto("Amen");

    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onInput.mock.calls[0]![0]).toBeInstanceOf(Event);
    expect(onValueInput).toHaveBeenCalledWith("Amen");
  });

  it("keeps a hidden label for screen readers", () => {
    act(() => {
      render(
        <TextField
          label="New folder name"
          hideLabel
          placeholder="New folder name"
          value=""
        />,
        container
      );
    });

    const label = box().labels![0]!;
    expect(label.textContent).toBe("New folder name");
    expect(label.classList.contains("sb-visually-hidden")).toBe(true);
  });

  it("says when a field is optional, as part of its name", () => {
    act(() => {
      render(<TextField label="Location" optional value="" />, container);
    });

    expect(box().labels![0]!.textContent).toBe("Location (Optional)");
  });

  it("reads a hint out with the box", () => {
    act(() => {
      render(
        <TextField
          label="Server URL"
          hint="Starts with https://"
          type="url"
          value=""
        />,
        container
      );
    });

    expect(description()).toBe("Starts with https://");
    expect(box().getAttribute("aria-invalid")).toBeNull();
  });

  it("marks the box wrong and announces the error", () => {
    act(() => {
      render(
        <TextField
          label="Login code"
          hint="Check your email"
          error="That code didn't work"
          value="12345"
        />,
        container
      );
    });

    expect(box().getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector('[role="alert"]')!.textContent).toBe(
      "That code didn't work"
    );
    expect(description()).toBe("Check your email | That code didn't work");
  });

  it("clears the error once it's fixed", () => {
    function Code() {
      const [code, setCode] = useState("1");
      return (
        <TextField
          label="Login code"
          value={code}
          onValueInput={setCode}
          error={code.length < 6 ? "Codes have 6 digits" : undefined}
        />
      );
    }
    act(() => {
      render(<Code />, container);
    });
    expect(box().getAttribute("aria-invalid")).toBe("true");

    typeInto("123456");

    expect(box().getAttribute("aria-invalid")).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(box().getAttribute("aria-describedby")).toBeNull();
  });

  it("counts the characters used against the limit as they're typed", () => {
    function Description() {
      const [text, setText] = useState("Psalms");
      return (
        <TextField
          label="Description"
          multiline
          maxLength={300}
          showCount
          value={text}
          onValueInput={setText}
        />
      );
    }
    act(() => {
      render(<Description />, container);
    });

    const count = container.querySelector(".sb-field-count")!;
    expect(count.querySelector('[aria-hidden="true"]')!.textContent).toBe(
      "6/300"
    );
    expect(description()).toBe("6 of 300 characters");

    typeInto("Psalms and Proverbs");

    expect(count.querySelector('[aria-hidden="true"]')!.textContent).toBe(
      "19/300"
    );
    expect(box().getAttribute("maxlength")).toBe("300");
  });

  it("shows no count without a limit to count against", () => {
    act(() => {
      render(<TextField label="Note" showCount value="Amen" />, container);
    });

    expect(container.querySelector(".sb-field-count")).toBeNull();
  });

  it("keeps the caller's own aria-describedby ahead of its hint", () => {
    act(() => {
      render(
        <>
          <p id="verses-status">2 verses not recognised</p>
          <TextField
            label="Verses"
            hint="One per line"
            aria-describedby="verses-status"
            value=""
          />
        </>,
        container
      );
    });

    expect(description()).toBe("2 verses not recognised | One per line");
  });

  it("uses the id it's given, so other code can point at the box", () => {
    act(() => {
      render(
        <TextField id="sb-edit-profile-name" label="Profile name" value="" />,
        container
      );
    });

    expect(box().id).toBe("sb-edit-profile-name");
    expect(box().labels![0]!.htmlFor).toBe("sb-edit-profile-name");
  });

  it("gives two fields on one screen their own ids", () => {
    act(() => {
      render(
        <>
          <TextField label="Title" value="" hint="Shown on the card" />
          <TextField label="Subtitle" value="" hint="Shown under it" />
        </>,
        container
      );
    });

    const [first, second] = Array.from(container.querySelectorAll("input"));
    expect(first!.id).not.toBe(second!.id);
    expect(first!.labels![0]!.textContent).toBe("Title");
    expect(second!.labels![0]!.textContent).toBe("Subtitle");
  });

  it("is a text area when multiline, three rows tall unless told otherwise", () => {
    act(() => {
      render(<TextField label="Description" multiline value="" />, container);
    });

    expect(box().tagName).toBe("TEXTAREA");
    expect(box().getAttribute("rows")).toBe("3");
  });

  it("passes the browser's own input settings through", () => {
    act(() => {
      render(
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          required
          disabled
          value=""
        />,
        container
      );
    });

    const input = box() as HTMLInputElement;
    expect(input.type).toBe("email");
    expect(input.getAttribute("autocomplete")).toBe("email");
    expect(input.required).toBe(true);
    expect(input.disabled).toBe(true);
  });

  it("puts className on the whole field, for placement", () => {
    act(() => {
      render(
        <TextField label="Title" className="sb-place-me" value="" />,
        container
      );
    });

    expect(container.firstElementChild!.classList.contains("sb-place-me")).toBe(
      true
    );
    expect(box().classList.contains("sb-place-me")).toBe(false);
  });
});

describe("TextInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function box() {
    return container.querySelector("input")!;
  }

  it("can stand alone, named by an aria-label", () => {
    act(() => {
      render(<TextInput aria-label="Folder name" value="Psalms" />, container);
    });

    expect(container.querySelector("label")).toBeNull();
    expect(box().getAttribute("aria-label")).toBe("Folder name");
    expect(box().value).toBe("Psalms");
  });

  it("tells screen readers when its value is wrong", () => {
    act(() => {
      render(<TextInput aria-label="Link" invalid value="nope" />, container);
    });

    expect(box().getAttribute("aria-invalid")).toBe("true");
  });

  it("hands an inline inputRef the element once, though it's a new function each render", () => {
    const received: (HTMLInputElement | null)[] = [];
    function Parent(props: { count: number }) {
      return (
        <TextInput
          aria-label={`Folder ${props.count}`}
          value=""
          inputRef={(element) => {
            received.push(element);
          }}
        />
      );
    }
    act(() => {
      render(<Parent count={1} />, container);
    });
    act(() => {
      render(<Parent count={2} />, container);
    });
    act(() => {
      render(<Parent count={3} />, container);
    });

    expect(received).toEqual([box()]);
  });

  it("fills an inputRef object, for code that has to focus the box", () => {
    const inputRef: { current: HTMLInputElement | null } = { current: null };
    act(() => {
      render(
        <TextInput aria-label="Folder name" value="" inputRef={inputRef} />,
        container
      );
    });

    expect(inputRef.current).toBe(box());
  });
});
