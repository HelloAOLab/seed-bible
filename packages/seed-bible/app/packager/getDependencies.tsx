
// const result = await os.listDataByMarker(tags.publicKey, ['publicRead']);
// os.log(result, 'for test')
// if (result.success) {
//     return result.items
//     // .filter(data => data.data.type === 'dependency')
//     .map(data=>data.data)
// }
let lastAddress;
const items = [];
while (true) {
    const result = await os.listDataByMarker(tags.publicKey, 'publicRead', lastAddress);
    if (result.success) {
        items.push(...result.items);
        if (result.items.length > 0) {
            lastAddress = result.items[result.items.length - 1].address;
        } else {
            // result.items is empty, so we can break out of the loop
            break;
        }
    } else {
        os.log("Failed " + result.errorMessage);
        break;
    }
}
const output = items
    // .map(data => data.data)

console.log(items);
return output