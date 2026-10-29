import { render } from "preact";
import { act } from "preact/test-utils";
import { FormField } from "@packages/find-the-verse-extension/ext_FindTheVerse/FormField";

describe("FormField", () => {
  let root: HTMLDivElement;

  beforeEach(() => {
    root = document.createElement("div");
    document.body.appendChild(root);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    act(() => {
      render(null, root);
    });
    root.remove();
  });

  it("scrolls to the field and shows a popup that clears once the error is fixed", () => {
    act(() => {
      render(
        <FormField error={null}>
          <input />
        </FormField>,
        root
      );
    });
    expect(root.querySelector("[role='alert']")).toBeNull();

    act(() => {
      render(
        <FormField error="Give this game a name." pulse={1}>
          <input />
        </FormField>,
        root
      );
    });

    const popup = root.querySelector("[role='alert']");
    expect(popup?.textContent).toBe("Give this game a name.");
    expect(popup?.getAttribute("style")).toContain("ftv-error-zoom");
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();

    act(() => {
      render(
        <FormField error={null} pulse={1}>
          <input />
        </FormField>,
        root
      );
    });
    expect(root.querySelector("[role='alert']")).toBeNull();
  });

  it("zooms the same message again when the pulse changes", () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    act(() => {
      render(
        <FormField error="Give this game a name." pulse={1}>
          <input />
        </FormField>,
        root
      );
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    act(() => {
      render(
        <FormField error="Give this game a name." pulse={2}>
          <input />
        </FormField>,
        root
      );
    });
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });
});
