// const updatedData = {};

// Object.keys(data).forEach(key=>{
//   const item = data[key];
//   const splitKey = key.toLocaleLowerCase().includes("psalm") ? "Psalm" : key;
//   const updatedArray = item.map(ele=>{
//     const [verse,location] = ele.split(` - ${splitKey} `);
//     if(location?.length > 12) {
//       console.log(location)
//       throw Error("WE are UP!")
//     }else if(!location){
//       console.log(location,key,item);
//       throw Error("Not data!")
//     }
//     return {
//       verse,
//       refer: `${key} ${location}`
//     }
//   });
//   updatedData[key] = updatedArray;
// })

const bookName = that.bookName;
const fullVerse = that.verse; 

const splitKey = bookName;

const [verse,location] = fullVerse.split(` - ${splitKey} `);

return {
      verse,
      refer: `${bookName} ${location}`,
      bookName,
      location
}