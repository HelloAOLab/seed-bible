const { mapData, position } = that;

const dimension = os.getCurrentDimension()
const toggleBackgroundPadding = 0.5
const colorPickerBackgroundPadding = 0.8
const buttonMargin = new Vector2(1, 0.4);
// const spaceBetweenButtons = 2.5;
const settingsButtonMargin = 0.75;
const buttonGap = 0.25;
const coverPadding = new Vector2(10, 8);

// const fixedLabelWidth = 4.5;
const bookShowDelay = 500;

mapData.childrenStructures.forEach(async (mapBookStructure) => {
    thisBot.SpawnMapBook({ mapBookStructure, mapData })
})
const rowSegments = [];
const BooksOriginOffset = new Vector2(0, 0);
const booksOriginPosition = new Vector2(BooksOriginOffset.x + position.x, BooksOriginOffset.y + position.y);
let currRowPosition = booksOriginPosition.y;
const sectionLineScaleY = 0.2;
const sectionLineLabelScaleY = 1;
const columnsSegments = [];
for(let i = 0 ; i < Math.min(MapElementMeasurements.MaxAmountOfColumns, mapData.childrenStructures.length) ; i++)
{
    const segment = {
        start: booksOriginPosition.x + ((MapElementMeasurements.BookScaleX + MapElementMeasurements.BookHorizontalGap) * i),
        end: booksOriginPosition.x + ((MapElementMeasurements.BookScaleX + MapElementMeasurements.BookHorizontalGap) * i) + MapElementMeasurements.BookScaleX
    }
    columnsSegments.push(segment)
}

for(let row = 0; row < mapData.amountOfRows; row++)
{
    const rowSegment = {start: currRowPosition}

    let greaterBookScaleY = 0;
    const bookStructuresWithinRow = mapData.childrenStructures.filter((mapBookStructure) => {return mapBookStructure.row === row});

    bookStructuresWithinRow.forEach((mapBookStructure) => {

        if(mapBookStructure.mapBookData.element.tags.scaleY > greaterBookScaleY) greaterBookScaleY = mapBookStructure.mapBookData.element.tags.scaleY;

        const bookPosition = new Vector2(
            booksOriginPosition.x + (mapBookStructure.mapBookData.element.tags.scaleX/2) + ((mapBookStructure.mapBookData.element.tags.scaleX + MapElementMeasurements.BookHorizontalGap) * mapBookStructure.column),
            currRowPosition - sectionLineLabelScaleY - sectionLineScaleY - MapElementMeasurements.BookVerticalGap - MapElementMeasurements.BookLabelHeight - (mapBookStructure.mapBookData.element.tags.scaleY/2),
        )
        setTag(mapBookStructure.mapBookData.element, dimension + "X", bookPosition.x);
        setTag(mapBookStructure.mapBookData.element, dimension + "Y", bookPosition.y);

        const mapBookNameLabelMod = {
            [dimension]: true,
            [dimension + "X"]: bookPosition.x,
            [dimension + "Y"]: currRowPosition - sectionLineLabelScaleY - sectionLineScaleY - MapElementMeasurements.BookVerticalGap - (MapElementMeasurements.BookLabelHeight/2),
            [dimension + "Z"]: 0.5,
            isClick: false,
            label: mapBookStructure.mapBookData.elementInfo.commonName,
            scaleX: MapElementMeasurements.BookScaleX,
            scaleY: MapElementMeasurements.BookLabelHeight
        }

        let mapBookDateLabelLabel;
        switch(mapData.currentDateFormat)
        {
            case DateFormats.ElapsedYears: {
                mapBookDateLabelLabel = mapBookStructure.elapsedYearsRange
            }
            break;
            case DateFormats.HistoricalDate: {
                mapBookDateLabelLabel = mapBookStructure.historicalDateRange
            }
            break;
        }

        const sectionColor = InstanceManager.vars.fixedArrangementsInfo[mapBookStructure.mapBookData.creationInfo.arrangementIndex]
        .testaments
        .toReversed()[mapBookStructure.mapBookData.creationInfo.testamentIndex]
        .sections
        .toReversed()[mapBookStructure.mapBookData.creationInfo.sectionIndex]
        .color
        const labelColor = GetTextColorBasedOnBackground(sectionColor)

        const mapBookDateLabelMod = {
            [dimension]: false,
            [dimension + "X"]: bookPosition.x,
            [dimension + "Y"]: currRowPosition - sectionLineLabelScaleY - (sectionLineScaleY/2),
            [dimension + "Z"]: 1 + sectionLineScaleY,
            isHover: true,
            hidden: false,
            isClick: true,
            scaleX: MapElementMeasurements.BookScaleX,
            label: mapBookDateLabelLabel,
            labelColor: "black",
            initialLabelcolor: labelColor
        }

        applyMod(mapBookStructure.dateLabel, mapBookDateLabelMod);
        applyMod(mapBookStructure.nameLabel, mapBookNameLabelMod);
    }) 

    rowSegment.end = rowSegment.start  - sectionLineLabelScaleY - sectionLineScaleY - MapElementMeasurements.BookVerticalGap - MapElementMeasurements.BookLabelHeight - greaterBookScaleY
    currRowPosition += (rowSegment.end - rowSegment.start - MapElementMeasurements.BookVerticalGap);
    rowSegments.push(rowSegment);
}

