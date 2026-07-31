shout("closeShareButton");
const G = globalThis as any;
G.LocaleStorage.historySaver();
os.unregisterApp("quitGame");
os.registerApp("quitGame", thisBot);
const makeBooleansTrue = that?.makeBooleansTrue;
if (makeBooleansTrue) {
  if (G.makingPlaylist) {
    G.makingPlaylist = false;
    return;
  }
  G.makingPlaylist = true;
}
G.setOpenSidebar && G.setOpenSidebar(false);
const Playlist = await thisBot.PlaylistUI();
return Playlist;
// thisBot.showInfo(`History Mode`);
// if (!globalThis.hasASharedPlaylist) {
//     thisBot.showInfo(`History Mode`);
// } else {
//     thisBot.showInfo(`Playlist Mode`);
// }
// const QuitGame = () => {
//     return <>
//         <style>{thisBot.tags['google-icon.css']}</style>
//         <div
//             style={{
//                 position: "fixed",
//                 top: '20px',
//                 right: "20px",
//                 zIndex: '1001'
//             }}
//         >
//             <Button
//                 backgroundColor="black"
//                 onClick={() => {
//                     const ids = Object.keys(globalThis.PlaylistsGroups);
//                     globalThis.makingPlaylist = false;
//                     setCurrentExperience(0);
//                     setOpenSidebar(false);
//                     shout('shareButton');
//                     if (globalThis.updateCustomHeight) updateCustomHeight(0);
//                     ids.forEach(id => {
//                         globalThis[`${id}creatingPlaylist`] = false;
//                         globalThis[`${id}creatingPlaylistName`] = "";
//                     })
//                     os.unregisterApp("controlButtons");
//                     os.unregisterApp("quitGame");
//                     os.unregisterApp("message");
//                     os.unregisterApp("playing-playlist");
//                     os.unregisterApp("playlist-cont-ui");
//                     thisBot.cursorReset();
//                 }}
//             >
//                 ➲ Quit
//             </Button>
//         </div>
//     </>
// }
// os.compileApp("quitGame", <QuitGame />);
