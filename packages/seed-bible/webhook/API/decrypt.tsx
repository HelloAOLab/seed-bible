const salt = globalThis.ENCRYPT_SALT_KEY || "CUSTOMSALT";

const applySaltToChar = code =>
    thisBot.textToChars(salt).reduce((a, b) => a ^ b, code);
return encoded =>
    encoded
      .match(/.{1,2}/g)
      .map(hex => parseInt(hex, 16))
      .map(applySaltToChar)
      .map(charCode => String.fromCharCode(charCode))
      .join("");