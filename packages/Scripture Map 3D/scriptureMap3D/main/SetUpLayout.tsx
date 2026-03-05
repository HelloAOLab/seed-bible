const { layoutData, position } = that;

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

layoutData.childrenStructures.forEach(async (layoutBookStructure: any) => {
  thisBot.SpawnBook({ layoutBookStructure, layoutData });
});
const rowSegments = [];
const BooksOriginOffset = new Vector2(0, 0);
const booksOriginPosition = new Vector2(
  BooksOriginOffset.x + position.x,
  BooksOriginOffset.y + position.y
);
let currRowPosition = booksOriginPosition.y;
const sectionLineScaleY = 0.2;
const sectionLineLabelScaleY = 1;
const columnsSegments = [];
for (
  let i = 0;
  i <
  Math.min(
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.MaxAmountOfColumns,
    layoutData.childrenStructures.length
  );
  i++
) {
  const segment = {
    start:
      booksOriginPosition.x +
      (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DScaleX +
        BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookHorizontalGap) *
        i,
    end:
      booksOriginPosition.x +
      (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DScaleX +
        BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookHorizontalGap) *
        i +
      BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DScaleX,
  };
  columnsSegments.push(segment);
}

for (let row = 0; row < layoutData.amountOfRows; row++) {
  const rowSegment = { start: currRowPosition };

  let greaterBookScaleY = 0;
  const bookStructuresWithinRow = layoutData.childrenStructures.filter(
    (layoutBookStructure: any) => {
      return layoutBookStructure.row === row;
    }
  );

  bookStructuresWithinRow.forEach((layoutBookStructure: any) => {
    if (
      layoutBookStructure.layoutBookData.piece.tags.scaleY > greaterBookScaleY
    )
      greaterBookScaleY = layoutBookStructure.layoutBookData.piece.tags.scaleY;

    const bookPosition = new Vector2(
      booksOriginPosition.x +
        layoutBookStructure.layoutBookData.piece.tags.scaleX / 2 +
        (layoutBookStructure.layoutBookData.piece.tags.scaleX +
          BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookHorizontalGap) *
          layoutBookStructure.column,
      currRowPosition -
        sectionLineLabelScaleY -
        sectionLineScaleY -
        BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookVerticalGap -
        BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookLabelHeight -
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
        BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookVerticalGap -
        BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookLabelHeight / 2,
      [dimension + "Z"]: 0.5,
      isClick: false,
      label: layoutBookStructure.layoutBookData.pieceInfo.commonName,
      scaleX: BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DScaleX,
      scaleY: BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookLabelHeight,
    };

    let bookDateLabelLabel;
    switch (layoutData.currentDateFormat) {
      case BibleVizUtils.Data.tags.DateFormats.ElapsedYears:
        {
          bookDateLabelLabel = layoutBookStructure.elapsedYearsRange;
        }
        break;
      case BibleVizUtils.Data.tags.DateFormats.HistoricalDate:
        {
          bookDateLabelLabel = layoutBookStructure.historicalDateRange;
        }
        break;
    }

    const sectionColor = BibleVizUtils.Data.vars.fixedArrangementsInfo[
      layoutBookStructure.layoutBookData.creationInfo.arrangementIndex
    ].testaments
      .toReversed()
      [
        layoutBookStructure.layoutBookData.creationInfo.testamentIndex
      ].sections.toReversed()[
      layoutBookStructure.layoutBookData.creationInfo.sectionIndex
    ].color;
    const labelColor = BibleVizUtils.Functions.GetTextColorBasedOnBackground({
      backgroundColor: sectionColor,
    });

    const bookDateLabelMod = {
      [dimension]: false,
      [dimension + "X"]: bookPosition.x,
      [dimension + "Y"]:
        currRowPosition - sectionLineLabelScaleY - sectionLineScaleY / 2,
      [dimension + "Z"]: 1 + sectionLineScaleY,
      isHover: true,
      hidden: false,
      isClick: true,
      scaleX: BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DScaleX,
      label: bookDateLabelLabel,
      labelColor: "black",
      initialLabelcolor: labelColor,
    };

    applyMod(layoutBookStructure.dateLabel, bookDateLabelMod);
    applyMod(layoutBookStructure.nameLabel, bookNameLabelMod);
  });

  rowSegment.end =
    rowSegment.start -
    sectionLineLabelScaleY -
    sectionLineScaleY -
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookVerticalGap -
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookLabelHeight -
    greaterBookScaleY;
  currRowPosition +=
    rowSegment.end -
    rowSegment.start -
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookVerticalGap;
  rowSegments.push(rowSegment);
}

