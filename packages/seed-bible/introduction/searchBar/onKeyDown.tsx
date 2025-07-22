const mainWord = getBot('isMainWord', true);
// const splitIntoTestaments =
//   mainWord.masks.currentState === 'splitIntoTestaments';
// if(!splitIntoTestaments) return;
if (!globalThis.openSearchBar && that.keys.includes("Enter")) return;
const searchBarFocused = globalThis?.searchBarFocused;

const allowedCharacters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "=", "[", "]", "{", "}", "|", "\\", "'", '"', "<", ">", ",", ".", "?", "/", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", " "]
if (!searchBarFocused && allowedCharacters.includes(that.keys[[0]]) && setOpenSidebar && setOpenSearchBar && setQuery) {
    // setOpenSidebar(true);
    // setOpenSearchBar(true);
    setQuery(query + that.keys[0]);
} else if (!searchBarFocused && that.keys.includes("Enter")) {
    handleEnter()
} else if (!searchBarFocused && that.keys.includes("Backspace") && query?.length > 0 && query?.length - 1 >= 0 && setQuery) {
    setQuery(query.slice(0, query.length - 1))
}