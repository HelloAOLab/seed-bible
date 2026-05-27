declare module "https://esm.run/qrcode" {
  export const toCanvas: (
    canvas: HTMLCanvasElement,
    text: string,
    options?: QRCodeToCanvasOptions
  ) => Promise<void>;
  export const toDataURL: (
    text: string,
    options?: QRCodeToDataURLOptions
  ) => Promise<string>;

  export default {
    toCanvas,
    toDataURL,
  };
}
