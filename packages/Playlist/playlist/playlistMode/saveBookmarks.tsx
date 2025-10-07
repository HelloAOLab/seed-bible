const authBot = await os.requestAuthBotInBackground();

if (authBot?.id) {
  const res = await os.recordData(
    authBot.id,
    "bookmarks",
    { ...that.bookmarks },
    {
      marker: "bookmarks",
    }
  );
  return res;
} else {
  throw new Error("User not logged in!");
}
