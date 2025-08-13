/**
 * Defines global constants and functions to be used across the application.
 * 
 * @example
 * thisBot.DefineGlobals();
 */

import {SectionBookData} from "interactiveBible.managers.StacksManager.SectionBookData"

// Constants

const PlaylistItemType =  {
    Verse: "verse",
    Date: "date",
    Chapter: "chapter"
}

const BibleType = {
    Default: "Default",
    PlatformerGame: "PlatformerGame"
}

const BRUSH_CURSOR_URL = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/c323206388a7991796eef65d04389cb68ff9876a20457b6f54009de84509aaf5.webp"

const UsersColorValues = {
    InfoLabelColorScales: {x: 0.5, y: 0.5, z: 0},
    InfoLabelExtraUsersContentScales: {x: 0.4, y: 0.4, z: 0},
    InfoLabelExtraUsersBackgroundScales: {x: 0.5, y: 0.5, z: 0},
    InfoLabelColorForm: "circle",
    InfoLabelColorOffset: new Vector3(0.25, 0, 0.1),
    InfoLabelColorStep: new Vector3(0.3, 0, 0.02),
    ChapterColorOffset: new Vector3(0.075, 0.075, 0),
    ChapterColorStep: new Vector3(0.275, 0, 0),
    GroundedElementColorScales: {x: 0.25, y: 0.25, z: 0.125},
    GroundedElementExtraUsersContentScales: {x: 0.2, y: 0.2, z: 0.125},
    GroundedElementExtraUsersBackgroundScales: {x: 0.25, y: 0.25, z: 0.03},
    GroundedElementColorForm: "sphere",
    MapBookColorOffset: {x: 0.1, y: 0.1, z: 0},
    MapBookColorStep: new Vector3(0.3, 0, 0),
}

const MapElementMeasurements = {
    MaxAmountOfColumns: 7,
    BookMaxAmountOfColumns: 5,
    ChapterWidth: 0.5,
    ChapterHeight: 0.5,
    ChapterPadding: 0.1,
    ChapterGap: 0.1,
    BookHorizontalGap: 1,
    BookVerticalGap: 1,
    LayersVerticalGap: [3.5, 13.5, 21.625, 30.5, 43.5, 53.5, 57.5, 61.5, 68.5, 74],
    GapBetweenBookAndLine: 1.5,
    BookHorizontalOffset: 5,
    BookLabelHeight: 1,
    BookPositionZ: 1,
    ChapterInitialScaleZ: 0.15,
    ChapterSelectedScaleZ: 0.3,
    ChapterPlaylistItemDeltaHeight: 0.075,
    PlaylistNavigationButtonVerticalGap: 1,
    PlaylistStackedEntryItemGap: 0.0375,
    PlaylistEntryItemPadding: 0.01
}
MapElementMeasurements.BookScaleX = (MapElementMeasurements.BookMaxAmountOfColumns * MapElementMeasurements.ChapterWidth) + (MapElementMeasurements.ChapterPadding * 2) + (MapElementMeasurements.ChapterGap * (MapElementMeasurements.BookMaxAmountOfColumns - 1))

const MapButtonType = {
    PlaylistPathToggle: "PlaylistPathToggle",
    CameraAnimationToggle: "CameraAnimationToggle",
    ShowLabelsToggle: "ShowLabelsToggle",
    PathToggle: "PathToggle",
    ChapterExpandToggle: "ChapterExpandToggle",
    ColorPickerButton: "ColorPickerButton",
    ShowDatesToggle: "ShowDatesToggle",
    DateFormatSelectorButton: "DateFormatSelectorButton",
    OpenAllBooksButton: "OpenAllBooksButton",
    PlaylistSelectorButton: "PlaylistSelectorButton"
}

const DateFormats = {
    ElapsedYears: "Elapsed years",
    HistoricalDate: "Historical Date"
}

const TimeUnit = {
    Minutes: "Minutes",
    Hours: "Hours",
    Days: "Days",
    Weeks: "Weeks",
    Months: "Months",
    Years: "Years",
}

const MeshesUrls = {
    Text: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/Sandbox/64f1b9a9ff216be8eb3e673cbf0865239db1b787adc5c6dd880726872dfc5841.bin"
}

const BookNames = {
    Acts: "Acts",
    Amos: "Amos",
    Colossians: "Colossians",
    Daniel: "Daniel",
    Deuteronomy: "Deuteronomy",
    Ecclesiastes: "Ecclesiastes",
    Ephesians: "Ephesians",
    Esther: "Esther",
    Exodus: "Exodus",
    Ezekiel: "Ezekiel",
    Ezra: "Ezra",
    FifthPsalms: "5 Psalms",
    FirstChronicles: "1 Chronicles",
    FirstCorinthians: "1 Corinthians",
    FirstJohn: "1 John",
    FirstKings: "1 Kings",
    FirstPeter: "1 Peter",
    FirstSamuel: "1 Samuel",
    FirstThessalonians: "1 Thessalonians",
    FirstTimothy: "1 Timothy",
    FirstPsalms: "1 Psalms",
    FourthPsalms: "4 Psalms",
    Galatians: "Galatians",
    Genesis: "Genesis",
    Habakkuk: "Habakkuk",
    Haggai: "Haggai",
    Hebrews: "Hebrews",
    Hosea: "Hosea",
    Isaiah: "Isaiah",
    James: "James",
    Jeremiah: "Jeremiah",
    Job: "Job",
    Joel: "Joel",
    John: "John",
    Jonah: "Jonah",
    Joshua: "Joshua",
    Jude: "Jude",
    Judges: "Judges",
    Lamentations: "Lamentations",
    Leviticus: "Leviticus",
    Luke: "Luke",
    Malachi: "Malachi",
    Mark: "Mark",
    Matthew: "Matthew",
    Micah: "Micah",
    Nahum: "Nahum",
    Nehemiah: "Nehemiah",
    Numbers: "Numbers",
    Obadiah: "Obadiah",
    Philemon: "Philemon",
    Philippians: "Philippians",
    Proverbs: "Proverbs",
    Revelation: "Revelation",
    Romans: "Romans",
    Ruth: "Ruth",
    SecondChronicles: "2 Chronicles",
    SecondCorinthians: "2 Corinthians",
    SecondJohn: "2 John",
    SecondKings: "2 Kings",
    SecondPeter: "2 Peter",
    SecondPsalms: "2 Psalms",
    SecondSamuel: "2 Samuel",
    SecondThessalonians: "2 Thessalonians",
    SecondTimothy: "2 Timothy",
    SongOfSongs: "Song of Songs",
    ThirdJohn: "3 John",
    ThirdPsalms: "3 Psalms",
    Titus: "Titus",
    Zechariah: "Zechariah",
    Zephaniah: "Zephaniah"
};

const SectionNames = {
    Prophecy: "Prophecy",
    Letters: "Letters",
    History: "History",
    Gospels: "Gospels",
    Prophets: "Prophets",
    Wisdom: "Wisdom",
    Law: "Law",
    Writings: "Writings",
    Torah: "Torah",
    ChronologicalNT: 'Chronological NT',
    ChronologicalOT: 'Chronological OT'
};

const TestamentNames = {
    NewTestament: "New Testament",
    OldTestament: "Old Testament"
}

const StackArrangementNames = {
    Protestant: 'Protestant',
    Hebrew: 'Hebrew',
    Chronological: 'Chronological',
    ChronologicalAlternative: "Chronological Alternative"
}

const MapArrangementNames = {
    Hebrew: 'Hebrew',
    Protestant: 'Protestant',
    Chronological: 'Chronological',
    ChronologicalAlternative: "Chronological Alternative"
}

const InterpolatableColorTags = {
    Color: "color",
    StrokeColor: "strokeColor"
}

const ClickModality = {
    mouse: "mouse",
    touch: "touch"
}

const EnqueueChapterActions = {
    Select: "Select",
    Deselect: "Deselect"
}

const BibleState = {
    Closed: "Closed",
    Open: "Open"
}

const StackSpacing = {
    BetweenArrangements: 2.5,
    BetweenSections: 0.5,
    BetweenBooks: 0.08,
    CoverToCross: 2,
    ExplodedViewSectionPadding: 2,
    ExplodedViewSectionShadowPadding: 1,
    SelectedBookMargin: 1,
    ChapterGap: 0.05,
    SectionShadowPadding: 1
}

