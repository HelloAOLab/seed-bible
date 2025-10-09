


if (that.name === 'updateSharingData') {
    shout('updatedYourData', { user: that.remoteId, tab: { ...that.that } })
}
if (masks['remotes'] && masks['remotes'].includes(that.remoteId)) {
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
    } else if (that.name === "playlistPlayed") {
        if(!globalThis.Playlist) {
            return os.toast("Please install playlist tool.")
        }
        shout('remotePlaylistPlayed', { ...that.that })
    } else if (that.name === "playlistQueueUpdated") {
        shout('remotePlaylistMetaDataUpdate', { ...that.that, playlistUpdated: true })
    } else if (that.name === "playlistCurrentIndexUpdate") {
        shout('remotePlaylistMetaDataUpdate', { ...that.that, indexesUpdate: true })
    } else if(that.name === 'playlistStopped') {
        shout('remotePlaylistStopped',{ ...that.that })
    }
} else {


    os.log('you are not logged to this session at allls', that, that.remoteId, that.that)
}