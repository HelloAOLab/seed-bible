/**
 * Shared by the icon generators (`generateAndroidAssets.ts`,
 * `generateIosAssets.ts`): placing the Seed Bible icon in a frame and
 * rendering it to PNG with Puppeteer's Chrome. Set PUPPETEER_EXECUTABLE_PATH
 * to use a different Chrome.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";
import {
  SEED_BIBLE_ICON_HEIGHT,
  SEED_BIBLE_ICON_PATH,
  SEED_BIBLE_ICON_WIDTH,
} from "../../packages/seed-bible/seed-bible/components/seedBibleIconShape";

export const MOBILE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

/** The icon's color on light backgrounds: the light theme's text color. */
export const ICON_COLOR = "#191919";
/** The icon's color on dark backgrounds: the dark theme's text color. */
export const ICON_COLOR_ON_DARK = "#f5f5f5";

export const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * The transform that centers the icon at `iconWidth` wide in a `width` ×
 * `height` frame: scale first, then translate.
 */
export function placeIcon(
  iconWidth: number,
  width: number,
  height: number = width
) {
  const scale = iconWidth / SEED_BIBLE_ICON_WIDTH;
  return {
    scale: round(scale),
    translateX: round((width - SEED_BIBLE_ICON_WIDTH * scale) / 2),
    translateY: round((height - SEED_BIBLE_ICON_HEIGHT * scale) / 2),
  };
}

/** The icon's height when drawn `iconWidth` wide. */
export const iconHeightFor = (iconWidth: number) =>
  (iconWidth * SEED_BIBLE_ICON_HEIGHT) / SEED_BIBLE_ICON_WIDTH;

/**
 * An SVG of the icon, centered at `iconWidth` wide on an optional tile.
 * Without a tile the background is transparent.
 */
export function iconSvg(options: {
  width: number;
  height?: number;
  iconWidth: number;
  color?: string;
  tile?: { shape: "square" | "rounded" | "circle"; color: string };
}): string {
  const { width, iconWidth, tile } = options;
  const height = options.height ?? width;
  const { scale, translateX, translateY } = placeIcon(iconWidth, width, height);
  const background = !tile
    ? ""
    : tile.shape === "circle"
      ? `<circle cx="${width / 2}" cy="${height / 2}" r="${Math.min(width, height) / 2}" fill="${tile.color}" />`
      : `<rect width="${width}" height="${height}" rx="${tile.shape === "rounded" ? width * 0.18 : 0}" fill="${tile.color}" />`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${background}<g transform="translate(${translateX} ${translateY}) scale(${scale})"><path fill="${options.color ?? ICON_COLOR}" d="${SEED_BIBLE_ICON_PATH}" /></g></svg>`;
}

export interface PngFile {
  file: string;
  svg: string;
  width: number;
  height?: number;
}

/**
 * Renders each SVG to a PNG. Transparent areas stay transparent; an image
 * with none is written without an alpha channel, which the App Store requires
 * of app icons.
 */
export async function renderPngs(files: PngFile[]): Promise<void> {
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    for (const { file, svg, width, height = width } of files) {
      await page.setViewport({ width, height });
      await page.setContent(
        `<html><body style="margin:0;background:transparent">${svg}</body></html>`
      );
      mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({
        path: file as `${string}.png`,
        omitBackground: true,
        clip: { x: 0, y: 0, width, height },
      });
    }
  } finally {
    await browser.close();
  }
}
