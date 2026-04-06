import { GetDialogBotScaleY } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { GetTextColorBasedOnBackground } from "bibleVizUtils.functions.index";
import { arrangementService } from "bibleVizUtils.services.index";
import { DateFormats, ObjectPoolTags } from "bibleVizUtils.models.canvas";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import type {
  Bot,
  Vector2 as Vector2Type,
} from "../../../../typings/AuxLibraryDefinitions";

interface Segment {
  start: number;
  end?: number;
}

const {
  layoutData,
  position,
}: {
  layoutData: LayoutBibleData;
  position: Vector2Type;
} = that;

const dimension = os.getCurrentDimension();
const toggleBackgroundPadding = 0.5;
const colorPickerBackgroundPadding = 0.8;
const buttonMargin = new Vector2(1, 0.4);
// const spaceBetweenButtons = 2.5;
const settingsButtonMargin = 0.75;
const buttonGap = 0.25;
const coverPadding = new Vector2(10, 8);

// const fixedLabelWidth = 4.5;
const bookShowDelay = 500;

for (const layoutBookStructure of layoutData.childrenStructures) {
  await thisBot.SpawnBook({ layoutBookStructure, layoutData });
}
const rowSegments: Segment[] = [];
const BooksOriginOffset = new Vector2(0, 0);
const booksOriginPosition = new Vector2(
  BooksOriginOffset.x + position.x,
  BooksOriginOffset.y + position.y
);
let currRowPosition = booksOriginPosition.y;
const sectionLineScaleY = 0.2;
const sectionLineLabelScaleY = 1;
const columnsSegments: Segment[] = [];
for (
  let i = 0;
  i <
  Math.min(
    BibleVizDataRepository.getBibleLayoutMeasurement("MaxAmountOfColumns"),
    layoutData.childrenStructures.length
  );
  i++
) {
  const segment = {
    start:
      booksOriginPosition.x +
      (BibleVizDataRepository.getBibleLayoutMeasurement("Book3DScaleX") +
        BibleVizDataRepository.getBibleLayoutMeasurement("BookHorizontalGap")) *
        i,
    end:
      booksOriginPosition.x +
      (BibleVizDataRepository.getBibleLayoutMeasurement("Book3DScaleX") +
        BibleVizDataRepository.getBibleLayoutMeasurement("BookHorizontalGap")) *
        i +
      BibleVizDataRepository.getBibleLayoutMeasurement("Book3DScaleX"),
  };
  columnsSegments.push(segment);
}

