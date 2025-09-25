// if (!globalThis?.AIAIDataChannel) return
// // let chapterContent = `${that.book}-${that.chapter} \n`;
// // for (let i = 0; i < that.content.length; i++) {
// //     chapterContent += `${that.content[i].heading} \n`
// //     let verses = that.content[i].verses;
// //     for (let j = 0; j < verses.length; j++) {
// //         chapterContent += `${verses[j].verseNumber} ${verses[j].text} \n`
// //     }
// // }
// console.log(that, "data channel")
// // AIAIDataChannel.send(
// //     JSON.stringify({
// //         type: "conversation.item.create",
// //         item: {
// //             type: "message",
// //             role: "developer",
// //             content: [
// //                 {
// //                     type: "input_text",
// //                     text: `CTX: user is reading book=${that.book} chapter=${that.chapter}`
// //                 }
// //             ]
// //         }
// //     })
// // );

// AIDataChannel.send(JSON.stringify({
//   type: "session.update",
//   session: {
//     instructions:
//       `You assist in a Bible app. Active chapter: ${that.translation} ${that.book} ${that.chapter} `
//   }
// }));

// // 2) Add a developer item so it’s visible in the thread, too.
// AIDataChannel.send(JSON.stringify({
//   type: "conversation.item.create",
//   item: {
//     type: "message",
//     role: "developer",
//     content: [{ type: "input_text", text: `CTX: bible=${that.translation} book=${that.book} chapter=${that.chapter}` }]
//   }
// }));

// // 3) Nudge the model to re-plan with the new context.
// AIDataChannel.send(JSON.stringify({ type: "response.create" }));