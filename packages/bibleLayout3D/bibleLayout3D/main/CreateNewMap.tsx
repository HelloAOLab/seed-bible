import {LayoutData} from 'bibleLayout3D.main.LayoutData'

const {position} = that;

const layoutData = new LayoutData({id: uuid()});
const {layoutBookStructures, staticLayoutElements, amountOfRows, sectionLinesInfo, testamentLinesInfo } = await thisBot.CreateLayoutStructure({layoutData});

layoutBookStructures.forEach((layoutBookStructure) => {layoutData.AddChild(layoutBookStructure)});
layoutData.amountOfRows = amountOfRows
layoutData.sectionLinesInfo = sectionLinesInfo;
layoutData.testamentLinesInfo = testamentLinesInfo;
layoutData.staticLayoutElements = staticLayoutElements;
thisBot.vars.layoutsData.push(layoutData);
thisBot.SetUpLayout({layoutData, position});

return {layoutData}