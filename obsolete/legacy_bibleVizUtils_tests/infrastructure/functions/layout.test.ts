import {
  GetDialogBotScaleY,
  GetExplodedViewBooksPositions,
  computeNotificationDirection,
  ComputeInfoLabelTransformerDesiredPosition,
  ComputeInfoLabelOffset,
  ComputeInfoLabelTailRotationZ,
  ComputeInfoLabelTailOffset,
  ComputeInfoLabelDateOffset,
  GetLabelFormAddress,
} from "bibleVizUtils.infrastructure.functions.layout";
import {
  LabelPosition,
  LabelDateFormat,
} from "bibleVizUtils.domain.models.label";

// ─── globals ──────────────────────────────────────────────────────────────────

class Vec3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0
  ) {}
  add(other: Vec3) {
    return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z);
  }
}

class Vec2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
}

beforeEach(() => {
  (globalThis as any).Vector3 = Vec3;
  (globalThis as any).Vector2 = Vec2;
  (globalThis as any).math = {
    degreesToRadians: (deg: number) => (deg * Math.PI) / 180,
  };
});

afterEach(() => {
  delete (globalThis as any).Vector3;
  delete (globalThis as any).Vector2;
  delete (globalThis as any).math;
});

// ─── font fixture ─────────────────────────────────────────────────────────────

// fontSize=1, factor=0.0102
// 'A' (id=65): xadvance=100 → charScaleX=1.02
// ' ' (id=32): xadvance=50  → charScaleX=0.51
// '\n' (id=10): xadvance=0  → triggers line break
// lineHeight=100 → scaleY per line = 100*1*0.0102 = 1.02

const makeFont = (): any => ({
  common: { lineHeight: 100 },
  chars: [
    { id: 10, xadvance: 0 },
    { id: 32, xadvance: 50 },
    { id: 65, xadvance: 100 },
    { id: 66, xadvance: 100 },
  ],
});

// ─── GetDialogBotScaleY ───────────────────────────────────────────────────────

describe("GetDialogBotScaleY", () => {
  it("returns { scaleX: 0, scaleY: 1.02 } for an empty string", () => {
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "",
      fontSize: 1,
      font: makeFont(),
    });
    expect(result.scaleX).toBeCloseTo(0);
    expect(result.scaleY).toBeCloseTo(1.02);
  });

  it("measures a single character correctly", () => {
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "A",
      fontSize: 1,
      font: makeFont(),
    });
    expect(result.scaleX).toBeCloseTo(1.02);
    expect(result.scaleY).toBeCloseTo(1.02);
  });

  it("measures two characters in a single word", () => {
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "AB",
      fontSize: 1,
      font: makeFont(),
    });
    expect(result.scaleX).toBeCloseTo(2.04);
    expect(result.scaleY).toBeCloseTo(1.02);
  });

  it("two words on one line when limit is large enough", () => {
    const result = GetDialogBotScaleY({
      scaleXLimit: 3,
      line: "A A",
      fontSize: 1,
      font: makeFont(),
    });
    // 'A'=1.02 + ' '=0.51 + 'A'=1.02 = 2.55, all fit
    expect(result.scaleY).toBeCloseTo(1.02);
    expect(result.scaleX).toBeCloseTo(2.55);
  });

  it("wraps to a second line when adding the space would exceed the limit", () => {
    // limit = 1.5 → after 'A'(1.02) + ' '(0.51) = 1.53 > 1.5 → wrap
    const result = GetDialogBotScaleY({
      scaleXLimit: 1.5,
      line: "A A",
      fontSize: 1,
      font: makeFont(),
    });
    expect(result.scaleY).toBeCloseTo(2.04);
  });

  it("increments line count on an explicit newline character", () => {
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "A\nA",
      fontSize: 1,
      font: makeFont(),
    });
    expect(result.scaleY).toBeCloseTo(2.04);
    expect(result.scaleX).toBeCloseTo(1.02);
  });

  it("increments line count for each newline in a multi-break string", () => {
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "A\nA\nA",
      fontSize: 1,
      font: makeFont(),
    });
    expect(result.scaleY).toBeCloseTo(3.06);
  });

  it("adds paddingY to scaleY", () => {
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "A",
      fontSize: 1,
      paddingY: 5,
      font: makeFont(),
    });
    expect(result.scaleY).toBeCloseTo(1.02 + 5);
  });

  it("reduces effective limit by paddingX", () => {
    // Without paddingX, "A A" (2.55) fits in limit 3
    // With paddingX=1, effective limit=2, space(0.51) pushes scaleX to 1.53 > 2 after 'A' → wrap on 2nd 'A'
    const result = GetDialogBotScaleY({
      scaleXLimit: 3,
      line: "A A",
      fontSize: 1,
      paddingX: 1,
      font: makeFont(),
    });
    expect(result.scaleY).toBeCloseTo(2.04);
  });

  it("uses the provided fontSize to scale character widths and height", () => {
    // With fontSize=2: charScaleX = 1.02*2 = 2.04, scaleY = 1.02*2 = 2.04
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "A",
      fontSize: 2,
      font: makeFont(),
    });
    expect(result.scaleX).toBeCloseTo(2.04);
    expect(result.scaleY).toBeCloseTo(2.04);
  });

  it("silently skips characters not present in the font", () => {
    // char 'Z' (id=90) is not in makeFont(); it should be ignored
    const result = GetDialogBotScaleY({
      scaleXLimit: 10,
      line: "Z",
      fontSize: 1,
      font: makeFont(),
    });
    expect(result.scaleX).toBeCloseTo(0);
    expect(result.scaleY).toBeCloseTo(1.02);
  });
});

