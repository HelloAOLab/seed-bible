// .filter((bookBot)=> (bookBot.tags.bookRank % 3) === that.validInteger)

let bookBots = getBots(byTag("#bookRank" , (bookRank)=> !!bookRank && bookRank>-1),byTag("sectionRank",that.sectionRank));

bookBots = bookBots.sort((a,b)=>b.tags.bookRank - a.tags.bookRank);

await os.sleep(300);

let strings = {
    '5': {
        0: "String_06c",
        1: "String_08f",
        2: "String_09g",
        3: "String_10a",
        4: "String_11c"
        },
    "12":{
            0: "String_01c",
            1: "String_03f",
            2: "String_04g",
            3: "String_05a",
            4: "String_06c",
            5: "String_08f",
            6: "String_09g",
            7: "String_10a",
            8: "String_11c",
            9: "String_13f",
            10: "String_14g",
            11: "String_11c"
        },
        "9":{
            0: "String_01c",
            1: "String_03f",
            2: "String_04g",
            3: "String_05a",
            4: "String_06c",
            5: "String_08f",
            6: "String_09g",
            7: "String_10a",
            8: "String_11c"
            },
        "17":{
            0: "String_01c",
            1: "String_03f",
            2: "String_04g",
            3: "String_06c",
            4: "String_07e",
            5: "String_09g",
            6: "String_02e",
            7: "String_05a",
            8: "String_06c",
            9: "String_08f",
            10: "String_09g",
            11: "String_11c",
            12: "String_04g",
            13: "String_06c",
            14: "String_08f",
            15: "String_09g",
            16: "String_11c",
        },
        "4":{
            0:"String_06c",
            1:"String_08f",
            2:"String_09g",
            3:"String_11c",
        },
        '21':{
            0: "String_01c",
            1: "String_03f",
            2: "String_04g",
            3: "String_06c",
            4: "String_07e",
            5: "String_09g",
            6: "String_02e",
            7: "String_05a",
            8: "String_06c",
            9: "String_08f",
            10: "String_09g",
            11: "String_11c",
            12: "String_04g",
            13: "String_06c",
            14: "String_08f",
            15: "String_09g",
            16: "String_11c",
            17: "String_12e",
            18: "String_13f",
            19: "String_14g",
            20: "String_16c",
        },
        "1":{
            0:'String_06c'
        }
}

for(let i = 0;i<bookBots.length; i++) {
    if (globalThis.skipAnimation || !globalThis.hideSeekPlaying){
        continue;
    }
    let obj = strings[bookBots.length];
    const book = bookBots[i];
    try {
        book.shiftFocus({onlyZ: true, duration: 0.4});
    }catch {
        
    }
    book.tryToHighlightSelf({highlightingFrom: "transition", unhighlightDelayInSeconds: (0.25 - 0.2)});
    shout("playSound",{soundName: obj[i]});
    await os.sleep(250);
}

await os.sleep(500); 