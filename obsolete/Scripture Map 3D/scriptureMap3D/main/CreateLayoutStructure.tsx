import { arrangementService } from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { ObjectPoolTags } from "bibleVizUtils.models.canvas";

const { layoutDataId } = that;

const layoutBookStructures = [];
const arrangementIndex = arrangementService.getCurrentArrangementIndex();
const arrangement = arrangementService.getArrangementByIndex(arrangementIndex);

if (!arrangement) {
  console.error(`arrangement not found at CreateLayoutStructure`);
  return null;
}

let column = 0;
let row = 0;
let bookIndex = 0;
const testamentLinesInfo = [];
const sectionLinesInfo = [];
const labelInitialSpace = "   ";

// const { testamentLinesInfo, sectionLinesInfo, layoutBooksInfo, layers } = GetLayoutStructure({arrangementIndex, arrangement})

const testaments = arrangement.testaments.toReversed();
for (const testamentIndex in testaments) {
  const testamentInfo = testaments[testamentIndex];
  const testamentLineInfo = {
    name: testamentInfo.name,
    startRow: row,
    endRow: null,
    color: testamentInfo.color ?? "#FFFFFF",
    arrangementIndex,
    testamentIndex,
  };
  const sections = testamentInfo.sections.toReversed();
  for (const sectionIndex in sections) {
    const sectionInfo = sections[sectionIndex];
    const sectionLinePoints = [];
    const sectionLineInfo = {
      testamentName: testamentInfo.name,
      name: sectionInfo.name,
      segments: [],
      color: sectionInfo.color,
      arrangementIndex,
      testamentIndex,
      sectionIndex,
    };
    for (const bookInfo of sectionInfo.books.toReversed()) {
      sectionLinePoints.push({ row, column });
      const layoutBookStructure = await thisBot.CreateBookStructure({
        bookInfo,
        layoutDataId,
        column,
        row,
        structureIndex: bookIndex,
        arrangementIndex,
        testamentIndex,
        sectionIndex,
      });
      layoutBookStructures.push(layoutBookStructure);

      bookIndex++;
      column++;
      if (
        column >=
        BibleVizDataRepository.getBibleLayoutMeasurement("MaxAmountOfColumns")
      ) {
        column = 0;
        row++;
      }
    }
    for (
      let segmentRow = sectionLinePoints[0].row;
      segmentRow <= sectionLinePoints[sectionLinePoints.length - 1].row;
      segmentRow++
    ) {
      const pointsWithinSegment = sectionLinePoints.filter((point) => {
        return point.row === segmentRow;
      });
      const sortedPoints = pointsWithinSegment.toSorted((pointA, pointB) => {
        return pointA.column - pointB.column;
      });
      const segment = {
        start: sortedPoints[0],
        end: sortedPoints[sortedPoints.length - 1],
      };
      sectionLineInfo.segments.push(segment);
    }
    sectionLinesInfo.push(sectionLineInfo);
  }
  testamentLineInfo.endRow = row;
  testamentLinesInfo.push(testamentLineInfo);

  if (column > 0) {
    column = 0;
    row++;
  }
}

const cover = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutCover,
});
const cameraAnimationToggle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleButton,
});
const labelsToggle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleButton,
});
const pathToggle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleButton,
});
const chapterSelectToggle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleButton,
});
const showDatesToggle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleButton,
});
const cameraAnimationToggleBackground = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleBackground,
});
const showDatesToggleBackground = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleBackground,
});
const labelsToggleBackground = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleBackground,
});
const pathToggleBackground = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleBackground,
});
const chapterSelectToggleBackground = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleBackground,
});
const cameraAnimationToggleHandle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleHandle,
});
const showDatesToggleHandle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleHandle,
});
const labelsToggleHandle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleHandle,
});
const pathToggleHandle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleHandle,
});
const chapterSelectToggleHandle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleHandle,
});
const colorPickerButton = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButton,
});
const openAllBooksButton = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButton,
});
const openAllBooksIcon = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButtonIcon,
});
const openAllBooksLabel = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButtonLabel,
});
const colorPickerBackground = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutColorPickerBackground,
});
const colorPickerContent = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutColorPickerContent,
});
const settingsButton = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutSettingsButton,
});
const playlistSelectorButton = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButton,
});
const playlistSelectorIcon = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButtonIcon,
});
const playlistSelectorLabel = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButtonLabel,
});
const dateFormatSelectorButton = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButton,
});
const dateFormatSelectorIcon = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButtonIcon,
});
const dateFormatSelectorLabel = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutButtonLabel,
});

