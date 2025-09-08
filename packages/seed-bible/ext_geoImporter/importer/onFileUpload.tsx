var file = that.file.data;
console.log("good", that.file)

const arrayBuffer = file;
const textDecoder = new TextDecoder();
const string = textDecoder.decode(arrayBuffer);
const jsonObject = JSON.parse(string);
whisper(thisBot, "loadMap", {file: jsonObject})