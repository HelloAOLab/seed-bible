const getStyleOf = await thisBot.GetStyle();
import { BibleDataManager } from 'app.hooks.bibleDataManager';
const ApologistSearch = await thisBot.Apologist();
const SgSearch = await thisBot.Tapos();
const TableTalkEmbed = await thisBot.TableTalk();
const { useEffect, useState, useRef, useLayoutEffect } = os.appHooks;

const bibleBooks = [
    { id: "GEN", name: "GENESIS", realName: "Genesis" },
    { id: "EXO", name: "EXODUS", realName: "Exodus" },
    { id: "LEV", name: "LEVITICUS", realName: "Leviticus" },
    { id: "NUM", name: "NUMBERS", realName: "Numbers" },
    { id: "DEU", name: "DEUTERONOMY", realName: "Deuteronomy" },
    { id: "JOS", name: "JOSHUA", realName: "Joshua" },
    { id: "JDG", name: "JUDGES", realName: "Judges" },
    { id: "RUT", name: "RUTH", realName: "Ruth" },
    { id: "1SA", name: "1 SAMUEL", realName: "1 Samuel" },
    { id: "2SA", name: "2 SAMUEL", realName: "2 Samuel" },
    { id: "1KI", name: "1 KINGS", realName: "1 Kings" },
    { id: "2KI", name: "2 KINGS", realName: "2 Kings" },
    { id: "1CH", name: "1 CHRONICLES", realName: "1 Chronicles" },
    { id: "2CH", name: "2 CHRONICLES", realName: "2 Chronicles" },
    { id: "EZR", name: "EZRA", realName: "Ezra" },
    { id: "NEH", name: "NEHEMIAH", realName: "Nehemiah" },
    { id: "EST", name: "ESTHER", realName: "Esther" },
    { id: "JOB", name: "JOB", realName: "Job" },
    { id: "PSA", name: "PSALMS", realName: "Psalms" },
    { id: "PRO", name: "PROVERBS", realName: "Proverbs" },
    { id: "ECC", name: "ECCLESIASTES", realName: "Ecclesiastes" },
    { id: "SNG", name: "SONG", realName: "Song" },
    { id: "ISA", name: "ISAIAH", realName: "Isaiah" },
    { id: "JER", name: "JEREMIAH", realName: "Jeremiah" },
    { id: "LAM", name: "LAMENTATIONS", realName: "Lamentations" },
    { id: "EZK", name: "EZEKIEL", realName: "Ezekiel" },
    { id: "DAN", name: "DANIEL", realName: "Daniel" },
    { id: "HOS", name: "HOSEA", realName: "Hosea" },
    { id: "JOL", name: "JOEL", realName: "Joel" },
    { id: "AMO", name: "AMOS", realName: "Amos" },
    { id: "OBA", name: "OBADIAH", realName: "Obadiah" },
    { id: "JON", name: "JONAH", realName: "Jonah" },
    { id: "MIC", name: "MICAH", realName: "Micah" },
    { id: "NAM", name: "NAHUM", realName: "Nahum" },
    { id: "HAB", name: "HABAKKUK", realName: "Habakkuk" },
    { id: "ZEP", name: "ZEPHANIAH", realName: "Zephaniah" },
    { id: "HAG", name: "HAGGAI", realName: "Haggai" },
    { id: "ZEC", name: "ZECHARIAH", realName: "Zechariah" },
    { id: "MAL", name: "MALACHI", realName: "Malachi" },
    { id: "MAT", name: "MATTHEW", realName: "Matthew" },
    { id: "MRK", name: "MARK", realName: "Mark" },
    { id: "LUK", name: "LUKE", realName: "Luke" },
    { id: "JHN", name: "JOHN", realName: "John" },
    { id: "ACT", name: "ACTS", realName: "Acts" },
    { id: "ROM", name: "ROMANS", realName: "Romans" },
    { id: "1CO", name: "1 CORINTHIANS", realName: "1 Corinthians" },
    { id: "2CO", name: "2 CORINTHIANS", realName: "2 Corinthians" },
    { id: "GAL", name: "GALATIANS", realName: "Galatians" },
    { id: "EPH", name: "EPHESIANS", realName: "Ephesians" },
    { id: "PHP", name: "PHILIPPIANS", realName: "Philippians" },
    { id: "COL", name: "COLOSSIANS", realName: "Colossians" },
    { id: "1TH", name: "1 THESSALONIANS", realName: "1 Thessalonians" },
    { id: "2TH", name: "2 THESSALONIANS", realName: "2 Thessalonians" },
    { id: "1TI", name: "1 TIMOTHY", realName: "1 Timothy" },
    { id: "2TI", name: "2 TIMOTHY", realName: "2 Timothy" },
    { id: "TIT", name: "TITUS", realName: "Titus" },
    { id: "PHM", name: "PHILEMON", realName: "Philemon" },
    { id: "HEB", name: "HEBREWS", realName: "Hebrews" },
    { id: "JAS", name: "JAMES", realName: "James" },
    { id: "1PE", name: "1 PETER", realName: "1 Peter" },
    { id: "2PE", name: "2 PETER", realName: "2 Peter" },
    { id: "1JN", name: "1 JOHN", realName: "1 John" },
    { id: "2JN", name: "2 JOHN", realName: "2 John" },
    { id: "3JN", name: "3 JOHN", realName: "3 John" },
    { id: "JUD", name: "JUDE", realName: "Jude" },
    { id: "REV", name: "REVELATION", realName: "Revelation" }
]

function getBookNameById(id) {
    const book = bibleBooks.find(b => b.id === id);
    return book ? book.realName : null;
}

/**
 * Splits a string into an array of { text, type } chunks,
 * where type === 'citation' for each individual parenthetical ref,
 * and 'plain' for everything else.
 */
