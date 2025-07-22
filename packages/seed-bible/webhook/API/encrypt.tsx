const salt = globalThis.ENCRYPT_SALT_KEY || "CUSTOMSALT";

const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
const applySaltToChar = code =>
    thisBot.textToChars(salt).reduce((a, b) => a ^ b, code);

return text =>
    text.split("").map(thisBot.textToChars).map(applySaltToChar).map(byteHex).join("");