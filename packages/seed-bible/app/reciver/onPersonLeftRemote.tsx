const G = globalThis as any;
if (G.SetOnlineUsers) {
  G.SetOnlineUsers((prev: any) => {
    const oldUsers = { ...prev };
    delete oldUsers[that.user];
    return oldUsers;
  });
}
