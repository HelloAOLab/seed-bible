const hexadecimalCharacters = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
let randomColor = "#";
for(let i = 0; i < 6; i++)
{
    const randomCharacter = Math.floor(Math.random() * hexadecimalCharacters.length);
    randomColor += hexadecimalCharacters[randomCharacter];
}
return randomColor;