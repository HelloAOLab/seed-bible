const { layoutData } = that;

const bookStructures = [];
const arrangementIndex = BibleVizUtils.Functions.GetCurrentArrangementIndex();
const arrangement = BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex];
let column = 0;
let row = 0;
let bookIndex = 0;
const testamentLinesInfo = [];
const sectionLinesInfo = [];
const labelInitialSpace = "   ";

// const { testamentLinesInfo, sectionLinesInfo, mapBooksInfo, layers } = GetLayoutStructure({arrangementIndex, arrangement})

const testaments = arrangement.testaments.toReversed()
for(const testamentIndex in testaments)
{
    const testamentInfo = testaments[testamentIndex];
    const testamentLineInfo = {
        name: testamentInfo.name,
        startRow: row,
        endRow: null,
        color: testamentInfo.color ?? "#FFFFFF",
        arrangementIndex,
        testamentIndex
    }
    const sections = testamentInfo.sections.toReversed()
    for(const sectionIndex in sections)
    {
        const sectionInfo = sections[sectionIndex]
        const sectionLinePoints = []
        const sectionLineInfo = {
            testamentName: testamentInfo.name,
            name: sectionInfo.name,
            segments: [],
            color: sectionInfo.color,
            arrangementIndex,
            testamentIndex,
            sectionIndex
        }
        for(const bookInfo of sectionInfo.books.toReversed())
        {
            sectionLinePoints.push({row, column});
            const layoutBookStructure = await thisBot.CreateBookStructure({
                bookInfo, 
                layoutData, 
                column, 
                row, 
                structureIndex: bookIndex, 
                arrangementIndex, 
                testamentIndex, 
                sectionIndex
                
            });
            bookStructures.push(layoutBookStructure);

            bookIndex++
            column++
            if(column >= BibleVizUtils.Data.BibleLayoutMeasurements.MaxAmountOfColumns)
            {
                column = 0;
                row++;
            }
        }
        for(let segmentRow = sectionLinePoints[0].row ; segmentRow <= sectionLinePoints[sectionLinePoints.length - 1].row ; segmentRow++)
        {
            const pointsWithinSegment = sectionLinePoints.filter((point) => {return point.row === segmentRow});
            const sortedPoints = pointsWithinSegment.toSorted((pointA, pointB) => {
                return pointA.column - pointB.column
            })
            const segment = {
                start: sortedPoints[0], 
                end: sortedPoints[sortedPoints.length - 1]
            }
            sectionLineInfo.segments.push(segment);
        }
        sectionLinesInfo.push(sectionLineInfo);
    }
    testamentLineInfo.endRow = row;
    testamentLinesInfo.push(testamentLineInfo);

    if(column > 0)
    {
        column = 0;
        row++;
    }
}

const cover = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutCover });
const cameraAnimationToggle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton });
const labelsToggle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton });
const pathToggle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton });
const chapterSelectToggle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton });
const showDatesToggle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton });
const cameraAnimationToggleBackground = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground });
const showDatesToggleBackground = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground });
const labelsToggleBackground = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground });
const pathToggleBackground = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground });
const chapterSelectToggleBackground = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground });
const cameraAnimationToggleHandle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle });
const showDatesToggleHandle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle });
const labelsToggleHandle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle });
const pathToggleHandle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle });
const chapterSelectToggleHandle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle });
const colorPickerButton = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButton });
const openAllBooksButton = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButton });
const openAllBooksIcon = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonIcon });
const openAllBooksLabel = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonLabel });
const colorPickerBackground = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerBackground });
const colorPickerContent = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerContent });
const settingsButton = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutSettingsButton });
const playlistSelectorButton = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButton });
const playlistSelectorIcon = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonIcon });
const playlistSelectorLabel = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonLabel });
const dateFormatSelectorButton = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButton });
const dateFormatSelectorIcon = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonIcon });
const dateFormatSelectorLabel = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonLabel });

const playlistPathToggle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleButton });
const playlistPathToggleBackground = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleBackground });
const playlistPathToggleHandle = ObjectPooler.GetObjectFromPool({ tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutToggleHandle });

const settingsButtonsBaseTags = {
    layoutId: layoutData.id, 
    isSettingsElement: true
}