// ─── GetExplodedViewBooksPositions ────────────────────────────────────────────

describe("GetExplodedViewBooksPositions", () => {
  it("returns an empty array when booksScalesZ is empty", () => {
    expect(
      GetExplodedViewBooksPositions({
        booksScalesZ: [],
        sectionExplodedViewScaleZ: 5,
      })
    ).toEqual([]);
  });

  it("returns [0] for a single book", () => {
    const result = GetExplodedViewBooksPositions({
      booksScalesZ: [2],
      sectionExplodedViewScaleZ: 2,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(0);
  });

  it("first position is always 0", () => {
    const result = GetExplodedViewBooksPositions({
      booksScalesZ: [1, 1, 1],
      sectionExplodedViewScaleZ: 5,
    });
    expect(result[0]).toBeCloseTo(0);
  });

  it("distributes two equal books evenly across the section", () => {
    // booksScalesZ=[1,1], total=2, gaps=1, sectionZ=4 → gapSize=(4-2)/1=2
    // book[0]=0/4=0, book[1]=(0+2+1)/4=0.75
    const result = GetExplodedViewBooksPositions({
      booksScalesZ: [1, 1],
      sectionExplodedViewScaleZ: 4,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(0.75);
  });

  it("distributes three equal books with correct gaps", () => {
    // booksScalesZ=[1,1,1], total=3, gaps=2, sectionZ=5 → gapSize=(5-3)/2=1
    // book[0]=0/5=0, book[1]=2/5=0.4, book[2]=4/5=0.8
    const result = GetExplodedViewBooksPositions({
      booksScalesZ: [1, 1, 1],
      sectionExplodedViewScaleZ: 5,
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(0.4);
    expect(result[2]).toBeCloseTo(0.8);
  });

  it("returns positions as fractions of sectionExplodedViewScaleZ", () => {
    const sectionZ = 10;
    const result = GetExplodedViewBooksPositions({
      booksScalesZ: [2, 2],
      sectionExplodedViewScaleZ: sectionZ,
    });
    for (const pos of result) {
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThan(1);
    }
  });

  it("positions increase monotonically", () => {
    const result = GetExplodedViewBooksPositions({
      booksScalesZ: [1, 2, 1],
      sectionExplodedViewScaleZ: 10,
    });
    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1]!);
    }
  });
});

// ─── computeNotificationDirection ────────────────────────────────────────────

describe("computeNotificationDirection", () => {
  it("returns a Vec2 instance", () => {
    expect(computeNotificationDirection(0)).toBeInstanceOf(Vec2);
  });

  it("returns (1,1) when cameraRotationZ=0 (adjusted angle > PI)", () => {
    // (0 - PI/2) mod 2PI = 3PI/2 > PI → Vector2(1,1)
    const result = computeNotificationDirection(0);
    expect(result.x).toBe(1);
    expect(result.y).toBe(1);
  });

  it("returns (-1,-1) when cameraRotationZ=PI/2 (adjusted angle=0, ≤ PI)", () => {
    const result = computeNotificationDirection(Math.PI / 2);
    expect(result.x).toBe(-1);
    expect(result.y).toBe(-1);
  });

  it("returns (-1,-1) when adjusted angle equals PI exactly", () => {
    // cameraRotationZ = PI*1.5 → (PI*1.5 - PI/2) mod 2PI = PI → not > PI → Vector2(-1,-1)
    const result = computeNotificationDirection(Math.PI * 1.5);
    expect(result.x).toBe(-1);
    expect(result.y).toBe(-1);
  });

  it("returns (1,1) when cameraRotationZ=2*PI (adjusted angle=3PI/2 > PI)", () => {
    const result = computeNotificationDirection(Math.PI * 2);
    expect(result.x).toBe(1);
    expect(result.y).toBe(1);
  });

  it("normalises negative adjusted angles by adding 2*PI", () => {
    // cameraRotationZ=0 → adjusted = -PI/2, then +2PI = 3PI/2 > PI → (1,1)
    // cameraRotationZ=PI/4 → adjusted = PI/4-PI/2 = -PI/4, then +2PI = 7PI/4 > PI → (1,1)
    const result = computeNotificationDirection(Math.PI / 4);
    expect(result.x).toBe(1);
    expect(result.y).toBe(1);
  });
});

// ─── ComputeInfoLabelTransformerDesiredPosition ───────────────────────────────

describe("ComputeInfoLabelTransformerDesiredPosition", () => {
  const baseParams = () => ({
    piecePosition: new Vec3(0, 0, 4) as any,
    pieceScales: { x: 2, y: 2, z: 2 },
    infoLabelTransformerDesiredScales: { x: 1, y: 1, z: 1 },
    transformerPosition: new Vec3(0, 0, 0) as any,
  });

  it("returns a Vec3 instance for every positioning", () => {
    for (const pos of Object.values(LabelPosition)) {
      const result = ComputeInfoLabelTransformerDesiredPosition({
        ...baseParams(),
        positioning: pos,
      });
      expect(result).toBeInstanceOf(Vec3);
    }
  });

  it("LeftSided: z = pieceZ + pieceZ/2 - transZ/2 (+ transformerPosition)", () => {
    // z = 4 + 2/2 - 1/2 + 0 = 4 + 1 - 0.5 = 4.5
    const result = ComputeInfoLabelTransformerDesiredPosition({
      ...baseParams(),
      positioning: LabelPosition.LeftSided,
    });
    expect(result.z).toBeCloseTo(4.5);
  });

  it("RightSided: same z formula as LeftSided", () => {
    const left = ComputeInfoLabelTransformerDesiredPosition({
      ...baseParams(),
      positioning: LabelPosition.LeftSided,
    });
    const right = ComputeInfoLabelTransformerDesiredPosition({
      ...baseParams(),
      positioning: LabelPosition.RightSided,
    });
    expect(right.z).toBeCloseTo(left.z);
  });

  it("RightSidedCorner: z = pieceZ + pieceScaleZ - transZ/2 (+ transformerPosition)", () => {
    // z = 4 + 2 - 0.5 = 5.5
    const result = ComputeInfoLabelTransformerDesiredPosition({
      ...baseParams(),
      positioning: LabelPosition.RightSidedCorner,
    });
    expect(result.z).toBeCloseTo(5.5);
  });

  it("Top: z = pieceZ + pieceScaleZ - transZ/2 + 1.5", () => {
    // z = 4 + 2 - 0.5 + 1.5 = 7
    const result = ComputeInfoLabelTransformerDesiredPosition({
      ...baseParams(),
      positioning: LabelPosition.Top,
    });
    expect(result.z).toBeCloseTo(7);
  });

  it("adds the transformerPosition offset to the result", () => {
    const result = ComputeInfoLabelTransformerDesiredPosition({
      ...baseParams(),
      positioning: LabelPosition.LeftSided,
      transformerPosition: new Vec3(10, 20, 30) as any,
    });
    expect(result.x).toBeCloseTo(10);
    expect(result.y).toBeCloseTo(20);
    expect(result.z).toBeCloseTo(4.5 + 30);
  });
});

// ─── ComputeInfoLabelOffset ───────────────────────────────────────────────────

describe("ComputeInfoLabelOffset", () => {
  // radialVector.length() = sqrt(3^2+4^2) = 5
  const radialVector = new Vec2(3, 4) as any;
  const baseParams = () => ({
    radialVector,
    infoLabelOffsetMargin: 1,
    infoLabelScales: { x: 4, y: 3, z: 1 },
    infoLabelTailDesiredScales: { x: 0.5, y: 0.5, z: 0.5 },
  });

  it("returns a Vec3 instance for every positioning", () => {
    for (const pos of Object.values(LabelPosition)) {
      const result = ComputeInfoLabelOffset({
        ...baseParams(),
        positioning: pos,
      });
      expect(result).toBeInstanceOf(Vec3);
    }
  });

  it("LeftSided: x is negative (-(len + margin + labelX/2 + tailX))", () => {
    // -(5 + 1 + 2 + 0.5) = -8.5
    const result = ComputeInfoLabelOffset({
      ...baseParams(),
      positioning: LabelPosition.LeftSided,
    });
    expect(result.x).toBeCloseTo(-8.5);
    expect(result.y).toBeCloseTo(0.5);
    expect(result.z).toBeCloseTo(5);
  });

  it("RightSided: x is positive (+(len + margin + labelX/2 + tailX))", () => {
    // 5 + 1 + 2 + 0.5 = 8.5
    const result = ComputeInfoLabelOffset({
      ...baseParams(),
      positioning: LabelPosition.RightSided,
    });
    expect(result.x).toBeCloseTo(8.5);
    expect(result.y).toBeCloseTo(0.5);
    expect(result.z).toBeCloseTo(5);
  });

  it("RightSidedCorner: x = len + labelX/2 (no margin, no tail)", () => {
    // 5 + 4/2 = 7
    const result = ComputeInfoLabelOffset({
      ...baseParams(),
      positioning: LabelPosition.RightSidedCorner,
    });
    expect(result.x).toBeCloseTo(7);
    expect(result.y).toBeCloseTo(0.5);
    expect(result.z).toBeCloseTo(5);
  });

  it("Top: x=0, y = 1.5 + labelY/2", () => {
    // y = 1.5 + 3/2 = 3
    const result = ComputeInfoLabelOffset({
      ...baseParams(),
      positioning: LabelPosition.Top,
    });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(3);
    expect(result.z).toBeCloseTo(5);
  });
});

// ─── ComputeInfoLabelTailRotationZ ────────────────────────────────────────────

describe("ComputeInfoLabelTailRotationZ", () => {
  it("LeftSided: returns degreesToRadians(90)", () => {
    expect(ComputeInfoLabelTailRotationZ(LabelPosition.LeftSided)).toBeCloseTo(
      (90 * Math.PI) / 180
    );
  });

  it("RightSided: returns degreesToRadians(-90)", () => {
    expect(ComputeInfoLabelTailRotationZ(LabelPosition.RightSided)).toBeCloseTo(
      (-90 * Math.PI) / 180
    );
  });

  it("RightSidedCorner: returns degreesToRadians(-26.56)", () => {
    expect(
      ComputeInfoLabelTailRotationZ(LabelPosition.RightSidedCorner)
    ).toBeCloseTo((-26.56 * Math.PI) / 180);
  });

  it("Top: returns 0", () => {
    expect(ComputeInfoLabelTailRotationZ(LabelPosition.Top)).toBe(0);
  });

  it("returns a number for every positioning", () => {
    for (const pos of Object.values(LabelPosition)) {
      expect(typeof ComputeInfoLabelTailRotationZ(pos)).toBe("number");
    }
  });
});

// ─── ComputeInfoLabelTailOffset ───────────────────────────────────────────────

describe("ComputeInfoLabelTailOffset", () => {
  // infoLabelOffset=(5, 0.5, 3), labelScales=(4,6,1), transScales=(2,3,1), tailScales=(1,2,1)
  const baseParams = () => ({
    infoLabelOffset: new Vec3(5, 0.5, 3) as any,
    infoLabelScales: { x: 4, y: 6, z: 1 },
    infoLabelTransformerDesiredScales: { x: 2, y: 3, z: 1 },
    infoLabelTailDesiredScales: { x: 1, y: 2, z: 1 },
  });

  it("returns a Vec3 instance for every positioning", () => {
    for (const pos of Object.values(LabelPosition)) {
      const result = ComputeInfoLabelTailOffset({
        ...baseParams(),
        positioning: pos,
      });
      expect(result).toBeInstanceOf(Vec3);
    }
  });

  it("LeftSided: x = offsetX + labelX/2/transX + tailX/2", () => {
    // 5 + 4/2/2 + 1/2 = 5 + 1 + 0.5 = 6.5
    const result = ComputeInfoLabelTailOffset({
      ...baseParams(),
      positioning: LabelPosition.LeftSided,
    });
    expect(result.x).toBeCloseTo(6.5);
    expect(result.y).toBeCloseTo(0.5);
    expect(result.z).toBeCloseTo(3);
  });

  it("RightSided: x = offsetX - labelX/2/transX - tailX/2", () => {
    // 5 - 4/2/2 - 1/2 = 5 - 1 - 0.5 = 3.5
    const result = ComputeInfoLabelTailOffset({
      ...baseParams(),
      positioning: LabelPosition.RightSided,
    });
    expect(result.x).toBeCloseTo(3.5);
    expect(result.y).toBeCloseTo(0.5);
    expect(result.z).toBeCloseTo(3);
  });

  it("RightSidedCorner: x = offsetX - labelX/2/transX + tailX, y = offsetY - labelY/2/transY", () => {
    // x = 5 - 4/2/2 + 1 = 5 - 1 + 1 = 5
    // y = 0.5 - 6/2/3 = 0.5 - 1 = -0.5
    const result = ComputeInfoLabelTailOffset({
      ...baseParams(),
      positioning: LabelPosition.RightSidedCorner,
    });
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(-0.5);
    expect(result.z).toBeCloseTo(3);
  });

  it("Top: x=0, y = offsetY - labelY/2 - tailY/2", () => {
    // y = 0.5 - 6/2 - 2/2 = 0.5 - 3 - 1 = -3.5
    const result = ComputeInfoLabelTailOffset({
      ...baseParams(),
      positioning: LabelPosition.Top,
    });
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(-3.5);
    expect(result.z).toBeCloseTo(3);
  });
});

// ─── ComputeInfoLabelDateOffset ───────────────────────────────────────────────

describe("ComputeInfoLabelDateOffset", () => {
  // offset=(5,3,2), labelScales=(4,4,1), transScales=(2,2,1)
  // dateGap={x:0.2,y:0.1}, dateScales=(1,0.5,1)
  const baseParams = () => ({
    infoLabelOffset: new Vec3(5, 3, 2) as any,
    infoLabelScales: { x: 4, y: 4, z: 1 },
    infoLabelTransformerDesiredScales: { x: 2, y: 2, z: 1 },
    dateGap: { x: 0.2, y: 0.1 },
    infoLabelDateScales: { x: 1, y: 0.5, z: 1 },
    relativeDateScalesX: 1.5,
    absoluteDateScalesX: 2.0,
  });

  it("returns a Vec3 instance", () => {
    expect(
      ComputeInfoLabelDateOffset({
        ...baseParams(),
        dateFormat: LabelDateFormat.Relative,
      })
    ).toBeInstanceOf(Vec3);
  });

  it("z is always infoLabelOffset.z + 1", () => {
    const result = ComputeInfoLabelDateOffset({
      ...baseParams(),
      dateFormat: LabelDateFormat.Relative,
    });
    expect(result.z).toBeCloseTo(3);
  });

  it("Relative format: uses relativeDateScalesX to compute x", () => {
    // x = 5 + 4/2/2 - 1.5/2 - 0.2 = 5 + 1 - 0.75 - 0.2 = 5.05
    const result = ComputeInfoLabelDateOffset({
      ...baseParams(),
      dateFormat: LabelDateFormat.Relative,
    });
    expect(result.x).toBeCloseTo(5.05);
  });

  it("Absolute format: uses absoluteDateScalesX to compute x", () => {
    // x = 5 + 4/2/2 - 2.0/2 - 0.2 = 5 + 1 - 1 - 0.2 = 4.8
    const result = ComputeInfoLabelDateOffset({
      ...baseParams(),
      dateFormat: LabelDateFormat.Absolute,
    });
    expect(result.x).toBeCloseTo(4.8);
  });

  it("y = offsetY + labelY/2 + dateY/2 + gapY", () => {
    // y = 3 + 4/2 + 0.5/2 + 0.1 = 3 + 2 + 0.25 + 0.1 = 5.35
    const result = ComputeInfoLabelDateOffset({
      ...baseParams(),
      dateFormat: LabelDateFormat.Relative,
    });
    expect(result.y).toBeCloseTo(5.35);
  });

  it("Absolute x is smaller than Relative x (larger dateScalesX subtracts more)", () => {
    const relative = ComputeInfoLabelDateOffset({
      ...baseParams(),
      dateFormat: LabelDateFormat.Relative,
    });
    const absolute = ComputeInfoLabelDateOffset({
      ...baseParams(),
      dateFormat: LabelDateFormat.Absolute,
    });
    expect(absolute.x).toBeLessThan(relative.x);
  });
});

// ─── GetLabelFormAddress ──────────────────────────────────────────────────────

describe("GetLabelFormAddress", () => {
  const formAddresses = {
    0.5: "url-0.5",
    1.0: "url-1.0",
    2.0: "url-2.0",
  } as const;

  it("returns the exact URL for an exact aspect-ratio match", () => {
    expect(GetLabelFormAddress(0.5, formAddresses as any)).toBe("url-0.5");
  });

  it("returns the closest URL when the aspect ratio falls between keys", () => {
    // 0.6 is closer to 0.5 (diff=0.1) than to 1.0 (diff=0.4)
    expect(GetLabelFormAddress(0.6, formAddresses as any)).toBe("url-0.5");
  });

  it("returns the larger-key URL when the aspect ratio is closer to it", () => {
    // 0.8 is closer to 1.0 (diff=0.2) than to 0.5 (diff=0.3)
    expect(GetLabelFormAddress(0.8, formAddresses as any)).toBe("url-1.0");
  });

  it("returns the largest key's URL for a very large aspect ratio", () => {
    expect(GetLabelFormAddress(100, formAddresses as any)).toBe("url-2.0");
  });

  it("returns the smallest key's URL for a very small aspect ratio", () => {
    expect(GetLabelFormAddress(0, formAddresses as any)).toBe("url-0.5");
  });

  it("returns a string for every input", () => {
    expect(typeof GetLabelFormAddress(1.0, formAddresses as any)).toBe(
      "string"
    );
  });
});
