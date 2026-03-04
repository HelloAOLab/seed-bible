// console.log('here user data', that)
// if (!masks['usersData'])
//     masks['usersData'] = {}

// masks['usersData'][`${that.user}`] = that?.tab
// console.log(masks['usersData'], "masks['usersData']")
// await os.sleep(10)
// console.log(that,'that final')
// console.log(GetOrSetVisualInTags(that.user))
const G = globalThis;
if (G.SetOnlineUsers) {
  G.SetOnlineUsers((prev: any) => ({
    ...prev,
    [`${that.user}`]: that.tab,
    info: G?.GetOrSetVisualInTags(that.user),
  }));
}
