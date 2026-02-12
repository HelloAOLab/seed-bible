const file = that.file.data;
const arrayBuffer = file;
const textDecoder = new TextDecoder();
const string = textDecoder.decode(arrayBuffer);
const jsonObject = JSON.parse(string);
whisper(thisBot, "loadMap", { file: jsonObject });
