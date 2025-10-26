const id = setInterval(() => {
    shout("HistoryUpdate");
}, 500);

setTagMask(thisBot, "historyUpdateIntervalId", id);