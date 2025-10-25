const { useEffect, useState, useMemo, useLayoutEffect, createRef } = os.appHooks;
import { TextFormattingToolbar } from 'app.components.textSettings'
import { MiniTextEditor } from 'app.components.smallEditor'

/**
 * Split text into chunks of words vs. exact section-keys,
 * matching any multi-word subphrase (≥2 words) *and* any single-word keys.
 */
function splitBySectionKeys(text, verseSectionMap) {
    const stripRe = /[.,'"“”‘’]/g;

    // 1) Build a map of all subphrases (length ≥2) and single-word keys → parent key
    const subphraseMap = {};
    let maxLen = 1;

    Object.keys(verseSectionMap).forEach(fullKey => {
        // normalize the key
        const normalized = fullKey.replace(stripRe, '').trim();
        const wordsKey = normalized.split(/\s+/);
        const n = wordsKey.length;
        maxLen = Math.max(maxLen, n);

        if (n === 1) {
            // single-word key
            subphraseMap[normalized] = fullKey;
        } else {
            // all contiguous subphrases of length ≥2
            for (let L = n; L >= 2; L--) {
                for (let start = 0; start + L <= n; start++) {
                    const phrase = wordsKey.slice(start, start + L).join(' ');
                    subphraseMap[phrase] = fullKey;
                }
            }
        }
    });

    // 2) Tokenize & normalize your text
    const words = text.split(/\s+/);
    const norm = words.map(w => w.replace(stripRe, ''));

    // 3) Scan through words greedily
    const chunks = [];
    let i = 0;
    while (i < words.length) {
        let matchLen = 0, matchKey = null;

        // try lengths from maxLen down to 1
        const limit = Math.min(maxLen, words.length - i);
        for (let L = limit; L >= 1; L--) {
            const slice = norm.slice(i, i + L).join(' ');
            if (subphraseMap[slice]) {
                matchKey = subphraseMap[slice];
                matchLen = L;
                break;
            }
        }

        if (matchLen > 0) {
            // emit matched chunk
            chunks.push({
                text: words.slice(i, i + matchLen).join(' '),
                isSection: true,
                key: matchKey
            });
            i += matchLen;
        } else {
            // no match → emit/merge single plain word
            const w = words[i++];
            if (chunks.length && !chunks[chunks.length - 1].isSection) {
                chunks[chunks.length - 1].text += ' ' + w;
            } else {
                chunks.push({ text: w, isSection: false });
            }
        }
    }

    return chunks;
}

// Replace the Section component with this one below: 

function Section({ heading, setRef, verses, book, chapter, holded, blinker, selected, textEdit }) {

    const stripRe = /[.,'"“”‘’]/g;
    const normalize = (k) => k.replace(stripRe, '').toLowerCase().trim();

    // read the active key
    const [activeKey, setActiveKey] = useState(globalThis.HighlightedSectionKey || '');

    const [activeVerse, setActiveVerse] = useState(globalThis.HighlightedVerseNumber || '');

    // 1) build refs once per verse
    const verseRefs = useMemo(() => {
        const m = {};
        verses.forEach(v => {
            m[v.verseNumber] = createRef();
        })
        return m;
    }, [verses]);

    useEffect(() => {
        const handler = () => {
            setActiveKey(globalThis.HighlightedSectionKey || '');
        };
        window.addEventListener('highlightedSectionKeyChanged', handler);
        return () => window.removeEventListener('highlightedSectionKeyChanged', handler);
    }, []);

    useEffect(() => {
        const handler = () => {
            setActiveVerse(globalThis.HighlightedVerseNumber || '');
            console.log("verse number clicked: ", globalThis.HighlightedVerseNumber || '');
        };
        window.addEventListener('highlightedVerseChanged', handler);
        return () =>
            window.removeEventListener('highlightedVerseChanged', handler);
    }, []);

    useLayoutEffect(() => {
        if (!activeVerse) return
        const ref = verseRefs[activeVerse]
        if (ref?.current) {
            ref.current.scrollIntoView({
                behavior: 'smooth',
                block: 'end'
            })
        }
    }, [activeVerse, verseRefs])


    const editTextStyle = {
        "border-radius": "6px",
        "border": "2px solid #4459F3",
        "background": "rgba(68, 89, 243, 0.10)",
        "padding": '8px',
        "position": 'relative',
    }
    const styles = {
        font: `'Montserrat', sans-serif`,
        weight: '600',
        color: 'black',
        styles: {
            bold: true,
            italic: false,
            underline: false,
            alignment: 'left',
        },
    }

    // inside your Section component, before the return:
    const chunksMap = useMemo(() => {
        const result = {};
        if (globalThis.studyNotesPresent) {
            verses.forEach(v => {
                result[v.verseNumber] = splitBySectionKeys(
                    v.text,
                    globalThis.VerseSectionMap
                );
            });
        }
        return result;
    }, [verses, globalThis.studyNotesPresent, globalThis.VerseSectionMap]);

    return <div>
        <div className="sectionTitle">
            {heading}
        </div>
        <div style={textEdit ? editTextStyle : null}>
            {textEdit && <div className="editVerseTitle">Verse - Text</div>}
            {textEdit &&
                <div style={{ right: '20px', top: '-65px', background: 'transparent' }} className="flexElementGap-4 editVerseTitle">
                    <TextFormattingToolbar sectionStyles={styles} />
                </div>}
            <div className="sectionCover">
                {verses.map(verse => {
                    const [c, setC] = useState(false)
                    const isActive = verse.verseNumber.toString() === activeVerse
                    return <span
                        ref={verseRefs[verse.verseNumber]}
                        // onDoubleClick={(e) => { console.log(e); setC(!c) }}
                        onClick={() => {

                            os.log({
                                verseNumber: verse.verseNumber,
                                text: verse.text,
                                chapter,
                                book
                            })
                            thisBot.onVerseClick({
                                verseNumber: verse.verseNumber,
                                text: verse.text,
                                chapter,
                                book
                            })
                        }}
                        style={{
                            'text-decoration': (holded?.[verse.verseNumber] || selected[verse.verseNumber] || blinker[verse.verseNumber]) ? `underline` : ``,
                        }}
                        className={`sectionText ${verse?.verseNumber.toString() === activeVerse.toString() ? 'highlighted' : ''} `}
                    >
                        <span
                            className={`sectionTextNumber ${globalThis.studyNotesPresent ? "clickableCursor" : ""}`}
                            onClick={() => {
                                if (globalThis.studyNotesPresent) {
                                    HighlightStudyNoteSection(verse?.verseNumber)
                                }
                            }}
                        >{verse?.verseNumber}</span>
                        {!c
                            ? globalThis.studyNotesPresent
                                ? (chunksMap[verse.verseNumber] || []).map((part, i) => {
                                    if (!part.isSection) {
                                        return <span key={i}>{part.text}</span>;
                                    }

                                    const partNorm = normalize(part.key);
                                    const activeNorm = (activeKey || '').toLowerCase();
                                    const isActive = activeNorm.includes(partNorm);

                                    return (
                                        <span
                                            key={`${verse?.verseNumber}-${i}-${part.text}`}
                                            className={
                                                `clickableCursor highlightened ${isActive ? 'highlighted-word' : ''}`
                                            }
                                            style={{ animationDelay: `${i * 0.1}s` }}
                                            onClick={() => {
                                                console.log(part.key);
                                                const raw = globalThis.VerseSectionMap[part.key].original;
                                                console.log(raw);
                                                const m = /:(\d+)$/.exec(raw);
                                                console.log(m);
                                                const sec = m ? m[1] : part.key;
                                                console.log(sec);
                                                globalThis.HighlightStudyNoteSection(raw);
                                            }}
                                        >
                                            {part.text}
                                        </span>
                                    )
                                })
                                : verse.text
                            : (
                                <MiniTextEditor
                                    initialHtml={verse.text}
                                    onChange={(html) => console.log("Updated HTML:", html)}
                                />
                            )
                        }
                        <input
                            style={{ opacity: '0', 'pointer-events': 'none', position: 'absolute', 'left': 0, 'top': 0, zIndex: -1 }}
                            placeholder={'test'}
                            ref={(ref) => {
                                if (setRef && setRef[verse.verseNumber]) {
                                    setRef[verse.verseNumber].current = ref
                                }
                            }}
                        />
                    </span>
                })}
            </div>
        </div>
    </div >
}

return Section;