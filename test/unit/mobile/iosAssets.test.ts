import { existsSync, readFileSync } from "fs";
import path from "path";

// Checks the iOS launch screen and the asset catalog
// `mobile/scripts/generateIosAssets.ts` writes, as committed.

const APP_DIR = path.resolve(__dirname, "../../../mobile/ios/App/App");
const ASSETS = path.join(APP_DIR, "Assets.xcassets");
const ANDROID_RES = path.resolve(
  __dirname,
  "../../../mobile/android/app/src/main/res"
);

interface CatalogEntry {
  filename?: string;
  appearances?: { appearance: string; value: string }[];
  scale?: string;
  size?: string;
}

const contents = (asset: string) =>
  JSON.parse(readFileSync(path.join(ASSETS, asset, "Contents.json"), "utf-8"));

/** Width, height and PNG color type (2 = RGB, 6 = RGB + alpha). */
function pngInfo(file: string) {
  const header = readFileSync(file).subarray(0, 26);
  return {
    width: header.readUInt32BE(16),
    height: header.readUInt32BE(20),
    colorType: header[25],
  };
}

const appearance = (entry: { appearances?: CatalogEntry["appearances"] }) =>
  entry.appearances?.[0]?.value ?? "any";

const storyboard = new DOMParser().parseFromString(
  readFileSync(
    path.join(APP_DIR, "Base.lproj/LaunchScreen.storyboard"),
    "utf-8"
  ),
  "application/xml"
);

describe("iOS app icon", () => {
  const images: CatalogEntry[] = contents("AppIcon.appiconset").images;

  it("has the light, dark and tinted icons iOS 18 asks for, all present", () => {
    expect(images.map(appearance).sort()).toEqual(["any", "dark", "tinted"]);
    for (const image of images) {
      expect(
        existsSync(path.join(ASSETS, "AppIcon.appiconset", image.filename!))
      ).toBe(true);
    }
  });

  // App Store Connect rejects an app icon that has an alpha channel.
  it("is a 1024px image with no alpha channel", () => {
    const main = images.find((image) => appearance(image) === "any")!;

    expect(
      pngInfo(path.join(ASSETS, "AppIcon.appiconset", main.filename!))
    ).toEqual({ width: 1024, height: 1024, colorType: 2 });
  });
});

describe("iOS launch screen", () => {
  const imageView = storyboard.getElementsByTagName("imageView")[0]!;
  const imageName = imageView.getAttribute("image")!;
  const colorName = storyboard
    .querySelector('color[key="backgroundColor"]')!
    .getAttribute("name")!;

  it("only uses images and colors that are in the asset catalog", () => {
    expect(storyboard.getElementsByTagName("parsererror")).toHaveLength(0);
    expect(existsSync(path.join(ASSETS, `${imageName}.imageset`))).toBe(true);
    expect(existsSync(path.join(ASSETS, `${colorName}.colorset`))).toBe(true);
  });

  it("shows the icon at its image's size, with a version for dark mode", () => {
    const images: CatalogEntry[] = contents(`${imageName}.imageset`).images;
    const oneX = images.find(
      (image) => image.scale === "1x" && appearance(image) === "any"
    )!;
    const constant = (attribute: string) =>
      Number(
        [...imageView.getElementsByTagName("constraint")]
          .find((c) => c.getAttribute("firstAttribute") === attribute)!
          .getAttribute("constant")
      );

    const { width, height } = pngInfo(
      path.join(ASSETS, `${imageName}.imageset`, oneX.filename!)
    );
    expect({ width, height }).toEqual({
      width: constant("width"),
      height: constant("height"),
    });
    expect(images.filter((image) => appearance(image) === "dark")).toHaveLength(
      3
    );
  });

  it("uses the same light and dark backgrounds as the Android splash screen", () => {
    const androidColor = (dir: string) =>
      /name="sb_background">(#[0-9a-f]{6})</i
        .exec(
          readFileSync(path.join(ANDROID_RES, dir, "colors.xml"), "utf-8")
        )![1]!
        .toLowerCase();
    const iosColors = Object.fromEntries(
      contents(`${colorName}.colorset`).colors.map(
        (entry: {
          appearances?: CatalogEntry["appearances"];
          color: { components: Record<string, string> };
        }) => {
          const { red, green, blue } = entry.color.components;
          const hex = [red, green, blue]
            .map((part) => part!.replace(/^0x/i, "").toLowerCase())
            .join("");
          return [appearance(entry), `#${hex}`];
        }
      )
    );

    expect(iosColors).toEqual({
      any: androidColor("values"),
      dark: androidColor("values-night"),
    });
  });
});
