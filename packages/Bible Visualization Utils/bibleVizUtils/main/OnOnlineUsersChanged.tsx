const {onlineUsers} = that;

if(!onlineUsers) return;

const usersIds = Object.keys(onlineUsers);

const colorMap = new Map(usersIds.map((userId) => {
    const currColor = BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user?.color;

    return [
        userId,
        currColor ?? BibleVizUtils.Functions.GetRandomColor()
    ]
        
}))

BibleVizUtils.Data.vars.userPresenceData = {}

usersIds.forEach((userId) => {
    const { book, bookId, chapter, id } = onlineUsers[userId];
    BibleVizUtils.Data.vars.userPresenceData[userId] = { 
        user: {
            name: "Unknown",
            color: colorMap.get(userId)
        },
        tab: {
            data: {
                book,
                bookId,
                chapter,
            },
            id  
        }
    }
});

shout("UserPresenceUpdate");