for(const testamentLineInfo of mapData.testamentLinesInfo)
{
    const scaleX = sectionLineScaleY;
    const scaleY = Math.abs(rowSegments[testamentLineInfo.endRow].end - rowSegments[testamentLineInfo.startRow].start);
    const positionX = columnsSegments[0].start - MapElementMeasurements.BookHorizontalGap - (sectionLineScaleY/2);
    const positionY = rowSegments[testamentLineInfo.startRow].start - (scaleY/2);
    const line = ObjectPooler.GetObjectFromPool({ tag: ObjectPoolTags.MapLine });
    const label = ObjectPooler.GetObjectFromPool({ tag: ObjectPoolTags.MapLabel });
    const lineMod = {
        lineInfo: testamentLineInfo,
        mapId: mapData.id,
        space: "tempLocal",
        scaleX,
        scaleY,
        scaleZ: sectionLineScaleY,
        [dimension]: false,
        [dimension + "X"]: positionX,
        [dimension + "Y"]: positionY,
        [dimension + "Z"]: 1,
        color: testamentLineInfo.color,
        initialColor: testamentLineInfo.color
    }
    const labelMod = {
        mapId: mapData.id,
        space: "tempLocal",
        scaleX: scaleY,
        scaleY: sectionLineLabelScaleY,
        scaleZ: sectionLineScaleY,
        [dimension]: false,
        [dimension + "X"]: positionX - (sectionLineLabelScaleY/2),
        [dimension + "Y"]: positionY,
        [dimension + "Z"]: 1,
        [dimension + "RotationZ"]: math.degreesToRadians(90),
        label: testamentLineInfo.name,
        color: "clear",
        pointable: false
    }
    line.OnSpawned({ mod: lineMod });
    label.OnSpawned({ mod: labelMod });
    mapData.staticMapElements.testamentLines.push(line);
    mapData.staticMapElements.testamentLabels.push(label);
}

for(const sectionLineInfo of mapData.sectionLinesInfo)
{
    const segmentLabelIndex = (sectionLineInfo.segments.length / 2) + (sectionLineInfo.segments.length % 2 === 0 ? -1 : -0.5)
    for(const segmentIndex in sectionLineInfo.segments)
    {
        const segment = sectionLineInfo.segments[segmentIndex];
        const scaleX = Math.abs(columnsSegments[segment.end.column].end - columnsSegments[segment.start.column].start);
        const positionX = columnsSegments[segment.start.column].start + (scaleX/2);
        const positionY = rowSegments[segment.start.row].start - (sectionLineScaleY/2) - sectionLineLabelScaleY;
        const line = ObjectPooler.GetObjectFromPool({ tag: ObjectPoolTags.MapLine });
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
            mapId: mapData.id
        }
        line.OnSpawned({ mod: lineMod });

        mapData.staticMapElements.sectionLines.push(line)
        
        if(segmentIndex == segmentLabelIndex)
        {
            const label = ObjectPooler.GetObjectFromPool({ tag: ObjectPoolTags.MapLabel });
            const labelMod = {
                space: "tempLocal",
                scaleX,
                scaleY: sectionLineLabelScaleY,
                scaleZ: sectionLineScaleY,
                [dimension]: false,
                [dimension + "X"]: positionX,
                [dimension + "Y"]: rowSegments[segment.start.row].start - (sectionLineLabelScaleY/2),
                [dimension + "Z"]: 1,
                label: sectionLineInfo.name,
                color: "clear",
                pointable: false,
                mapId: mapData.id
            }
            label.OnSpawned({ mod: labelMod });

            mapData.staticMapElements.sectionLabels.push(label)
        }
    }
}

