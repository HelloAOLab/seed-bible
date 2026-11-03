/**
 * Generates the iOS app icon and launch screen images from the Seed Bible
 * icon's shape (`packages/seed-bible/seed-bible/components/seedBibleIconShape.ts`).
 *
 * Run from `mobile/` after changing the icon:
 *
 *   pnpm assets:ios
 *
 * Writes, under `ios/App/App/Assets.xcassets/`:
 * - `AppIcon.appiconset`: the app icon, with the dark and tinted versions iOS
 *   18+ uses when the home screen is set to those styles.
 * - `LaunchIcon.imageset`: the finished icon the launch screen
 *   (`Base.lproj/LaunchScreen.storyboard`) shows in the middle, dark on light
 *   and light on dark.
 * - `LaunchBackground.colorset`: the launch screen's background, the app's
 *   light or dark theme background.
 *
 * iOS launch screens are static, so unlike Android 12+ there's no animated
 * intro here: the launch screen shows the icon as Android's animation ends.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  ICON_COLOR,
  ICON_COLOR_ON_DARK,
  iconHeightFor,
  iconSvg,
  MOBILE_DIR,
  renderPngs,
  type PngFile,
} from "./iconRendering";

const ASSETS_DIR = path.join(MOBILE_DIR, "ios/App/App/Assets.xcassets");

// Keep in sync with LIGHT_THEME / DARK_THEME `background` in
// packages/seed-bible/seed-bible/managers/ThemeManager.tsx, as Android's
// `sb_background` colors are.
const LIGHT_BACKGROUND = "#f8fafc";
const DARK_BACKGROUND = "#0a0a0a";

const APP_ICON_SIZE = 1024;
/** How much of the app icon's width the mark spans. */
const APP_ICON_MARK = 0.6;

/** The launch screen icon's width in points, the same as Android's splash. */
const LAUNCH_ICON_WIDTH = 130;
const LAUNCH_ICON_HEIGHT = Math.round(iconHeightFor(LAUNCH_ICON_WIDTH));

const DARK = [{ appearance: "luminosity", value: "dark" }];
const TINTED = [{ appearance: "luminosity", value: "tinted" }];

function writeJson(relativePath: string, value: unknown) {
  const file = path.join(ASSETS_DIR, relativePath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const xcodeInfo = { author: "xcode", version: 1 };

function srgb(hex: string) {
  const [red, green, blue] = [1, 3, 5].map(
    (start) => `0x${hex.slice(start, start + 2).toUpperCase()}`
  );
  return {
    "color-space": "srgb",
    components: { alpha: "1.000", red, green, blue },
  };
}

function appIcon(): PngFile[] {
  const dir = path.join(ASSETS_DIR, "AppIcon.appiconset");
  // Rebuilt from scratch so no icon from an earlier layout lingers.
  rmSync(dir, { recursive: true, force: true });
  const iconWidth = APP_ICON_SIZE * APP_ICON_MARK;
  writeJson("AppIcon.appiconset/Contents.json", {
    images: [
      { filename: "AppIcon.png" },
      { appearances: DARK, filename: "AppIcon-dark.png" },
      { appearances: TINTED, filename: "AppIcon-tinted.png" },
    ].map((image) => ({
      ...image,
      idiom: "universal",
      platform: "ios",
      size: `${APP_ICON_SIZE}x${APP_ICON_SIZE}`,
    })),
    info: xcodeInfo,
  });
  return [
    {
      // Opaque: the App Store rejects an app icon with an alpha channel.
      file: path.join(dir, "AppIcon.png"),
      svg: iconSvg({
        width: APP_ICON_SIZE,
        iconWidth,
        tile: { shape: "square", color: "#ffffff" },
      }),
      width: APP_ICON_SIZE,
    },
    {
      // The dark and tinted icons leave the background to iOS.
      file: path.join(dir, "AppIcon-dark.png"),
      svg: iconSvg({
        width: APP_ICON_SIZE,
        iconWidth,
        color: ICON_COLOR_ON_DARK,
      }),
      width: APP_ICON_SIZE,
    },
    {
      // iOS tints a grayscale image; white takes the tint at full strength.
      file: path.join(dir, "AppIcon-tinted.png"),
      svg: iconSvg({ width: APP_ICON_SIZE, iconWidth, color: "#ffffff" }),
      width: APP_ICON_SIZE,
    },
  ];
}

function launchIcon(): PngFile[] {
  const dir = path.join(ASSETS_DIR, "LaunchIcon.imageset");
  rmSync(dir, { recursive: true, force: true });
  const variants = [
    { suffix: "", color: ICON_COLOR, appearances: undefined },
    { suffix: "-dark", color: ICON_COLOR_ON_DARK, appearances: DARK },
  ];
  const scales = [1, 2, 3];
  writeJson("LaunchIcon.imageset/Contents.json", {
    images: variants.flatMap(({ suffix, appearances }) =>
      scales.map((scale) => ({
        ...(appearances ? { appearances } : {}),
        filename: `LaunchIcon${suffix}@${scale}x.png`,
        idiom: "universal",
        scale: `${scale}x`,
      }))
    ),
    info: xcodeInfo,
  });
  return variants.flatMap(({ suffix, color }) =>
    scales.map((scale) => ({
      file: path.join(dir, `LaunchIcon${suffix}@${scale}x.png`),
      svg: iconSvg({
        width: LAUNCH_ICON_WIDTH * scale,
        height: LAUNCH_ICON_HEIGHT * scale,
        iconWidth: LAUNCH_ICON_WIDTH * scale,
        color,
      }),
      width: LAUNCH_ICON_WIDTH * scale,
      height: LAUNCH_ICON_HEIGHT * scale,
    }))
  );
}

function launchBackground() {
  writeJson("LaunchBackground.colorset/Contents.json", {
    colors: [
      { idiom: "universal", color: srgb(LIGHT_BACKGROUND) },
      { appearances: DARK, idiom: "universal", color: srgb(DARK_BACKGROUND) },
    ],
    info: xcodeInfo,
  });
}

async function main() {
  launchBackground();
  await renderPngs([...appIcon(), ...launchIcon()]);
}

await main();
