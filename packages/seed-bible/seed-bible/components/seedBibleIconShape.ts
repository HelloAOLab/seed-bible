/**
 * The Seed Bible icon's shape, in its own 555 × 298 coordinate space, kept free
 * of Preact and CSS imports so build scripts can read it too:
 * `mobile/scripts/generateAndroidAssets.ts` turns it into the Android app
 * icons and the animated splash screen.
 */

/** The viewBox every coordinate here is in. */
export const SEED_BIBLE_ICON_WIDTH = 555;
export const SEED_BIBLE_ICON_HEIGHT = 298;

/** The seed the intro animation starts from, at the base of the trunk. */
export const SEED_BIBLE_ICON_SEED = { cx: 277.57, cy: 280, rx: 22, ry: 15 };

/** The trunk: the center column the intro grows upward. */
export const SEED_BIBLE_ICON_TRUNK = { x: 251.1, width: 52.94 };

export const SEED_BIBLE_ICON_PATH =
  "m331.11 57.54c7.57-3.65 16.62-4.99 26.18-3.88 73.91 8.58 144.62 15.2 197.44 4.67v-54.36c-44.45 12.58-118.68 5.53-191.34-2.9-19.53-2.27-38.64 0.77-55.26 8.78-11.78 5.67-22.08 13.37-30.56 22.57-8.48-9.2-18.77-16.9-30.55-22.57-16.63-8.01-35.73-11.05-55.26-8.78-72.66 8.43-146.9 15.48-191.35 2.9v54.36c52.83 10.53 123.54 3.91 197.45-4.67 9.55-1.11 18.6 0.23 26.17 3.88 16.52 7.96 26.89 24.29 27.07 42.62v10.89q-2.01-1.09-4.08-2.09c-16.63-8.01-35.73-11.04-55.26-8.78-72.66 8.44-146.9 15.49-191.35 2.9v54.36c52.83 10.53 123.54 3.91 197.45-4.67 9.55-1.11 18.6 0.24 26.17 3.88 16.52 7.96 26.89 24.29 27.07 42.63v6.01h-250.69v52.94h250.69v39.77h52.94v-39.77h250.69v-52.94h-250.69v-6.01c0.18-18.34 10.56-34.67 27.07-42.63 7.57-3.64 16.62-4.99 26.18-3.88 73.91 8.58 144.62 15.2 197.44 4.67v-54.36c-44.44 12.59-118.68 5.54-191.34-2.9-19.53-2.26-38.64 0.77-55.26 8.78q-2.07 1-4.09 2.09v-10.89c0.18-18.33 10.56-34.66 27.07-42.62z";

// The icon is one compound path, so the animation draws it several times,
// each clipped to one piece: the trunk (center column) and the left/right
// halves of the ground bar and the middle and top "pages". Clipped copies leave
// hairline seams where they meet, so the whole path is swapped in at the end.
// The trunk column spans x 251.1–304.04 (center x 277.57).
export const SEED_BIBLE_ICON_BRANCHES = [
  {
    id: "ground-l",
    side: "left",
    points: "0,205.29 253,205.29 253,258.23 0,258.23",
    hingeY: 231,
    delay: 0.36,
  },
  {
    id: "ground-r",
    side: "right",
    points: "302.14,205.29 555.14,205.29 555.14,258.23 302.14,258.23",
    hingeY: 231,
    delay: 0.36,
  },
  {
    id: "middle-l",
    side: "left",
    points: "0,80 200,80 253,106 253,205.29 0,205.29",
    hingeY: 155,
    delay: 0.41,
  },
  {
    id: "middle-r",
    side: "right",
    points: "555.14,80 355.14,80 302.14,106 302.14,205.29 555.14,205.29",
    hingeY: 155,
    delay: 0.41,
  },
  {
    id: "top-l",
    side: "left",
    points: "0,0 253,0 253,106 200,80 0,80",
    hingeY: 60,
    delay: 0.46,
  },
  {
    id: "top-r",
    side: "right",
    points: "555.14,0 302.14,0 302.14,106 355.14,80 555.14,80",
    hingeY: 60,
    delay: 0.46,
  },
] as const;

// SVG flattens 3D transforms, so a page turning on the trunk's spine is faked
// in 2D: the page widens out from its hinge on the trunk while its outer half
// (folded at `fold`) trails behind with a lifted edge, like a bending page.
// The halves overlap by a few units so no gap opens at the fold.
export const SEED_BIBLE_ICON_PAGE_SIDES = {
  left: { hinge: 251.1, fold: 125, inner: [122, 260], outer: [0, 128] },
  right: {
    hinge: 304.04,
    fold: 430.14,
    inner: [295, 433.14],
    outer: [427.14, 555.14],
  },
} as const;