for (let row = 0; row < layoutData.amountOfRows; row++) {
  const rowSegment: Segment = { start: currRowPosition };

  let greaterBookScaleY = 0;
  const bookStructuresWithinRow = layoutData.childrenStructures.filter(
    (layoutBookStructure) => {
      return layoutBookStructure.row === row;
    }
  );

  bookStructuresWithinRow.forEach((layoutBookStructure) => {
    if (!layoutBookStructure.layoutBookData.piece) {
      throw new Error(
        "layoutBookStructure.layoutBookData.piece not defined at SetUpLayout"
      );
    }
    if (
      layoutBookStructure.layoutBookData.piece.tags.scaleY > greaterBookScaleY
    )
      greaterBookScaleY = layoutBookStructure.layoutBookData.piece?.tags.scaleY;

    const bookPosition = new Vector2(
      booksOriginPosition.x +
        layoutBookStructure.layoutBookData.piece.tags.scaleX / 2 +
        (layoutBookStructure.layoutBookData.piece.tags.scaleX +
          BibleVizDataRepository.getBibleLayoutMeasurement(
            "BookHorizontalGap"
          )) *
          layoutBookStructure.column,
      currRowPosition -
        sectionLineLabelScaleY -
        sectionLineScaleY -
        BibleVizDataRepository.getBibleLayoutMeasurement("BookVerticalGap") -
        BibleVizDataRepository.getBibleLayoutMeasurement("BookLabelHeight") -
        layoutBookStructure.layoutBookData.piece.tags.scaleY / 2
    );
    setTag(
      layoutBookStructure.layoutBookData.piece,
      dimension + "X",
      bookPosition.x
    );
    setTag(
      layoutBookStructure.layoutBookData.piece,
      dimension + "Y",
      bookPosition.y
    );

    const bookNameLabelMod = {
      [dimension]: true,
      [dimension + "X"]: bookPosition.x,
      [dimension + "Y"]:
        currRowPosition -
        sectionLineLabelScaleY -
        sectionLineScaleY -
        BibleVizDataRepository.getBibleLayoutMeasurement("BookVerticalGap") -
        BibleVizDataRepository.getBibleLayoutMeasurement("BookLabelHeight") / 2,
      [dimension + "Z"]: 0.5,
      isClick: false,
      label: layoutBookStructure.layoutBookData.pieceInfo.commonName,
      scaleX: BibleVizDataRepository.getBibleLayoutMeasurement("Book3DScaleX"),
      scaleY:
        BibleVizDataRepository.getBibleLayoutMeasurement("BookLabelHeight"),
    };

    let bookDateLabelLabel;
    switch (layoutData.currentDateFormat) {
      case DateFormats.ElapsedYears:
        {
          bookDateLabelLabel = layoutBookStructure.elapsedYearsRange;
        }
        break;
      case DateFormats.HistoricalDate:
        {
          bookDateLabelLabel = layoutBookStructure.historicalDateRange;
        }
        break;
    }

    const arrangement = arrangementService.getArrangementByIndex(
      layoutBookStructure.layoutBookData.creationParams.arrangementIndex
    );

    if (arrangement) {
      const sectionColor = arrangement.testaments
        ?.toReversed()
        [
          layoutBookStructure.layoutBookData.creationParams.testamentIndex
        ]?.sections.toReversed()[
        layoutBookStructure.layoutBookData.creationParams.sectionIndex
      ]?.color;
      const labelColor = sectionColor
        ? GetTextColorBasedOnBackground({
            backgroundColor: sectionColor,
          })
        : "#000000";

      const bookDateLabelMod = {
        [dimension]: false,
        [dimension + "X"]: bookPosition.x,
        [dimension + "Y"]:
          currRowPosition - sectionLineLabelScaleY - sectionLineScaleY / 2,
        [dimension + "Z"]: 1 + sectionLineScaleY,
        isHover: true,
        hidden: false,
        isClick: true,
        scaleX:
          BibleVizDataRepository.getBibleLayoutMeasurement("Book3DScaleX"),
        label: bookDateLabelLabel,
        labelColor: "black",
        initialLabelcolor: labelColor,
      };

      applyMod(layoutBookStructure.dateLabel, bookDateLabelMod);
      applyMod(layoutBookStructure.nameLabel, bookNameLabelMod);
    }
  });

  rowSegment.end =
    rowSegment.start -
    sectionLineLabelScaleY -
    sectionLineScaleY -
    BibleVizDataRepository.getBibleLayoutMeasurement("BookVerticalGap") -
    BibleVizDataRepository.getBibleLayoutMeasurement("BookLabelHeight") -
    greaterBookScaleY;
  currRowPosition +=
    rowSegment.end -
    rowSegment.start -
    BibleVizDataRepository.getBibleLayoutMeasurement("BookVerticalGap");
  rowSegments.push(rowSegment);
}

