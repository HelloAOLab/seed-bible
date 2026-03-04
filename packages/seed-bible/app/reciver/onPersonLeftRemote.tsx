const G = globalThis;
if (G.SetOnlineUsers) {
  G.SetOnlineUsers((prev: any) => {
    const oldUsers = { ...prev };
    delete oldUsers[that.user];
    return oldUsers;
  });
}
