const arr = thisBot.tags.gameData.hints;
let leftIndex = Math.min(thisBot.tags.currentTries,thisBot.tags.totalTries);


while (leftIndex >= 0 && arr[leftIndex] === "") {
    leftIndex--;
}

if (leftIndex < 0) {
        return null;  // No non-empty string found on the left
}

return arr[leftIndex];