const playlistPathToggle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleButton,
});
const playlistPathToggleBackground = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleBackground,
});
const playlistPathToggleHandle = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.LayoutToggleHandle,
});

const settingsButtonsBaseTags = {
  layoutId: layoutDataId,
  isSettingsPiece: true,
};

const playlistPathToggleMod = {
  background: `🔗${playlistPathToggleBackground.id}`,
  handle: `🔗${playlistPathToggleHandle.id}`,
  label: labelInitialSpace + "Playlist path",
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.PlaylistPathToggle,
  ...settingsButtonsBaseTags,
};
const playlistPathToggleBackgroundMod = settingsButtonsBaseTags;
const playlistPathToggleHandleMod = settingsButtonsBaseTags;

const coverMod = settingsButtonsBaseTags;

const cameraAnimationToggleMod = {
  background: `🔗${cameraAnimationToggleBackground.id}`,
  handle: `🔗${cameraAnimationToggleHandle.id}`,
  label: labelInitialSpace + "Camera Animation",
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.CameraAnimationToggle,
  ...settingsButtonsBaseTags,
};
const cameraAnimationToggleBackgroundMod = settingsButtonsBaseTags;
const cameraAnimationToggleHandleMod = settingsButtonsBaseTags;

const labelsToggleMod = {
  background: `🔗${labelsToggleBackground.id}`,
  handle: `🔗${labelsToggleHandle.id}`,
  label: labelInitialSpace + "Labels",
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.ShowLabelsToggle,
  ...settingsButtonsBaseTags,
};
const labelsToggleBackgroundMod = settingsButtonsBaseTags;
const labelsToggleHandleMod = settingsButtonsBaseTags;

const pathToggleMod = {
  background: `🔗${pathToggleBackground.id}`,
  handle: `🔗${pathToggleHandle.id}`,
  label: labelInitialSpace + "Path",
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.PathToggle,
  ...settingsButtonsBaseTags,
};
const pathToggleBackgroundMod = settingsButtonsBaseTags;
const pathToggleHandleMod = settingsButtonsBaseTags;

const chapterSelectToggleMod = {
  background: `🔗${chapterSelectToggleBackground.id}`,
  handle: `🔗${chapterSelectToggleHandle.id}`,
  label: labelInitialSpace + "Chapter Expand",
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.ChapterExpandToggle,
  ...settingsButtonsBaseTags,
};
const chapterSelectToggleBackgroundMod = settingsButtonsBaseTags;
const chapterSelectToggleHandleMod = settingsButtonsBaseTags;

const colorPickerButtonMod = {
  colorContent: `🔗${colorPickerContent.id}`,
  colorBackground: `🔗${colorPickerBackground.id}`,
  label: labelInitialSpace + "Color",
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.ColorPickerButton,
  ...settingsButtonsBaseTags,
};
const colorPickerBackgroundMod = settingsButtonsBaseTags;
const colorPickerContentMod = settingsButtonsBaseTags;

const showDatesToggleMod = {
  background: `🔗${showDatesToggleBackground.id}`,
  handle: `🔗${showDatesToggleHandle.id}`,
  label: labelInitialSpace + "Show dates",
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.ShowDatesToggle,
  ...settingsButtonsBaseTags,
};
const showDatesToggleBackgroundMod = settingsButtonsBaseTags;
const showDatesToggleHandleMod = settingsButtonsBaseTags;

const dateFormatselectorButtonMod = {
  buttonIcon: `🔗${dateFormatSelectorIcon.id}`,
  buttonLabel: `🔗${dateFormatSelectorLabel.id}`,
  draggable: false,
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.DateFormatSelectorButton,
  ...settingsButtonsBaseTags,
};
const dateFormatselectorLabelMod = {
  label: "Change date format",
  ...settingsButtonsBaseTags,
};
const dateFormatselectorIconMod = {
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Canvas/4d3c62e30cd5b0e38bba9463df006b89af865e0cba30072062ff6da7f95f7eab.png",
  ...settingsButtonsBaseTags,
};

const openAllBooksButtonMod = {
  buttonLabel: `🔗${openAllBooksLabel.id}`,
  buttonIcon: `🔗${openAllBooksIcon.id}`,
  draggable: false,
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton,
  closeIcon:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/a71bb7fc57da5acf0ebcb801c7f3a0e3639e0234dababcc6f2ad169a3bb3987c.webp",
  openIcon:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/988824600f85ac5099c901f6a3388bec73fb10c64c8a1c9f23454a32d96aa33b.webp",
  ...settingsButtonsBaseTags,
};
const openAllBooksLabelMod = {
  label: "Open all books",
  ...settingsButtonsBaseTags,
};
const openAllBooksIconMod = settingsButtonsBaseTags;

