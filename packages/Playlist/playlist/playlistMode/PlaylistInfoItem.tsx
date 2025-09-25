// type =  book/section/testament
// content = Name
// additionalInfo = rank, sectionRank, testamentRank  
// number -> Index of chpater / verse / book
const { useState } = os.appHooks;


const PlaylistInfoItem = () => {

    const [open, setOpen] = useState(false);

    return <div className={`control-container info-item-playlist-cover ${open && "open"}`}>
        <div onClick={() => setOpen((p) => !p)} >
            <span class="material-symbols-outlined unfollow">
                {open ? "close" : "info"}
            </span>
        </div>
        <div className="info-item-playlist-container">
            <div className="info-item-playlist">
                <p className="playlist-item-verse"></p>
                <p>Verse</p>
            </div>
            <div className="info-item-playlist">
                <p className="playlist-item-verse-range"></p>
                <p>Verse Grouped</p>
            </div>
            <div className="info-item-playlist">
                <p className="playlist-item-chapter"></p>
                <p>Chapter</p>
            </div>
            <div className="info-item-playlist">
                <p className="playlist-item-chapter-range"></p>
                <p>Chapter Grouped</p>
            </div>
            <div className="info-item-playlist">
                <p className="playlist-item-book"></p>
                <p>Book</p>
            </div>
            <div className="info-item-playlist">
                <p className="playlist-item-testament"></p>
                <p>Testament</p>
            </div>
            <div className="info-item-playlist">
                <p className="playlist-item-section"></p>
                <p>Section</p>
            </div>
            <div className="info-item-playlist">
                <p className="playlist-item-attachment-link"></p>
                <p>Attachment Link</p>
            </div>
        </div>
    </div>
}

return PlaylistInfoItem;