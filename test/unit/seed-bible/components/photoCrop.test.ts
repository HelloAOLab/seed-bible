import {
  cropToFile,
  type PhotoCropTarget,
} from "@packages/seed-bible/seed-bible/components/PhotoCropModal/photoCrop";

/**
 * `cropToFile` is the half of the crop flow that decides what actually gets
 * stored — the pixel size, the encoding, the filename — so it is what these
 * cover. The modal around it renders `react-avatar-editor`, which needs a real
 * canvas 2D context and real image decoding; jsdom has neither, and `vi.mock`
 * does not intercept the package in this setup, so the modal's own chrome is
 * not unit-testable here. Splitting the encode step out is what makes the part
 * that matters testable at all.
 */
const SQUARE_TARGET: PhotoCropTarget = {
  width: 256,
  height: 256,
  previewWidth: 256,
  previewHeight: 256,
  borderRadius: 128,
  mimeType: "image/png",
  fileName: "profile-picture.png",
};

const LANDSCAPE_TARGET: PhotoCropTarget = {
  width: 1024,
  height: 768,
  previewWidth: 288,
  previewHeight: 216,
  borderRadius: 8,
  mimeType: "image/jpeg",
  quality: 0.85,
  fileName: "hero-image.jpg",
};

/**
 * A canvas that records the size it was asked to draw at and what encoding it
 * was asked for, standing in for the encoder jsdom does not have.
 */
function stubCanvas(options: { context?: boolean; blob?: boolean } = {}) {
  const drawn: { width: number; height: number }[] = [];
  const encoded: { type?: string; quality?: number }[] = [];
  const canvas = {
    width: 0,
    height: 0,
    getContext: () =>
      options.context === false
        ? null
        : {
            drawImage: (
              _source: unknown,
              _x: number,
              _y: number,
              width: number,
              height: number
            ) => {
              drawn.push({ width, height });
            },
          },
    toBlob: (
      callback: (blob: Blob | null) => void,
      type?: string,
      quality?: number
    ) => {
      encoded.push({ type, quality });
      callback(
        options.blob === false
          ? null
          : new Blob([new Uint8Array([1, 2, 3])], { type })
      );
    },
  };
  return { canvas, drawn, encoded };
}

describe("cropToFile", () => {
  let stub: ReturnType<typeof stubCanvas>;

  const useStub = (options?: Parameters<typeof stubCanvas>[0]) => {
    stub = stubCanvas(options);
    const real = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((
      tagName: string,
      ...rest: unknown[]
    ) =>
      tagName === "canvas"
        ? stub.canvas
        : (real as (...args: unknown[]) => unknown)(
            tagName,
            ...rest
          )) as never);
    return stub;
  };

  // A stand-in for the editor's cropped canvas; only its identity matters.
  const source = { nodeName: "CANVAS" } as unknown as CanvasImageSource;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stores a cover at the target's size, type and name", async () => {
    useStub();

    const file = await cropToFile(source, LANDSCAPE_TARGET);

    expect(stub.canvas.width).toBe(1024);
    expect(stub.canvas.height).toBe(768);
    expect(stub.drawn).toEqual([{ width: 1024, height: 768 }]);
    expect(file.name).toBe("hero-image.jpg");
    expect(file.type).toBe("image/jpeg");
  });

  it("passes the target's quality to the JPEG encoder", async () => {
    useStub();

    await cropToFile(source, LANDSCAPE_TARGET);

    expect(stub.encoded).toEqual([{ type: "image/jpeg", quality: 0.85 }]);
  });

  it("encodes a PNG target with no quality argument, since it is lossless", async () => {
    useStub();

    const file = await cropToFile(source, SQUARE_TARGET);

    expect(stub.encoded).toEqual([{ type: "image/png", quality: undefined }]);
    expect(file.name).toBe("profile-picture.png");
    expect(file.type).toBe("image/png");
  });

  it("draws at the stored size, not the preview size", async () => {
    // The preview is 288x216; storing at that would waste most of the
    // resolution the source has.
    useStub();

    await cropToFile(source, LANDSCAPE_TARGET);

    expect(stub.drawn).toEqual([{ width: 1024, height: 768 }]);
    expect(stub.drawn).not.toEqual([{ width: 288, height: 216 }]);
  });

  it("rejects when the canvas has no 2D context", async () => {
    useStub({ context: false });

    await expect(cropToFile(source, SQUARE_TARGET)).rejects.toThrow(
      "Failed to create the cropped image"
    );
  });

  it("rejects when the encoder produces nothing", async () => {
    useStub({ blob: false });

    await expect(cropToFile(source, SQUARE_TARGET)).rejects.toThrow(
      "Failed to encode the cropped image"
    );
  });
});
