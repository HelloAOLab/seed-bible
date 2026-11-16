import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  CustomIconsProvider,
  CustomizableIcon,
} from "@packages/seed-bible/seed-bible/components/CustomizableIcon/CustomizableIcon";
import type { CustomizationIcons } from "@packages/seed-bible/seed-bible/managers/CustomizationsManager";

describe("CustomizableIcon", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const renderSearchIcon = (icons: CustomizationIcons) => {
    const iconsSignal = signal(icons);
    act(() => {
      render(
        <CustomIconsProvider icons={iconsSignal}>
          <CustomizableIcon id="search">
            <span className="default-icon">search</span>
          </CustomizableIcon>
        </CustomIconsProvider>,
        container
      );
    });
    return iconsSignal;
  };

  it("shows the app's own icon when the customization has none for that id", () => {
    renderSearchIcon({ chat: "https://files.example.com/chat.svg" });

    expect(container.querySelector(".default-icon")).not.toBeNull();
    expect(container.querySelector(".sb-custom-icon")).toBeNull();
  });

  it("shows the customization's SVG in place of the app's icon", () => {
    renderSearchIcon({ search: "https://files.example.com/search.svg" });

    const custom = container.querySelector<HTMLElement>(".sb-custom-icon");
    expect(container.querySelector(".default-icon")).toBeNull();
    expect(custom?.style.getPropertyValue("--sb-custom-icon-url")).toBe(
      'url("https://files.example.com/search.svg")'
    );
  });

  it("switches back to the app's icon when the customization stops providing one", async () => {
    const icons = renderSearchIcon({
      search: "https://files.example.com/search.svg",
    });

    await act(() => {
      icons.value = {};
    });

    expect(container.querySelector(".default-icon")).not.toBeNull();
    expect(container.querySelector(".sb-custom-icon")).toBeNull();
  });

  it("shows the app's icon outside any provider", () => {
    act(() => {
      render(
        <CustomizableIcon id="search">
          <span className="default-icon">search</span>
        </CustomizableIcon>,
        container
      );
    });

    expect(container.querySelector(".default-icon")).not.toBeNull();
  });
});
