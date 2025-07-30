if (globalThis.RenderLinkTimer) clearTimeout(globalThis.RenderLinkTimer);

globalThis.RenderLinkTimer = setTimeout(async () => {
    const appName = 'media-linked-playlist';

    const PlaylistMedia = thisBot.playlistContentRenderer();
    const { Modal, Button, ButtonsCover } = Components;

    DataManager.cancelCurrentPlayingSound();

    if (globalThis.SetMediaURL && !that.skipEmbed) {
        globalThis.SetMediaURL(null);
    }

    if (globalThis.SetVideoSrc && !that.skipEmbed) {
        globalThis.SetVideoSrc(null);
        if (that.additionalInfo.type === 'video-recording' || that.additionalInfo.type === "video") {
            globalThis.SetVideoSrc(that.additionalInfo.link);
            return;
        }
    }

    if (that.additionalInfo.type === 'voice-recording') {
        const data = await web.get(that.additionalInfo.link);
        if (globalThis.SetIncrementalCountPlayingPlaylist) {
            await globalThis.SetIncrementalCountPlayingPlaylist(that.additionalInfo.link);
        }
        await DataManager.playSound({ data: data.data });
        return;
    }

    if (that.additionalInfo.type === 'file') {
        const link = document.createElement('a');
        link.href = that.additionalInfo.link;
        link.download = that.content;

        // For cross-origin URLs, set target _blank to trigger download in new tab
        link.target = '_blank';

        // Append to DOM and trigger click
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    const data = that;

    if (data.additionalInfo.type === 'iframe') {
        if (globalThis.OpenRefTimeout) {
            clearTimeout(globalThis.OpenRefTimeout);
            globalThis.OpenRefTimeout = null;
        }
        globalThis.OpenRefTimeout = setTimeout(() => {
            globalThis.window?.open(
                data.additionalInfo.link,
                "_blank",
                "noopener,noreferrer"
            );
        }, 200);
        return;
    }

    // os.unregisterApp(appName);
    os.registerApp(appName);

    const MediaLinkedPlaylist = () => {
        return <Modal showIcon={false} title="Linked Items" styles={{ height: 'calc(100% - 120px)' }} sxContainer={{ height: "98dvh", width: "98vw", zIndex: "9999999" }} showIcon={false} onClose={() => { if (globalThis.SmallPlaybackContent) globalThis.SmallPlaybackContent(); os.unregisterApp(appName); }}>
            <PlaylistMedia type={data.additionalInfo.type} content={data.content} link={data.additionalInfo.link} videoId={data.additionalInfo.videoId} />
            {globalThis.PlayingPlaylist && <ButtonsCover>
                {!that.isFirstItem ? <Button style={{ minWidth: "100px", margin: "8px 0 0 0 " }} onClick={() => {
                    HandleOnButtonPress(-1)
                    os.unregisterApp(appName)
                }} backgroundColor="black">
                    Previous
                </Button> : <p />}
                {!that.isLastItem && <Button style={{ minWidth: "100px", margin: "8px 0 0 0 " }} onClick={() => {
                    HandleOnButtonPress(1)
                    os.unregisterApp(appName)
                }} backgroundColor="black">
                    Next
                </Button>}
            </ButtonsCover>}
        </Modal>
    }

    globalThis.ModifyTransformedHistory && globalThis.PlayingPlaylist && globalThis.ModifyTransformedHistory(thh => thisBot.checkGreyOut(thh));
    if (globalThis.updateCustomHeight) updateCustomHeight(0);

    os.compileApp(appName, <MediaLinkedPlaylist />);
}, 100);