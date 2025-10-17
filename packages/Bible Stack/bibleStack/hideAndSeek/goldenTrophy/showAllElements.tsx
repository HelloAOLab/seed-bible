const gamesButton = getBots(byTag("system","hideAndSeek.startGame"),byTag("isInitialized",true));

 animateTag(gamesButton,{
        fromValue : {
            opacity: 0,
            scale: 0,
            labelFontSize: 0
        },
        toValue : {
            opacity: 1,
            scale: 1,
            labelFontSize: 1
        },
        duration: 0.1
});