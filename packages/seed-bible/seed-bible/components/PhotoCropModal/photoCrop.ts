/**
 * The resize-and-encode half of the crop flow, kept apart from the modal that
 * drives it so it can be exercised without `react-avatar-editor` — that needs
 * a real canvas 2D context and real image decoding, neither of which jsdom
 * has, and it cannot be stubbed here (see `photoCrop.test.ts`).
 */

/** The shape and encoding one feature wants its cropped image stored in. */
export interface PhotoCropTarget {
  /** Stored image size, in pixels. */
  width: number;
  height: number;
  /** Crop-editor preview size. Keep it the same aspect ratio as the stored size. */
  previewWidth: number;
  previewHeight: number;
  /**
   * Corner radius of the editor's crop mask; half the preview width makes it a
   * circle. Only the mask is rounded — every extraction `react-avatar-editor`
   * offers returns the rectangular crop, so the stored file is rectangular
   * whatever this says, and a round avatar stays CSS's job.
   */
  borderRadius: number;
  mimeType: "image/png" | "image/jpeg";
  /** Encoder quality, 0–1. Ignored for PNG, which is lossless. */
  quality?: number;
  fileName: string;
}

/**
 * Redraws an already-cropped canvas at the target's exact stored size and
 * encodes it as the target's file.
 *
 * Callers should pass the crop at the source image's own resolution
 * (`getImage`) rather than the editor's preview canvas
 * (`getImageScaledToCanvas`), so this downscales from full detail instead of
 * from something already reduced.
 */
export function cropToFile(
  source: CanvasImageSource,
  target: PhotoCropTarget
): Promise<File> {
  const dest = document.createElement("canvas");
  dest.width = target.width;
  dest.height = target.height;
  const context = dest.getContext("2d");
  if (!context) {
    return Promise.reject(new Error("Failed to create the cropped image"));
  }
  context.drawImage(source, 0, 0, target.width, target.height);
  return new Promise((resolve, reject) => {
    dest.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to encode the cropped image"));
          return;
        }
        resolve(new File([blob], target.fileName, { type: target.mimeType }));
      },
      target.mimeType,
      target.quality
    );
  });
}
