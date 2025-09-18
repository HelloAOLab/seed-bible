const { useState } = os.appHooks;
const VideoPlayer = await thisBot.VideoSmallScreen();
const AudioPlayer = await thisBot.AudioPlayer();

const ShowPlayingContentAnnotation = () => {
    // Audio
    const [mediaURL, setMediaURL] = useState('');
    const [videoSrc, setVideoSrc] = useState(false);
    const [currentItem, setCurrentItem] = useState({});

    globalThis.SetVideoSrc = (val) => { setMediaURL(null); setVideoSrc(val) };
    globalThis.SetMediaURL = (val) => { setVideoSrc(null); setMediaURL(val) };
    globalThis.SetCurrentItem = setCurrentItem;

    if (!currentItem) return null;

    return <div
        style={{
            position: 'relative',
            backgroundColor: 'white',
            padding: '0 0.5rem',
            width: 'calc(100% - 10px)'
        }}
    >
        {videoSrc ?
            <VideoPlayer videoSrc={videoSrc} playlistItem={{ ...currentItem }} />
            :
            mediaURL ?
                <AudioPlayer close secondaryClose mediaURL={mediaURL} />
                :
                null
        }
    </div>
}

return ShowPlayingContentAnnotation;