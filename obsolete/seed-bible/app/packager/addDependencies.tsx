console.log(that)
const { bots, createdAt, description, id, name, status } = that
os.log(that)
const realbots = bots.map(bot => getBot('system', bot.botTag))
const uploadedBots = await os.recordFile(tags.recordName, [...realbots])
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
const result = await os.recordData(tags.recordName, name, data, {
    marker: 'publicRead'
})
console.log(result, 'dependency uploaded')
