import { render } from "preact";
import { act } from "preact/test-utils";
import {
  Skeleton,
  SkeletonContainer,
} from "@packages/seed-bible/seed-bible/components/Skeleton/Skeleton";

describe("Skeleton", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("applies the shape modifier class and inline (scalable) dimensions", () => {
    act(() => {
      render(<Skeleton shape="circle" width="2rem" height="2rem" />, container);
    });

    const block = container.querySelector<HTMLDivElement>(".sb-skeleton")!;
    expect(block).not.toBeNull();
    expect(block.classList.contains("sb-skeleton--circle")).toBe(true);
    // rem (not px) so the block scales with the UI Size setting.
    expect(block.style.width).toBe("2rem");
    expect(block.style.height).toBe("2rem");
  });

  it("defaults to the block shape and lets radius be overridden", () => {
    act(() => {
      render(<Skeleton radius="0.625rem" />, container);
    });

    const block = container.querySelector<HTMLDivElement>(".sb-skeleton")!;
    expect(block.classList.contains("sb-skeleton--block")).toBe(true);
    expect(block.style.borderRadius).toBe("0.625rem");
  });

  it("is decorative — every block is hidden from assistive tech", () => {
    act(() => {
      render(<Skeleton shape="line" />, container);
    });

    const block = container.querySelector<HTMLDivElement>(".sb-skeleton")!;
    expect(block.getAttribute("aria-hidden")).toBe("true");
  });

  it("passes through extra layout classes", () => {
    act(() => {
      render(<Skeleton className="my-extra-class" />, container);
    });

    const block = container.querySelector<HTMLDivElement>(".sb-skeleton")!;
    expect(block.classList.contains("my-extra-class")).toBe(true);
  });
});

describe("SkeletonContainer", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("exposes a busy status region with a single visually-hidden label", () => {
    act(() => {
      render(
        <SkeletonContainer label="Loading your profile…" className="my-layout">
          <Skeleton shape="line" />
        </SkeletonContainer>,
        container
      );
    });

    const status = container.querySelector<HTMLDivElement>(
      ".sb-skeleton-status"
    )!;
    expect(status).not.toBeNull();
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    // The caller's layout class is applied alongside the status class.
    expect(status.classList.contains("my-layout")).toBe(true);

    const srLabel = status.querySelector(".sr-only")!;
    expect(srLabel).not.toBeNull();
    expect(srLabel.textContent).toBe("Loading your profile…");

    // The decorative block is rendered inside the region.
    expect(status.querySelector(".sb-skeleton")).not.toBeNull();
  });
});
