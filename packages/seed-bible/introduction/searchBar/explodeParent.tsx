let parentSection = getBot(byTag("isSection", true), byTag("sectionName", that.sectionName));
const isSingleBook = that.isSingleBook;

if (isSingleBook) {
    parentSection = getBot(byTag("isBook", true), byTag("bookName", that.sectionName));
}

if(parentSection?.tags?.isInExplodedView || !globalThis.hideSeekPlaying) return;

parentSection && !isSingleBook  && parentSection.setAsExplodedView({focusON: parentSection.tags.sectionRank === 7 || globalThis.skipAnimation});
const sectionExplodeSound = ["String_01c" , "String_02e" , "String_04g" , "String_05a" ,  "String_07e" , "String_08f" , "String_10a" , "String_11c"];
await os.sleep(globalThis.skipAnimation ? 700 : 1000);

const soundName = sectionExplodeSound[globalThis.skipAnimation ? 7 - parentSection.tags.sectionRank : parentSection.tags.sectionRank];

shout("playSound",{soundName});

if (isSingleBook) {
        try {
            parentSection.shiftFocus({onlyZ: true, duration: 0.8});
        }catch {
        }
        parentSection.tryToHighlightSelf({});
        await os.sleep(400);
        parentSection.unhighlightSelf({delayInSeconds: 0.20});
        await os.sleep(200);
}

await os.sleep(globalThis.skipAnimation ? 700 : 1000);

if (!globalThis.skipAnimation){
    if(!isSingleBook) {
        await thisBot.highlightBooksinSection({sectionRank: parentSection.tags.sectionRank, validInteger: that.validInteger});
    }
}