if (!layoutData.testamentLinesInfo) {
  throw new Error(
    "layoutData.testamentLinesInfo is not defined at SetUpLayout"
  );
}
const firstColumnSegment = columnsSegments[0];
if (!firstColumnSegment) {
  throw new Error("firstColumnSegment not found at SetUpLayout");
}
for (const testamentLineInfo of layoutData.testamentLinesInfo) {
  const scaleX = sectionLineScaleY;
  const rowStartSegment = rowSegments[testamentLineInfo.startRow];
  if (!rowStartSegment) {
    throw new Error("rowStartSegment not defined at SetUpLayout");
  }
  const rowEndSegment = testamentLineInfo.endRow
    ? rowSegments[testamentLineInfo?.endRow]
    : undefined;
  if (!rowEndSegment) {
    throw new Error("rowEndSegment not defined at SetUpLayout");
  }
  if (!rowEndSegment.end) {
    throw new Error("rowEndSegment.end not defined at SetUpLayout");
  }
  const scaleY = Math.abs(rowEndSegment.end - rowStartSegment.start);

  const positionX =
    firstColumnSegment.start -
    BibleVizDataRepository.getBibleLayoutMeasurement("BookHorizontalGap") -
    sectionLineScaleY / 2;
  const positionY = rowStartSegment.start - scaleY / 2;
  const line = ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.LayoutLine,
  });
  const label = ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.LayoutLabel,
  });
  const lineMod = {
    lineInfo: testamentLineInfo,
    layoutId: layoutData.id,
    space: "tempLocal",
    scaleX,
    scaleY,
    scaleZ: sectionLineScaleY,
    [dimension]: false,
    [dimension + "X"]: positionX,
    [dimension + "Y"]: positionY,
    [dimension + "Z"]: 1,
    color: testamentLineInfo.color,
    initialColor: testamentLineInfo.color,
  };
  const labelMod = {
    layoutId: layoutData.id,
    space: "tempLocal",
    scaleX: scaleY,
    scaleY: sectionLineLabelScaleY,
    scaleZ: sectionLineScaleY,
    [dimension]: false,
    [dimension + "X"]: positionX - sectionLineLabelScaleY / 2,
    [dimension + "Y"]: positionY,
    [dimension + "Z"]: 1,
    [dimension + "RotationZ"]: math.degreesToRadians(90),
    label: testamentLineInfo.name,
    color: "clear",
    pointable: false,
  };
  line.OnSpawned({ mod: lineMod });
  label.OnSpawned({ mod: labelMod });
  layoutData.staticLayoutPieces.testamentLines?.push(line);
  layoutData.staticLayoutPieces.testamentLabels?.push(label);
}

if (!layoutData.sectionLinesInfo) {
  throw new Error("layoutData.sectionLinesInfo is not defined at SetUpLayout");
}
for (const sectionLineInfo of layoutData.sectionLinesInfo) {
  const segmentLabelIndex =
    sectionLineInfo.segments.length / 2 +
    (sectionLineInfo.segments.length % 2 === 0 ? -1 : -0.5);
  for (const segmentIndex in sectionLineInfo.segments) {
    const segment = sectionLineInfo.segments[segmentIndex];
    if (!segment) {
      throw new Error("segment not found at SetUpLayout");
    }
    const columnSegmentStart = columnsSegments[segment.start.column];
    const columnSegmentEnd = columnsSegments[segment.end.column];
    const rowSegmentStart = rowSegments[segment.start.row];
    if (!columnSegmentStart) {
      throw new Error("columnSegmentStart not found at SetUpLayout");
    }
    if (!columnSegmentEnd) {
      throw new Error("columnSegmentEnd not found at SetUpLayout");
    }
    if (!columnSegmentEnd.end) {
      throw new Error("columnSegmentEnd.end not found at SetUpLayout");
    }
    if (!rowSegmentStart) {
      throw new Error("rowSegmentStart not found at SetUpLayout");
    }
    const scaleX = Math.abs(columnSegmentEnd.end - columnSegmentStart.start);
    const positionX = columnSegmentStart.start + scaleX / 2;
    const positionY =
      rowSegmentStart.start - sectionLineScaleY / 2 - sectionLineLabelScaleY;
    const line = ObjectPooler.GetObjectFromPool({
      tag: ObjectPoolTags.LayoutLine,
    });
    const lineMod = {
      space: "tempLocal",
      scaleX,
      scaleY: sectionLineScaleY,
      scaleZ: sectionLineScaleY,
      [dimension]: false,
      [dimension + "X"]: positionX,
      [dimension + "Y"]: positionY,
      [dimension + "Z"]: 1,
      color: sectionLineInfo.color,
      initialColor: sectionLineInfo.color,
      lineInfo: sectionLineInfo,
      segmentIndex,
      layoutId: layoutData.id,
    };
    line.OnSpawned({ mod: lineMod });

    layoutData.staticLayoutPieces.sectionLines?.push(line);

    if (Number(segmentIndex) === segmentLabelIndex) {
      const label = ObjectPooler.GetObjectFromPool({
        tag: ObjectPoolTags.LayoutLabel,
      });
      const labelMod = {
        space: "tempLocal",
        scaleX,
        scaleY: sectionLineLabelScaleY,
        scaleZ: sectionLineScaleY,
        [dimension]: false,
        [dimension + "X"]: positionX,
        [dimension + "Y"]: rowSegmentStart.start - sectionLineLabelScaleY / 2,
        [dimension + "Z"]: 1,
        label: sectionLineInfo.name,
        color: "clear",
        pointable: false,
        layoutId: layoutData.id,
      };
      label.OnSpawned({ mod: labelMod });

      layoutData.staticLayoutPieces.sectionLabels?.push(label);
    }
  }
}