const StackElementMeasurements = {
    ChapterWidth: 0.5,
    ChapterHeight: 0.5,
    MinChapterBackDepth: 0.5,
    ChapterFrontDepth: 0.01,
    ChapterFrontSelectedDepth: 0.25,
    EmptySectionShadowScaleZ: 1,
    CoverScales: new Vector3(2.53, 3.85, 0.10),
    TestamentScales: new Vector3(2.27, 3.47, 0.825),
    SectionScales: new Vector2(2.04, 3.12),
    BookScales: new Vector2(1.83, 2.8),
    SectionAditionalScaleOnHover: 0.1,
    SectionDesiredScaleZRatio: 0.02,
    AditionalBookScaleOnHover: 0.1
}

const StackAnimationsDuration = {
    Highlight: 0.15,
    Unhighlight: 0.15,
    Rehighlight: 0.15,
    IncreaseHighlight: 0.15,
}

const StackElementInteractionType = {
    Click: "Click",
    Tap: "Tap",
    HoverBegin: "HoverBegin",
    HoverEnd: "HoverEnd",
    GridClick: "GridClick",
    Transition: "Transition",
    SearchBarSelection: "SearchBarSelection",
    Drag: "Drag",
    Dragging: "Dragging",
    Drop: "Drop",
    PointerUp: 'PointerUp',
    PointerDown: 'PointerDown'
}

const BibleElementType = {
    Testament: "Testament",
    Section: "Section",
    SectionBook: "SectionBook",
    Book: "Book",
    Chapter: "Chapter",
    ChunkOfVerses: 'ChunkOfVerses',
    Verse: 'Verse',
    MapBook: 'MapBook',
    MapChapter: 'MapChapter'
}

const BookShapeType = {
    Regular: "Regular",
    ExplodedView: "ExplodedView",
    Selected: "Selected",
    RegularSelected: "RegularSelected"
}

const BibleVisualizationState = {
    Regular: "Regular",
    Expanded: "Expanded"
}

const CrossPosition = {
    Top: 'Top',
    Middle: 'Middle'
}

const MouseButtonId = {left: 'left', right: 'right', middle: 'middle'}

const ObjectPoolTags = {
    ConfettiParticle: "ConfettiParticle",
    VFXParticle: "VFXParticle",
    InfoLabel: "InfoLabel",
    InfoLabelTail: "InfoLabelTail",
    InfoLabelDate: "InfoLabelDate",
    InfoLabelTransformer: "InfoLabelTransformer",
    UserColor: 'UserColor',
    DonationContainer: "DonationContainer",
    DonationFill: "DonationFill",
    BookOutline: "BookOutline",
    SectionShadow: "SectionShadow",
    DonationOutline: "DonationOutline",
    Chapter: "Chapter",
    ChunkOfVerses: 'ChunkOfVerses',
    Verse: 'Verse',
    Book: 'Book',
    Section: 'Section',
    Testament: 'Testament',
    BibleTransformer: 'BibleTransformer',
    Cover: 'Cover',
    CrossLine: 'CrossLine',
    BibleShadow: 'BibleShadow',
    MapCover: "MapCover",
    MapBook: 'MapBook',
    MapBookNameLabel: 'MapBookNameLabel',
    MapBookDateLabel: "MapBookDateLabel",
    MapBookInfoCardTransformer: "MapBookInfoCardTransformer",
    MapBookInfoCardBackground: "MapBookInfoCardBackground",
    MapBookInfoCardContent: "MapBookInfoCardContent",
    MapLine: 'MapLine',
    MapLabel: 'MapLabel',
    MapChapter: 'MapChapter',
    MapToggleButton: 'MapToggleButton',
    MapToggleBackground: 'MapToggleBackground',
    MapToggleHandle: 'MapToggleHandle',
    MapButton: 'MapButton',
    MapButtonIcon: 'MapButtonIcon',
    MapButtonLabel: 'MapButtonLabel',
    MapColorPickerBackground: 'MapColorPickerBackground',
    MapColorPickerContent: 'MapColorPickerContent',
    MapSettingsButton: 'MapSettingsButton',
    UsersNotification: 'UsersNotification',
    ElementUserColor: "ElementUserColor",
    MapChapterPlaylistEntryItem: "MapChapterPlaylistEntryItem",
    MapChapterPlaylistEntryNode: "MapChapterPlaylistEntryNode"
}

const LabelPositioning = {
    RightSided: 'RightSided',
    LeftSided: 'LeftSided',
    Top: 'Top',
    RightSidedCorner: 'RightSidedCorner'
}

const LabelDateFormats = {
    Absolute: "Absolute",
    Relative: "Relative"
}

const GameState = {
    WaitingToStart: "WaitingToStart",
    CountdownToStart: "CountdownToStart",
    Playing: "Playing",
    Pause: "Pause",
    GameOver: "GameOver"
}

globalThis.BibleState = BibleState;
globalThis.EnqueueChapterActions = EnqueueChapterActions;
globalThis.StackSpacing = StackSpacing;
globalThis.StackElementInteractionType = StackElementInteractionType;
globalThis.BibleElementType = BibleElementType;
globalThis.BookShapeType = BookShapeType;
globalThis.StackElementMeasurements = StackElementMeasurements;
globalThis.BibleVisualizationState = BibleVisualizationState;
globalThis.CrossPosition = CrossPosition;
globalThis.MOBILE_VIEWPORT_THRESHOLD = 550;
globalThis.ClickModality = ClickModality;
globalThis.MouseButtonId = MouseButtonId;
globalThis.ChapterDraggingTimeThreshold = 25;
globalThis.ObjectPoolTags = ObjectPoolTags;
globalThis.LabelPositioning = LabelPositioning;
globalThis.StackAnimationsDuration = StackAnimationsDuration;
globalThis.InterpolatableColorTags = InterpolatableColorTags;
globalThis.StackArrangementNames = StackArrangementNames;
globalThis.MapArrangementNames = MapArrangementNames;
globalThis.TestamentNames = TestamentNames;
globalThis.SectionNames = SectionNames;
globalThis.BookNames = BookNames;
globalThis.MeshesUrls = MeshesUrls;
globalThis.TimeUnit = TimeUnit;
globalThis.MapButtonType = MapButtonType;
globalThis.MapElementMeasurements = MapElementMeasurements;
globalThis.UsersColorValues = UsersColorValues;
globalThis.BRUSH_CURSOR_URL = BRUSH_CURSOR_URL
globalThis.LabelDateFormats = LabelDateFormats;
globalThis.BibleType = BibleType;
globalThis.GameState = GameState;
globalThis.DateFormats = DateFormats;
globalThis.PlaylistItemType = PlaylistItemType;


// Functions

function GetTextColorBasedOnBackground(backgroundColor) {
  /* For further reference visit https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio */

  const backgroundColorRGB = HexToRgb(backgroundColor)
  const srgb = [backgroundColorRGB[0] / 255, backgroundColorRGB[1] / 255, backgroundColorRGB[2] / 255];
  const linearRGB = srgb.map(i => 
    i <= 0.04045 ? i / 12.92 : Math.pow((i + 0.055) / 1.055, 2.4)
  );
  const relativeLuminance = 0.2126 * linearRGB[0] + 0.7152 * linearRGB[1] + 0.0722 * linearRGB[2];

  return relativeLuminance > 0.179 ? "#000000" : "#ffffff";
}

function GetChildrenLevelColors({sectionColorRGB, colorRange, levelsLength})
{
    const levelsColors = [];
    const levelsColorRange = {
        min: [Math.max(sectionColorRGB[0] - colorRange, 0), Math.max(sectionColorRGB[1] - colorRange, 0), Math.max(sectionColorRGB[2] - colorRange, 0)],
        max: [Math.min(sectionColorRGB[0] + colorRange, 255), Math.min(sectionColorRGB[1] + colorRange, 255), Math.min(sectionColorRGB[2] + colorRange, 255)]
    }
    const deltaRed = Math.floor((levelsColorRange.max[0] - levelsColorRange.min[0]) / levelsLength);
    const deltaGreen = Math.floor((levelsColorRange.max[1] - levelsColorRange.min[1]) / levelsLength);
    const deltaBlue = Math.floor((levelsColorRange.max[2] - levelsColorRange.min[2]) / levelsLength);
    
    for(let i = 0; i < levelsLength; i++)
    {
        const levelColorRGB = [levelsColorRange.min[0] + (deltaRed * i), levelsColorRange.min[1] + (deltaGreen * i), levelsColorRange.min[2] + (deltaBlue * i)];
        const levelColorHex = RgbToHex(levelColorRGB);
        levelsColors.push(levelColorHex);
    }
    return levelsColors
}