const booksGridScales = {
    x: Math.abs(columnsSegments[columnsSegments.length - 1].end - columnsSegments[0].start), 
    y: Math.abs(currRowPosition - booksOriginPosition.y)
}
const coverScales = new Vector2(booksGridScales.x + coverPadding.x, booksGridScales.y + coverPadding.y)
const gridElementsOffset = new Vector3(-booksGridScales.x/2, booksGridScales.y/2, 0);
const bookGridElements = [
    ...mapData.childrenStructures.flatMap((mapBookStructure) => {
        return [mapBookStructure.mapBookData.element, mapBookStructure.nameLabel, mapBookStructure.dateLabel]
    }),
    ...mapData.staticMapElements.testamentLines,
    ...mapData.staticMapElements.testamentLabels,
    ...mapData.staticMapElements.sectionLines,
    ...mapData.staticMapElements.sectionLabels
]

bookGridElements.forEach((element) => {
    const currPosition = getBotPosition(element, dimension);
    const newPosition = currPosition.add(gridElementsOffset);
    const mod = {
        [dimension + "X"]: newPosition.x,
        [dimension + "Y"]: newPosition.y
    }
    applyMod(element, mod);
})

const coverMod = {
    [dimension]: true,
    [dimension + "X"]: position.x,
    [dimension + "Y"]: position.y,
    scaleX: coverScales.x,
    scaleY: coverScales.y,
    toErase: true,
    draggable: false,
    system: null,
    pointable: false
}

const buttonPosition = new Vector3(
    position.x - (coverScales.x/2) - (links.baseToggle.tags.scaleX/2) - buttonMargin.x,
    0,
    0
)
const toggleHandleMarginZ = 0.01;