function splitWithCitations(text) {
    // very loose pre-split on parens:
    const citationRE = /\([^)]*\)/g;

    const hasDigit = (s) => /\d/.test(s);

    // our Five citation‐formats:
    // 1) BookName[.] Chapter:Verse[-Verse][ note]
    // 2) BookName[.] Chapter:Verse[-Verse][ note],[ note]
    // 3) pure numeric Chapter:Verse[-Verse]
    // 4) v. N or vv. N–N (with optional " note")
    // 5) bare BookName[.]
    const validRefRE = new RegExp(
        [
            // 1) e.g. "John 1:3", "1 Kings 4:12–14", "Ps. 102:25–27"
            '^(?:[1-3]\\s+)?[A-Za-z]+\\.?\\s*\\d+:\\d+(?:[-–]\\d+)?(?:\\s+(?:and\\s+)?note)?$',

            // 2) e.g. "John 1:3", "1 Kings 4:12–14", "Ps. 102:25–27, 28"
            '^(?:[1-3]\\s+)?[A-Za-z]+\\.?\\s*\\d+:\\d+' +
            '(?:[-–]\\d+)?' +
            '(?:,\\s*(?:\\d+:)?\\d+(?:[-–]\\d+)?)*' +
            '(?:\\s+(?:and\\s+)?note)?$',

            // 3) pure numeric "43:10" or "3:1–6"
            '^\\d+:\\d+(?:[-–]\\d+)?' +
            '(?:,\\s*(?:\\d+:)?\\d+(?:[-–]\\d+)?)*' +
            '(?:\\s+(?:and\\s+)?note)?$',

            // 4) v./vv. shorthand "(v. 8)", "(vv. 1–16)", allowing a trailing " note"
            '^vv?\\.\\s*\\d+(?:[-–]\\d+)?' +
            '(?:,\\s*(?:\\d+:)?\\d+(?:[-–]\\d+)?)*' +
            '(?:\\s+(?:and\\s+)?note)?$',

            // 5) bare book only: "(John)", "(1 Kings)", "(Ps.)"
            '^(?:[1-3]\\s+)?[A-Za-z]+\\.?(?:\\s+(?:and\\s+)?note)?$'
        ].join('|'),
        'i'
    );

    const getTheLettersOnly = new RegExp([
        '^(?:[1-3]\\s+)?[A-Za-z]+\\.?$'
    ]);

    // helper: does this alpha‐prefix match any book?
    function looksLikeBook(prefix) {
        const norm = prefix
            .toUpperCase()
            .replace(/\.$/, "")
            .replaceAll(",", "")
            .trim();

        // reject too-short alpha chunks outright
        if (norm.length < 2) return false;

        return bibleBooks.some(
            b => b.id === norm || b.name.startsWith(norm) || b.name.includes(norm)
        );
    }

    // split into plain vs "(…)" segments
    const parts = text.split(citationRE) || [];
    const matches = text.match(citationRE) || [];

    const result = [];

    for (let i = 0; i < parts.length; i++) {
        // 1) push any leading plain text
        if (parts[i]) {
            result.push({ text: parts[i], type: 'plain' });
        }

        // 2) now handle the "(...)" that got removed by split()
        const group = matches[i];
        if (!group) continue;

        // strip the parens and trim
        const inner = group.slice(1, -1).trim();

        // break multi‐refs on semicolons and commas
        inner
            .split(';')
            .map(chunk => chunk.trim())
            .filter(Boolean)
            .forEach(chunk => {

                // 🚫 No numbers => never a citation
                if (!hasDigit(chunk)) {
                    result.push({ text: `(${chunk})`, type: 'plain' });
                    return;
                }

                let flag = chunk.includes('cf');

                if (chunk.includes(',') && !validRefRE.test(chunk) && !flag) {
                    let splitParts = chunk
                        .split(',')
                        .map(c => c.trim())


                    if (splitParts.length > 2) {
                        for (let i = 0; i < splitParts.length - 1; i++) {
                            if (looksLikeBook(splitParts[i])) {
                                if (validRefRE.test(splitParts[i] + splitParts[i + 1])) {
                                    result.push({ text: `(${splitParts[i] + ". " + splitParts[i + 1]})`, type: 'citation' });
                                } else {
                                    if (validRefRE.test(splitParts[i])) {
                                        result.push({ text: `(${splitParts[i]})`, type: 'citation' });
                                    } else {
                                        // anything else remains plain
                                        result.push({ text: `(${splitParts[i]})`, type: 'plain' });
                                    }
                                }
                            } else {
                                // test validity
                                if (getTheLettersOnly.test(splitParts[i])) {
                                    if (validRefRE.test(splitParts[i]) && looksLikeBook(splitParts[i])) {
                                        result.push({ text: `(${splitParts[i]})`, type: 'citation' });
                                    } else {
                                        // anything else remains plain
                                        result.push({ text: `(${splitParts[i]})`, type: 'plain' });
                                    }
                                } else {
                                    if (validRefRE.test(splitParts[i])) {
                                        result.push({ text: `(${splitParts[i]})`, type: 'citation' });
                                    } else {
                                        // anything else remains plain
                                        result.push({ text: `(${splitParts[i]})`, type: 'plain' });
                                    }
                                }
                            }
                        }
                    } else {
                        splitParts.forEach(ref => {
                            const wrapped = `(${ref})`;
                            // test validity
                            if (getTheLettersOnly.test(ref)) {
                                if (validRefRE.test(ref) && looksLikeBook(ref)) {
                                    result.push({ text: wrapped, type: 'citation' });
                                } else {
                                    // anything else remains plain
                                    result.push({ text: wrapped, type: 'plain' });
                                }
                            } else {
                                if (validRefRE.test(ref)) {
                                    result.push({ text: wrapped, type: 'citation' });
                                } else {
                                    // anything else remains plain
                                    result.push({ text: wrapped, type: 'plain' });
                                }
                            }
                        });
                    }
                } else if (chunk.includes('.') && !validRefRE.test(chunk) && flag) {
                    let splitParts = chunk
                        .split('.')
                        .map(c => c.trim())
                        .filter(Boolean);

                    if (splitParts.length > 2) {
                        for (let i = 0; i < splitParts.length - 1; i++) {
                            if (looksLikeBook(splitParts[i])) {
                                if (validRefRE.test(splitParts[i] + splitParts[i + 1])) {
                                    result.push({ text: `(${splitParts[i] + ". " + splitParts[i + 1]})`, type: 'citation' });
                                } else {
                                    if (validRefRE.test(splitParts[i])) {
                                        result.push({ text: `(${splitParts[i]})`, type: 'citation' });
                                    } else {
                                        // anything else remains plain
                                        result.push({ text: `(${splitParts[i]})`, type: 'plain' });
                                    }
                                }
                            } else {
                                // test validity
                                if (getTheLettersOnly.test(splitParts[i])) {
                                    if (validRefRE.test(splitParts[i]) && looksLikeBook(splitParts[i])) {
                                        result.push({ text: `(${splitParts[i]})`, type: 'citation' });
                                    } else {
                                        // anything else remains plain
                                        result.push({ text: `(${splitParts[i]})`, type: 'plain' });
                                    }
                                } else {
                                    if (validRefRE.test(splitParts[i])) {
                                        result.push({ text: `(${splitParts[i]})`, type: 'citation' });
                                    } else {
                                        // anything else remains plain
                                        result.push({ text: `(${splitParts[i]})`, type: 'plain' });
                                    }
                                }
                            }
                        }
                    } else {
                        splitParts.forEach(ref => {
                            const wrapped = `(${ref})`;
                            // test validity
                            if (getTheLettersOnly.test(ref)) {
                                if (validRefRE.test(ref) && looksLikeBook(ref)) {
                                    result.push({ text: wrapped, type: 'citation' });
                                } else {
                                    // anything else remains plain
                                    result.push({ text: wrapped, type: 'plain' });
                                }
                            } else {
                                if (validRefRE.test(ref)) {
                                    result.push({ text: wrapped, type: 'citation' });
                                } else {
                                    // anything else remains plain
                                    result.push({ text: wrapped, type: 'plain' });
                                }
                            }
                        });
                    }
                } else {
                    // test validity
                    if (getTheLettersOnly.test(chunk)) {
                        // Bare alpha → only a citation if it's a real book (John, Ps., 1 Kings, etc.)
                        if (validRefRE.test(chunk) && looksLikeBook(chunk)) {
                            result.push({ text: `(${chunk})`, type: 'citation' });
                        } else {
                            result.push({ text: `(${chunk})`, type: 'plain' });
                        }
                    } else {
                        // Mixed/numeric forms still rely on validRefRE
                        if (validRefRE.test(chunk)) {
                            result.push({ text: `(${chunk})`, type: 'citation' });
                        } else {
                            result.push({ text: `(${chunk})`, type: 'plain' });
                        }
                    }
                }
            });
    }

    return result;
}

