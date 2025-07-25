import { getStyleOf } from 'app.sn_styles.styler'
import { MiniTextEditor } from 'app.components.smallEditor'
const { useEffect, useState, useRef, useMemo, useLayoutEffect } = os.appHooks;
import { TextEditor } from 'app.components.editor'

function StudyNotes({ chapter }) {
    const bookId = globalThis.BookId;
    const [studyNote, setStudyNote] = useState(
        []
    );

    // Build a map of all sections → their { bookIdx, verseIdx }
    const sectionMap = useMemo(() => {
        const map = {}
        studyNote.forEach((book, bIdx) => {
            book.sections.forEach((verse, vIdx) => {
                const raw = verse.section.toString()
                // 1) remove any a:b patterns
                // 2) remove commas
                // 3) collapse multiple spaces to one
                // 4) trim edges
                const cleaned = raw
                    .replace(/\d+:\d+/g, '')
                    .replace('.', '')
                    .replace(/\s+/g, ' ')
                    .trim()

                map[cleaned] = {
                    bookIdx: bIdx,
                    verseIdx: vIdx,
                    original: raw
                }
            })
        })
        console.log("Section Map: ", map);
        return map
    }, [studyNote]);

    globalThis.VerseSectionMap = sectionMap;

    // —— New state for cycling through matches ——
    const [searchKey, setSearchKey] = useState(null)
    const [matches, setMatches] = useState([])
    const [pointer, setPointer] = useState(0)
    const [highlightedPos, setHighlightedPos] = useState(null)

    // ref to the currently highlighted verse DOM node
    const scrollRef = useRef(null);

    // whenever chapter changes, pull in the new notes
    useEffect(() => {
        const getStudyNote = async () => {
            const studyNoteDataURL = tags[bookId] ?? null;
            if (studyNoteDataURL) {
                const studyNoteData = await os.getFile(studyNoteDataURL);
                // if (!chapter || chapter < 0) return;
                setStudyNote([studyNoteData[chapter]] ?? []);
                // reset any old highlights
                setSearchKey(null)
                setMatches([])
                setPointer(0)
                setHighlightedPos(null)
            } else {
                setStudyNote([]);
                // reset any old highlights
                setSearchKey(null)
                setMatches([])
                setPointer(0)
                setHighlightedPos(null)
            }
        }

        getStudyNote();
    }, [chapter, bookId]);

    // debug/log after state actually updates
    useEffect(() => {
        console.log('📖 chapter:', chapter);
        console.log('🔄 studyNote:', studyNote);
    }, [chapter, studyNote]);

    // scroll **immediately** when highlight flips on
    useLayoutEffect(() => {
        if (!highlightedPos || !scrollRef.current) return;

        scrollRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
        });

        const timer = setTimeout(() => {
            setHighlightedPos(null)
        }, 3000);

        return () => clearTimeout(timer);
    }, [highlightedPos]);

    // unified highlight function
    const highlightSection = (rawKey) => {
        const stripRe = /[.,'"“”‘’]/g;
        const key = String(rawKey).replace(stripRe, '')  // strip dots
        let newMatches = matches
        let newPointer = pointer

        console.log("sent Key: ", key);

        // if brand‐new search key → rebuild matches
        if (key !== searchKey) {
            const byNumber = /^\d+$/.test(key)
            newMatches = []

            studyNote.forEach((book, bIdx) => {
                book.sections.forEach((verse, vIdx) => {
                    if (byNumber) {
                        // match verse.section’s “a:b” → compare part after “:”
                        const m = /(\d+):(\d+)/.exec(verse.section.toString());
                        if (m && m[2] === key) {
                            newMatches.push({ bookIdx: bIdx, verseIdx: vIdx })
                        }
                    } else {
                        const token = verse.section.toString().replace(stripRe, '');
                        console.log("token: ", token);
                        if (token.includes(key)) {
                            newMatches.push({ bookIdx: bIdx, verseIdx: vIdx })
                        }
                    }
                })
            })

            newPointer = 0
            setSearchKey(key)
            setMatches(newMatches)
            setPointer(0)
        } else if (matches.length) {
            // same key again → cycle pointer
            newPointer = (pointer + 1) % matches.length
            setPointer(newPointer)
        }

        // finally highlight
        if (newMatches.length) {
            setHighlightedPos(newMatches[newPointer])
        }
    }

    // expose globally
    globalThis.HighlightStudyNoteSection = highlightSection;

    let timeout;

    function highlightSectionWord(rawKey) {
        if (timeout) clearTimeout(timeout);
        const stripRe = /[.,'"“”‘’]/g;
        const keyNorm = String(rawKey).replace(stripRe, '').trim().toLowerCase();
        globalThis.HighlightedSectionKey = keyNorm;
        // let everyone know it changed
        window.dispatchEvent(new CustomEvent('highlightedSectionKeyChanged'));

        // clear after 3s
        timeout = setTimeout(() => {
            globalThis.HighlightedSectionKey = '';
            window.dispatchEvent(new CustomEvent('highlightedSectionKeyChanged'));
        }, 3000);
    }

    let verseTimeout;

    function highlightSectionNumber(rawNumber) {
        // cancel any pending clear
        if (verseTimeout) clearTimeout(verseTimeout);

        // normalize to a simple string
        const numStr = String(rawNumber);

        console.log("called verse: ", numStr)

        // 1) store globally
        globalThis.HighlightedVerseNumber = numStr;

        // 2) let React listeners know
        window.dispatchEvent(new CustomEvent('highlightedVerseChanged'));

        // 4) clear after 3s
        verseTimeout = setTimeout(() => {
            globalThis.HighlightedVerseNumber = ''
            window.dispatchEvent(new CustomEvent('highlightedVerseChanged'));
        }, 3000)
    }

    if (!studyNote || studyNote.length === 0 || !studyNote[0]) {
        return (
            <div className="judeTextPage">
                <div className="verseText">
                    No study note for this book: <strong>{bookId}</strong>
                </div>
            </div>
        );
    }
    const [enableEditor, setEnableEditor] = useState(false)
    useEffect(() => {
        globalThis.SetEnableEditStudyNotes = setEnableEditor
        globalThis.EnableEditStudyNotes = enableEditor

    }, [])
    return (
        <>

            {!enableEditor ? <div className="judeTextPage">

                {studyNote.map((book, bookIdx) => {
                    const [c1, setC1] = useState(false)
                    return (
                        <div key={bookIdx} className="studyTextContainer">
                            <h2
                                // onDoubleClick={(e) => { console.log(e); setC1(!c1) }}
                                className={`mainHeader`}
                            >
                                {!c1 ?
                                    book.header :
                                    <MiniTextEditor
                                        initialHtml={book.header}
                                        onChange={(html) => console.log('Updated HTML:', html)}
                                    />}
                            </h2>

                            {book.sections.map((verse, vIdx) => {
                                const isCurrent =
                                    highlightedPos?.bookIdx === bookIdx &&
                                    highlightedPos?.verseIdx === vIdx

                                return (
                                    <div
                                        key={vIdx}
                                        ref={isCurrent ? scrollRef : null}
                                        className={`verse ${isCurrent ? 'highlighted' : ''}`}
                                    >
                                        <h3
                                            className={`verseNumber`}
                                        >
                                            {(() => {
                                                const sec = verse.section.toString();
                                                // find the first "number:number" and any trailing text
                                                const m = sec.match(/(\d+):(\d+)(?:\s+(.*))?/);


                                                if (!m) return (
                                                    <>
                                                        <span
                                                            className="clickableCursor"
                                                            style={{ marginLeft: '4px' }}
                                                            onClick={() => highlightSectionWord(sec)}
                                                        >
                                                            {sec}
                                                        </span>
                                                    </>
                                                );

                                                const fullMatch = m[0];    // e.g. "3:16 Some phrase"
                                                const bookNum = m[1];    // "3"
                                                const verseNum = m[2];    // "16"
                                                const tail = m[3] || ''; // "Some phrase" or ''

                                                // split out the parts before/after the match
                                                const before = sec.slice(0, m.index).trim() || "";

                                                return (
                                                    <>
                                                        <span
                                                            className="clickableCursor"
                                                            onClick={() => highlightSectionNumber(verseNum)}
                                                        >
                                                            {before} {bookNum}:{verseNum}
                                                        </span>

                                                        {tail && (
                                                            <span
                                                                className="clickableCursor"
                                                                style={{ marginLeft: '4px' }}
                                                                onClick={() => highlightSectionWord(tail)}
                                                            >
                                                                {tail}
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </h3>
                                        {verse.content.map((content, cIdx) => {
                                            const [c, setC] = useState(false)
                                            return <span
                                                onDoubleClick={(e) => { console.log(e); setC(!c) }}
                                                key={cIdx}
                                                className={`verseText`}
                                            >
                                                {!c ? content : <MiniTextEditor
                                                    initialHtml={content}
                                                    onChange={(html) => console.log('Updated HTML:', html)}
                                                />}
                                            </span>
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )
                }
                )}

                <style>
                    {getStyleOf('studyNotes.css')}
                </style>
            </div> : <TextEditor
                enableEditor={enableEditor}
                setEnableEditor={setEnableEditor}
                data={studyNote}
                studyNotes={studyNote}
                content={true}
                tab={'s'}
            />}
        </>
    );
}

globalThis.GlobalStudyNotes = StudyNotes;

export const StudyNotesWithPanel = () => {
    return (
        <div>
            <StudyNotes />
        </div>
    );
};

export { StudyNotes };