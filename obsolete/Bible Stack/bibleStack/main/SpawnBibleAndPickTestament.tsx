const {testamentName} = that;
const {bibleData} = await thisBot.CreateNewBible({setBibleAnimating: false});
await thisBot.PickTestament({bibleData, testamentName});