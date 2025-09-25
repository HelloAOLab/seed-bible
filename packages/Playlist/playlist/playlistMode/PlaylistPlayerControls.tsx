const { useState } = os.appHooks;
const { Button } = Components;

const EditPlaylist = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/a48b4bb0182ac0b5f8c8437e3d985f9af99c8b64c61249496ef797b9b8ac88df.svg";
const SharePlaylist = "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/d205ab2613e2feb14123b39522527dc72a7b649078fd434c81b0b44ede4cdecf.svg";

const PlayerControls = ({ parentId = 'default' }) => {

    const [{ prevItemName, nextItemName }, setItemsPlayer] = useState({
        prevItemName: globalThis.prevItemName || null,
        nextItemName: globalThis.nextItemName || null,
    });


    globalThis.SetItemsPlayer = setItemsPlayer;

    return (
        <>
            <style>{thisBot.tags['Linking.css']}</style>
            <style>{thisBot.tags["PlaylistContainer.css"]}</style>
            <style>{thisBot.tags["playlist.css"]}</style>
            <div style={{
                background: "white",
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                boxShadow: '0px 0px 9px 0px #00000026',
                padding: '10px',
                borderRadius: '8px'
            }}>
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: '0.5rem',
                        width: "calc(100%)",
                    }}
                >
                    <div style={{ width: '50%', flexDirection: 'column', display: 'flex' }}>
                        {nextItemName?.content ? <p style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            display: "flex",
                            alignItems: 'center',
                            margin: '0',
                            marginBottom: '0.5rem',
                            fontFamily: 'DM Mono'
                        }}>
                            Playing Next
                        </p> : null}
                        <div style={{ gap: '0.5rem', }} className="align-center">
                            <div style={{ height: '2.5rem', width: '2.5rem', display: 'grid', placeItems: 'center', backgroundColor: '#D3643329', borderRadius: '0.25rem' }} >
                                <span style={{ margin: '0', fontSize: '18px' }} class="material-symbols-outlined unfollow">
                                    {nextItemName?.type === 'attachment-link' ? 'media_link' : 'description'}
                                </span>
                            </div>
                            <div>
                                {nextItemName?.content ? < p style={{
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    display: "flex",
                                    alignItems: 'center',
                                    fontFamily: 'DM Sans',
                                    margin: '0',
                                }}>
                                    {nextItemName?.content ? `${nextItemName?.content}${nextItemName?.prefix}`.substring(0, 16) : ""}{`${nextItemName?.content}${nextItemName?.prefix}`.length > 16 ? '...' : ""}
                                </p> : null}
                                <p
                                    style={{
                                        color: "green",
                                        fontSize: "12px",
                                        fontWeight: "900",
                                        fontFamily: 'DM Sans',
                                        margin: '0',
                                    }}
                                >{nextItemName?.content ? "" : " (Playlist Ended)"}</p>
                                {!globalThis.ValidTypes[nextItemName?.type] && <p style={{ fontSize: '12px', fontWeight: '400', color: '#0000001', margin: '0', textTransform: "capitalize" }}>{nextItemName?.type}</p>}
                            </div>
                        </div>
                    </div>
                    <div className="flex align-center" style={{ gap: '0.5rem' }}>
                        <p style={{ margin: '0', width: '24px', backgroundColor: '#D364334D', height: '24px', border: '1px solid #D36433' }} className="playlist-action small" onClick={globalThis.PlaylistPlaytoggleHide}>
                            <img
                                src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/fe3ea1784fbed6a33fb06bc8885bca18211293462adcb06311db83f1450589b8.svg"
                                class="material-symbols-outlined unfollow" style={{
                                    margin: '0',
                                    width: '12px'
                                }}
                            />

                            {false && <span>
                                {checklistEnabled ? "Player" : "Queue"}
                            </span>}
                        </p>
                        <p
                            onClick={() => {
                                if (globalThis.PlayingsetOpenAttachLink) globalThis.PlayingsetOpenAttachLink(true);
                            }}
                            style={{ margin: '0', width: 'max-content', height: '24px', borderRadius: '6px', border: '0px solid #D36433', backgroundColor: '#E6E6E6' }}
                            className="playlist-action small"
                        >
                            <span style={{ margin: '0' }} class="material-symbols-outlined unfollow">
                                add
                            </span>
                        </p>
                    </div>
                </div>

                <p style={{ height: '1px', backgroundColor: '#000000', opacity: '0.1', width: '100%', margin: '0.5rem 0' }} />

                <div style={{ display: 'flex', width: '100%', gap: '1rem', justifyContent: "space-between", alignItems: 'center' }}>
                    {false && <img
                        src={EditPlaylist}
                        class="material-symbols-outlined unfollow"
                        style={{
                            margin: '0',
                            width: '1rem',
                            marginRight: '1rem',
                            cursor: 'pointer'
                        }}
                        onClick={globalThis.PlaylistPlaytoggleHide}
                    />}
                    <Button
                        style={{
                            fontSize: '12px',
                            margin: '0',
                            minWidth: 'auto',
                            backgroundColor: 'transparent',
                            border: '0px solid #D36433',
                            boxShadow: 'none',
                            color: !prevItemName?.content ? "#939393" : '#000',
                            padding: '8px',
                            fontSize: '12px'
                        }}
                        onClick={() => {
                            if (!prevItemName?.content) return;
                            DataManager.cancelCurrentPlayingSound();
                            if (globalThis.HandleOnButtonPress) globalThis.HandleOnButtonPress(-1);
                        }}
                    >
                        <span class="material-symbols-outlined unfollow">
                            skip_previous
                        </span>
                    </Button>
                    <p
                        onClick={() => {
                            globalThis.IsPlaylistPlaying = false;
                            DataManager.cancelCurrentPlayingSound();
                            globalThis.SetSelected && SetSelected({});
                            globalThis.SetHolded && SetHolded({});
                            // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                            globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                            globalThis.IsQueuePresent = false;
                            // os.unregisterApp("playing-playlist");
                            globalThis.IS_PLAYLIST_ACTIVE = false;
                            thisBot.CloseFloatingApp();
                            globalThis.SetSplitAppPanel2(null);
                            // thisBot.showInfo(`History Mode`);
                            if (globalThis.RemoveNowBarApp) {
                                globalThis.RemoveNowBarApp('player-playlist-bar');
                            }
                        }}
                        style={{ margin: '0', width: '2.55rem', height: '2.55rem', borderRadius: '50%', border: 'none' }}
                        className="playlist-action small"
                    >
                        <span style={{ margin: '0', fontSize: '14px', backgroundColor: '#D36433' }} class="material-symbols-outlined unfollow">
                            stop
                        </span>
                    </p>
                    <Button
                        style={{
                            fontSize: '12px',
                            margin: '0',
                            minWidth: 'auto',
                            backgroundColor: 'transparent',
                            border: '0px solid #D36433',
                            boxShadow: 'none',
                            color: '#000',
                            padding: '8px',
                            fontSize: '12px'
                        }}
                        onClick={() => {
                            DataManager.cancelCurrentPlayingSound();
                            if (!!nextItemName?.content && !!globalThis.HandleOnButtonPress) {
                                globalThis.HandleOnButtonPress(1);
                                return;
                            }
                            // globalThis.SetPlayingPlaylist && globalThis.SetPlayingPlaylist(false);
                            globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`] && globalThis[`${parentId}ToggleGreyCheckPLayingPlaylist`](null);
                            globalThis.IsQueuePresent = false;
                            globalThis.IS_PLAYLIST_ACTIVE = false;
                            thisBot.CloseFloatingApp();
                            globalThis.SetSplitAppPanel2(null);
                            // os.unregisterApp("playing-playlist");
                            // thisBot.showInfo(`History Mode`);
                            if (globalThis.RemoveNowBarApp) {
                                globalThis.RemoveNowBarApp('player-playlist-bar');
                            }
                        }}
                    >
                        <span class="material-symbols-outlined unfollow">
                            {!!nextItemName?.content ? "skip_next " : "last_page"}
                        </span>
                    </Button>
                    {false && <img
                        src={SharePlaylist}
                        class="material-symbols-outlined unfollow" style={{
                            margin: '0',
                            marginLeft: '1rem',
                            width: '1rem',
                            cursor: 'not-allowed'
                        }}
                        onClick={() => {
                            return ShowNotification({ message: "Coming Soon!", severity: "error" });
                        }}
                    />}
                </div>
            </div>
        </>)
}

return PlayerControls;