const lastColumnSegment = columnsSegments[columnsSegments.length - 1];
if (!lastColumnSegment) {
  throw new Error("lastColumnSegment not defined at SetUpLayout");
}
if (!lastColumnSegment.end) {
  throw new Error("lastColumnSegment.end not defined at SetUpLayout");
}

const booksGridScales = {
  x: Math.abs(lastColumnSegment.end - firstColumnSegment.start),
  y: Math.abs(currRowPosition - booksOriginPosition.y),
};
const coverScales = new Vector2(
  booksGridScales.x + coverPadding.x,
  booksGridScales.y + coverPadding.y
);
const gridPieceOffset = new Vector3(
  -booksGridScales.x / 2,
  booksGridScales.y / 2,
  0
);
const bookGridPieces: Bot[] = [
  ...layoutData.childrenStructures.flatMap((layoutBookStructure) => {
    return [
      layoutBookStructure.layoutBookData.piece,
      layoutBookStructure.nameLabel,
      layoutBookStructure.dateLabel,
    ];
  }),
  ...(layoutData.staticLayoutPieces.testamentLines ?? []),
  ...(layoutData.staticLayoutPieces.testamentLabels ?? []),
  ...(layoutData.staticLayoutPieces.sectionLines ?? []),
  ...(layoutData.staticLayoutPieces.sectionLabels ?? []),
].filter(Boolean) as Bot[];

bookGridPieces.forEach((piece) => {
  const currPosition = getBotPosition(piece, dimension);
  const newPosition = currPosition.add(gridPieceOffset);
  const mod = {
    [dimension + "X"]: newPosition.x,
    [dimension + "Y"]: newPosition.y,
  };
  applyMod(piece, mod);
});

const coverMod = {
  [dimension]: true,
  [dimension + "X"]: position.x,
  [dimension + "Y"]: position.y,
  scaleX: coverScales.x,
  scaleY: coverScales.y,
  toErase: true,
  draggable: false,
  system: null,
  pointable: false,
};

if (
  !links.baseToggle ||
  Array.isArray(links.baseToggle) ||
  !links.baseToggle?.tags
) {
  throw new Error("links.baseToggle.tags not properly defined as SetUpLayout");
}
if (
  !links.baseToggleBackground ||
  Array.isArray(links.baseToggleBackground) ||
  !links.baseToggleBackground?.tags
) {
  throw new Error(
    "links.baseToggleBackground.tags not properly defined as SetUpLayout"
  );
}
if (
  !links.baseToggleHandle ||
  Array.isArray(links.baseToggleHandle) ||
  !links.baseToggleHandle?.tags
) {
  throw new Error(
    "links.baseToggleHandle.tags not properly defined as SetUpLayout"
  );
}
if (
  !links.baseColorPickerBackground ||
  Array.isArray(links.baseColorPickerBackground) ||
  !links.baseColorPickerBackground?.tags
) {
  throw new Error(
    "links.baseColorPickerBackground.tags not properly defined as SetUpLayout"
  );
}
if (
  !links.baseButtonIcon ||
  Array.isArray(links.baseButtonIcon) ||
  !links.baseButtonIcon?.tags
) {
  throw new Error(
    "links.baseButtonIcon.tags not properly defined as SetUpLayout"
  );
}

