const { onlineUsers } = that;

if (!onlineUsers || !globalThis.SetBooksOnlineUsers) return;

SetBooksOnlineUsers(onlineUsers);