function parseCitationReferences(citation, defaultBookId, contextChapter) {
    // remove surrounding parens
    const inner = citation.slice(1, -1).trim();

    // NEW: robust v./vv. parser with "note" and "and note"
    // Examples:
    //  "v. 5"
    //  "vv. 1–3, 7, 9-11"
    //  "vv. 29, 30 note."
    //  "v. 5 and note"
    const vvMatch = inner.match(/^vv?\.\s*([^()]*?)(?:\s+(and\s+note|note)\.?)?$/i);
    if (vvMatch) {
        const itemsStr = vvMatch[1].trim();                  // e.g., "1–3, 7, 9-11" or "29, 30" or "5"
        const tail = (vvMatch[2] || '').toLowerCase();   // "", "note", or "and note"
        const wantNote = tail.includes('note');            // true for "note" or "and note"
        const wantBible = tail === '' || tail === 'and note';
        const chapter = Number(contextChapter) || 1;

        // split on commas, normalize dashes, trim each token
        const tokens = itemsStr
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        const baseRanges = [];
        for (const raw of tokens) {
            const tok = raw.replace(/[\u2013\u2014]/g, '-'); // normalize –— to -
            const mRange = tok.match(/^(\d+)\s*-\s*(\d+)$/);
            if (mRange) {
                const a = Number(mRange[1]), b = Number(mRange[2]);
                baseRanges.push({ verseStart: Math.min(a, b), verseEnd: Math.max(a, b) });
                continue;
            }
            const mSingle = tok.match(/^(\d+)$/);
            if (mSingle) {
                const v = Number(mSingle[1]);
                baseRanges.push({ verseStart: v, verseEnd: v });
            }
            // silently ignore non-matching tokens
        }

        // If nothing parsed, fall back safely to v1
        if (!baseRanges.length) {
            baseRanges.push({ verseStart: 1, verseEnd: 1 });
        }

        const out = [];
        for (const r of baseRanges) {
            if (wantBible) {
                out.push({
                    bookId: defaultBookId,
                    chapter,
                    verseStart: r.verseStart,
                    verseEnd: r.verseEnd,
                    source: 'bible',
                });
            }
            if (wantNote) {
                out.push({
                    bookId: defaultBookId,
                    chapter,
                    verseStart: r.verseStart,
                    verseEnd: r.verseEnd,
                    source: 'study-note',
                });
            }
        }
        return out;
    }

    // Accepts things like: "Is. 6:8 note", "1:3-31 note", "3:1–6, 9 note", "2:4 and note"
    // Works only if "note" (or "and note") is present. Book prefix optional.
    // If no chapter is given in a segment, uses the most recent one in that citation,
    // falling back to contextChapter.

    if (/\b(and\s+note|note)\b\.?$/i.test(inner)) {
        // capture optional book prefix, the rest of the ref list, and trailing "note"/"and note"
        const m = inner.match(/^\s*((?:[1-3]\s+)?[A-Za-z]+\.?)?\s*(.*?)\s*(and\s+note|note)\.?$/i);
        if (!m) return null;
        console.log(m);

        const bookPrefix = (m[1] || '').trim();          // e.g., "Is." or "Isaiah" or ""
        const refsStr = (m[2] || '').trim();          // e.g., "6:8", "1:3-31", "3:1–6, 9"
        const tail = m[3].toLowerCase();           // "note" | "and note"

        // resolve book id (if no prefix, stick to defaultBookId)
        const bookId = bookPrefix
            ? getBookIdFromCitation(`(${bookPrefix})`, defaultBookId)
            : defaultBookId;

        console.log("note bookId: ", bookId, bookPrefix);

        const wantNote = true;                           // always when this parser is used
        const wantBible = tail === 'and note';            // include bible too only for "and note"

        // split items on commas/semicolons
        const parts = refsStr.split(/[;,]/).map(s => s.trim()).filter(Boolean);

        let currentChapter = Number(contextChapter) || 1; // rolling chapter memory
        const ranges = [];

        for (const raw of parts) {
            const tok = raw.replace(/[\u2013\u2014]/g, '-'); // normalize –— to -
            // full "C:V" or "C:V-V"
            let mm = tok.match(/^(\d+):(\d+)(?:\s*-\s*(\d+))?$/);
            if (mm) {
                currentChapter = Number(mm[1]);
                const vs = Number(mm[2]);
                const ve = mm[3] ? Number(mm[3]) : vs;
                ranges.push({ chapter: currentChapter, verseStart: Math.min(vs, ve), verseEnd: Math.max(vs, ve) });
                continue;
            }
            // verse-only "V" or "V-V" (use currentChapter)
            mm = tok.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
            if (mm) {
                const vs = Number(mm[1]);
                const ve = mm[2] ? Number(mm[2]) : vs;
                ranges.push({ chapter: currentChapter, verseStart: Math.min(vs, ve), verseEnd: Math.max(vs, ve) });
                continue;
            }
            // ignore anything else silently
        }

        if (!ranges.length) {
            ranges.push({ chapter: Number(contextChapter) || 1, verseStart: 1, verseEnd: 1 });
        }

        const out = [];
        for (const r of ranges) {
            if (wantBible) {
                out.push({ bookId, chapter: r.chapter, verseStart: r.verseStart, verseEnd: r.verseEnd, source: 'bible' });
            }
            if (wantNote) {
                out.push({ bookId, chapter: r.chapter, verseStart: r.verseStart, verseEnd: r.verseEnd, source: 'study-note' });
            }
        }
        console.log("output: ", out);
        return out;
    }

    // 1) detect & consume the book‐prefix
    //    e.g. "1 Kings", "Ps.", "John"
    const bookMatch = inner.match(
        /^(?:[1-3]\s+)?[A-Za-z]+\.?/
    );
    let bookId = defaultBookId;
    let rest = inner;
    if (bookMatch) {
        const bookPart = bookMatch[0];
        bookId = getBookIdFromCitation(`(${bookPart})`, defaultBookId);
        rest = inner.slice(bookPart.length).trim();
    }

    // 2) now rest should look like "102:25–27, 28" or "1:1–3; 3:5"
    //    split on semicolons → each group may span multiple verses separated by commas
    const groups = rest.split(';').map(g => g.trim()).filter(Boolean);

    const out = [];

    groups.forEach(group => {
        // group might be "102:25–27, 28" or "1:1–3"
        // split on commas:
        const parts = group.split(',').map(p => p.trim()).filter(Boolean);

        // we keep track of the “current chapter” from the first full part
        let currentChapter = null;

        parts.forEach(part => {
            // part can be "102:25–27" or "28" or "1:5–6"
            const fullRef = part.match(/^(\d+):(\d+)(?:[-–](\d+))?$/);
            if (fullRef) {
                // chapter:verse[-verse]
                currentChapter = +fullRef[1];
                const start = +fullRef[2];
                const end = fullRef[3] ? +fullRef[3] : start;
                out.push({ bookId, chapter: currentChapter, verseStart: start, verseEnd: end, source: 'bible' });
            } else {
                // maybe just a verse number, e.g. "28" → use currentChapter
                const vOnly = part.match(/^(\d+)(?:[-–](\d+))?$/);
                if (vOnly && currentChapter != null) {
                    const start = +vOnly[1];
                    const end = vOnly[2] ? +vOnly[2] : start;
                    out.push({ bookId, chapter: currentChapter, verseStart: start, verseEnd: end, source: 'bible' });
                }
            }
        });
    });

    return out;
}

function getBookIdFromCitation(citation, defaultBookId) {
    // citation is like "(John 1:3)" or "(1 Kings 4:12–14)"
    const inner = citation.slice(1, -1).trim();
    // match either “1 Kings” or “John” at the start
    const m = inner.match(/^(?:[1-3]\s+[A-Za-z]+|[A-Za-z]+)\.?/);
    if (!m) return defaultBookId;
    const prefix = m[0].replace(/\.$/, "").toUpperCase();
    const found = bibleBooks.find(
        b => b.id === prefix || b.name.startsWith(prefix)
    );
    return found ? found.id : defaultBookId;
}

