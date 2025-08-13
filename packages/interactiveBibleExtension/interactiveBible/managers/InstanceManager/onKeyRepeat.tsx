if(globalThis.throttelLimitHit) return;
 
globalThis.throttelLimitHit = true;

globalThis.keyRepeatTimeout = setTimeout(function() {
    if (globalThis.repeatSpeed  > 200) {
        globalThis.repeatSpeed  -= 100;
    }
    thisBot.onKeyUp({...that,pass: true});
    globalThis.throttelLimitHit = false;
}, globalThis.repeatSpeed);