//shout("chronicle_loadData", {record: obj, version: num});

console.log(that)

const targetRecord = that.record;
const fileArray = targetRecord.data.urlArray;
const fileVersion = that.targetVersion ?? fileArray.length - 1;
console.log("FILE", fileArray[fileVersion])
const fileData = await os.getFile(fileArray[fileVersion]);

return fileData;