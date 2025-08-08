const writenBot = getBot(byTag("id", tags.currentWritingBotId));
const allowedCharacters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "=", "[", "]", "{", "}", "|", "\\", "'", '"', "<", ">", ",", ".", "?", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]
const dim = os.getCurrentDimension();

if(writenBot.space === "remoteTempShared"){
    if(!writenBot.masks.label){
        setTagMask(writenBot, "label", " ", "shared");
    }
    if (allowedCharacters.includes(that.keys[0])) {
        setTagMask(writenBot, "label", writenBot.masks.label + that.keys[0], "tempShared");
        tags.writing = true;
    } else if (that.keys[0] === " ") {
        setTagMask(writenBot, "label", writenBot.masks.label + " ", "shared");
        tags.writing = true;
    } else if (that.keys[0] === "Backspace") {
        const label = writenBot.masks.label;
        if(label.slice(0, -1)){
            setTagMask(writenBot, "label", writenBot.masks.label.slice(0, -1), "shared");
        }
        tags.writing = true;
    }
}else{
    if(!writenBot.masks.label){
        setTagMask(writenBot, "label", " ", "shared");
    }
    if (allowedCharacters.includes(that.keys[0])) {
        setTagMask(writenBot, "label", writenBot.masks.label + that.keys[0], "tempShared");
        tags.writing = true;
    } else if (that.keys[0] === " ") {
        setTagMask(writenBot, "label", writenBot.masks.label + " ", "shared");
        tags.writing = true;
    } else if (that.keys[0] === "Backspace") {
        const label = writenBot.masks.label;
        if(label.slice(0, -1)){
            setTagMask(writenBot, "label", writenBot.masks.label.slice(0, -1), "shared");
        }
        tags.writing = true;
    }
}