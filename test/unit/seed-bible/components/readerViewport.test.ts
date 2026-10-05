import { revealReadAlongVerse } from "@packages/seed-bible/seed-bible/components/BibleReader/readerViewport";

/** Gives `element` the on-screen box a browser would lay it out at. */
function placeAt(element: HTMLElement, top: number, bottom: number) {
  element.getBoundingClientRect = () =>
    ({
      top,
      bottom,
      left: 0,
      right: 300,
      width: 300,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("revealReadAlongVerse", () => {
  let reader: HTMLDivElement;
  let scroller: HTMLDivElement;
  let verse: HTMLSpanElement;
  let scrollBy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // A scroller filling the screen from 0 to 800px, with the bottom toolbar
    // covering its last 100px.
    reader = document.createElement("div");
    reader.className = "sb-bible-reader";
    scroller = document.createElement("div");
    verse = document.createElement("span");
    scroller.appendChild(verse);
    reader.appendChild(scroller);
    document.body.appendChild(reader);
    placeAt(scroller, 0, 800);
    scrollBy = vi.fn();
    scroller.scrollBy = scrollBy as unknown as HTMLElement["scrollBy"];
    document.documentElement.style.setProperty(
      "--sb-reader-bottom-inset",
      "100px"
    );
  });

  afterEach(() => {
    reader.remove();
    document.documentElement.style.removeProperty("--sb-reader-bottom-inset");
    vi.unstubAllGlobals();
  });

  it("leaves the reader alone while the verse is fully on screen", () => {
    placeAt(verse, 300, 500);

    revealReadAlongVerse(verse, scroller);

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it("glides a verse running under the toolbar up to the top", () => {
    // Its last line is behind the toolbar, which starts at 700px.
    placeAt(verse, 650, 750);

    revealReadAlongVerse(verse, scroller);

    // Scrolled until the verse sits 16px below the top of the screen.
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({
      top: 634,
      behavior: "smooth",
    });
  });

  it("brings a verse that is entirely off screen back to the top", () => {
    placeAt(verse, 1200, 1300);

    revealReadAlongVerse(verse, scroller);

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({
      top: 1184,
      behavior: "smooth",
    });
  });

  it("scrolls back up to a verse cut off at the top", () => {
    placeAt(verse, -40, 60);

    revealReadAlongVerse(verse, scroller);

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({
      top: -56,
      behavior: "smooth",
    });
  });

  it("counts a verse under the floating mobile header as off screen", () => {
    const header = document.createElement("div");
    header.className = "sb-bible-reader-mobile-header";
    reader.prepend(header);
    placeAt(header, 0, 60);
    placeAt(verse, 40, 140);

    revealReadAlongVerse(verse, scroller);

    // Lands 16px below the header rather than the top of the screen.
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({
      top: -36,
      behavior: "smooth",
    });
  });

  it("jumps instead of gliding for someone who prefers reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      (query: string) =>
        ({
          matches: query === "(prefers-reduced-motion: reduce)",
        }) as MediaQueryList
    );
    placeAt(verse, 650, 750);

    revealReadAlongVerse(verse, scroller);

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({
      top: 634,
      behavior: "auto",
    });
  });
});
