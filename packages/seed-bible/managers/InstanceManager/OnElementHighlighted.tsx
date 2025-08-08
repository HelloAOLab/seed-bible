import {HighlightHistoryEntry} from "managers.InstanceManager.HighlightHistoryEntry"
const {color, prevColor, element, data} = that;

thisBot.masks.highlightHistoryIndex++;
thisBot.vars.highlightHistory.splice(thisBot.masks.highlightHistoryIndex, Infinity, new HighlightHistoryEntry({data, element, color, prevColor}));