const baseToggleTags = links.baseToggle.tags;
const baseToggleBackgroundTags = links.baseToggleBackground.tags;
const baseToggleHandleTags = links.baseToggleHandle.tags;
const baseColorPickerBackgroundTags = links.baseColorPickerBackground.tags;
const baseButtonIconTags = links.baseButtonIcon.tags;

const buttonPosition = new Vector3(
  position.x - coverScales.x / 2 - baseToggleTags.scaleX / 2 - buttonMargin.x,
  0,
  0
);
const toggleHandleMarginZ = 0.01;

layoutData.staticLayoutPieces.settingsButtons?.forEach(
  (settingsButton, index) => {
    buttonPosition.y =
      position.y +
      coverScales.y / 2 -
      baseToggleTags.scaleY / 2 -
      buttonMargin.y -
      (baseToggleTags.scaleY + buttonMargin.y) * index;

    const buttonMod = {
      [dimension]: false,
      [dimension + "X"]: buttonPosition.x,
      [dimension + "Y"]: buttonPosition.y,
      [dimension + "Z"]: buttonPosition.z,
    };

    switch (settingsButton.tags.buttonType) {
      case BibleVizUtils.Data.tags.LayoutButtonType.CameraAnimationToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.ShowLabelsToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.PathToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.ChapterExpandToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistPathToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.ShowDatesToggle:
        {
          const toggleBackgroundMod = {
            [dimension]: false,
            [dimension + "X"]:
              (buttonMod[dimension + "X"] as number) +
              baseToggleTags.scaleX / 2 -
              baseToggleBackgroundTags.scaleX / 2 -
              toggleBackgroundPadding,
            [dimension + "Y"]: buttonMod[dimension + "Y"] as number,
            [dimension + "Z"]:
              (buttonMod[dimension + "Z"] as number) + toggleHandleMarginZ,
          };
          const toggleHandleMod = {
            [dimension]: false,
            [dimension + "X"]:
              (toggleBackgroundMod[dimension + "X"] as number) -
              baseToggleBackgroundTags.scaleX / 2 +
              baseToggleHandleTags.scaleX / 2 +
              (baseToggleBackgroundTags.scaleY - baseToggleHandleTags.scaleY) /
                2,
            [dimension + "Y"]: buttonMod[dimension + "Y"] as number,
            [dimension + "Z"]:
              (buttonMod[dimension + "Z"] as number) + toggleHandleMarginZ * 2,
          };
          applyMod(settingsButton.links.background, toggleBackgroundMod);
          applyMod(settingsButton.links.handle, toggleHandleMod);
        }
        break;
      case BibleVizUtils.Data.tags.LayoutButtonType.ColorPickerButton:
        {
          const colorPickerBackgroundMod = {
            [dimension]: false,
            [dimension + "X"]:
              (buttonMod[dimension + "X"] as number) +
              baseToggleTags.scaleX / 2 -
              baseColorPickerBackgroundTags.scaleX / 2 -
              colorPickerBackgroundPadding,
            [dimension + "Y"]: buttonMod[dimension + "Y"] as number,
            [dimension + "Z"]:
              (buttonMod[dimension + "Z"] as number) + toggleHandleMarginZ,
          };
          const colorPickerContentMod = {
            [dimension]: false,
            [dimension + "X"]: colorPickerBackgroundMod[dimension + "X"],
            [dimension + "Y"]: colorPickerBackgroundMod[dimension + "Y"],
            [dimension + "Z"]:
              (buttonMod[dimension + "Z"] as number) + toggleHandleMarginZ * 2,
            color: layoutData.chapterSelectColor,
          };
          applyMod(settingsButton.links.colorContent, colorPickerContentMod);
          applyMod(
            settingsButton.links.colorBackground,
            colorPickerBackgroundMod
          );
        }
        break;
      case BibleVizUtils.Data.tags.LayoutButtonType.DateFormatSelectorButton:
      case BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton:
      case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistSelectorButton:
        {
          const scaleXLimit =
            baseToggleTags.scaleX - baseButtonIconTags.scaleX - buttonGap;

          if (
            !settingsButton.links.buttonLabel ||
            Array.isArray(settingsButton.links.buttonLabel) ||
            !settingsButton.links.buttonLabel?.tags
          ) {
            throw new Error(
              "settingsButton.links.buttonLabel.tags not properly defined as SetUpLayout"
            );
          }
          const { scaleX: labelScaleX } = GetDialogBotScaleY({
            scaleXLimit,
            line: settingsButton.links.buttonLabel.tags.label,
            paddingX: 0,
            paddingY: 0,
            font: BibleVizDataRepository.getFont("Roboto"),
          });

          const buttonContentScaleX =
            labelScaleX + baseButtonIconTags.scaleX + buttonGap;

          const labelMod = {
            [dimension]: false,
            [dimension + "X"]:
              (buttonMod[dimension + "X"] as number) +
              buttonContentScaleX / 2 -
              labelScaleX / 2,
            [dimension + "Y"]: buttonMod[dimension + "Y"] as number,
            [dimension + "Z"]:
              (buttonMod[dimension + "Z"] as number) + toggleHandleMarginZ,
            scaleX: labelScaleX,
          };
          const iconMod = {
            [dimension]: false,
            [dimension + "X"]:
              (buttonMod[dimension + "X"] as number) -
              buttonContentScaleX / 2 +
              baseButtonIconTags.scaleX / 2,
            [dimension + "Y"]: buttonMod[dimension + "Y"] as number,
            [dimension + "Z"]:
              (buttonMod[dimension + "Z"] as number) + toggleHandleMarginZ,
          };
          applyMod(settingsButton.links.buttonLabel, labelMod);
          applyMod(settingsButton.links.buttonIcon, iconMod);
        }
        break;
    }

    applyMod(settingsButton, buttonMod);
  }
);