function GetHistoryColor({element, data})
{
    let entries;
    if(element) entries = GetHistoryEntriesForElement({element});
    else if(data)
    {
        const {typeOfElement, key} = data;
        entries = GetHistoryEntries({typeOfElement, key});
    }
    let color;
    if(entries.length > 0)
    {
        const entriesDeltaTime = entries.map((entry) => {return os.localTime - entry.date.getTime()});
        color = GetHistoryColorByDeltaTime(entriesDeltaTime[entriesDeltaTime.length - 1]);
    }
    else color = InstanceManager.tags.historyNullColor
    return color;
}

function GetHistoryColorByDeltaTime(deltaTime)
{
    const sortedTimePeriods = InstanceManager.masks.historyTimePeriodsInfo.toSorted((periodInfoA, periodInfoB) => {
        return periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()
    })
    const greaterTimePeriodTime = sortedTimePeriods[sortedTimePeriods.length - 1].GetTimePeriodInMs();
    const normalizedTimePeriods = sortedTimePeriods.map((timePeriod) => {
        return {normalizedTime: timePeriod.GetTimePeriodInMs() / greaterTimePeriodTime, timePeriod}
    })
    const actualDeltaTime = Math.min(deltaTime, greaterTimePeriodTime);
    const actualDeltaTimeNormalized = actualDeltaTime / greaterTimePeriodTime;
    let timePeriodLowerIndex = -1;
    let timePeriodUpperIndex = -1;

    for (let i = 0; i < normalizedTimePeriods.length - 1; i++) {
        if (actualDeltaTimeNormalized >= normalizedTimePeriods[i].normalizedTime && actualDeltaTimeNormalized <= normalizedTimePeriods[i + 1].normalizedTime) 
        {
            timePeriodLowerIndex = i;
            timePeriodUpperIndex = i + 1;
            break;
        }
    }
    const endColorRgb = HexToRgb(normalizedTimePeriods[timePeriodUpperIndex].timePeriod.color)
    const startColorRgb = HexToRgb(normalizedTimePeriods[timePeriodLowerIndex].timePeriod.color)
    const colorProgress = Math.max(0, Math.min(1, (actualDeltaTimeNormalized - normalizedTimePeriods[timePeriodLowerIndex].normalizedTime) / (normalizedTimePeriods[timePeriodUpperIndex].normalizedTime - normalizedTimePeriods[timePeriodLowerIndex].normalizedTime)));
    const deltaColor = [endColorRgb[0] - startColorRgb[0], endColorRgb[1] - startColorRgb[1], endColorRgb[2] - startColorRgb[2]]
    const finalColor = [startColorRgb[0] + (Math.floor(deltaColor[0] * colorProgress)), startColorRgb[1] + (Math.floor(deltaColor[1] * colorProgress)), startColorRgb[2] + (Math.floor(deltaColor[2] * colorProgress))]
    const finalColorHex = RgbToHex(finalColor);
    return finalColorHex
}

function GetHistoryEntriesForElement({element})
{
    let key;
    switch(element.tags.typeOfElement)
    {
        case BibleElementType.Testament: 
            key = element.tags.testamentName; 
        break;
        case BibleElementType.Section: 
            key = element.tags.sectionName; 
        break;
        case BibleElementType.SectionBook:
        case BibleElementType.Book:
        case BibleElementType.MapBook:
            key = element.tags.bookName; 
        break;
        case BibleElementType.Chapter:
        case BibleElementType.MapChapter:
            key = `${element.tags.parentBookName} ${element.tags.chapterNumber}`;
        break;
        case BibleElementType.ChunkOfVerses:
            key = element.masks.chunkPath
        break;
        case BibleElementType.Verse:
            key = element.masks.versePath;
        break;
        default: break;
    }
    
    const actualTypeOfElement = (element.tags.typeOfElement === BibleElementType.MapBook ||element.tags.typeOfElement ===  BibleElementType.SectionBook) ? BibleElementType.Book : 
        (element.tags.typeOfElement === BibleElementType.MapChapter) ? BibleElementType.Chapter : element.tags.typeOfElement
    return GetHistoryEntries({typeOfElement: actualTypeOfElement, key});
}

function GetHistoryEntries({typeOfElement, key})
{
    const entries = InstanceManager.vars.history.filter((entry) => {return entry.typeOfElement == typeOfElement && entry.key == key});
    return entries
}

function GetAmountOfChaptersInSection(section)
{
    const values = section.map((book) => {
        return StacksManager.tags.booksStaticInfo[book.commonName].numberOfChapters
    });
    return values.reduce((accumulator, currentValue) => {return (accumulator + currentValue)}, 0);
}

function GetDarkerColor(color)
{
    const colorOffset = 55;
    const rgbColor = HexToRgb(color);
    const darkerColorRGB = [Math.max(rgbColor[0] - colorOffset, 0), Math.max(rgbColor[1] - colorOffset, 0), Math.max(rgbColor[2] - colorOffset, 0)];
    const darkerColorHex = RgbToHex(darkerColorRGB);

    return darkerColorHex;
}

function RotateArray(arr, startIndex) {
    if (startIndex < 0 || startIndex >= arr.length) {
        throw new Error("The start index is off of the array limits.");
    }
    
    const firstPart = arr.slice(startIndex);
    const secondPart = arr.slice(0, startIndex);
    const rotatedArray = firstPart.concat(secondPart)
    return rotatedArray;
}

function GetSelectedBookData(data)
{
    if(data.isSelected)
    {
        const isSectionBookDataInstance = data instanceof SectionBookData || data.constructor.name === "SectionBookData";
        const chapterColumns = Math.floor((isSectionBookDataInstance ? data.element.tags.initialScaleX : data.element.tags.singleBooksScales.x) / (StackElementMeasurements.ChapterWidth + (StackSpacing.ChapterGap*2)))
        const chapterRows = Math.ceil(data.element.tags.numberOfChapters / chapterColumns) + 1;
        const selectedBookHeight = chapterRows * (StackElementMeasurements.ChapterHeight + (StackSpacing.ChapterGap*2));
        return {chapterColumns, chapterRows, selectedBookHeight};
    }
    else
    {
        return {};
    }
}

function ShowChaptersInBook(data, dimension)
{
    setTagMask(data.element, "isShowingChapters", true);
    for(const chapterData of data.childrenData)
    {
        const idx = data.childrenData.indexOf(chapterData);
        if(!chapterData.isActive)
        {
            const isSectionBookDataInstance = data instanceof SectionBookData || data.constructor.name === "SectionBookData";
            const chapter = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Chapter});
            const chapterDeltaDepth = (data.element.masks.scaleY - (chapter.tags.gapY*2) - StackElementMeasurements.MinChapterBackDepth) * (chapterData.elementInfo.amountOfVerses / StacksManager.GetBiggerChapter());
            const chapterMod = {
                [dimension]: true,
                [dimension + "X"]: 0,
                [dimension + "Y"]: 0,
                [dimension + "Z"]: 0,
                creator: null,
                index: idx,
                chapterNumber: idx+1,
                chapterWidth: StackElementMeasurements.ChapterWidth,
                chapterHeight: StackElementMeasurements.ChapterHeight,
                arrangementIndex: data.element.tags.arrangementIndex,
                parentBookName: data.element.tags.bookName,
                scaleX: StackElementMeasurements.ChapterWidth,
                scaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
                scaleZ: StackElementMeasurements.ChapterHeight,
                initialScaleX: StackElementMeasurements.ChapterWidth,
                initialScaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
                initialScaleZ: StackElementMeasurements.ChapterHeight,
                initialScaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth,
                selectedScaleY: StackElementMeasurements.MinChapterBackDepth + chapterDeltaDepth + StackElementMeasurements.ChapterFrontSelectedDepth,
                label: (idx + 1) + ((isSectionBookDataInstance ? data.elementBookInfo.startingIndex : data.elementInfo.startingIndex) ?? 0),
            }
            chapter.OnSpawned({mod: chapterMod});
            chapterData.element = chapter;
            chapterData.isInsideBible = data.isInsideBible;
            chapterData.isInsideBook = true;
            chapterData.isActive = true;
            chapterData.isHidden = false;
            if(InstanceManager.masks.isInHistoryMode) setTagMask(chapter, "color", GetHistoryColor({element: chapter}))
        }
    }
    data.element.TrySetChaptersPosition({setX: true, setY: true, setZ: true});
}

function FindPreviousValidGroupBookData(arr, currentIndex) {
    for (let i = currentIndex - 1; i >= 0; i--) {
        if (arr[i].isActive && arr[i].element) {
            return arr[i];
        }
    }
    return null;
}