mapData.staticMapElements.settingsButtons.forEach((settingsButton, index) => {
    buttonPosition.y = position.y + (coverScales.y/2) - (links.baseToggle.tags.scaleY/2) - buttonMargin.y - ((links.baseToggle.tags.scaleY + buttonMargin.y) * index)
    
    const buttonMod = {
        [dimension]: false,
        [dimension + "X"]: buttonPosition.x,
        [dimension + "Y"]: buttonPosition.y,
        [dimension + "Z"]: buttonPosition.z
    }

    switch(settingsButton.tags.buttonType)
    {
        case MapButtonType.CameraAnimationToggle: 
        case MapButtonType.ShowLabelsToggle: 
        case MapButtonType.PathToggle: 
        case MapButtonType.ChapterExpandToggle: 
        case MapButtonType.PlaylistPathToggle:
        case MapButtonType.ShowDatesToggle: {
            const toggleBackgroundMod = {
                [dimension]: false,
                [dimension + "X"]: buttonMod[dimension + "X"] + (links.baseToggle.tags.scaleX / 2) - (links.baseToggleBackground.tags.scaleX / 2) - toggleBackgroundPadding,
                [dimension + "Y"]: buttonMod[dimension + "Y"],
                [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ
            }
            const toggleHandleMod = {
                [dimension]: false,
                [dimension + "X"]: toggleBackgroundMod[dimension + "X"] - (links.baseToggleBackground.tags.scaleX / 2) + (links.baseToggleHandle.tags.scaleX / 2) + ((links.baseToggleBackground.tags.scaleY - links.baseToggleHandle.tags.scaleY) / 2),
                [dimension + "Y"]: buttonMod[dimension + "Y"],
                [dimension + "Z"]: buttonMod[dimension + "Z"] + (toggleHandleMarginZ * 2)
            }
            applyMod(settingsButton.links.background, toggleBackgroundMod);
            applyMod(settingsButton.links.handle, toggleHandleMod);
        }
        break;
        case MapButtonType.ColorPickerButton: {
            const colorPickerBackgroundMod = {
                [dimension]: false,
                [dimension + "X"]: buttonMod[dimension + "X"] + (links.baseToggle.tags.scaleX / 2) - (links.baseColorPickerBackground.tags.scaleX / 2) - colorPickerBackgroundPadding,
                [dimension + "Y"]: buttonMod[dimension + "Y"],
                [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ
            }
            const colorPickerContentMod = {
                [dimension]: false,
                [dimension + "X"]: colorPickerBackgroundMod[dimension + "X"],
                [dimension + "Y"]: colorPickerBackgroundMod[dimension + "Y"],
                [dimension + "Z"]: buttonMod[dimension + "Z"] + (toggleHandleMarginZ * 2),
                color: mapData.chapterSelectColor
            }
            applyMod(settingsButton.links.colorContent, colorPickerContentMod);
            applyMod(settingsButton.links.colorBackground, colorPickerBackgroundMod);
        }
        break;
        case MapButtonType.DateFormatSelectorButton:
        case MapButtonType.OpenAllBooksButton:
        case MapButtonType.PlaylistSelectorButton: {
            
            const scaleXLimit = links.baseToggle.tags.scaleX - links.baseButtonIcon.tags.scaleX - buttonGap
            const {scaleX: labelScaleX} = GetDialogBotScaleY(scaleXLimit, settingsButton.links.buttonLabel.tags.label, 0, 0)
            
            const buttonContentScaleX = labelScaleX + links.baseButtonIcon.tags.scaleX + buttonGap;

            const labelMod = {
                [dimension]: false,
                [dimension + "X"]: buttonMod[dimension + "X"] + (buttonContentScaleX / 2) - (labelScaleX / 2),
                [dimension + "Y"]: buttonMod[dimension + "Y"],
                [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ,
                scaleX: labelScaleX
            }
            const iconMod = {
                [dimension]: false,
                [dimension + "X"]: buttonMod[dimension + "X"] - (buttonContentScaleX / 2) + (links.baseButtonIcon.tags.scaleX / 2),
                [dimension + "Y"]: buttonMod[dimension + "Y"],
                [dimension + "Z"]: buttonMod[dimension + "Z"] + toggleHandleMarginZ
            }
            applyMod(settingsButton.links.buttonLabel, labelMod);
            applyMod(settingsButton.links.buttonIcon, iconMod);
        }
        break;
    }

    applyMod(settingsButton, buttonMod);
})

const settingsButtonMod = {
    [dimension]: true,
    [dimension + "X"]: position.x - (coverScales.x / 2) + (links.baseSettingsButton.tags.scaleX / 2) + settingsButtonMargin,
    [dimension + "Y"]: position.y + (coverScales.y / 2) - (links.baseSettingsButton.tags.scaleY / 2) - settingsButtonMargin,
    [dimension + "Z"]: mapData.staticMapElements.cover.tags.scaleZ + 0.01,
    [dimension + "RotationZ"]: Math.PI,
    isShowingSettings: false
}

applyMod(mapData.staticMapElements.settingsButton, settingsButtonMod)
applyMod(mapData.staticMapElements.cover, coverMod);

// thisBot.TryShowDatesOnMap({ mapData })
thisBot.TryShowLabelsOnMap({ mapData });
mapData.childrenStructures.forEach((mapBookStructure, index) => {
    animateTag(mapBookStructure.mapBookData.element, {
        fromValue: {
            formOpacity: 0
        },
        toValue: {
            formOpacity: 1,
        },
        duration: 0.007,
        startTime: os.localTime + bookShowDelay + (index * 20),
    })
})