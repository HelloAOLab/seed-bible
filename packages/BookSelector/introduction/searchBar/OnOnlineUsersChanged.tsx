const {onlineUsers} = that;

if(!onlineUsers || !globalThis.SetBooksOnlineUsers) return

SetBooksOnlineUsers(onlineUsers);

setTagMask(thisBot, "onlineUsers", onlineUsers, "tempLocal");