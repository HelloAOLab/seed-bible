const salt = globalThis.ENCRYPT_SALT_KEY || "CUSTOMSALT";

const byteHex = (n: any) => ("0" + Number(n).toString(16)).substr(-2);
const applySaltToChar = (code: any) =>
  thisBot.textToChars(salt).reduce((a: any, b: any) => a ^ b, code);

return (text) =>
  text
    .split("")
    .map(thisBot.textToChars)
    .map(applySaltToChar)
    .map(byteHex)
    .join("");
