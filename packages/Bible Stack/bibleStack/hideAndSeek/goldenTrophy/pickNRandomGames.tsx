const arr = getBots(byTag("system","hideAndSeek.startGame"),byTag("isInitialized",true));

const n = 4;

if (n >= arr.length) {
    return arr;
}

const result = [];
const indices = new Set();

while (result.length < n) {
    const randomIndex = Math.floor(Math.random() * arr.length);

    if (!indices.has(randomIndex)) {
        result.push(arr[randomIndex]);
        indices.add(randomIndex);
    }
}

return result;