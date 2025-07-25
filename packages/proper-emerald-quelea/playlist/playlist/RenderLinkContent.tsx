const appName = 'media-linked-playlist';

const PlaylistMedia = thisBot.playlistContentRenderer();
const { Modal, Button, ButtonsCover } = Components;

DataManager.cancelCurrentPlayingSound();

if (that.additionalInfo.type === 'voice-recording') {
    await DataManager.playSound({ data: that.additionalInfo.link });
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
    return <Modal showIcon={false} title="Linked Items" styles={{ height: 'calc(100% - 120px)' }} sxContainer={{ height: "98dvh", width: "98vw", zIndex: "9999999" }} showIcon={false} onClose={() => os.unregisterApp(appName)}>
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
        <ButtonsCover>
            <p>{" "}</p>
            <Button secondary style={{ minWidth: "100px", margin: "8px 0 0 0 " }} onClick={() => os.unregisterApp(appName)}>
                Close
            </Button>
        </ButtonsCover>
    </Modal>
}

globalThis.ModifyTransformedHistory && globalThis.PlayingPlaylist && globalThis.ModifyTransformedHistory(thh => thisBot.checkGreyOut(thh));
if (globalThis.updateCustomHeight) updateCustomHeight(0);

os.compileApp(appName, <MediaLinkedPlaylist />);