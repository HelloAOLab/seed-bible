import { render } from "preact";
import { useState } from "preact/hooks";
import { act } from "preact/test-utils";
import { Switch } from "@packages/seed-bible/seed-bible/components/Switch/Switch";
import { SettingRow } from "@packages/seed-bible/seed-bible/components/SettingRow/SettingRow";

describe("Switch", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function theSwitch() {
    return container.querySelector<HTMLInputElement>('[role="switch"]')!;
  }

  function Toggle(props: { onChange?: (checked: boolean) => void }) {
    const [on, setOn] = useState(false);
    return (
      <Switch
        aria-label="Keep screen awake"
        checked={on}
        onToggled={(checked) => {
          setOn(checked);
          props.onChange?.(checked);
        }}
      />
    );
  }

  it("is a checkbox that screen readers announce as a switch, named by its aria-label", () => {
    act(() => {
      render(<Toggle />, container);
    });

    const toggle = theSwitch();
    expect(toggle.tagName).toBe("INPUT");
    expect(toggle.type).toBe("checkbox");
    expect(toggle.getAttribute("aria-label")).toBe("Keep screen awake");
    expect(toggle.checked).toBe(false);
  });

  it("reports the new value each time it's flipped", () => {
    const onChange = vi.fn();
    act(() => {
      render(<Toggle onChange={onChange} />, container);
    });

    act(() => theSwitch().click());
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(theSwitch().checked).toBe(true);

    act(() => theSwitch().click());
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(theSwitch().checked).toBe(false);
  });

  it("doesn't change while disabled", () => {
    const onToggled = vi.fn();
    act(() => {
      render(
        <Switch
          aria-label="Only host can navigate"
          checked={false}
          disabled
          onToggled={onToggled}
        />,
        container
      );
    });

    act(() => theSwitch().click());
    expect(onToggled).not.toHaveBeenCalled();
    expect(theSwitch().checked).toBe(false);
  });
});

describe("SettingRow", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function switchNamed(name: string) {
    const toggle = [
      ...container.querySelectorAll<HTMLInputElement>('[role="switch"]'),
    ].find((input) => input.labels?.[0]?.textContent === name);
    if (!toggle) {
      throw new Error(`No switch labelled "${name}"`);
    }
    return toggle;
  }

  it("names each switch by its own row's label, and clicking the label flips it", () => {
    const onHeadings = vi.fn();
    const onFootnotes = vi.fn();
    act(() => {
      render(
        <>
          <SettingRow label="Show headings">
            <Switch checked={false} onToggled={onHeadings} />
          </SettingRow>
          <SettingRow label="Show footnotes">
            <Switch checked={false} onToggled={onFootnotes} />
          </SettingRow>
        </>,
        container
      );
    });

    const headings = switchNamed("Show headings");
    const footnotes = switchNamed("Show footnotes");
    expect(headings).not.toBe(footnotes);

    act(() => headings.labels![0]!.click());
    expect(onHeadings).toHaveBeenCalledWith(true);
    expect(onFootnotes).not.toHaveBeenCalled();
  });

  it("describes the switch by the row's description, and only when there is one", () => {
    act(() => {
      render(
        <>
          <SettingRow
            label="Show in shared sessions"
            description="Only you see it. Others in the session won't."
          >
            <Switch checked onToggled={() => {}} />
          </SettingRow>
          <SettingRow label="Show discovered content">
            <Switch checked onToggled={() => {}} />
          </SettingRow>
        </>,
        container
      );
    });

    const described = switchNamed("Show in shared sessions");
    const descriptionId = described.getAttribute("aria-describedby")!;
    expect(document.getElementById(descriptionId)?.textContent).toBe(
      "Only you see it. Others in the session won't."
    );
    expect(
      switchNamed("Show discovered content").hasAttribute("aria-describedby")
    ).toBe(false);
  });

  it("points its label at a control that isn't a switch, by the id given", () => {
    act(() => {
      render(
        <SettingRow label="Scroll mode" controlId="sb-scroll-mode">
          <select id="sb-scroll-mode">
            <option>Chapter</option>
          </select>
        </SettingRow>,
        container
      );
    });

    const select = container.querySelector("select")!;
    expect(select.labels?.[0]?.textContent).toBe("Scroll mode");
  });
});