// const playlistButtonMod = settingsButtonsBaseTags;

const playlistSelectorButtonMod = {
  buttonLabel: `🔗${playlistSelectorLabel.id}`,
  buttonIcon: `🔗${playlistSelectorIcon.id}`,
  draggable: false,
  buttonType: BibleVizUtils.Data.tags.LayoutButtonType.PlaylistSelectorButton,
  ...settingsButtonsBaseTags,
};
const playlistSelectorLabelMod = {
  label: "Show playlist",
  ...settingsButtonsBaseTags,
};
const playlistSelectorIconMod = {
  formAddress:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Canvas/ef127b06aa78dae76cf984793b862d7fd73f062ab58f37ba13880d981aae7352.png",
  ...settingsButtonsBaseTags,
};

const settingsButtonMod = settingsButtonsBaseTags;

cover.OnSpawned({ mod: coverMod });
cameraAnimationToggle.OnSpawned({ mod: cameraAnimationToggleMod });
cameraAnimationToggleBackground.OnSpawned({
  mod: cameraAnimationToggleBackgroundMod,
});
cameraAnimationToggleHandle.OnSpawned({ mod: cameraAnimationToggleHandleMod });

showDatesToggle.OnSpawned({ mod: showDatesToggleMod });
showDatesToggleBackground.OnSpawned({ mod: showDatesToggleBackgroundMod });
showDatesToggleHandle.OnSpawned({ mod: showDatesToggleHandleMod });

playlistSelectorButton.OnSpawned({ mod: playlistSelectorButtonMod });
playlistSelectorLabel.OnSpawned({ mod: playlistSelectorLabelMod });
playlistSelectorIcon.OnSpawned({ mod: playlistSelectorIconMod });

dateFormatSelectorButton.OnSpawned({ mod: dateFormatselectorButtonMod });
dateFormatSelectorLabel.OnSpawned({ mod: dateFormatselectorLabelMod });
dateFormatSelectorIcon.OnSpawned({ mod: dateFormatselectorIconMod });

labelsToggle.OnSpawned({ mod: labelsToggleMod });
labelsToggleBackground.OnSpawned({ mod: labelsToggleBackgroundMod });
labelsToggleHandle.OnSpawned({ mod: labelsToggleHandleMod });
pathToggle.OnSpawned({ mod: pathToggleMod });
pathToggleBackground.OnSpawned({ mod: pathToggleBackgroundMod });
pathToggleHandle.OnSpawned({ mod: pathToggleHandleMod });
chapterSelectToggle.OnSpawned({ mod: chapterSelectToggleMod });
chapterSelectToggleBackground.OnSpawned({
  mod: chapterSelectToggleBackgroundMod,
});
chapterSelectToggleHandle.OnSpawned({ mod: chapterSelectToggleHandleMod });
colorPickerButton.OnSpawned({ mod: colorPickerButtonMod });
colorPickerBackground.OnSpawned({ mod: colorPickerBackgroundMod });
colorPickerContent.OnSpawned({ mod: colorPickerContentMod });
openAllBooksButton.OnSpawned({ mod: openAllBooksButtonMod });
openAllBooksLabel.OnSpawned({ mod: openAllBooksLabelMod });
openAllBooksIcon.OnSpawned({ mod: openAllBooksIconMod });
settingsButton.OnSpawned({ mod: settingsButtonMod });

playlistPathToggle.OnSpawned({ mod: playlistPathToggleMod });
playlistPathToggleBackground.OnSpawned({
  mod: playlistPathToggleBackgroundMod,
});
playlistPathToggleHandle.OnSpawned({ mod: playlistPathToggleHandleMod });

const staticLayoutPieces = {
  cover,
  settingsButtons: [
    cameraAnimationToggle,
    showDatesToggle,
    labelsToggle,
    pathToggle,
    chapterSelectToggle,
    playlistPathToggle,
    colorPickerButton,
    openAllBooksButton,
    dateFormatSelectorButton,
    playlistSelectorButton,
  ],
  settingsButton,
  colorPickerContent,
  sectionLines: [],
  sectionLabels: [],
  testamentLines: [],
  testamentLabels: [],
};

return {
  layoutBookStructures,
  staticLayoutPieces,
  amountOfRows: row,
  sectionLinesInfo,
  testamentLinesInfo,
};