async function loadTabsData(bookId, chapter, tabId, tabData) {
    // ---------- Preflight: fetch chapter 1 to know total chapters ----------
    const preflight = new BibleDataManager({
        tabId: `preflight-${tabId}`,
        translation: 'BSB',
        bookId,
        chapter: 1,
    });

    try {
        await preflight.fetch();
    } catch (e) {
        console.error(`[loadTabsData] Preflight fetch failed for ${bookId} ch1:`, e);
        return;
    }

    const getTotalChapters = (pf) => {
        const d = pf?.data || {};
        return (
            d?.numberOfChapters ??
            undefined
        );
    };

    const totalChapters = getTotalChapters(preflight);

    if (!Number.isFinite(totalChapters) || totalChapters <= 0) {
        console.warn(
            `[loadTabsData] Could not determine total chapters for ${bookId}. Data shape:`,
            preflight?.data
        );
        RemoveTab(tabId);
        return;
    }

    if (!Number.isFinite(chapter) || chapter < 1 || chapter > totalChapters) {
        console.warn(
            `[loadTabsData] Requested chapter ${chapter} is out of range for ${bookId} (1..${totalChapters}).`
        );
        RemoveTab(tabId);
        return;
    }

    // ---------- Main load: reuse preflight if chapter === 1 ----------
    const bible =
        chapter === 1
            ? preflight
            : new BibleDataManager({
                tabId,
                translation: 'BSB',
                bookId,
                chapter,
            });

    if (chapter !== 1) {
        try {
            await bible.fetch();
        } catch (e) {
            console.error(
                `[loadTabsData] Fetch failed for ${bookId} ch${chapter}:`,
                e
            );
            RemoveTab(tabId);
            return;
        }
    }

    // ---------- After fetch ----------
    globalThis.BookId = bible.bookId;

    const { data, loading, error } = bible.getState();
    if (error) {
        console.error(`[loadTabsData] State has error for ${bookId} ch${chapter}:`, error);
        RemoveTab(tabId);
        return;
    }

    console.log(data, 'the data loaded');

    const customeTabData = {
        id: tabId,
        data: {
            ...tabData,
            ...data,
        },
        taken: false,
    };

    UpdateTab(customeTabData);
    SetActiveTab(tabId);

    globalThis.GlobalChapter = (bible.data?.chapter ?? chapter) - 1;

    if (globalThis.studyNotesPresent) {
        UpdateApplication(globalThis.STUDYNOTES_PANEL_ID, {
            App: (
                <StudyNotes
                    id={globalThis.STUDYNOTES_PANEL_ID}
                    chapter={globalThis.GlobalChapter}
                />
            ),
            to: 'panel',
        });
    }
}


// Fetch the study-note chapter for (bookId, chapter) — no caching, just fetch.
function fetchStudyNoteByBookChapter(bookId, chapter) {
    if (!bookId || !chapter) return;
    const mainBot = getBot('system', 'studyNote.main');
    const url = mainBot?.tags[bookId] ?? mainBot?.tags[String(bookId).toUpperCase()] ?? null;
    if (!url) return; // no notes for this book
    try {
        os.getFile(url);
    } catch { /* ignore */ }
}

/**
 * Peek previous & next using CurrentBibleObject.
 * We call openPrevious() then immediately openNext() to restore,
 * then openNext() and immediately openPrevious() to restore.
 * We read `res.data.{bookId,chapter}` from each call and fetch the note.
 */
async function prefetchNeighborsViaCurrentBibleObject() {
    const bible = globalThis.CurrentBibleObject || null;
    if (!bible) return;

    // --- Peek PREVIOUS ---
    let prevData = null;
    try {
        await bible.openPrevious();                 // navigate to previous
        console.log("previous response: ", bible.data);
        prevData = bible.data;
        console.log("prevData: ", prevData);
    } catch { }

    if (prevData?.bookId && prevData?.chapter) {
        console.log("prevData?.bookId: ", prevData?.bookId, " prevData?.chapter: ", prevData?.chapter);
        fetchStudyNoteByBookChapter(prevData.bookId, prevData.chapter);
    }

    // --- Peek NEXT ---
    let nextData = null;
    try {
        await bible.openNext();                     // navigate to next
        console.log("next response: ", bible.data);
        nextData = bible.data;
        console.log("nextData: ", nextData);
    } catch { }

    if (nextData?.bookId && nextData?.chapter) {
        console.log("nextData?.bookId: ", nextData?.bookId, " nextData?.chapter: ", nextData?.chapter);
        fetchStudyNoteByBookChapter(nextData.bookId, nextData.chapter);
    }
}