const playlistPathToggleMod = { 
    background: `🔗${playlistPathToggleBackground.id}`, 
    handle: `🔗${playlistPathToggleHandle.id}`,
    label: labelInitialSpace + "Playlist path",
    buttonType: BibleVizUtils.Data.LayoutButtonType.PlaylistPathToggle,
    ...settingsButtonsBaseTags
}
const playlistPathToggleBackgroundMod = settingsButtonsBaseTags;
const playlistPathToggleHandleMod = settingsButtonsBaseTags;

const coverMod = settingsButtonsBaseTags;

const cameraAnimationToggleMod = { 
    background: `🔗${cameraAnimationToggleBackground.id}`, 
    handle: `🔗${cameraAnimationToggleHandle.id}`,
    label: labelInitialSpace + "Camera Animation",
    buttonType: BibleVizUtils.Data.LayoutButtonType.CameraAnimationToggle,
    ...settingsButtonsBaseTags
}
const cameraAnimationToggleBackgroundMod = settingsButtonsBaseTags;
const cameraAnimationToggleHandleMod = settingsButtonsBaseTags;

const labelsToggleMod = { 
    background: `🔗${labelsToggleBackground.id}`, 
    handle: `🔗${labelsToggleHandle.id}`,
    label: labelInitialSpace + "Labels",
    buttonType: BibleVizUtils.Data.LayoutButtonType.ShowLabelsToggle,
    ...settingsButtonsBaseTags
};
const labelsToggleBackgroundMod = settingsButtonsBaseTags;
const labelsToggleHandleMod = settingsButtonsBaseTags;

const pathToggleMod = {
    background: `🔗${pathToggleBackground.id}`, 
    handle: `🔗${pathToggleHandle.id}`,
    label: labelInitialSpace + "Path",
    buttonType: BibleVizUtils.Data.LayoutButtonType.PathToggle,
    ...settingsButtonsBaseTags
}
const pathToggleBackgroundMod = settingsButtonsBaseTags
const pathToggleHandleMod = settingsButtonsBaseTags

const chapterSelectToggleMod = {
    background: `🔗${chapterSelectToggleBackground.id}`, 
    handle: `🔗${chapterSelectToggleHandle.id}`,
    label: labelInitialSpace + "Chapter Expand",
    buttonType: BibleVizUtils.Data.LayoutButtonType.ChapterExpandToggle,
    ...settingsButtonsBaseTags
}
const chapterSelectToggleBackgroundMod = settingsButtonsBaseTags
const chapterSelectToggleHandleMod = settingsButtonsBaseTags

const colorPickerButtonMod = {
    colorContent: `🔗${colorPickerContent.id}`,
    colorBackground: `🔗${colorPickerBackground.id}`,
    label: labelInitialSpace + "Color",
    buttonType: BibleVizUtils.Data.LayoutButtonType.ColorPickerButton,
    ...settingsButtonsBaseTags
}
const colorPickerBackgroundMod = settingsButtonsBaseTags
const colorPickerContentMod = settingsButtonsBaseTags

const showDatesToggleMod =  {
    background: `🔗${showDatesToggleBackground.id}`, 
    handle: `🔗${showDatesToggleHandle.id}`,
    label: labelInitialSpace + "Show dates",
    buttonType: BibleVizUtils.Data.LayoutButtonType.ShowDatesToggle,
    ...settingsButtonsBaseTags
}
const showDatesToggleBackgroundMod = settingsButtonsBaseTags;
const showDatesToggleHandleMod = settingsButtonsBaseTags;

const dateFormatSelectorButtonMod = {
    buttonIcon: `🔗${dateFormatSelectorIcon.id}`,
    buttonLabel: `🔗${dateFormatSelectorLabel.id}`,
    draggable: false,
    buttonType: BibleVizUtils.Data.LayoutButtonType.DateFormatSelectorButton,
    ...settingsButtonsBaseTags
};
const dateFormatSelectorLabelMod = { label: "Change date format", ...settingsButtonsBaseTags };
const dateFormatSelectorIconMod = {
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Canvas/4d3c62e30cd5b0e38bba9463df006b89af865e0cba30072062ff6da7f95f7eab.png",
    ...settingsButtonsBaseTags
};

