const { dataItem } = that;

let dataToNavigate = dataItem;
let skipNeeded = false;

const openTestamentBySection = (sectionName, isFindByRank = false) => {
    const sectionRanks = getSectionRanking();
    let section;
    Object.keys(sectionRanks).forEach((key) => {
        if (isFindByRank) {
            const curreSec = sectionRanks[key];
            if (sectionName === curreSec.sectionRank) {
                section = curreSec;
            }
        } else {
            if (key.toLocaleLowerCase() === sectionName.toLocaleLowerCase()) {
                section = sectionRanks[key];
            }
        }
    })
    const mainWordBibleOldTestament = getBot("isOldTestament", true);
    const mainWordBibleNewTestament = getBot("isNewTestament", true);

    const bookTestament = section?.testament === "Old Testament" ? mainWordBibleOldTestament : mainWordBibleNewTestament;
    if (!bookTestament) {
        return false;
    }
    return true;
}


switch (dataToNavigate.type) {
    case "testament": {
        const mainWordBibleOldTestament = getBot("isOldTestament", true);
        const mainWordBibleNewTestament = getBot("isNewTestament", true);
        const bot = dataToNavigate.additionalInfo.isNewTestament ? mainWordBibleNewTestament : mainWordBibleOldTestament;
        if (!bot) {
            skipNeeded = true;
        }
        break;
    }
    case "section": {
        const isTestamentPresent = openTestamentBySection(dataToNavigate.additionalInfo.sectionName);
        if (!isTestamentPresent) {
            let sectionBot = getBot(byTag("isSection", true), byTag('sectionName', dataToNavigate.additionalInfo.sectionName));
            if (!sectionBot || sectionBot?.masks?.selected) {
                skipNeeded = true;
            }
        }
        break;
    }
    default: {

    }
}
return skipNeeded;