for (const testamentLineInfo of layoutData.testamentLinesInfo) {
  const scaleX = sectionLineScaleY;
  const scaleY = Math.abs(
    rowSegments[testamentLineInfo.endRow].end -
      rowSegments[testamentLineInfo.startRow].start
  );
  const positionX =
    columnsSegments[0].start -
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookHorizontalGap -
    sectionLineScaleY / 2;
  const positionY = rowSegments[testamentLineInfo.startRow].start - scaleY / 2;
  const line = ObjectPooler.GetObjectFromPool({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLine,
  });
  const label = ObjectPooler.GetObjectFromPool({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLabel,
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
  layoutData.staticLayoutPieces.testamentLines.push(line);
  layoutData.staticLayoutPieces.testamentLabels.push(label);
}

for (const sectionLineInfo of layoutData.sectionLinesInfo) {
  const segmentLabelIndex =
    sectionLineInfo.segments.length / 2 +
    (sectionLineInfo.segments.length % 2 === 0 ? -1 : -0.5);
  for (const segmentIndex in sectionLineInfo.segments) {
    const segment = sectionLineInfo.segments[segmentIndex];
    const scaleX = Math.abs(
      columnsSegments[segment.end.column].end -
        columnsSegments[segment.start.column].start
    );
    const positionX = columnsSegments[segment.start.column].start + scaleX / 2;
    const positionY =
      rowSegments[segment.start.row].start -
      sectionLineScaleY / 2 -
      sectionLineLabelScaleY;
    const line = ObjectPooler.GetObjectFromPool({
      tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLine,
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

    layoutData.staticLayoutPieces.sectionLines.push(line);

    if (segmentIndex == segmentLabelIndex) {
      const label = ObjectPooler.GetObjectFromPool({
        tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutLabel,
      });
      const labelMod = {
        space: "tempLocal",
        scaleX,
        scaleY: sectionLineLabelScaleY,
        scaleZ: sectionLineScaleY,
        [dimension]: false,
        [dimension + "X"]: positionX,
        [dimension + "Y"]:
          rowSegments[segment.start.row].start - sectionLineLabelScaleY / 2,
        [dimension + "Z"]: 1,
        label: sectionLineInfo.name,
        color: "clear",
        pointable: false,
        layoutId: layoutData.id,
      };
      label.OnSpawned({ mod: labelMod });

      layoutData.staticLayoutPieces.sectionLabels.push(label);
    }
  }
}

const booksGridScales = {
  x: Math.abs(
    columnsSegments[columnsSegments.length - 1].end - columnsSegments[0].start
  ),
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
const bookGridPieces = [
  ...layoutData.childrenStructures.flatMap((layoutBookStructure: any) => {
    return [
      layoutBookStructure.layoutBookData.piece,
      layoutBookStructure.nameLabel,
      layoutBookStructure.dateLabel,
    ];
  }),
  ...layoutData.staticLayoutPieces.testamentLines,
  ...layoutData.staticLayoutPieces.testamentLabels,
  ...layoutData.staticLayoutPieces.sectionLines,
  ...layoutData.staticLayoutPieces.sectionLabels,
];

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

const buttonPosition = new Vector3(
  position.x -
    coverScales.x / 2 -
    links.baseToggle.tags.scaleX / 2 -
    buttonMargin.x,
  0,
  0
);
const toggleHandleMarginZ = 0.01;

layoutData.staticLayoutPieces.settingsButtons.forEach(
  (settingsButton: any, index) => {
    buttonPosition.y =
      position.y +
      coverScales.y / 2 -
      links.baseToggle.tags.scaleY / 2 -
      buttonMargin.y -
      (links.baseToggle.tags.scaleY + buttonMargin.y) * index;

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
              buttonMod[dimension + "X"] +
              links.baseToggle.tags.scaleX / 2 -
              links.baseToggleBackground.tags.scaleX / 2 -
              toggleBackgroundPadding,
            [dimension + "Y"]: buttonMod[dimension + "Y"],
            [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ,
          };
          const toggleHandleMod = {
            [dimension]: false,
            [dimension + "X"]:
              toggleBackgroundMod[dimension + "X"] -
              links.baseToggleBackground.tags.scaleX / 2 +
              links.baseToggleHandle.tags.scaleX / 2 +
              (links.baseToggleBackground.tags.scaleY -
                links.baseToggleHandle.tags.scaleY) /
                2,
            [dimension + "Y"]: buttonMod[dimension + "Y"],
            [dimension + "Z"]:
              buttonMod[dimension + "Z"] + toggleHandleMarginZ * 2,
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
              buttonMod[dimension + "X"] +
              links.baseToggle.tags.scaleX / 2 -
              links.baseColorPickerBackground.tags.scaleX / 2 -
              colorPickerBackgroundPadding,
            [dimension + "Y"]: buttonMod[dimension + "Y"],
            [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ,
          };
          const colorPickerContentMod = {
            [dimension]: false,
            [dimension + "X"]: colorPickerBackgroundMod[dimension + "X"],
            [dimension + "Y"]: colorPickerBackgroundMod[dimension + "Y"],
            [dimension + "Z"]:
              buttonMod[dimension + "Z"] + toggleHandleMarginZ * 2,
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
            links.baseToggle.tags.scaleX -
            links.baseButtonIcon.tags.scaleX -
            buttonGap;
          const { scaleX: labelScaleX } =
            BibleVizUtils.Functions.GetDialogBotScaleY({
              scaleXLimit,
              line: settingsButton.links.buttonLabel.tags.label,
              paddingX: 0,
              paddingY: 0,
            });

          const buttonContentScaleX =
            labelScaleX + links.baseButtonIcon.tags.scaleX + buttonGap;

          const labelMod = {
            [dimension]: false,
            [dimension + "X"]:
              buttonMod[dimension + "X"] +
              buttonContentScaleX / 2 -
              labelScaleX / 2,
            [dimension + "Y"]: buttonMod[dimension + "Y"],
            [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ,
            scaleX: labelScaleX,
          };
          const iconMod = {
            [dimension]: false,
            [dimension + "X"]:
              buttonMod[dimension + "X"] -
              buttonContentScaleX / 2 +
              links.baseButtonIcon.tags.scaleX / 2,
            [dimension + "Y"]: buttonMod[dimension + "Y"],
            [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ,
          };
          applyMod(settingsButton.links.buttonLabel, labelMod);
          applyMod(settingsButton.links.buttonIcon, iconMod);
        }
        break;
    }

    applyMod(settingsButton, buttonMod);
  }
);

const settingsButtonMod = {
  [dimension]: true,
  [dimension + "X"]:
    position.x -
    coverScales.x / 2 +
    links.baseSettingsButton.tags.scaleX / 2 +
    settingsButtonMargin,
  [dimension + "Y"]:
    position.y +
    coverScales.y / 2 -
    links.baseSettingsButton.tags.scaleY / 2 -
    settingsButtonMargin,
  [dimension + "Z"]: layoutData.staticLayoutPieces.cover.tags.scaleZ + 0.01,
  [dimension + "RotationZ"]: Math.PI,
  isShowingSettings: false,
};

applyMod(layoutData.staticLayoutPieces.settingsButton, settingsButtonMod);
applyMod(layoutData.staticLayoutPieces.cover, coverMod);

// thisBot.TryShowDates({ layoutData })
thisBot.TryShowLabels({ layoutData });
layoutData.childrenStructures.forEach((layoutBookStructure: any, index) => {
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
});