if (
  !links.baseSettingsButton ||
  Array.isArray(links.baseSettingsButton) ||
  !links.baseSettingsButton?.tags
) {
  throw new Error(
    "links.baseSettingsButton.tags not properly defined as SetUpLayout"
  );
}
const baseSettingsButtonTags = links.baseSettingsButton.tags;
if (!layoutData.staticLayoutPieces.cover) {
  throw new Error(
    "layoutData.staticLayoutPieces.cover not defined at SetUpLayout"
  );
}

const settingsButtonMod = {
  [dimension]: true,
  [dimension + "X"]:
    position.x -
    coverScales.x / 2 +
    baseSettingsButtonTags.scaleX / 2 +
    settingsButtonMargin,
  [dimension + "Y"]:
    position.y +
    coverScales.y / 2 -
    baseSettingsButtonTags.scaleY / 2 -
    settingsButtonMargin,
  [dimension + "Z"]: layoutData.staticLayoutPieces.cover.tags.scaleZ + 0.01,
  [dimension + "RotationZ"]: Math.PI,
  isShowingSettings: false,
};

applyMod(layoutData.staticLayoutPieces.settingsButton, settingsButtonMod);
applyMod(layoutData.staticLayoutPieces.cover, coverMod);

// thisBot.TryShowDates({ layoutData })
thisBot.TryShowLabels({ layoutData });
layoutData.childrenStructures.forEach((layoutBookStructure, index) => {
  if (layoutBookStructure.layoutBookData.piece) {
    animateTag(layoutBookStructure.layoutBookData.piece, {
      fromValue: {
        formOpacity: 0,
      },
      toValue: {
        formOpacity: 1,
      },
      duration: 0.007,
      startTime: os.localTime + bookShowDelay + index * 20,
    });
  }
});