function HandleBookDataInStack(params)
{
    const {
        bookData, 
        bookDataArr, 
        bookDataIndex, 
        sectionData, 
        selectedBooksTotalHeight,
        selectedBooksTotalMargin,
        dimension,
        duration,
        isInstantaneous,
        easing,
        speedMultiplier = 1
    } = params;

    let {
        desiredPositionX,
        desiredPositionY,
        desiredPositionZ
    } = params;

    console.log(`[Debug] DefineGlobals.HandleBookDataInStack`, {params})
    const {chapterColumns, chapterRows, selectedBookHeight} = GetSelectedBookData(bookData);
    const bookPosition = getBotPosition(bookData.element, dimension);
    let absBookDesiredPosition;
    let halfInitialBookScales;
    let marginToAdd = 0;
    const newBookAnimations = [];
    const initialDesiredPositionX = desiredPositionX;
    const initialDesiredPositionY = desiredPositionY;
    const isSectionBookDataInstance = bookData instanceof SectionBookData || bookData.constructor.name === "SectionBookData";

    if(bookData.isSelected)
    {
        setTag(bookData.element, "chapterColumns", chapterColumns);
        setTag(bookData.element, "chapterRows", chapterRows);
        if(isSectionBookDataInstance) setTag(bookData.element, "desiredScaleZ", selectedBookHeight);
        else setTag(bookData.element, "explodedViewSelectedScaleZ", selectedBookHeight);
        setTagMask(bookData.element, "pointable", sectionData && !sectionData.isInExplodedView ? true : false);
        if(sectionData && !sectionData.isInExplodedView && bookData.element.masks.isShowingChapters) bookData.element.HideChapters();
        newBookAnimations.push(bookData.element.TrySetShape({isInstantaneous, speedMultiplier, shape: !sectionData || sectionData.isInExplodedView ? BookShapeType.Selected : BookShapeType.RegularSelected}).then(() => {
            if(bookData.currentShape === BookShapeType.Selected && !bookData.element.masks.isShowingChapters)
            {
                ShowChaptersInBook(bookData, dimension);
            }
        }))
    }
    else
    {
        if(isSectionBookDataInstance) setTag(bookData.element, "desiredScaleZ", bookData.element.tags.initialScaleZ);
        if(bookData.element.masks.isShowingChapters)
        {
            bookData.element.HideChapters();
        }
        newBookAnimations.push(bookData.element.TrySetShape({isInstantaneous, speedMultiplier, shape: sectionData?.isInExplodedView ? BookShapeType.ExplodedView : BookShapeType.Regular}));
    }

    if(sectionData)
    {
        if(sectionData.isInExplodedView)
        {
            desiredPositionZ += ((bookData.element.tags.explodedViewPosition.z * sectionData.element.tags.desiredExplodedViewScaleZ) - (bookData.element.tags.desiredScaleZ/2) + selectedBooksTotalHeight + selectedBooksTotalMargin);
            if(bookData.isSelected)
            {
                desiredPositionZ += StackSpacing.SelectedBookMargin;
                marginToAdd += (StackSpacing.SelectedBookMargin*2);
                if(bookDataIndex > 0)
                {
                    const previousValidGroupBookData = FindPreviousValidGroupBookData(bookDataArr, bookDataIndex);
                    if(previousValidGroupBookData)
                    {
                        const tempBookDesiredPositionZ = previousValidGroupBookData.element.tags.desiredPositionZ + previousValidGroupBookData.element.tags.desiredScaleZ + StackSpacing.SelectedBookMargin
                        if(tempBookDesiredPositionZ && tempBookDesiredPositionZ > desiredPositionZ)
                        {
                            marginToAdd += (tempBookDesiredPositionZ - desiredPositionZ)
                            desiredPositionZ = tempBookDesiredPositionZ
                        }
                    }
                }
            }
            else
            {
                desiredPositionX += (bookData.element.tags.explodedViewPosition.x * StackElementMeasurements.SectionScales.x);
                desiredPositionY += (bookData.element.tags.explodedViewPosition.y * StackElementMeasurements.SectionScales.y);
            }
        }
        else
        {
            if(bookData.element.tags.isGroupBook)
            {
                desiredPositionX += bookData.element.tags.layoutPositionX;
                desiredPositionY += bookData.element.tags.layoutPositionY;
            }
        }
        absBookDesiredPosition = {x: Math.abs(desiredPositionX - initialDesiredPositionX), y: Math.abs(desiredPositionY - initialDesiredPositionY)};
        halfInitialBookScales = {x: (bookData.element.tags.initialScaleX / 2), y: (bookData.element.tags.initialScaleY / 2)};
    }

    setTag(bookData.element, "desiredPositionZ", desiredPositionZ);
    if(isInstantaneous)
    {
        setTagMask(bookData.element, dimension + "X", desiredPositionX)
        setTagMask(bookData.element, dimension + "Y", desiredPositionY)
        setTagMask(bookData.element, dimension + "Z", desiredPositionZ)
    }
    else
    {
        newBookAnimations.push(
            animateTag(bookData.element, {
                fromValue: {
                    [dimension + "X"]: bookPosition.x,
                    [dimension + "Y"]: bookPosition.y,
                    [dimension + "Z"]: bookPosition.z
                },
                toValue: {
                    [dimension + "X"]: desiredPositionX,
                    [dimension + "Y"]: desiredPositionY,
                    [dimension + "Z"]: desiredPositionZ
                },
                duration,
                easing
            })
        )
    }

    return {absBookDesiredPosition, halfInitialBookScales, selectedBookHeight, marginToAdd, newBookAnimations};
}