const openAllBooksButtonMod = {
    buttonLabel: `🔗${openAllBooksLabel.id}`, 
    buttonIcon: `🔗${openAllBooksIcon.id}`,
    draggable: false,
    buttonType: BibleVizUtils.Data.LayoutButtonType.OpenAllBooksButton,
    closeIcon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/a71bb7fc57da5acf0ebcb801c7f3a0e3639e0234dababcc6f2ad169a3bb3987c.webp",
    openIcon: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/988824600f85ac5099c901f6a3388bec73fb10c64c8a1c9f23454a32d96aa33b.webp",
    ...settingsButtonsBaseTags
}
const openAllBooksLabelMod = { label: "Open all books", ...settingsButtonsBaseTags};
const openAllBooksIconMod = settingsButtonsBaseTags;

// const playlistButtonMod = settingsButtonsBaseTags;

const playlistSelectorButtonMod = {
    buttonLabel: `🔗${playlistSelectorLabel.id}`, 
    buttonIcon: `🔗${playlistSelectorIcon.id}`,
    draggable: false,
    buttonType: BibleVizUtils.Data.LayoutButtonType.PlaylistSelectorButton,
    ...settingsButtonsBaseTags
}
const playlistSelectorLabelMod = { label: "Show playlist", ...settingsButtonsBaseTags };
const playlistSelectorIconMod = {
    formAddress: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Canvas/ef127b06aa78dae76cf984793b862d7fd73f062ab58f37ba13880d981aae7352.png",
    ...settingsButtonsBaseTags
};

const settingsButtonMod = settingsButtonsBaseTags;

cover.OnSpawned({ mod: coverMod });
cameraAnimationToggle.OnSpawned({ mod: cameraAnimationToggleMod });
cameraAnimationToggleBackground.OnSpawned({ mod: cameraAnimationToggleBackgroundMod });
cameraAnimationToggleHandle.OnSpawned({ mod: cameraAnimationToggleHandleMod })

showDatesToggle.OnSpawned({ mod: showDatesToggleMod });
showDatesToggleBackground.OnSpawned({ mod: showDatesToggleBackgroundMod });
showDatesToggleHandle.OnSpawned({ mod: showDatesToggleHandleMod })

playlistSelectorButton.OnSpawned({mod: playlistSelectorButtonMod});
playlistSelectorLabel.OnSpawned({mod: playlistSelectorLabelMod});
playlistSelectorIcon.OnSpawned({mod: playlistSelectorIconMod});

dateFormatSelectorButton.OnSpawned({ mod: dateFormatSelectorButtonMod });
dateFormatSelectorLabel.OnSpawned({ mod: dateFormatSelectorLabelMod });
dateFormatSelectorIcon.OnSpawned({ mod: dateFormatSelectorIconMod });

labelsToggle.OnSpawned({ mod: labelsToggleMod })
labelsToggleBackground.OnSpawned({ mod: labelsToggleBackgroundMod })
labelsToggleHandle.OnSpawned({ mod: labelsToggleHandleMod })
pathToggle.OnSpawned({ mod: pathToggleMod })
pathToggleBackground.OnSpawned({ mod: pathToggleBackgroundMod })
pathToggleHandle.OnSpawned({ mod: pathToggleHandleMod })
chapterSelectToggle.OnSpawned({ mod: chapterSelectToggleMod })
chapterSelectToggleBackground.OnSpawned({ mod: chapterSelectToggleBackgroundMod })
chapterSelectToggleHandle.OnSpawned({ mod: chapterSelectToggleHandleMod })
colorPickerButton.OnSpawned({ mod: colorPickerButtonMod })
colorPickerBackground.OnSpawned({ mod: colorPickerBackgroundMod });
colorPickerContent.OnSpawned({ mod: colorPickerContentMod });
openAllBooksButton.OnSpawned({ mod: openAllBooksButtonMod })
openAllBooksLabel.OnSpawned({ mod: openAllBooksLabelMod })
openAllBooksIcon.OnSpawned({ mod: openAllBooksIconMod })
settingsButton.OnSpawned({ mod: settingsButtonMod })

playlistPathToggle.OnSpawned({mod: playlistPathToggleMod})
playlistPathToggleBackground.OnSpawned({mod: playlistPathToggleBackgroundMod})
playlistPathToggleHandle.OnSpawned({mod: playlistPathToggleHandleMod})

const staticLayoutElements = {
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
        playlistSelectorButton
    ],
    settingsButton,
    sectionLines: [],
    sectionLabels: [],
    testamentLines: [],
    testamentLabels: [],

}

return { bookStructures, staticLayoutElements, amountOfRows: row, sectionLinesInfo, testamentLinesInfo };