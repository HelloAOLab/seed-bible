const sendIcon = (vars) => {
    if (vars === null) {
        os.unregisterApp('mouseCursor')
        masks['clicked'] = false
        masks['type'] = null
        return
    }
    if (vars.action) {
        vars.action();
        return
    }
    thisBot.cursorFollow({ type: vars.type })
    masks['clicked'] = true
    masks['type'] = vars
}

globalThis.sendIcon = sendIcon;