function HandleSectionDataInStack(params)
{
    const {sectionData, desiredPositionZ, dimension, duration, easing, speedMultiplier = 1, isInstantaneous} = params;
    const {bibleData} = StacksManager.GetDataChainFromParentDataIds({parentDataIds: sectionData.parentDataIds});
    const sectionPosition = getBotPosition(sectionData.element, dimension);
    let nextPositionZ = desiredPositionZ;
    const newSectionAnimations = []
    const desiredSectionShadowFormOpacity = 0.2;
    if(sectionData.isSplitIntoBooks)
    {
        const activeBooksInsideSection = sectionData.childrenData.flat().filter((bookData) => {return bookData.isActive});
        let selectedBooksTotalHeight = 0;
        let selectedBooksTotalMargin = 0;
        const sectionShadowDesiredScales = {x: 0, y: 0, z: 0};
        const sectionShadowDesiredPositionZ = nextPositionZ + (!sectionData.element.masks.isOnTheGround && sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? StackSpacing.ExplodedViewSectionShadowPadding : 0);
        nextPositionZ += sectionData.element.masks.isOnTheGround ? 0 : (sectionData.isInExplodedView ? StackSpacing.ExplodedViewSectionPadding : StackSpacing.BetweenBooks);
        for(const bookDataArr of sectionData.childrenData)
        {
            for(const bookData of bookDataArr)
            {
                const bookDataIndex = bookDataArr.indexOf(bookData);
                if(bookData.isActive)
                {
                    const {absBookDesiredPosition, halfInitialBookScales, selectedBookHeight, marginToAdd, newBookAnimations} = HandleBookDataInStack({
                        dimension, 
                        duration,
                        easing,
                        bookData, 
                        bookDataArr, 
                        bookDataIndex, 
                        sectionData, 
                        selectedBooksTotalHeight, 
                        selectedBooksTotalMargin,
                        desiredPositionX: sectionPosition.x,
                        desiredPositionY: sectionPosition.y,
                        desiredPositionZ: nextPositionZ + (sectionData.element.masks.isOnTheGround ? StackSpacing.SectionShadowPadding : 0),
                        speedMultiplier,
                        isInstantaneous
                    });
                    
                    newSectionAnimations.push(...newBookAnimations);
                    const tempSectionShadowScales = {x: absBookDesiredPosition.x + halfInitialBookScales.x, y: absBookDesiredPosition.y + halfInitialBookScales.y};
                    if(tempSectionShadowScales.x > sectionShadowDesiredScales.x) sectionShadowDesiredScales.x = tempSectionShadowScales.x;
                    if(tempSectionShadowScales.y > sectionShadowDesiredScales.y) sectionShadowDesiredScales.y = tempSectionShadowScales.y;
                    if(selectedBookHeight)
                    {
                        selectedBooksTotalHeight += selectedBookHeight;
                        selectedBooksTotalMargin += marginToAdd;
                    }
                }
            }

            if(bookDataArr.some((bookData) => {return bookData.isActive}) && !sectionData.isInExplodedView) nextPositionZ += bookDataArr.find((bookData) => {return bookData.isActive}).element.tags.desiredScaleZ + StackSpacing.BetweenBooks;
        }
        sectionShadowDesiredScales.x = (sectionShadowDesiredScales.x * 2) + StackSpacing.SectionShadowPadding;
        sectionShadowDesiredScales.y = (sectionShadowDesiredScales.y * 2) + StackSpacing.SectionShadowPadding;
        if(activeBooksInsideSection.length === 0)
        {
            sectionShadowDesiredScales.z = StackElementMeasurements.EmptySectionShadowScaleZ;
        }
        else if(activeBooksInsideSection.length > 0)
        {
            if(sectionData.isInExplodedView)
            {
                sectionShadowDesiredScales.z = sectionData.element.tags.desiredExplodedViewScaleZ + (StackSpacing.ExplodedViewSectionShadowPadding*2) + selectedBooksTotalHeight + selectedBooksTotalMargin;
            }
            else
            {
                const rawActiveBooksInsideSecion = sectionData.childrenData.filter((bookDataArr) => {return bookDataArr.some((bookData) => {return bookData.isActive})});
                const booksTotalScaleZ = rawActiveBooksInsideSecion.reduce((total, currentRawBookData) => {
                    return total + currentRawBookData.find((bookData) => {return bookData.isActive}).element.tags.desiredScaleZ
                }, 0)
                const tempSectionShadowScaleZ = booksTotalScaleZ + ((activeBooksInsideSection.length + 1) * StackSpacing.BetweenBooks);
                sectionShadowDesiredScales.z = tempSectionShadowScaleZ > StackElementMeasurements.EmptySectionShadowScaleZ ? tempSectionShadowScaleZ : StackElementMeasurements.EmptySectionShadowScaleZ;
            }
        }
        if(sectionData.shadow)
        {
            // Modify section shadow scale and position
            const infoLabelTransformer = GetCurrentInfoLabelTransformer(sectionData.shadow);
            const sectionShadowScales = GetBotScales(sectionData.shadow);
            setTag(sectionData.shadow, "desiredPositionZ", sectionShadowDesiredPositionZ);
            setTag(sectionData.shadow, "desiredScaleZ", sectionShadowDesiredScales.z);
            if(infoLabelTransformer && !sectionData.isInExplodedView)
            {
                newSectionAnimations.push(infoLabelTransformer.Hide({speedMultiplier, isInstantaneous}).then(() => {ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag})}))
            }
            if(isInstantaneous)
            {
                setTagMask(sectionData.shadow, dimension + "Z", sectionShadowDesiredPositionZ);
                setTagMask(sectionData.shadow, "scaleX", sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.x : sectionData.element.tags.initialScaleX);
                setTagMask(sectionData.shadow, "scaleY", sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.y : sectionData.element.tags.initialScaleY);
                setTagMask(sectionData.shadow, "scaleZ", sectionShadowDesiredScales.z);
                if(!infoLabelTransformer && sectionData.isInExplodedView && !(bibleData && bibleData.bibleType === BibleType.PlatformerGame))
                {
                    const label = CapitalizeFirstLetter(sectionData.element.tags.sectionName.split("-").join(" "));
                    const {infoLabelTransformer} = StacksManager.GetLabelForElement({
                        element: sectionData.shadow, 
                        label, 
                        color: sectionData.highlightColor ?? sectionData.element.tags.labelTextColor,
                        labelColor: "white", 
                        dimension,
                        labelPositioning: sectionData.element.masks.isOnTheGround ? LabelPositioning.Top : LabelPositioning.RightSidedCorner,
                        isAnimatable: false,
                        targetOpacity: 0.5
                    });

                    newSectionAnimations.push(infoLabelTransformer.Show({speedMultiplier, isInstantaneous}));
                }
            }
            else
            {
                newSectionAnimations.push(
                    animateTag(sectionData.shadow, {
                        fromValue: {
                            [dimension + "Z"]: sectionData.shadow.tags[dimension + "Z"],
                            scaleX: sectionShadowScales.x,
                            scaleY: sectionShadowScales.y,
                            scaleZ: sectionShadowScales.z,
                        },
                        toValue: {
                            [dimension + "Z"]: sectionShadowDesiredPositionZ,
                            scaleX: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.x : sectionData.element.tags.initialScaleX,
                            scaleY: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.y : sectionData.element.tags.initialScaleY,
                            scaleZ: sectionShadowDesiredScales.z,
                        },
                        duration,
                        easing
                    }).then(() => {
                        if(!infoLabelTransformer && sectionData.isInExplodedView && !(bibleData && bibleData.bibleType === BibleType.PlatformerGame))
                        {
                            const label = CapitalizeFirstLetter(sectionData.element.tags.sectionName.split("-").join(" "));
                            const {infoLabelTransformer} = StacksManager.GetLabelForElement({
                                element: sectionData.shadow, 
                                label, 
                                color: sectionData.highlightColor ?? sectionData.element.tags.labelTextColor,
                                labelColor: "white", 
                                dimension,
                                labelPositioning: sectionData.element.masks.isOnTheGround ? LabelPositioning.Top : LabelPositioning.RightSidedCorner,
                                isAnimatable: false,
                                targetOpacity: 0.5
                            });

                            return infoLabelTransformer.Show({speedMultiplier, isInstantaneous});
                        }
                    })
                )
            }
        }
        else
        {
            // Create section shadow
            
            const sectionShadow = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.SectionShadow});
            if(sectionShadow)
            {
                const sectionShadowMod = {
                    transformer: sectionData.element.tags.transformer,
                    [dimension]: true,
                    [dimension + "X"]: sectionPosition.x,
                    [dimension + "Y"]: sectionPosition.y,
                    [dimension + "Z"]: sectionShadowDesiredPositionZ,
                    desiredPositionZ: sectionShadowDesiredPositionZ,
                    scaleX: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.x : sectionData.element.tags.initialScaleX,
                    scaleY: sectionData.isInExplodedView && activeBooksInsideSection.length > 0 ? sectionShadowDesiredScales.y : sectionData.element.tags.initialScaleY,
                    scaleZ: sectionShadowDesiredScales.z,
                    desiredScaleZ: sectionShadowDesiredScales,
                    color: sectionData.highlightColor ?? sectionData.elementInfo.color,
                    sectionName: sectionData.element.tags.sectionName,
                    sectionDataId: sectionData.id
                }
                sectionShadow.OnSpawned?.({mod: sectionShadowMod})
                sectionData.shadow = sectionShadow;
            }
            if(isInstantaneous)
            {
                setTagMask(sectionShadow, "formOpacity", desiredSectionShadowFormOpacity);
                if(!(bibleData && bibleData.bibleType === BibleType.PlatformerGame))
                {
                    const label = CapitalizeFirstLetter(sectionData.element.tags.sectionName.split("-").join(" "));
                    const {infoLabelTransformer} = StacksManager.GetLabelForElement({
                        element: sectionShadow, 
                        label, 
                        color: sectionData.highlightColor ?? sectionData.element.tags.labelTextColor,
                        labelColor: "white", 
                        dimension,
                        labelPositioning: sectionData.element.masks.isOnTheGround ? LabelPositioning.Top : LabelPositioning.RightSidedCorner,
                        isAnimatable: false,
                        targetOpacity: 0.5
                    })
                    newSectionAnimations.push(
                        infoLabelTransformer.Show({isInstantaneous})
                    )
                }
            }
            else
            {
                newSectionAnimations.push(
                    animateTag(sectionShadow, "formOpacity", {
                        toValue: desiredSectionShadowFormOpacity,
                        duration,
                        easing
                    }).then(() => {
                        if(!(bibleData && bibleData.bibleType === BibleType.PlatformerGame))
                        {
                            const label = CapitalizeFirstLetter(sectionData.element.tags.sectionName.split("-").join(" "));
                            const {infoLabelTransformer} = StacksManager.GetLabelForElement({
                                element: sectionShadow, 
                                label, 
                                color: sectionData.highlightColor ?? sectionData.element.tags.labelTextColor,
                                labelColor: "white", 
                                dimension,
                                labelPositioning: sectionData.element.masks.isOnTheGround ? LabelPositioning.Top : LabelPositioning.RightSidedCorner,
                                isAnimatable: false,
                                targetOpacity: 0.5
                            })
                            return infoLabelTransformer.Show();
                        }
                    })
                )
            }
        }
        setTagMask(sectionData.shadow, "pointable", activeBooksInsideSection.length === 0);
        if(activeBooksInsideSection.length === 0) nextPositionZ = sectionShadowDesiredPositionZ + sectionShadowDesiredScales.z;
        else if(sectionData.isInExplodedView) nextPositionZ += (sectionData.element.tags.desiredExplodedViewScaleZ + StackSpacing.ExplodedViewSectionPadding + selectedBooksTotalHeight + selectedBooksTotalMargin);
    }
    else
    {
        if(sectionData.isActive)
        {
            const isSectionBookDataInstance = sectionData instanceof SectionBookData || sectionData.constructor.name === "SectionBookData"; // instanceof not working the first time for some reason so checking by name;
            if(isSectionBookDataInstance)
            {
                console.log(`[Debug] DefineGlobals.HandleSectionDataInStack !sectionData.isSplitIntoBooks && sectionData.isActive && sectionData instanceof SectionBookData`);
                const {newBookAnimations} = HandleBookDataInStack({
                    dimension,
                    duration,
                    bookData: sectionData,
                    isInstantaneous
                });
                newSectionAnimations.push(...newBookAnimations);
            }
            else
            {
                const sectionCurrentScales = GetBotScales(sectionData.element);
                const sectionDesiredScales = new Vector3(StackElementMeasurements.SectionScales.x, StackElementMeasurements.SectionScales.y, sectionData.element.tags.desiredScaleZ)
                const setScaleX = sectionCurrentScales.x != sectionDesiredScales.x;
                const setScaleY = sectionCurrentScales.y != sectionDesiredScales.y;
                const setScaleZ = sectionCurrentScales.z != sectionDesiredScales.z;
                const setFormOpacity = sectionData.element.tags.formOpacity != sectionData.element.tags.unhoveredOpacity;
                if(isInstantaneous)
                {
                    if(setScaleX) setTagMask(sectionData.element, "scaleX", sectionDesiredScales.x)
                    if(setScaleY) setTagMask(sectionData.element, "scaleY", sectionDesiredScales.y)
                    if(setScaleZ) setTagMask(sectionData.element, "scaleZ", sectionDesiredScales.z)
                    if(setFormOpacity) setTagMask(sectionData.element, "formOpacity", sectionData.element.tags.unhoveredOpacity)
                }
                else
                {
                    newSectionAnimations.push(animateTag(sectionData.element, {
                        fromValue: {
                            scaleX: setScaleX ? sectionCurrentScales.x : null,
                            scaleY: setScaleY ? sectionCurrentScales.y : null,
                            scaleZ: setScaleZ ? sectionCurrentScales.z : null,
                            formOpacity: setFormOpacity ? sectionData.element.tags.formOpacity : null
                        },
                        toValue: {
                            scaleX: setScaleX ? sectionDesiredScales.x : null,
                            scaleY: setScaleY ? sectionDesiredScales.y : null,
                            scaleZ: setScaleZ ? sectionDesiredScales.z : null,
                            formOpacity: setFormOpacity ? sectionData.element.tags.unhoveredOpacity : null
                        },
                        duration,
                        easing
                    }));
                }
            }
            setTag(sectionData.element, "desiredPositionZ", nextPositionZ);
            if(isInstantaneous) setTagMask(sectionData.element, dimension + "Z", nextPositionZ)
            else newSectionAnimations.push(animateTag(sectionData.element, dimension + "Z", {
                toValue: nextPositionZ,
                duration,
                easing
            }));
            nextPositionZ += sectionData.element.tags.desiredScaleZ;
        }
    }
    const sectionDeltaPositionZ = nextPositionZ - desiredPositionZ;
    return {sectionDeltaPositionZ, newSectionAnimations};
}

