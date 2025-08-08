
// if(globalThis?.humeStarted) {
//   if(socket.readyState === socket.OPEN) {
//     os.log("sending request")
//     socket.send(JSON.stringify({
//         data: await blobToBase64(that),
//         type: "audio_input"
//     }));
//   }
// }

// async function blobToBase64(blob) {
//   // Read the Blob as an ArrayBuffer
//   const arrayBuffer = await blob.arrayBuffer();
  
//   // Convert the ArrayBuffer to a Base64 string
//   const base64String = bytes.toBase64String(new Uint8Array(arrayBuffer), 'audio/wav');
  
//   return base64String;
// }