function StudyNotesWithoutWrap({ chapter }) {
    // Get extension bot for state management
    const mainBot = getBot('system', 'studyNote.main');

    const bookId = globalThis.BookId;
    const currentChapter = chapter + 1;
    const [studyNote, setStudyNote] = useState(
        []
    );

    const [pageLoading, setPageLoading] = useState(true);

    const [sectionMap, setSectionMap] = useState({});
    const [citationData, setCitationData] = useState([]);
    const [nextCitationData, setNextCitationData] = useState([]);

    const containerRef = useRef(null);

    // —— New state for cycling through matches ——
    const [searchKey, setSearchKey] = useState(null)
    const [matches, setMatches] = useState([])
    const [pointer, setPointer] = useState(0)
    const [highlightedPos, setHighlightedPos] = useState(null)

    //popup citation
    const [popup, setPopup] = useState(null);
    const [nextPopup, setNextPopup] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [canBeClosed, setCanBeClosed] = useState(false);

    // --- NEW: hover + loading control ---
    const [isLoading, setIsLoading] = useState(false);
    const hideTimerRef = useRef(null);
    const overPopupRef = useRef(false);
    const overCitationRef = useRef(false);
    const currentReqIdRef = useRef(0);
    const contextChapterRef = useRef(0);
    const hoverOpenTimerRef = useRef(null);
    const hoverTokenRef = useRef(0);

    // --- Back FAB fade-out control ---
    const [showBackFab, setShowBackFab] = useState(!!mainBot?.tags.previousTab?.tabId);
    const [backFabFading, setBackFabFading] = useState(false);
    const [backFabHovering, setBackFabHovering] = useState(false);

    const [lastDismissReason, setLastDismissReason] = useState("none");

    const [backFabAppearing, setBackFabAppearing] = useState(false);

    const appearCleanupTimerRef = useRef(null);
    const backFadeTimerRef = useRef(null);     // waits 3s then starts fade
    const backCleanupTimerRef = useRef(null);  // waits for CSS transition, then clears tag

    useEffect(() => {
        prefetchNeighborsViaCurrentBibleObject();
    }, [chapter, bookId]);


    function clearAppearTimer() {
        if (appearCleanupTimerRef.current) {
            clearTimeout(appearCleanupTimerRef.current);
            appearCleanupTimerRef.current = null;
        }
    }

    function clearBackTimers() {
        if (backFadeTimerRef.current) {
            clearTimeout(backFadeTimerRef.current);
            backFadeTimerRef.current = null;
        }
        if (backCleanupTimerRef.current) {
            clearTimeout(backCleanupTimerRef.current);
            backCleanupTimerRef.current = null;
        }
    }

    function clearHideTimer() {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }

    function scheduleHide() {
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => {
            // Only close if mouse is not over citation nor popup
            if (!overPopupRef.current && !overCitationRef.current) {
                handleClose();
            }
        }, 1500); // 1.5s as requested
    }

    function handleClose() {
        setShowModal(false);
        currentReqIdRef.current++; // cancel pending results
        setTimeout(() => {
            setPopup(null);
            // keep citationData; doesn’t hurt, but you can clear if you prefer
        }, 200);
    }

    globalThis.HandleClosePopup = handleClose;

    // ref to the currently highlighted verse DOM node
    const scrollRef = useRef(null);

    async function extractFromStudyNote({ bookId, chapter, verseStart, verseEnd }) {
        let newBookId = bookId;
        let current_note = null;
        console.log("start fetching study note: ", newBookId);
        if (globalThis.BookId !== newBookId || chapter !== currentChapter) {
            console.log("start fetching study note");
            const mainBot = getBot('system', 'studyNote.main');
            const studyNoteDataURL = mainBot?.tags[newBookId.toUpperCase()] ?? null;
            console.log(studyNoteDataURL);
            if (studyNoteDataURL) {
                console.log("attempting to fetch the note...")
                const studyNoteData = await os.getFile(studyNoteDataURL);
                console.log("studyNoteData: ", studyNoteData);
                current_note = [studyNoteData[chapter - 1]] || [];
            }
        }

        const noteBook = current_note ? current_note[0] ?? studyNote[0] ?? [] : studyNote[0] ?? [];
        console.log("noteBook: ", noteBook);
        console.log("studyNote: ", studyNote);
        if (!noteBook?.sections?.length) {
            console.log("no sections inside the notebook!!!");
            return { bookId: newBookId, chapter, verseStart, verseEnd, sectionTitle: null, verses: [], source: 'study-note' };
        }

        // Parse each section header like "3:16 Some title"
        const parsed = noteBook.sections.map(sec => {
            const secStr = String(sec.section ?? '');
            const m = /(\d+):(\d+)(?:\s+(.*))?/.exec(secStr);
            return {
                ch: m ? Number(m[1]) : null,
                v: m ? Number(m[2]) : null,
                title: m ? (m[3] || '').trim() : '',
                content: Array.isArray(sec.content) ? sec.content : [String(sec.content ?? '')],
            };
        });

        // Only sections in the requested chapter and verse range
        const hits = parsed.filter(s => s.ch === Number(chapter) && s.v != null && s.v >= verseStart && s.v <= verseEnd);

        const verses = hits.map(h => ({
            number: h.v,
            text: h.content.join(' ').trim()
        }));

        const sectionTitle = hits[0]?.title || null;

        let output = { bookId: newBookId, chapter, verseStart, verseEnd, sectionTitle, verses, source: 'study-note' };
        console.log("study note output: ", output);

        return output;
    }

    function normalizeBookId(bookId) {
        // if it starts with one or more digits followed by letters, insert a space
        return bookId.replace(/^(\d+)([A-Za-z])/, '$1 $2');
    }

    function denormalizeBookId(bookId) {
        // Remove spaces from book IDs for internal use (1 SA -> 1SA)
        return bookId.replace(/\s+/g, '');
    }

    async function fetchCitationDataForRefs(refs) {
        const reqId = ++currentReqIdRef.current;
        setIsLoading(true);
        try {
            const passages = await Promise.all(
                refs.map(async ({ bookId, chapter, verseStart, verseEnd, source }) => {
                    const displayBookId = normalizeBookId(bookId); // For display in popup

                    if (source === 'study-note') {
                        return await extractFromStudyNote({ bookId: displayBookId, chapter, verseStart, verseEnd });
                    }

                    const mgr = new BibleDataManager({
                        tabId: null,
                        translation: 'BSB',
                        bookId, // Use original bookId for BibleDataManager (1SA, 2SA, etc.)
                        chapter
                    });
                    await mgr.fetch();

                    const section = mgr.data.content.find(sec =>
                        sec.verses.some(v => v.verseNumber >= verseStart && v.verseNumber <= verseEnd)
                    );
                    const sectionTitle = section?.heading || null;
                    const allVerses = mgr.data.content.flatMap(sec => sec.verses);

                    const verses = allVerses
                        .filter(v => v.verseNumber >= verseStart && v.verseNumber <= verseEnd)
                        .map(v => ({ number: v.verseNumber, text: v.text }));

                    return { bookId: displayBookId, chapter, verseStart, verseEnd, sectionTitle, verses, source: source || 'bible' };
                })
            );

            // Only commit if this is still the latest request
            if (reqId === currentReqIdRef.current) {
                setCitationData(passages);
                setIsLoading(false);
            }
        } catch (e) {
            if (reqId === currentReqIdRef.current) setIsLoading(false);
            // (optional) log error
        }
    }


    // whenever chapter changes, pull in the new notes
    useEffect(() => {
        const getStudyNote = async () => {
            const mainBot = getBot('system', 'studyNote.main');
            const studyNoteDataURL = mainBot?.tags[bookId] ?? null;
            if (studyNoteDataURL) {
                const studyNoteData = await os.getFile(studyNoteDataURL);
                // if (!chapter || chapter < 0) return;
                if (![studyNoteData[chapter]]) cancelled = true;
                let note = [studyNoteData[chapter]];
                console.log(note);
                setTagMask(mainBot, 'currentStudyNote', note);
                setStudyNote(note);
                setPageLoading(false);
                // reset any old highlights
                setSearchKey(null)
                setMatches([])
                setPointer(0)
                setHighlightedPos(null)
                const map = {};
                ([studyNoteData[chapter]] ?? []).forEach((book, bIdx) => {
                    if (book && book.sections) {
                        book.sections.forEach((verse, vIdx) => {
                            const raw = verse.section.toString();
                            const cleaned = raw
                                .replace(/\d+:\d+/g, "")
                                .replace(/\./g, "")
                                .replace(/\s+/g, " ")
                                .trim();
                            map[cleaned] = { bookIdx: bIdx, verseIdx: vIdx, original: raw };
                        });
                    }
                });
                setSectionMap(map);
                globalThis.VerseSectionMap = map;
                // if(!tags.shouldHighlight) {
                //     tags.shouldHighlight = true;
                // }

                // 🔔 Dispatch the “mapready” event, so everyone else can start animating
                window.dispatchEvent(new CustomEvent('sectionMapReady', { detail: map }));
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
        console.log('🔄 sectionMap:', sectionMap);
        if (chapter) {
            contextChapterRef.current = chapter;
        }
        if (containerRef.current) {
            containerRef.current.scrollIntoView({
                behavior: 'auto',
                block: 'start',
            });

            setTagMask(mainBot, 'canHighlight', true);
            console.log("canHighlight is true now", mainBot?.tags.canHighlight);
        }

    }, [chapter, studyNote, sectionMap]);

    // scroll **immediately** when highlight flips on
    useLayoutEffect(() => {
        if (!highlightedPos || !scrollRef.current) return;

        scrollRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
        });

        const timer = setTimeout(() => {
            setHighlightedPos(null)
        }, 5000);

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

            mainBot?.tags.currentStudyNote?.forEach((book, bIdx) => {
                if (book && book.sections) {
                    book.sections.forEach((verse, vIdx) => {
                        if (byNumber) {
                            console.log("attepmting to highlight by number: ", key);
                            // match verse.section's "a:b" → compare part after ":"
                            const m = /(\d+):(\d+)/.exec(verse.section.toString());
                            console.log("matching: ", m);
                            if (m && m[2] === key) {
                                console.log("found a match!!");
                                newMatches.push({ bookIdx: bIdx, verseIdx: vIdx })
                            }
                        } else {
                            const token = verse.section.toString().replace(stripRe, '');
                            console.log("token: ", token);
                            if (token.includes(key)) {
                                newMatches.push({ bookIdx: bIdx, verseIdx: vIdx })
                            }
                        }
                    });
                }
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
            console.log(newMatches);
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
        }, 5000);
    }

    let verseTimeout;
    let versesTimeout;

    function clearHighlights(category) {
        if (category === 'verse') {
            clearTimeout(verseTimeout);
            globalThis.HighlightedVerseNumber = '';
            window.dispatchEvent(new CustomEvent('highlightedVerseChanged'));
        } else if (category === 'verses') {
            clearTimeout(versesTimeout);
            globalThis.HighlightedVerses = '';
            window.dispatchEvent(new CustomEvent('highlightedVersesChanged'));
        }
    }

    function highlightSectionNumber(rawNumber) {
        // cancel any pending clear
        if (verseTimeout) clearTimeout(verseTimeout);
        if (versesTimeout) clearHighlights('verses');
        // normalize to a simple string
        const numStr = String(rawNumber);

        console.log("called verse: ", numStr)

        // 1) store globally
        globalThis.HighlightedVerseNumber = numStr;

        // 2) let React listeners know
        window.dispatchEvent(new CustomEvent('highlightedVerseChanged'));

        // 4) clear after 3s
        verseTimeout = setTimeout(() => {
            globalThis.HighlightedVerseNumber = '';
            window.dispatchEvent(new CustomEvent('highlightedVerseChanged'));
        }, 5000)
    }

    // highlight a single verse, a range string, an array, or range object(s)
    function highlightVerses(payload) {
        if (verseTimeout) clearHighlights('verse');
        if (versesTimeout) clearTimeout(verseTimeout);

        globalThis.HighlightedVerses = payload; // e.g. "5-9", [3,4,8], {start:2,end:6}, [{start:1,end:3},{start:10,end:11}]
        window.dispatchEvent(new CustomEvent('highlightedVersesChanged'));

        versesTimeout = setTimeout(() => {
            globalThis.HighlightedVerses = '';
            window.dispatchEvent(new CustomEvent('highlightedVersesChanged'));
        }, 5000);
    }

    function scheduleStudyNoteHighlight(payload) {
        setTagMask(mainBot, 'canHighlight', false);
        console.log("canHighlight is false now: ", mainBot?.tags.canHighlight);
        globalThis.ScheduleHighlight(payload, highlightSection);
    }

    // Decide what to do when a popup heading is clicked
    async function handleCitationHeadingClick(passage, evt) {
        evt?.stopPropagation?.();

        const { source = 'bible', verseStart, verseEnd, chapter, bookId } = passage;
        const internalBookId = denormalizeBookId(bookId); // Convert "1 SA" to "1SA" for internal use
        console.log("passage: ", passage);

        if (globalThis.BookId === internalBookId && currentChapter === chapter) {
            setTagMask(mainBot, 'shouldHighlight', true);
            // Empty for now :D
        } else {
            // GlobalLoadingDataFromSN(bookId, chapter);
            HandleClosePopup();

            const currentTab = ActiveTab;
            setTagMask(mainBot, 'previousTab', {
                tabId: currentTab,
                bookId: globalThis.BookId,
                chapter: currentChapter,
                tabData: {
                    use: 'thePage',
                    type: 'book',
                    book: getBookNameById(globalThis.BookId),
                    bookId: globalThis.BookId,
                    chapter: currentChapter,
                    translation: 'BSB'
                }
            });

            setTagMask(mainBot, 'shouldHighlight', false);

            const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

            function findFirstTabByBookIdInActiveSpace(bookId) {
                const all = GetTabsInSpace() || [];
                const hit = all.find(t => t?.data && same(t.data.bookId, bookId));
                return hit ? { tabId: hit.id, data: hit.data } : null;
            }

            const existingTab = findFirstTabByBookIdInActiveSpace(internalBookId);

            let newTabData;
            let newTabId;

            if (existingTab) {
                newTabId = existingTab.tabId;
                newTabData = existingTab.data
            } else {
                newTabId = uuid();
                newTabData = {
                    use: 'thePage',
                    type: 'book',
                    book: getBookNameById(internalBookId),
                    bookId: internalBookId,
                    chapter: chapter,
                    translation: 'BSB'
                };

                AddTab({
                    id: newTabId,
                    taken: false,
                    data: { ...newTabData }
                });
            }

            SetActiveTab(newTabId);

            await loadTabsData(internalBookId, chapter, newTabId, newTabData);


            // const allTabsInSpace = GetTabsInSpace();

            // console.log("allTabsInSpace: ", allTabsInSpace.length);

        }

        if (source === 'bible') {
            const payload = {
                "start": verseStart,
                "end": verseEnd
            }

            highlightVerses(payload);
        } else {
            console.log("clicked on the heading for note");
            scheduleStudyNoteHighlight(String(verseStart));
        }

    }

    // Decide what to do when a popup verse is clicked
    async function handleCitationVerseClick(passage, evt, verseNumber) {
        evt?.stopPropagation?.();

        const { source = 'bible', verseStart, verseEnd, chapter, bookId } = passage;
        const internalBookId = denormalizeBookId(bookId); // Convert "1 SA" to "1SA" for internal use
        console.log("passage: ", passage);

        if (globalThis.BookId === internalBookId && currentChapter === chapter) {
            setTagMask(mainBot, 'shouldHighlight', true);
            os.toast("you are already opening this book.", 2);
            if (source === 'study-note') {
                console.log("is study note");
                console.log("clicked on the verse for note");
                highlightSection(String(verseNumber));
            } else {
                console.log("is bible");
                highlightSectionNumber(String(verseNumber));
            }
        } else {
            // await GlobalLoadingDataFromSN(bookId, chapter).then(() => {
            //     if (source === 'study-note') {
            //         console.log("is study note");
            //         console.log("clicked on the verse for note");
            //         scheduleStudyNoteHighlight(String(verseStart));
            //         // highlightSection(String(verseNumber));
            //     } else {
            //         console.log("is bible");
            //         highlightSectionNumber(String(verseNumber));
            //     }
            // })

            HandleClosePopup();

            const currentTab = ActiveTab;
            setTagMask(mainBot, 'previousTab', {
                tabId: currentTab,
                bookId: globalThis.BookId,
                chapter: currentChapter,
                tabData: {
                    use: 'thePage',
                    type: 'book',
                    book: getBookNameById(globalThis.BookId),
                    bookId: globalThis.BookId,
                    chapter: currentChapter,
                    translation: 'BSB'
                }
            });

            setTagMask(mainBot, 'shouldHighlight', false);

            const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();

            function findFirstTabByBookIdInActiveSpace(bookId) {
                const all = GetTabsInSpace() || [];
                console.log("all: ", all);
                const hit = all.find(t => t?.data && same(t.data.bookId, bookId));
                console.log("hit: ", hit);
                return hit ? { tabId: hit.id, data: hit.data } : null;
            }

            const existingTab = findFirstTabByBookIdInActiveSpace(internalBookId);

            let newTabData;
            let newTabId;

            if (existingTab) {
                console.log("existingTab: ", existingTab);
                newTabId = existingTab.tabId;
                newTabData = existingTab.data
            } else {
                newTabId = uuid();
                newTabData = {
                    use: 'thePage',
                    type: 'book',
                    book: getBookNameById(internalBookId),
                    bookId: internalBookId,
                    chapter: chapter,
                    translation: 'BSB'
                };

                AddTab({
                    id: newTabId,
                    taken: false,
                    data: { ...newTabData }
                });
            }

            SetActiveTab(newTabId);

            await loadTabsData(internalBookId, chapter, newTabId, newTabData);

            if (source === 'study-note') {
                console.log("is study note");
                console.log("clicked on the verse for note");
                scheduleStudyNoteHighlight(String(verseStart));
                // highlightSection(String(verseNumber));
            } else {
                console.log("is bible");
                highlightSectionNumber(String(verseNumber));
            }
        }
    }

    function changeGlobalHighlighting(flag) {
        const isBool = (val) => typeof val === "boolean";
        if (isBool(flag)) {
            setTagMask(mainBot, 'shouldHighlight', flag);
        } else {
            setTagMask(mainBot, 'shouldHighlight', true);
        }
    }

    globalThis.ChangeGlobalHighlighting = changeGlobalHighlighting;

    // if (!studyNote || studyNote.length === 0 || !studyNote[0]) {
    //     return (
    //         <div className="judeTextPage">
    //             <div className="verseText">
    //                 No study note for this book: <strong>{bookId}</strong>
    //             </div>
    //         </div>
    //     );
    // }

    let hoverTimer;
    function onCitationEnter(refText, triggerEl) {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(async () => {
            const refs = parseCitationReferences(refText, bookId);
            // fetch in background; don’t open yet
            await Promise.all(refs.map(r => prefetchChapter(r.bookId, r.chapter)));
        }, 160);
    }
    function onCitationLeave() { clearTimeout(hoverTimer); }

    const ANIM_MS = 200;

    function switchPopup(newPopup) {
        if (!newPopup) return;

        if (!popup) {
            setPopup(newPopup);
            setShowModal(true);
            return;
        }

        setShowModal(false);
        setTimeout(() => {
            setPopup(newPopup);
            setShowModal(true);
        }, ANIM_MS);
    }

    function clearHoverOpenTimer() {
        if (hoverOpenTimerRef.current) {
            clearTimeout(hoverOpenTimerRef.current);
            hoverOpenTimerRef.current = null;
        }
    }

    // schedule opening the popup after 500ms if still hovering the same target
    function scheduleOpenPopupOnHover(e, text) {
        clearHoverOpenTimer();
        const myToken = ++hoverTokenRef.current;

        hoverOpenTimerRef.current = setTimeout(() => {
            // if another hover started/ended, abort
            if (hoverTokenRef.current !== myToken) return;

            // (same body you currently run on MouseEnter)
            // overCitationRef.current = true;
            // clearHideTimer();



            const { clientX, clientY } = e;
            const containerRect = containerRef.current?.getBoundingClientRect() || { width: 0 };
            const targetEl = e.target;
            console.log("e: ", e);
            console.log("targetEl: ", targetEl);
            const targetRect = targetEl.getBoundingClientRect();
            const gap = 5;

            const margin = 15;
            const popupWidth = Math.min(containerRect.width * 0.6, 480);
            const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = e.target;
            const centerPivotX = offsetLeft + (offsetWidth / 4);
            const ideal = centerPivotX - popupWidth / 2;
            const realLeft = Math.max(margin, Math.min(ideal, containerRect.width - 15 - margin - popupWidth));

            // ---------- isBelow from viewport distance ----------
            const distanceFromViewportTop = targetRect.top;
            const isBelow = distanceFromViewportTop < 300;
            const relY = isBelow
                ? offsetTop + offsetHeight + gap
                : offsetTop - gap;

            const refs = parseCitationReferences(text, bookId, contextChapterRef.current + 1);
            const newPopup = {
                text,
                refs,
                clientX,
                clientY,
                relX: realLeft,
                relY,
                margin: offsetHeight,
                isBelow,
            };

            setNextPopup(newPopup);
            switchPopup(newPopup);
            fetchCitationDataForRefs(refs);
        }, 300); // 0.3s intent
    }

    const removeStudyNoteBackButton = () => {
        // fade out right after click, then clear
        clearBackTimers();
        setBackFabFading(true);
        backCleanupTimerRef.current = setTimeout(() => {
            setTagMask(mainBot, 'previousTab', {});
            setTagMask(mainBot, '_prevTabCache', {});
            setShowBackFab(false);
            setBackFabFading(false);
            setLastDismissReason("close");
        }, 400);
    }

    globalThis.RemoveStudyNoteBackButton = removeStudyNoteBackButton;

    async function handleBackFabClick() {
        if (mainBot?.tags._prevTabCache && !mainBot?.tags.previousTab?.tabId) {
            // ignore cache when user explicitly clicks: treat as normal back using cache if needed
            setTagMask(mainBot, 'previousTab', mainBot.tags._prevTabCache);
        }

        if (mainBot?.tags.previousTab?.tabId) {
            SetActiveTab(mainBot.tags.previousTab.tabId);
            await loadTabsData(
                mainBot.tags.previousTab.bookId,
                mainBot.tags.previousTab.chapter,
                mainBot.tags.previousTab.tabId,
                mainBot.tags.previousTab.tabData
            );
        }

        removeStudyNoteBackButton();
    }

    // derive current visibility from the tag each render
    const shouldShowBackFab = !!mainBot?.tags.previousTab?.tabId;

    // whenever it appears, show it, then fade after 3s, then clear the tag
    useEffect(() => {
        // keep in sync with tag presence
        if (!shouldShowBackFab) {
            clearBackTimers();
            setShowBackFab(false);
            setBackFabFading(false);
            return;
        }

        setShowBackFab(true);

        // if not hovering, arm the 3s fade timer; if hovering, do nothing
        clearBackTimers();
        if (!backFabHovering) {
            backFadeTimerRef.current = setTimeout(() => {
                // start fading
                setBackFabFading(true);
                // after transition, clear tag & hide
                backCleanupTimerRef.current = setTimeout(() => {
                    setTagMask(mainBot, '_prevTabCache', mainBot?.tags.previousTab || {});
                    setTagMask(mainBot, 'previousTab', {});
                    setShowBackFab(false);
                    setBackFabFading(false);
                    setLastDismissReason("timeout");
                }, 400); // keep in sync with CSS duration
            }, 3000);
        }

        return clearBackTimers;
    }, [shouldShowBackFab, backFabHovering]);

    function onBackFabMouseEnter() {
        setBackFabHovering(true);
        clearBackTimers();
        setBackFabFading(false);
    }

    function onBackFabMouseLeave() {
        setBackFabHovering(false);
    }

    function onBackHotspotMouseEnter() {
        if (lastDismissReason === "timeout" && mainBot?.tags._prevTabCache?.tabId) {
            // restore cached target, arm fade-in
            setTagMask(mainBot, 'previousTab', mainBot.tags._prevTabCache);

            // prevent the 3s idle timer from arming while pointer is in the area
            setBackFabHovering(true);
            clearBackTimers();
            setBackFabFading(false);

            // mount + animate in
            setBackFabAppearing(true);
            setShowBackFab(true);
            setBackFabFading(false);
            setLastDismissReason("none");

            clearAppearTimer();
            // drop the 'appear' flag after the CSS animation completes
            appearCleanupTimerRef.current = setTimeout(() => {
                setBackFabAppearing(false);
            }, 400); // keep in sync with CSS animation duration
        }
    }


    // cleanup on unmount
    useEffect(() => () => {
        clearHoverOpenTimer()
        clearBackTimers();
        clearAppearTimer();
    }, []);

    const shouldRender = popup && showModal;

    return (
        <div
            ref={containerRef}
            className="judeTextPage"
            onClick={(e) => {
                // clearHideTimer();
                const clickedCitation = e.target.closest('.studyCitation');
                const insidePopup = e.target.closest('.popup-container');
                if (popup && !insidePopup && !clickedCitation) {
                    handleClose();
                }
            }}
        >
            {pageLoading && (
                <div
                    className="sn-centered-loading"
                    aria-busy="true"
                    aria-live="polite"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none', // block clicks beneath? keep as none
                        zIndex: 2
                    }}
                >
                    <div className="sn-spinner" />
                </div>
            )}
            {lastDismissReason === "timeout" && (
                <div
                    className="sn-back-fab-hotspot"
                    onMouseEnter={onBackHotspotMouseEnter}
                    aria-hidden
                />
            )}
            {showBackFab && (
                <button
                    className={`sn-back-fab fade-in ${backFabFading ? 'fade-out' : ''} ${backFabAppearing ? 'appear' : ''}`}
                    onClick={handleBackFabClick}
                    onMouseEnter={onBackFabMouseEnter}
                    onMouseLeave={onBackFabMouseLeave}
                    aria-label="Back to previous tab"
                    title="Back to previous tab"
                >
                    <span className="sn-back-fab-icon" aria-hidden>↩</span>
                    <span className="sn-back-fab-text">Back</span>
                </button>
            )}
            {studyNote && studyNote.length > 0 ? studyNote.map((book, bookIdx) => {
                const [c1, setC1] = useState(false)
                return (
                    <div key={bookIdx} className="studyTextContainer">
                        <h2
                            onDoubleClick={(e) => { console.log(e); setC1(!c1) }}
                            className={`mainHeader`}
                        >

                        </h2>

                        {book && book.sections && book.sections.map((verse, vIdx) => {
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

                                    {splitWithCitations(verse.content.join(' ')).map((chunk, i) =>
                                        chunk.type === 'plain' ? (
                                            <span key={i} className="verseText" >{chunk.text}</span>
                                        ) : (
                                            <span
                                                key={i}
                                                className="studyCitation clickableCursor"
                                                onMouseEnter={(e) => {
                                                    e.stopPropagation();
                                                    scheduleOpenPopupOnHover(e, chunk.text);   // <-- wait 0.3 before opening
                                                }}
                                                onMouseLeave={() => {
                                                    // leaving the citation cancels pending open AND may schedule hide
                                                    clearHoverOpenTimer();
                                                    overCitationRef.current = false;
                                                    // scheduleHide();
                                                }}
                                                onClick={(e) => {
                                                    console.log("text: ", chunk.text);
                                                    e.stopPropagation();
                                                    overCitationRef.current = true;     // mark mouse is on citation
                                                    // clearHideTimer();
                                                    console.log("e: ", e);
                                                    const { clientX, clientY } = e;
                                                    const containerRect = containerRef.current.getBoundingClientRect() || { width: 0 };

                                                    const targetEl = e.currentTarget;
                                                    const targetRect = targetEl.getBoundingClientRect();
                                                    const margin = 15;
                                                    const gap = 5;
                                                    const popupWidth = Math.min(containerRect.width * 0.6, 480);
                                                    // center the popup on the click’s X
                                                    const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = e.target;
                                                    const centerPivotX = offsetLeft + (offsetWidth / 4);
                                                    const ideal = centerPivotX - popupWidth / 2; // since Wt/2 = 200, W = 160, if 15 <= Wt/2 + W < = Wt - 15
                                                    const realLeft = Math.max(margin, Math.min(ideal, containerRect.width - 15 - margin - popupWidth));

                                                    // ---------- isBelow from viewport distance ----------
                                                    const distanceFromViewportTop = targetRect.top;
                                                    const isBelow = distanceFromViewportTop < 300;

                                                    const relY = isBelow
                                                        ? offsetTop + offsetHeight + gap
                                                        : offsetTop - gap;

                                                    const refs = parseCitationReferences(chunk.text, bookId, contextChapterRef.current + 1);
                                                    const newPopup = {
                                                        text: chunk.text,
                                                        refs,
                                                        clientX,
                                                        clientY,
                                                        relX: realLeft,
                                                        relY,
                                                        margin: offsetHeight,
                                                        isBelow,
                                                    }
                                                    setNextPopup(newPopup);
                                                    switchPopup(newPopup);
                                                    fetchCitationDataForRefs(refs);
                                                }}
                                            >
                                                {chunk.text}
                                            </span>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            }) : (
                <div className="judeTextPage">
                    <div className="verseText" style={{ padding: '20px', textAlign: 'center' }}>
                        {pageLoading ? 'Loading study notes...' : `No study notes available for this book.`}
                    </div>
                </div>
            )}

            {shouldRender && (
                <div
                    className="popup-container"
                    style={{
                        top: popup ? `${popup.relY}px` : '-9999px',
                        left: popup ? `${popup.relX}px` : '0px',
                        transform: showModal ? `${popup.isBelow ? "translateY(0)" : "translateY(-100%)" + " scale(1)"}`
                            : `${popup.isBelow ? "translateY(0)" : "translateY(-100%)" + " scale(0.9)"}`,
                        opacity: showModal ? 1 : 0
                    }}
                    onClick={e => { e.stopPropagation(); }}
                    onMouseEnter={(e) => {
                        e.stopPropagation();
                        overPopupRef.current = true;
                        // clearHideTimer();
                    }}
                    onMouseLeave={(e) => {
                        overPopupRef.current = false;
                        // scheduleHide();
                    }}
                >
                    {isLoading && (
                        <div className="cite-loading">
                            <div className="spinner" />
                        </div>
                    )}

                    {!isLoading && citationData.map((passage, i) => (
                        <div key={i} className="cite" >
                            <div
                                className="cite-heading"
                                onClick={(e) => handleCitationHeadingClick(passage, e)}
                                style={{ cursor: 'pointer' }}
                                title={passage.source === 'study-note' ? 'Jump to note' : 'Open in Bible'}
                            >
                                {passage.bookId} {passage.chapter}:{passage.verseStart}
                                {passage.verseEnd !== passage.verseStart ? `–${passage.verseEnd}` : ''}
                                {passage.source === 'study-note' &&
                                    <span className={`cite-source ${passage.source === 'study-note' ? 'from-note' : 'from-bible'}`}>
                                        {passage.source === 'study-note' ? 'NOTE' : 'BIBLE'}
                                    </span>
                                }
                            </div>

                            {!!passage.sectionTitle && (
                                <div className="cite-section-title">{passage.sectionTitle}</div>
                            )}

                            {passage.verses.map(v => (
                                <p
                                    key={v.number}
                                    className="cite-verse"
                                    onClick={(e) => handleCitationVerseClick(passage, e, v.number)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    [{v.number}] {v.text}
                                </p>
                            ))}

                            {i < citationData.length - 1 && <div className="cite-divider" />}
                        </div>
                    ))}
                </div>
            )}


            <style>
                {getStyleOf('studyNotes.css')}
            </style>
        </div>
    );
}


function StudyNotes({ id, chapter: propChapter }) {
    // Get extension bot for state management
    const mainBot = getBot('system', 'studyNote.main');
    
    // Track book and chapter changes - use prop if provided, otherwise use globals
    const [bookId, setBookId] = useState(globalThis.BookId);
    const [chapter, setChapter] = useState(propChapter ?? globalThis.GlobalChapter ?? 0);
    
    // Update when prop changes (from UpdateApplication)
    useEffect(() => {
        if (propChapter !== undefined && propChapter !== chapter) {
            setChapter(propChapter);
        }
    }, [propChapter]);
    
    // Poll for changes to global book/chapter
    useEffect(() => {
        const checkChanges = () => {
            if (globalThis.BookId !== bookId) {
                setBookId(globalThis.BookId);
            }
            // Only update from globals if prop is not provided
            if (propChapter === undefined) {
                const globalChapter = globalThis.GlobalChapter ?? 0;
                if (globalChapter !== chapter) {
                    setChapter(globalChapter);
                }
            }
        };

        const interval = setInterval(checkChanges, 100);
        return () => clearInterval(interval);
    }, [bookId, chapter, propChapter]);

    const TAB_LIST = [
        { id: 'notes', label: 'Study Notes' },
        { id: 'devotion', label: 'Devotional' },  // Apologist
        { id: 'discover', label: 'Discovery' },  // SgSearch
    ];

    const initialTab = mainBot?.tags.studyNotesActiveTab || 'notes';
    const [active, setActive] = useState(initialTab);
    const [searchType, setSearchType] = useState('apologist'); // 'apologist' or 'tapos'
    const [, setForceUpdate] = useState(0); // For forcing re-renders

    useEffect(() => {
        setTagMask(mainBot, 'studyNotesActiveTab', active);
    }, [active]);
    
    // Expose current tab globally so thePage can check before updating
    useEffect(() => {
        globalThis.StudyNoteActiveTab = active;
    }, [active]);

    // Force re-render when global search changes
    useEffect(() => {
        let lastSearch = globalThis.GlobalSearch;

        const checkGlobalSearch = () => {
            if (globalThis.GlobalSearch !== lastSearch) {
                lastSearch = globalThis.GlobalSearch;
                setForceUpdate(prev => prev + 1); // Trigger re-render
            }
        };

        // Check for global search changes periodically
        const interval = setInterval(checkGlobalSearch, 100);

        return () => clearInterval(interval);
    }, []);

    // Alt + S key switching between search types
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.altKey && event.key === 's') {
                event.preventDefault();
                setSearchType(prev => prev === 'apologist' ? 'tapos' : 'apologist');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, []);


    return (
        <div className="sn-tabs-wrap">
            <div className="sn-tabs">
                {TAB_LIST.map(t => (
                    <button
                        key={t.id}
                        className={`sn-tab ${active === t.id ? 'is-active' : ''}`}
                        onClick={() => setActive(t.id)}
                        type="button"
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="sn-panels">
                <div className={`sn-panel ${active === 'notes' ? 'show' : 'hide'}`}>
                    <StudyNotesWithoutWrap chapter={chapter} />
                </div>

                <div className={`sn-panel ${active === 'devotion' ? 'show' : 'hide'}`}>
                    <div className="sg-searchWrap">
                        <TableTalkEmbed />
                    </div>
                </div>

                <div className={`sn-panel ${active === 'discover' ? 'show' : 'hide'}`}>
                    <div className="sg-searchWrap">
                        {searchType === 'apologist' ? (
                            <ApologistSearch search={globalThis.GlobalSearch ?? "galations 5"} />
                        ) : (
                            <SgSearch search={globalThis.GlobalSearch ?? "galations 5"} />
                        )}
                    </div>
                </div>
            </div>

            <style>{getStyleOf('studyNotes.css')}</style>
        </div>
    );
};

globalThis.GlobalStudyNotes = StudyNotes;

return StudyNotes;