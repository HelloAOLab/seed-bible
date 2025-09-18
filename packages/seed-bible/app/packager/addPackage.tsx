const { name, version, description, mainBotTag, otherBots, dependencies, author, license, configEditor } = that
os.log(that)
const mainBot = getBot('system', mainBotTag)
const otherBotsHolder = otherBots.map(bot => getBot('system', bot.tag))
const bots = await os.recordFile(tags.publicKey, [mainBot, ...otherBotsHolder])
if (!bots.success && bots.errorCode !== 'file_already_exists')
    return
if (bots.errorCode === 'file_already_exists')
    bots.url = bots.existingFileUrl
const data = {
    ...that,
    // mainBot: ,
    mainBotTag: mainBotTag,
    otherBots: otherBots,
    recordFile: bots,
    source: bots.url,
    userAuth: authBot.id,
    type: 'package',
    configEditor: getBot('system', mainBotTag).tags.config,
}
// const result = await os.recordData(tags.key, name, data);


const result = await os.recordData(tags.publicKey, name, (data));

os.log('the re', result)