function HandleTestamentDataInStack(params)
{
    const {testamentData, desiredPositionZ, dimension, duration, easing, speedMultiplier = 1, isInstantaneous} = params;
    let nextPositionZ = desiredPositionZ;
    const newTestamentAnimations = [];

    if(testamentData.isSplitIntoSections)
    {
        nextPositionZ += StackSpacing.BetweenSections;
        for(const sectionData of testamentData.childrenData)
        {
            if(sectionData.isActive)
            {
                const {sectionDeltaPositionZ, newSectionAnimations} = HandleSectionDataInStack({sectionData, desiredPositionZ: nextPositionZ, dimension, duration, easing, speedMultiplier, isInstantaneous})
                newTestamentAnimations.push(...newSectionAnimations);
                nextPositionZ += (sectionDeltaPositionZ + StackSpacing.BetweenSections);
            }
        }
    }
    else
    {
        if(testamentData.isActive)
        {
            setTag(testamentData.element, "desiredPositionZ", nextPositionZ);
            if(isInstantaneous) setTagMask(testamentData.element, dimension + "Z", nextPositionZ)
            else
            {
                newTestamentAnimations.push(animateTag(testamentData.element, dimension + "Z", {
                    toValue: nextPositionZ,
                    duration,
                    easing 
                }));
            }
            nextPositionZ += testamentData.element.tags.desiredScaleZ;
        }
    }
    const testamentDeltaPositionZ = nextPositionZ - desiredPositionZ;
    return {testamentDeltaPositionZ, newTestamentAnimations};
}

function GetCurrentInfoLabelTransformer(ownerBot)
{
    return getBot(byTag("ownerBotId", getID(ownerBot)), byTag("isInfoLabelTransformer", true), byTag("isInUse", true));
}

function ReleaseLabelTransformerFromElement(element)
{
    const infoLabelTransformer = getBot(byTag("isInfoLabelTransformer", true), byTag("ownerBotId", getID(element)), byTag('isInUse', true));
    if(infoLabelTransformer) ObjectPooler.ReleaseObject({obj: infoLabelTransformer, tag: infoLabelTransformer.tags.poolTag});
}

function GetDialogBotScaleY(scaleXLimit, line, paddingX = 0, paddingY = 0, fontSize = 1.94)
{
    let amountOfLines = 1;
    let scaleX = 0;
    let finalScaleX = 0;
    const labelHeight = robotoFont.tags.data.common.lineHeight;
    const newScaleXLimit = scaleXLimit - paddingX;
    let currentWordScaleX = 0;

    for (let i = 0; i < line.length; i++) {
        const charCode = line.charCodeAt(i);
       
        const charData = robotoFont.tags.data.chars.find(c => c.id === charCode);
     
        const charScaleX = charData.xadvance * fontSize * 0.0102;
        
        if(charCode === 10)
        {
            // Character is a line break
            
            amountOfLines++;
            scaleX = 0;
            currentWordScaleX = 0;
            continue;
        }
        else
        {
            if(charCode === 32)
            {
                // Character is a space

                if(scaleX === 0 && amountOfLines > 1)
                {
                    continue;
                }

                currentWordScaleX = 0;
                if((scaleX + charScaleX) > newScaleXLimit)
                {
                    amountOfLines++;
                    scaleX = 0;
                    continue;
                }
                else 
                {
                    scaleX += charScaleX;
                    finalScaleX = scaleX > finalScaleX ? Math.min(scaleX, newScaleXLimit) : finalScaleX
                }
            }
            else
            {
                // Character is not a space

                currentWordScaleX += charScaleX;

                if((i + 1) >= line.length || line.charCodeAt(i+1) === 32)
                {
                    // This is the final character
                    
                    if((scaleX + currentWordScaleX) > newScaleXLimit)
                    {
                        amountOfLines++;
                        scaleX = 0;
                    }
                    scaleX += currentWordScaleX;
                    finalScaleX = scaleX > finalScaleX ? Math.min(scaleX, newScaleXLimit) : finalScaleX
                    currentWordScaleX = 0;
                }
            }
        }
    }
    const scaleY = (labelHeight * fontSize * 0.0102 * amountOfLines) + paddingY;
    return {scaleX: finalScaleX, scaleY};
}

function GetRandomColor()
{
    const hexadecimalCharacters = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
    let randomColor = "#";
    for(let i = 0; i < 6; i++)
    {
        const randomCharacter = Math.floor(Math.random() * hexadecimalCharacters.length);
        randomColor += hexadecimalCharacters[randomCharacter];
    }
    return randomColor;
}

function GetRandomUnitVector()
{
    const randomX = (Math.random() * 2) - 1;
    const randomY = (Math.random() * 2) - 1;
    const randomZ = (Math.random() * 2) - 1;
    const randomVectorNormalized = new Vector3(randomX, randomY, randomZ).normalize();
    return randomVectorNormalized;
}

function DistanceBetweenBotAndCamera(bot)
{
    const cameraPosition = os.getCameraPosition('grid');
    const dimension = os.getCurrentDimension();
    
    const botPosition       = new Vector3(bot.masks[dimension + "X"] ?? bot.tags[dimension + "X"], bot.masks[dimension + "Y"] ?? bot.tags[dimension + "Y"], bot.masks[dimension + "Z"] ?? bot.tags[dimension + "Z"]);
    const newCamPosition    = new Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z);
    const distance          = Vector3.distanceBetween(botPosition, newCamPosition);
    return distance;
}

