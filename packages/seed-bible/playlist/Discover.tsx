const { useState } = os.appHooks;

const { Input } = Components;

const PlaylistCont = await thisBot.PlaylistContainer();
const AnnotationList = await thisBot.AnnotationList();

const items = ['All', "Playlist", "Annotations"];

const Discover = ({ currentOpenedBook, chapter, fetchingAnnotation, playingPlaylist, editingPlaylist, annotationData, style, setOpenModal, }) => {

    const [selectedChip, setSelectedChip] = useState('All');
    const [query, setQuery] = useState('');


    const isAll = "All" === selectedChip;

    return <div style={{ width: '100%', padding: '0.5rem', overflow: 'auto', ...style }}>
        {!editingPlaylist && <div className="align-center" style={{ gap: '0.5rem', padding: '1rem 0', marginBottom: '1rem', borderBottom: '1px solid #CCCCCD' }}>
            <div className="content-type">
                <img alt="sources" src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/c7bc8e3ba8c55d2dd8c2ab338bcb312c7e3757f41fc62985d9d2f229faf0960b.svg" />
                <p>Sources</p>
            </div>
            <div className="content-type secondary">
                <img alt="sources" src="https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/b4f14faaa7a25bd6e3541b18f93c82f773900c7bbd8687fda7cef3d2d38f2ce2.svg" />
                <p>Content</p>
            </div>
            <Input
                icon="search"
                style={{
                    marginBottom: '0'
                }}
                value={query}
                onChangeListener={(text) => setQuery(text)}
                placeholder="Search..."
            />
        </div>}
        {!editingPlaylist && <div className="align-center chips-tag-container">
            {items.map(ele => {
                return <div onClick={() => setSelectedChip(ele)} className={`chip-tag ${ele === selectedChip ? 'active' : ''}`}>
                    {ele}
                </div>
            })}
        </div>}
        {
            (isAll || playingPlaylist || selectedChip === "Playlist") ?

                <>
                    <h3 style={{ margin: '1rem 0 0 0 ' }}>Playlists</h3>
                    <PlaylistCont query={query} setOpenModal={setOpenModal} active={true} playingPlaylist={playingPlaylist} id='default' />
                </>
                :
                null
        }
        {
            (!editingPlaylist && (isAll || selectedChip === "Annotations")) ?
                <AnnotationList currentOpenedBook={currentOpenedBook} fetchingAnnotation={fetchingAnnotation} chapter={chapter} annotationData={annotationData} />
                :
                null
        }

    </div>
}

return Discover;