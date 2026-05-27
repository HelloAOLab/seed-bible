let userDataBot = create(thisBot, {
    onBotChanged: tags.onUMBotChanged,
    onGridClick: tags.onUMGridClick,
    onKeyDown: tags.onUMKeyDown,
    onKeyUp: tags.onUMKeyUp,
    mmTypingManager: true,
    typingTool: true,
    space: "tempLocal",
    onInstJoined: null,
    system: "temp.userData",
    dashText: tags.replaceText,
    onEggHatch: null,
    focus: null
})