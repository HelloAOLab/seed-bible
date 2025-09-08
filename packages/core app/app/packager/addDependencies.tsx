console.log(that)
const { bots, createdAt, description, id, name, status } = that
os.log(that)
const realbots = bots.map(bot => getBot('system', bot.botTag))
const uploadedBots = await os.recordFile(tags.publicKey, [...realbots])
if (!uploadedBots.success && uploadedBots.errorCode !== 'file_already_exists')
    return
if (uploadedBots.errorCode === 'file_already_exists')
    uploadedBots.url = uploadedBots.existingFileUrl
const data = {
    ...that,
    recordFile: uploadedBots,
    type: 'dependency',
    userAuth: authBot.id,
    source: uploadedBots.url,
}
const result = await os.recordData(tags.publicKey, name, data, {
    marker: 'publicRead'
})
console.log(result, 'dependency uploaded')
// const mainBot = getBot('system', mainBotTag)
// const otherBotsHolder = otherBots.map(bot => getBot('system', bot.tag))
// if (!bots.success)
//     return
// const data = {
//     ...that,
//     // mainBot: ,
//     mainBotTag:mainBotTag,
//     otherBots: otherBots,
//     recordFile: bots,
//     userAuth: authBot.id,
//     configEditor: getBot('system', mainBotTag).tags.config,
// }
// // const result = await os.recordData(tags.key, name, data);


// const result = await os.recordData(tags.publicKey, name, JSON.stringify(data));

// os.log('the re', result)