function ClosestNumber(arr, input) {
  let closest = arr[0];
  let closestDifference = Math.abs(input - closest);

  for (let i = 1; i < arr.length; i++) {
    const difference = Math.abs(input - arr[i]);

    if (difference < closestDifference) {
      closest = arr[i];
      closestDifference = difference;
    }
  }

  return closest;
}

function CapitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function GetFocusOnPositionFromRotation(theta, phi, botPosition)
{
    const x = Math.sin(phi) * Math.cos(theta + (math.degreesToRadians(270)));
    const y = Math.sin(phi) * Math.sin(theta + (math.degreesToRadians(270)));
    const z = Math.cos(phi);
    const camDesiredForwardDirection = new Vector3(x, y, z).negate().normalize();
    const camDesiredForwardDirectionXY = new Vector3(camDesiredForwardDirection.x, camDesiredForwardDirection.y, 0).normalize();
    const vectorZ = new Vector3(0, 0, camDesiredForwardDirection.z > 0 ? 1 : -1);
    const angleBetween = math.degreesToRadians(90) - Vector3.angleBetween(camDesiredForwardDirection, vectorZ);
    const vectorMagnitude = botPosition.z / Math.tan(angleBetween);
    const desiredFocusOnPosition = new Vector3(botPosition.x, botPosition.y, 0).add(camDesiredForwardDirectionXY.multiplyScalar(vectorMagnitude));
    return desiredFocusOnPosition;
}

function HexToRgb(hex = "")
{
    let color = hex;
    
    if(hex[0] === "#")
    {
        color = color.slice(1);
    }
    const r = parseInt(color.substring(0,2), 16);
    const g = parseInt(color.substring(2,4), 16);
    const b = parseInt(color.substring(4,6), 16);
    return [r, g, b];
}

function RgbToHex(rgbColor = [255,255,255])
{
    return "#" + ((1 << 24) + (rgbColor[0] << 16) + (rgbColor[1] << 8) + rgbColor[2]).toString(16).slice(1);
}

function GetRandomElementFromArray(array)
{
  if (!Array.isArray(array) || array.length === 0)
  {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function FormatNumberToUSDCurrency(value = 0)
{
    const formattedString = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
    }).format(value)

    return formattedString;
}

function ApplyFunctionToElement(element, func, args = {})
{
    if(Array.isArray(element))
    {
        return element.map((i, index) => {return func({element: i, args, isArray: true, index})}).filter((i) => {return i !== null && i !== undefined});
    }
    else
    {
        return func({element, args, isArray: false});
    }
}

function GetBotScales(bot)
{
    const scales = {
        x: bot.masks.scaleX ?? bot.tags.scaleX ?? 1, 
        y: bot.masks.scaleY ?? bot.tags.scaleY ?? 1, 
        z: bot.masks.scaleZ ?? bot.tags.scaleZ ?? 1
    };
    return scales;
}

function GetAnimateTagFromObject(obj)
{
    const animateFn = obj.tag ? animateTag(obj.bot, obj.tag, obj.options) : animateTag(obj.bot, obj.options);
    return animateFn.then(() => {
        if(obj.then)
        {
            return GetAnimateTagFromObject(obj.then)
        }
    })
}

function GetSetTagFromObject(obj)
{
    setTag(obj.bot, obj.tag, obj.options.toValue);
    if(obj.then)
    {
        GetSetTagFromObject(obj.then)
    }
}

function SubtractArrays(array1, array2)
{
    return array1.filter((element) => {return !array2.includes(element)});
}

function SetRenderOrder(bots)
{
    const dimension = os.getCurrentDimension();
    const newOrder = bots.sort((a, b) => {
        if ((a.masks[dimension + "Z"] ?? a.tags[dimension + "Z"]) > (b.masks[dimension + "Z"] ?? b.tags[dimension + "Z"])) 
        {
            return 1;
        }
        else if ((a.masks[dimension + "Z"] ?? a.tags[dimension + "Z"]) < (b.masks[dimension + "Z"] ?? b.tags[dimension + "Z"])) 
        {
            return -1;
        }
        else
        {
            if(DistanceBetweenBotAndCamera(a) < DistanceBetweenBotAndCamera(b))
            {
                return 1;
            }
            else if(DistanceBetweenBotAndCamera(a) > DistanceBetweenBotAndCamera(b))
            {
                return -1;
            }
            else if(DistanceBetweenBotAndCamera(a) == DistanceBetweenBotAndCamera(b))
            {
                return 0;
            }
        }
    })
    let i = -1;

    for(const bot of newOrder)
    {
        setTagMask(bot, "formRenderOrder", i);
        i--;
    }
}

function GetSectionLevels(books)
{
    const levels = [];
    const groupsIncluded = [];
    for(const book of books)
    {
        if(book.group)
        {
            if(groupsIncluded.includes(book.group)) continue;

            const group = books.filter((sectionBook) => {
                return sectionBook.group === book.group;
            });
            levels.push(group);
            groupsIncluded.push(book.group);
        }
        else
        {
            levels.push([book]);
        }
    }
    return levels;
}

function GetGroupBookData(bookLayout, sectionPosition = new Vector3(0,0,0))
{
    let groupBookScaleX, groupBookPositionX, groupBookLayoutPositionX, groupBookScaleY, groupBookPositionY, groupBookLayoutPositionY;

    groupBookScaleX = (StackElementMeasurements.BookScales.x * (bookLayout.x.to - bookLayout.x.from));
    groupBookPositionX = sectionPosition.x;
    if(bookLayout.x.from === 0 && bookLayout.x.to !== 1)
    {
        groupBookScaleX -= (StackSpacing.BetweenBooks / 2);
        groupBookLayoutPositionX = (groupBookScaleX / 2) - (StackElementMeasurements.BookScales.x / 2);
        groupBookPositionX += groupBookLayoutPositionX;
    }
    else if(bookLayout.x.from !== 0 && bookLayout.x.to === 1)
    {
        groupBookScaleX -= (StackSpacing.BetweenBooks / 2);
        groupBookLayoutPositionX = (StackElementMeasurements.BookScales.x / 2) - (groupBookScaleX / 2)
        groupBookPositionX += groupBookLayoutPositionX;
    }
    else
    {
        groupBookLayoutPositionX = 0;
    }

    groupBookScaleY = (StackElementMeasurements.BookScales.y * (bookLayout.y.to - bookLayout.y.from));
    groupBookPositionY = sectionPosition.y
    if(bookLayout.y.from === 0 && bookLayout.y.to !== 1)
    {
        groupBookScaleY -= (StackSpacing.BetweenBooks / 2);
        groupBookLayoutPositionY = (groupBookScaleY / 2) - (StackElementMeasurements.BookScales.y / 2)
        groupBookPositionY += groupBookLayoutPositionY;
    }
    else if(bookLayout.y.from !== 0 && bookLayout.y.to === 1)
    {
        groupBookScaleY -= (StackSpacing.BetweenBooks / 2);
        groupBookLayoutPositionY = (StackElementMeasurements.BookScales.y / 2) - (groupBookScaleY / 2)
        groupBookPositionY += groupBookLayoutPositionY;
    }
    else
    {
        groupBookLayoutPositionY = 0;
    }

    return {groupBookScaleX, groupBookScaleY, groupBookPositionX, groupBookPositionY, groupBookLayoutPositionX, groupBookLayoutPositionY};
}

function GetFixedScales(params)
{
    const {bot} = params;
    const botScale = bot.masks.scale ?? bot.tags.scale ?? 1;
    const botScales = GetBotScales(bot);
    botScales.x *= botScale;
    botScales.y *= botScale;
    botScales.z *= botScale;

    if(bot.masks.transformer || bot.tags.transformer)
    {
        if(!bot.links.transformerLink) setTagMask(bot, "transformerLink", `🔗${bot.masks.transformer ?? bot.tags.transformer}`)
        const transformerScale = bot.links.transformerLink.masks.scale ?? bot.links.transformerLink.tags.scale ?? 1;
        const transformerScales = GetBotScales(bot.links.transformerLink);
        botScales.x *= (transformerScales.x * transformerScale);
        botScales.y *= (transformerScales.y * transformerScale);
        botScales.z *= (transformerScales.z * transformerScale);
    }
    return botScales;
}

function GetFixedPosition(params)
{
    const {bot, dimension} = params;
    const position = getBotPosition(bot, dimension)
    if(bot.masks.transformer || bot.tags.transformer)
    {
        if(!bot.links.transformerLink) setTagMask(bot, "transformerLink", `🔗${bot.masks.transformer ?? bot.tags.transformer}`)
        const transformerScale = bot.links.transformerLink.masks.scale ?? bot.links.transformerLink.tags.scale ?? 1;
        const transformerScales = GetBotScales(bot.links.transformerLink);
        position.z += (transformerScales.z * transformerScale)
    }
    return position;
}

