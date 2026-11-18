import { readFileSync } from "fs";
import path from "path";
import { SEED_BIBLE_ICON_PATH } from "@packages/seed-bible/seed-bible/components/seedBibleIconShape";

// Checks the files `mobile/scripts/generateAndroidAssets.ts` writes, as
// committed. A failure about the icon shape means the generator needs
// re-running (`pnpm assets:android` in mobile/).

const RES = path.resolve(__dirname, "../../../mobile/android/app/src/main/res");
const ANDROID_NS = "http://schemas.android.com/apk/res/android";

function readXml(relativePath: string): Document {
  const doc = new DOMParser().parseFromString(
    readFileSync(path.join(RES, relativePath), "utf-8"),
    "application/xml"
  );
  expect(doc.getElementsByTagName("parsererror")).toHaveLength(0);
  return doc;
}

const attr = (el: Element, name: string) => el.getAttributeNS(ANDROID_NS, name);

describe("Android launcher icon", () => {
  it("draws the current Seed Bible icon", () => {
    const paths = readXml(
      "drawable/ic_launcher_foreground.xml"
    ).getElementsByTagName("path");

    expect(attr(paths[0]!, "pathData")).toBe(SEED_BIBLE_ICON_PATH);
  });
});

describe("Android animated splash icon", () => {
  const doc = readXml("drawable/splash_icon_animated.xml");
  const elementsByName = new Map(
    [...doc.getElementsByTagName("*")]
      .filter((el) => el.tagName !== "target" && attr(el, "name"))
      .map((el) => [attr(el, "name")!, el])
  );
  const holders = [...doc.getElementsByTagName("target")].flatMap((target) =>
    [...target.getElementsByTagName("propertyValuesHolder")].map((holder) => ({
      target: attr(target, "name")!,
      property: attr(holder, "propertyName")!,
      keyframes: [...holder.getElementsByTagName("keyframe")].map((frame) => ({
        fraction: Number(attr(frame, "fraction")),
        value: attr(frame, "value")!,
      })),
    }))
  );

  it("draws the current Seed Bible icon", () => {
    expect(attr(elementsByName.get("whole")!, "pathData")).toBe(
      SEED_BIBLE_ICON_PATH
    );
  });

  it("animates only elements that exist in the drawing", () => {
    expect(holders.length).toBeGreaterThan(0);
    for (const { target } of holders) {
      expect(elementsByName.has(target), target).toBe(true);
    }
  });

  it("runs every animation from start to end, in order", () => {
    for (const { target, property, keyframes } of holders) {
      const fractions = keyframes.map((frame) => frame.fraction);
      expect(fractions[0], `${target}.${property}`).toBe(0);
      expect(fractions.at(-1), `${target}.${property}`).toBe(1);
      expect(fractions, `${target}.${property}`).toEqual(
        [...fractions].sort((a, b) => a - b)
      );
    }
  });

  // Android before 12 draws this drawable without animating it, so its
  // resting values have to be the finished icon, not the start of the intro.
  it("rests on the finished icon, so Android 7–11 show it whole", () => {
    const resting = (el: Element, property: string) =>
      attr(el, property) ??
      ({ scaleX: "1", scaleY: "1", fillAlpha: "1" } as Record<string, string>)[
        property
      ];
    for (const { target, property, keyframes } of holders) {
      const final = keyframes.at(-1)!.value;
      expect(
        resting(elementsByName.get(target)!, property),
        `${target}.${property}`
      ).toBe(final);
    }
  });

  it("starts with nothing visible but the empty splash screen", () => {
    const hiddenAtStart = holders.every(({ property, keyframes }) => {
      const first = keyframes[0]!.value;
      return property === "pathData"
        ? // The trunk's reveal starts as a zero-height strip.
          new Set(first.match(/,(-?[\d.]+)/g)).size === 1
        : Number(first) === 0;
    });
    expect(hiddenAtStart).toBe(true);
  });
});
