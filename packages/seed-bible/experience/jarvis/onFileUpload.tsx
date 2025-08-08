if(!thisBot.tags.jarvis) return;
await thisBot.Alert();
const {mimeType} = that.file;
const dimension = os.getCurrentDimension();
const systemJarvis = getBot('system', 'experience.jarvis')
switch(mimeType)
{
    case "text/plain": {
        const textMesh = thisBot.SpawnMesh({meshUrl: MeshesUrls.Text, dimension, fileInfo: that});
        thisBot.ScanBot({bot: textMesh, dimension, duration: 4});
        whisper(systemJarvis, "handleVoice", {msg: "New info source found! analizing it!"});
        await os.sleep(5000);
        whisper(systemJarvis, "callChatGptResponse", {
            role: "system",
            content: `analize the following text give a brief summary of what's written and then ask user if they would like to see the locations mentions here or explore the chaism related to it or open matthew 8 in pages  \n ${textMesh.tags.fileInfo.file.data}`
        })
    }
    break;
}