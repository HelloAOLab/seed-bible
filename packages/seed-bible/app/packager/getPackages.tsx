// const { force } = that
if (tags.availablePackages) return tags.availablePackages;

// const result = await os.listDataByMarker(tags.recordName, 'publicRead');
// os.log(result, 'for test')
// if (result.success) {
//     const output = result.items.filter(data => data.data.type === 'package').map(data => ({ data: (data.data), address: data.address }))
//     if (!tags.availablePackages) {
//         tags.availablePackages = output
//     }
//     return output
// }
os.log("loading all pacakges");
const data = await thisBot.getDependencies();
os.log(data);
const output = data.filter((data: any) => data.data.type === "package");
tags.availablePackages = output;
return output;
// let lastAddress;
// let items = [];
// while (true) {
//     const result = await os.listDataByMarker(tags.recordName, 'publicRead', lastAddress);
//     if (result.success) {
//         items.push(...result.items);
//         if (result.items.length > 0) {
//             console.log(result.items)
//             lastAddress = result.items[result.items.length - 1].address;
//         } else {
//             // result.items is empty, so we can break out of the loop
//             break;
//         }
//     } else {
//         os.log("Failed " + result.errorMessage);
//         break;
//     }
// }
// const output = items.filter(data => data.data.type === 'package')
// console.log(items);
// tags.availablePackages = output
// return output
