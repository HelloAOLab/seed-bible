const th = that;

return th.map(item => {
    const skip = thisBot.checkIfNeedToSkip({ dataItem: item });
    return {
        ...item,
        greyOut: skip
    }
})