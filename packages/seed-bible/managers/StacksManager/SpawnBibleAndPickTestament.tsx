const {testamentName} = that;
const {bibleData} = await StacksManager.CreateNewBible({setBibleAnimating: false});
await thisBot.PickTestament({bibleData, testamentName});