import {HistoryEntry} from "managers.InstanceManager.HistoryEntry"
import {ElementInfo} from "managers.InstanceManager.ElementInfo"
import {RemoteUserSelection} from "managers.InstanceManager.RemoteUserSelection"
const {element} = that;
const myRemoteId = getID(configBot)
const remoteUserSelection='';
const lobbyUserBot = getBot('lobbyUserBot', true);
const lobbyId = lobbyUserBot?.id;

let entries;
switch(element.tags.typeOfElement)
{
    case BibleElementType.Testament:
        entries = [new HistoryEntry({typeOfElement: BibleElementType.Testament, key: element.tags.testamentName, date: new Date()})]
    break;
    case BibleElementType.Section: {
        const testamentName = InstanceManager.vars.fixedArrangementsInfo[element.tags.arrangementIndex].testaments[element.tags.testamentIndex].name
        entries = [
            new HistoryEntry({typeOfElement: BibleElementType.Section, key: element.tags.sectionName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Testament, key: testamentName, date: new Date()})
        ] 
    }
    break;
    case BibleElementType.SectionBook:{
        const testamentName = InstanceManager.vars.fixedArrangementsInfo[element.tags.arrangementIndex].testaments[element.tags.testamentIndex].name
        entries = [
            new HistoryEntry({typeOfElement: BibleElementType.Book, key: element.tags.bookName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Testament, key: testamentName, date: new Date()})
        ]
    }
    break;
    case BibleElementType.Book:{
        const testamentName = InstanceManager.vars.fixedArrangementsInfo[element.tags.arrangementIndex].testaments[element.tags.testamentIndex].name;
        entries = [
            new HistoryEntry({typeOfElement: BibleElementType.Book, key: element.tags.bookName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Testament, key: testamentName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Section, key: element.tags.sectionName, date: new Date()})
        ]
    }
    break;
    case BibleElementType.MapBook: {
        const testamentName = InstanceManager.vars.fixedArrangementsInfo[element.tags.arrangementIndex].testaments[element.tags.testamentIndex].name;
        entries = [
            new HistoryEntry({typeOfElement: BibleElementType.Book, key: element.tags.bookName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Section, key: element.tags.sectionName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Testament, key: testamentName, date: new Date()})
        ]
    }
    break;
    case BibleElementType.Chapter:
    case BibleElementType.MapChapter: {
        const {arrangementIndex, testamentIndex, sectionIndex} = StacksManager.GetBookInfoPathByName({name: element.tags.parentBookName, arrangementIndex: element.tags.arrangementIndex});
        const testamentName = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].name;
        const sectionName = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].name
        entries = [
            new HistoryEntry({typeOfElement: BibleElementType.Chapter, key: `${element.tags.parentBookName} ${element.tags.chapterNumber}`, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Book, key: element.tags.parentBookName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Section, key: sectionName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Testament, key: testamentName, date: new Date()})
        ]
    }
    break;
    case BibleElementType.ChunkOfVerses: {
        const {arrangementIndex, testamentIndex, sectionIndex} = StacksManager.GetBookInfoPathByName({name: element.masks.parentBookName, arrangementIndex: element.masks.arrangementIndex});
        const testamentName = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].name;
        const sectionName = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].name
        entries = [
            new HistoryEntry({typeOfElement: BibleElementType.ChunkOfVerses, key: element.masks.chunkPath, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Chapter, key: `${element.masks.parentBookName} ${element.masks.chapterNumber}`, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Book, key: element.masks.parentBookName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Section, key: sectionName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Testament, key: testamentName, date: new Date()})
        ]
    }
    break;
    case BibleElementType.Verse: {
        const {arrangementIndex, testamentIndex, sectionIndex} = StacksManager.GetBookInfoPathByName({name: element.masks.bookName, arrangementIndex: element.masks.arrangementIndex});
        const testamentName = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].name;
        const sectionName = InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].name
        entries = [
            new HistoryEntry({typeOfElement: BibleElementType.Verse, key: element.masks.versePath, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.ChunkOfVerses, key: element.masks.parentChunkPath, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Chapter, key: `${element.masks.bookName} ${element.masks.chapterNumber}`, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Book, key: element.masks.bookName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Section, key: sectionName, date: new Date()}),
            new HistoryEntry({typeOfElement: BibleElementType.Testament, key: testamentName, date: new Date()})
        ]
    }
    break;
    default: break;
}

const remoteSelectionPath = entries.map((entry) => {return new ElementInfo({key: entry.key, typeOfElement: entry.typeOfElement})})

remoteUserSelection = new RemoteUserSelection({selectionPath: remoteSelectionPath, userId: myRemoteId, lobbyId})
thisBot.vars.history.push(...entries)
shout(`OnHistoryUpdated`);
thisBot.OnUserSelectedBibleElement({remoteUserSelection})