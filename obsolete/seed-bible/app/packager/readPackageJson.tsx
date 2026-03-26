
const { data } = that
const { payload, metadata } = data

console.log(metadata)
console.log(payload)
if (!masks[`${metadata.createdFor}-data`])
    await thisBot.installPackage({ name: metadata.createdFor, feedback: () => shout(`${metadata.runAt}`, { content: payload.content }) })
else
    shout(`${metadata.runAt}`, { content: payload.content })
