if (configBot.tags.systemPortal) return;

const currentAiBot = getBot(byTag('selectedAiBot', true));

if (currentAiBot) {
    const allowedCharacters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "=", "[", "]", "{", "}", "|", "\\", "'", '"', "<", ">", ",", ".", "?", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", " "]
    if (allowedCharacters.includes(that.keys[0])) {
        setTagMask(currentAiBot, "label", currentAiBot.masks.label ? currentAiBot.masks.label + that.keys[0] : that.keys[0], "tempLocal");
        setTagMask(currentAiBot, "labelOpacity", 1, "tempLocal");
    } else if (that.keys[0] === "Backspace") {
        if (currentAiBot.masks.label === "" || currentAiBot.masks.label === null || currentAiBot.masks?.label.slice(0, -1) === "") {
            currentAiBot.masks.label = null;
            currentAiBot.masks.labelOpacity = null;
        } else {
            setTagMask(currentAiBot, "label", currentAiBot.masks.label.slice(0, -1), "tempLocal");
        }
    } else if (that.keys[0] === "Enter") {
        whisper(getBot("chatGptBot", true), "onClick");
    } else if (that.keys.includes("ArrowUp")) {
    } else if (that.keys.includes("ArrowDown")) {
    } else if (that.keys.includes("ArrowLeft")) {
    } else if (that.keys.includes("ArrowRight")) {
    }
}
