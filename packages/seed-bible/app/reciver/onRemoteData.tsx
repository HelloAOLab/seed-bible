


console.log(that)
if (that.name === 'updateSharingData') {
    console.log(that, 'updateSharingData')
    shout('updatedYourData', { user: that.remoteId, tab: { ...that.that } })
}
if (masks['remotes'] && masks['remotes'].includes(that.remoteId)) {
    console.log(that)
    if (that.name === 'book') {
        shout('remoteBookChange', { ...that.that })
    }
    else if (that.name === 'highlight') {
        shout('remoteHighlightChange', that.that)
    }
    else if (that.name === 'scrollPresence') {
        shout('remoteScrollPresence', { ...that.that })
    }
    else if (that.name === 'verseClicked') {
        shout('remoteVerseClick', { ...that.that })
    } else if (that.name === 'appClick') {
        // os.log('appClick', that.that)
        const { name } = that.that
        globalThis[name].onClick()
    }



} else {


    os.log('you are not logged to this session at allls', that, that.remoteId, that.that)
}