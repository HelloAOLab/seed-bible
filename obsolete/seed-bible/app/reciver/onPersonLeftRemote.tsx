globalThis.SetOnlineUsers &&
  SetOnlineUsers((prev) => {
    const oldUsers = { ...prev };
    delete oldUsers[that.user];
    return oldUsers;
  });