function GetCustomArrangementExplodedViewBooksPositions({booksScalesZ, sectionExplodedViewScaleZ}) {
    const totalScaleZ = booksScalesZ.reduce((sum, scaleZ) => sum + scaleZ, 0);
    
    const gaps = booksScalesZ.length - 1;
    const gapSize = gaps > 0 ? (sectionExplodedViewScaleZ - totalScaleZ) / gaps : 0;
    
    let position = 0

    return booksScalesZ.map(scaleZ => {
        const bookPosition = (position / sectionExplodedViewScaleZ);
        position += gapSize + scaleZ;
        return bookPosition;
    });
}

function GetFixedArrangementFromTemplate(template)
{
    const fixedArrangement = {
        name: template.name,
        testaments: template.testaments.map((testament) => {
            return {
                name: testament.name,
                color: testament.color,
                sections: testament.sections.map((section) => {
                    const amountOfChaptersInSection = GetAmountOfChaptersInSection(section.books.map((book) => {return {commonName: book.name}}))
                    const sectionDesiredScaleZ = amountOfChaptersInSection * StackElementMeasurements.SectionDesiredScaleZRatio;
                    const sectionAvailableSpace = sectionDesiredScaleZ - (StackSpacing.BetweenBooks * (section.books.length + 1));
                    const sectionExplodedViewScaleZ = sectionDesiredScaleZ * 2;

                    const booksScalesZ = section.books.map((book) => {
                        const percentageOfBookInSection = StacksManager.tags.booksStaticInfo[book.name].numberOfChapters / amountOfChaptersInSection;
                        const bookScaleZ = percentageOfBookInSection * sectionAvailableSpace;
                        return bookScaleZ
                    })
                    const positions = GetCustomArrangementExplodedViewBooksPositions({booksScalesZ, sectionExplodedViewScaleZ})
                    section.books.forEach((book, index) => {
                        book.explodedViewPosition = {x: 0, y: 0, z: positions[index]}
                    })
                    
                    return {
                        name: section.name,
                        color: section.color,
                        books: section.books.map((book) => {
                            return {
                                commonName: book.name,
                                customColor: book.color,
                                explodedViewPosition: book.explodedViewPosition
                            }
                        })
                    }

                })
            }
        })
    }

    return fixedArrangement
}

function GetTemplateFromArrangement(arrangementInfo)
{
    const template = {
        name: arrangementInfo.name,
        id: uuid(),
        testaments: arrangementInfo.testaments.map((testamentInfo) => {
            return {
                name: testamentInfo.name,
                id: uuid(),
                color: "#FFFFFF",
                sections: testamentInfo.sections.map((sectionInfo) => {
                    const bookLevelColors = GetChildrenLevelColors({
                        sectionColorRGB: HexToRgb(sectionInfo.color), 
                        colorRange: sectionInfo.customColorRange ?? 70, 
                        levelsLength: sectionInfo.books.slice().length
                    })
                    return {
                        name: sectionInfo.name,
                        id: uuid(),
                        color: sectionInfo.color,
                        books: sectionInfo.books.map((bookInfo, index) => {
                            return {
                                name: bookInfo.commonName,
                                color: bookLevelColors[index],
                                id: uuid()
                            }
                        })
                    }
                })
            }
        })
    }
    return template;
}

globalThis.GetFocusOnPositionFromRotation = GetFocusOnPositionFromRotation;
globalThis.GetDialogBotScaleY = GetDialogBotScaleY;
globalThis.GetRandomColor = GetRandomColor;
globalThis.GetRandomUnitVector = GetRandomUnitVector;
globalThis.DistanceBetweenBotAndCamera = DistanceBetweenBotAndCamera;
globalThis.ClosestNumber = ClosestNumber;
globalThis.CapitalizeFirstLetter = CapitalizeFirstLetter;
globalThis.HexToRgb = HexToRgb;
globalThis.RgbToHex = RgbToHex;
globalThis.GetRandomElementFromArray = GetRandomElementFromArray;
globalThis.FormatNumberToUSDCurrency = FormatNumberToUSDCurrency;
globalThis.ApplyFunctionToElement = ApplyFunctionToElement;
globalThis.GetBotScales = GetBotScales;
globalThis.GetAnimateTagFromObject = GetAnimateTagFromObject;
globalThis.GetSetTagFromObject = GetSetTagFromObject;
globalThis.SubtractArrays = SubtractArrays;
globalThis.SetRenderOrder = SetRenderOrder;
globalThis.GetSectionLevels = GetSectionLevels;
globalThis.ReleaseLabelTransformerFromElement = ReleaseLabelTransformerFromElement;
globalThis.GetCurrentInfoLabelTransformer = GetCurrentInfoLabelTransformer;
globalThis.HandleBookDataInStack = HandleBookDataInStack;
globalThis.HandleSectionDataInStack = HandleSectionDataInStack;
globalThis.HandleTestamentDataInStack = HandleTestamentDataInStack;
globalThis.FindPreviousValidGroupBookData = FindPreviousValidGroupBookData;
globalThis.GetGroupBookData = GetGroupBookData;
globalThis.GetAmountOfChaptersInSection = GetAmountOfChaptersInSection;
globalThis.GetDarkerColor = GetDarkerColor;
globalThis.RotateArray = RotateArray;
globalThis.GetSelectedBookData = GetSelectedBookData;
globalThis.ShowChaptersInBook = ShowChaptersInBook;
globalThis.GetHistoryColor = GetHistoryColor;
globalThis.GetHistoryEntriesForElement = GetHistoryEntriesForElement;
globalThis.GetHistoryEntries = GetHistoryEntries;
globalThis.GetFixedScales = GetFixedScales;
globalThis.GetFixedPosition = GetFixedPosition;
globalThis.GetChildrenLevelColors = GetChildrenLevelColors;
globalThis.GetTextColorBasedOnBackground = GetTextColorBasedOnBackground;
globalThis.GetCustomArrangementExplodedViewBooksPositions = GetCustomArrangementExplodedViewBooksPositions;
globalThis.GetFixedArrangementFromTemplate = GetFixedArrangementFromTemplate;
globalThis.GetTemplateFromArrangement = GetTemplateFromArrangement;

const globalsDefined = [
 "BibleState",
 "EnqueueChapterActions",
 "StackSpacing",
 "StackElementInteractionType",
 "BibleElementType",
 "BookShapeType",
 "StackElementMeasurements",
 "BibleVisualizationState",
 "CrossPosition",
 "550",
 "ClickModality",
 "MouseButtonId",
 "25",
 "ObjectPoolTags",
 "LabelPositioning",
 "StackAnimationsDuration",
 "InterpolatableColorTags",
 "StackArrangementNames",
 "MapArrangementNames",
 "TestamentNames",
 "SectionNames",
 "BookNames",
 "MeshesUrls",
 "TimeUnit",
 "MapButtonType",
 "MapElementMeasurements",
 "UsersColorValues",
 "BRUSH_CURSOR_URL", 
 "LabelDateFormats",
 "BibleType",
 "GameState",
 "DateFormats",
 "PlaylistItemType",
 "GetFocusOnPositionFromRotation",
 "GetDialogBotScaleY",
 "GetRandomColor",
 "GetRandomUnitVector",
 "DistanceBetweenBotAndCamera",
 "ClosestNumber",
 "CapitalizeFirstLetter",
 "HexToRgb",
 "RgbToHex",
 "GetRandomElementFromArray",
 "FormatNumberToUSDCurrency",
 "ApplyFunctionToElement",
 "GetBotScales",
 "GetAnimateTagFromObject",
 "GetSetTagFromObject",
 "SubtractArrays",
 "SetRenderOrder",
 "GetSectionLevels",
 "ReleaseLabelTransformerFromElement",
 "GetCurrentInfoLabelTransformer",
 "HandleBookDataInStack",
 "HandleSectionDataInStack",
 "HandleTestamentDataInStack",
 "FindPreviousValidGroupBookData",
 "GetGroupBookData",
 "GetAmountOfChaptersInSection",
 "GetDarkerColor",
 "RotateArray",
 "GetSelectedBookData",
 "ShowChaptersInBook",
 "GetHistoryColor",
 "GetHistoryEntriesForElement",
 "GetHistoryEntries",
 "GetFixedScales",
 "GetFixedPosition",
 "GetChildrenLevelColors",
 "GetTextColorBasedOnBackground",
 "GetCustomArrangementExplodedViewBooksPositions",
 "GetFixedArrangementFromTemplate",
 "GetTemplateFromArrangement"
]
thisBot.vars.globalsDefined = globalsDefined;